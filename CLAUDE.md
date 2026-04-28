# 音樂補習班 LINE OA 整合系統 — 專案規範文件
# 每次對話開始前請先閱讀本文件，所有開發都必須遵循以下規範

---

## 0. 系統定位

本系統為音樂補習班管理系統的**周圍系統**，負責 LINE Official Account 整合：
- **帳號綁定**：家長/教師用手機號碼綁定 LINE OA
- **推播通知**：課程異動、請假結果、學費提醒等
- **Webhook 處理**：接收 LINE Platform 事件

### 架構原則：完全解耦

- 本系統有**自己獨立的 MongoDB**（`titita_lineoa`），不直接存取主系統 DB
- 與主系統透過 **Internal API**（HTTP + `X-Internal-Key`）溝通
- LINE OA DB 只存 `LineBindLog`（綁定紀錄）和 `LineNotifyLog`（推播紀錄）

```
主系統 (port 3000)                    LINE OA (port 3001)
┌────────────────────┐                ┌────────────────────┐
│ /api/internal/*    │ ←── HTTP ───── │ main-system-client │
│ (查詢User/Student) │                │                    │
│                    │                │                    │
│ notifications.ts ──── HTTP ───────→ │ /api/line/notify   │
│ (觸發推播)          │                │ (推播給 LINE 用戶)  │
└────────┬───────────┘                └────────┬───────────┘
         │                                     │
    主系統 MongoDB                         LINE OA MongoDB
    (users, students,                     (linebindlogs,
     courses, ...)                         linenotifylogs)
```

---

## 1. 專案技術棧

| 層級 | 技術 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 15 |
| 樣式 | Tailwind CSS | 4 |
| 資料庫 | MongoDB Atlas（獨立實例） | 最新 |
| ORM | Mongoose | 9+ |
| LINE SDK | @line/bot-sdk | 11 |
| LIFF SDK | @line/liff | 2.28+ |
| 語言 | TypeScript | 5+ |
| 部署 | Docker (Synology NAS, port 3001) | — |

---

## 2. 專案目錄結構

```
titita_lineoa/
├── app/
│   ├── api/
│   │   ├── health/route.ts            # ✅ 健康檢查（含 DB 連線）
│   │   └── line/
│   │       ├── webhook/route.ts       # ✅ LINE Webhook（follow/unfollow/message）
│   │       ├── bind/route.ts          # ✅ 確認綁定（POST）
│   │       ├── bind/lookup/route.ts   # ✅ 電話查詢（POST）
│   │       ├── unbind/route.ts        # ✅ 管理員解綁（POST）
│   │       └── notify/route.ts        # ✅ 推播通知（POST + GET）
│   ├── liff/
│   │   ├── layout.tsx                 # ✅ LIFF layout（LiffProvider）
│   │   └── bind/page.tsx              # ✅ 綁定頁面（三步驟流程）
│   ├── layout.tsx                     # ✅ Root layout
│   ├── page.tsx                       # 首頁（預設）
│   └── globals.css
├── components/
│   └── liff/
│       └── LiffProvider.tsx           # ✅ LIFF SDK 初始化 Context
├── lib/
│   ├── db/
│   │   └── mongoose.ts                # ✅ LINE OA 自己的 MongoDB 連線
│   ├── models/                        # ⚠ 只有 LINE OA 自己的 Model
│   │   ├── LineBindLog.ts             # ✅ 綁定操作紀錄
│   │   └── LineNotifyLog.ts           # ✅ 推播紀錄
│   ├── line/
│   │   ├── client.ts                  # ✅ LINE Messaging API client
│   │   ├── signature.ts               # ✅ Webhook 簽名驗證
│   │   ├── templates.ts               # ✅ Flex Message 模板
│   │   └── push.ts                    # ✅ 推播函式封裝
│   ├── main-system-client.ts          # ✅ 主系統 Internal API Client
│   └── constants.ts                   # ✅ 常數定義
├── types/
│   └── index.ts                       # ✅ TypeScript 型別定義
├── .env.local                         # 環境變數（不入 Git）
├── .env.example                       # ✅ 環境變數範本
├── Dockerfile                         # ✅ 多階段建置
├── docker-compose.yml                 # ✅ 容器編排
├── next.config.ts                     # ✅ standalone output
└── CLAUDE.md                          # 本文件
```

---

## 3. 主系統 Internal API 依賴

本系統需要主系統提供以下 3 支 Internal API：

| 主系統端點 | 方法 | 用途 | LINE OA 呼叫位置 |
|-----------|------|------|-----------------|
| `/api/internal/users/lookup-by-phone` | POST | 用電話查詢 User+Student | bind/lookup |
| `/api/internal/users/line-binding` | PATCH | 更新 line_user_id | bind, unbind |
| `/api/internal/users/lookup-by-line` | POST | 用 LINE ID 查詢已綁定 User | webhook (unfollow, 狀態查詢) |

