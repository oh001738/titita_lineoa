/**
 * 簡單的記憶體速率限制器
 * 適用於 serverless / Next.js API routes（同一 process 內有效）
 * NAS 單機部署夠用；多 instance 需改用 Redis
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// 定期清理過期 key，避免記憶體無限成長
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 60_000)

/**
 * 檢查是否超過速率限制
 * @param key      識別 key（例如 line_user_id 或 IP）
 * @param max      視窗內最大次數
 * @param windowMs 視窗長度（毫秒）
 * @returns true = 超過限制（應拒絕）
 */
export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  entry.count += 1
  if (entry.count > max) return true
  return false
}
