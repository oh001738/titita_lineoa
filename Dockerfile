FROM node:20-alpine AS base

# ── 安裝依賴 ──
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── 建置 ──
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 環境變數在建置時需要（NEXT_PUBLIC_ 開頭的）
ARG NEXT_PUBLIC_LIFF_ID
ENV NEXT_PUBLIC_LIFF_ID=$NEXT_PUBLIC_LIFF_ID

RUN npm run build

# ── 運行 ──
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