所有 Internal API 使用 `X-Internal-Key` header 驗證。
呼叫邏輯封裝在 `lib/main-system-client.ts`。

---

## 4. LINE OA 的 API 端點

| 路由 | 方法 | 用途 | 驗證方式 |
|------|------|------|---------|
| `/api/health` | GET | 健康檢查 | 無 |
| `/api/line/webhook` | POST | LINE 事件接收 | X-Line-Signature |
| `/api/line/bind/lookup` | POST | 電話查詢可綁定帳號 | LIFF（LINE userId） |
| `/api/line/bind` | POST | 確認綁定 | LIFF（LINE userId） |
| `/api/line/unbind` | POST | 管理員解綁 | X-Internal-Key |
| `/api/line/notify` | POST | 推播通知（主系統呼叫） | X-Internal-Key |
| `/api/line/notify` | GET | 查詢推播紀錄 | X-Internal-Key |

---

## 5. 資料模型（LINE OA 自己的 DB）

本系統的 MongoDB 只有 2 個 collection：

### LineBindLog — 綁定/解綁操作紀錄
```
user_id, line_user_id, action(bind/unbind), operator(self/admin),
operator_id, phone_used, metadata, createdAt, updatedAt
```

### LineNotifyLog — 推播紀錄
```
user_id, line_user_id, student_name, notify_type, message_content,
status(pending/sent/failed), error_message, line_request_id, createdAt, updatedAt
```

---

## 6. 關鍵設計決定

1. **獨立 DB** — 不直接存取主系統 MongoDB，透過 Internal API 溝通
2. **line_user_id 不設 unique** — 一個家長 LINE 可綁定多個小孩的 User
3. **推播鐵則** — 每則訊息必須夾帶學生姓名
4. **Webhook 一律回 200** — 避免 LINE 重試風暴
5. **簽名驗證用 raw body** — `request.text()` 取得原始字串再驗證
6. **推播 API 需要 line_user_id** — 主系統呼叫時自行查 User.line_user_id 傳過來
7. **port 3001** — 避免與主系統 port 3000 衝突

---

## 7. 環境變數

```
MONGODB_URI              — LINE OA 自己的 MongoDB 連線字串
MAIN_SYSTEM_URL          — 主系統 URL（server-side only，不暴露給前端）
INTERNAL_API_KEY         — 內部 API 金鑰（雙向驗證）
LINE_CHANNEL_ID          — LINE Channel ID
LINE_CHANNEL_SECRET      — LINE Channel Secret
LINE_CHANNEL_ACCESS_TOKEN — LINE Channel Access Token
NEXT_PUBLIC_LIFF_ID      — LIFF App ID（前端使用）
```

---

## 8. 開發注意事項

1. **不直接存取主系統 DB** — 所有 User/Student 資料透過 `lib/main-system-client.ts`
2. **LINE OA 的 DB 只存 LineBindLog + LineNotifyLog**
3. **DB 操作前必須 `await connectDB()`**
4. **Mongoose Model 用 `models.X || model('X', Schema)` 避免重複定義**
5. **API 回應格式統一 `{ data, error }` 與主系統一致**
6. **Webhook route 必須用 `request.text()` 讀 body**（簽名驗證需要原始字串）
7. **LIFF 頁面是 client component**（`'use client'`）

---

## 9. 開發進度

### 9.1 已完成

| 項目 | 狀態 |
|------|------|
| 專案初始化 (Next.js + TS + Tailwind) | ✅ |
| MongoDB 連線（LINE OA 獨立 DB） | ✅ |
| 常數 + 型別定義 | ✅ |
| LineBindLog / LineNotifyLog Model | ✅ |
| 主系統 API Client (`main-system-client.ts`) | ✅ |
| LINE Client + 簽名驗證 | ✅ |
| Flex Message 模板 (4 種) | ✅ |
| 推播函式封裝與優化 | ✅ |
| Webhook API (follow/unfollow/message) | ✅ |
| 綁定查詢 + 確認 + 解綁 API | ✅ |
| 推播 API (含錯誤處理) | ✅ |
| LIFF Provider + 綁定頁面 | ✅ |
| 綁定狀態頁 (LIFF) | ✅ |
| 健康檢查 API | ✅ |
| Docker 部署設定 | ✅ |
| TypeScript 編譯 0 errors | ✅ |
| 廣播 API (Batch Push) | ✅ |

### 9.2 待完成

| 項目 | 說明 |
|------|------|
| 主系統 Internal API 3 支 | 需主系統團隊實作 |
| LINE Developer Console 設定 | 申請 Channel + LIFF App |
| Rich Menu 設計與上傳 | 6 格選單圖片 |
| ngrok 測試 | 本地 Webhook 測試 |
| 實際部署 | Docker 容器啟動 |