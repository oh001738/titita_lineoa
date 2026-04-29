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
│   │   ├── admin/                     # ✅ 管理員 API
│   │   │   ├── login/route.ts         #    登入
│   │   │   ├── logout/route.ts        #    登出
│   │   │   ├── broadcast/route.ts     #    廣播推播
│   │   │   ├── recipients/route.ts    #    已綁定用戶清單
│   │   │   ├── stats/route.ts         #    統計數據
│   │   │   ├── test-push/route.ts     #    試發推播
│   │   │   ├── settings/route.ts      #    系統設定
│   │   │   └── logs/
│   │   │       ├── bind/route.ts      #    綁定日誌
│   │   │       └── notify/route.ts    #    推播日誌
│   │   ├── internal/users/            # ✅ 代轉主系統查詢（LIFF 用）
│   │   │   ├── bound-students/route.ts#    已綁定學生
│   │   │   ├── courses/route.ts       #    課表
│   │   │   ├── points/route.ts        #    點數
│   │   │   └── leave/route.ts         #    請假申請
│   │   ├── points/teacher/            # ✅ 教師點數操作
│   │   │   ├── students/route.ts      #    教師學生清單
│   │   │   └── award/route.ts         #    獎勵點數
│   │   └── line/
│   │       ├── webhook/route.ts       # ✅ LINE Webhook（follow/unfollow/message/postback）
│   │       ├── bind/route.ts          # ✅ 確認綁定（POST）
│   │       ├── bind/lookup/route.ts   # ✅ 電話查詢（POST）
│   │       ├── bind/status/route.ts   # ✅ 綁定狀態查詢（GET）
│   │       ├── unbind/route.ts        # ✅ 管理員解綁（POST）
│   │       ├── unbind/self/route.ts   # ✅ 用戶自行解綁（POST）
│   │       ├── notify/route.ts        # ✅ 推播通知（POST + GET）
│   │       └── notify/broadcast/route.ts # ✅ 廣播推播（POST）
│   ├── admin/                         # ✅ 管理員 UI
│   │   ├── layout.tsx                 #    管理員 layout
│   │   ├── page.tsx                   #    儀表板
│   │   ├── login/page.tsx             #    登入頁
│   │   ├── notify/page.tsx            #    推播管理頁
│   │   └── logs/
│   │       ├── bind/page.tsx          #    綁定日誌頁
│   │       └── notify/page.tsx        #    推播日誌頁
│   ├── liff/
│   │   ├── layout.tsx                 # ✅ LIFF layout（LiffProvider）
│   │   ├── bind/page.tsx              # ✅ 綁定頁面（三步驟流程）
│   │   ├── status/page.tsx            # ✅ 綁定狀態頁
│   │   ├── courses/page.tsx           # ✅ 課表頁（含請假功能）
│   │   └── points/page.tsx            # ✅ 點數頁
│   ├── layout.tsx                     # ✅ Root layout
│   ├── page.tsx                       # 首頁（預設）
│   └── globals.css
├── components/
│   ├── admin/
│   │   └── AdminLogoutButton.tsx      # ✅ 管理員登出按鈕
│   └── liff/
│       ├── LiffProvider.tsx           # ✅ LIFF SDK 初始化 Context
│       ├── Toast.tsx                  # ✅ 全域 Toast 元件
│       └── ConfirmDialog.tsx          # ✅ 全域確認對話框
├── lib/
│   ├── db/
│   │   └── mongoose.ts                # ✅ LINE OA 自己的 MongoDB 連線
│   ├── models/
│   │   ├── LineBindLog.ts             # ✅ 綁定操作紀錄
│   │   ├── LineNotifyLog.ts           # ✅ 推播紀錄
│   │   ├── AdminUser.ts              # ✅ 管理員帳號
│   │   └── SystemSetting.ts          # ✅ 系統設定
│   ├── line/
│   │   ├── client.ts                  # ✅ LINE Messaging API client
│   │   ├── signature.ts               # ✅ Webhook 簽名驗證
│   │   ├── templates.ts               # ✅ 文字訊息模板
│   │   ├── flex-templates.ts          # ✅ Flex Message 模板
│   │   ├── push.ts                    # ✅ 推播函式封裝
│   │   └── verify-id-token.ts         # ✅ LIFF ID Token 驗證
│   ├── main-system-client.ts          # ✅ 主系統 Internal API Client
│   ├── mock-main-system-client.ts     # ✅ Mock 資料（MOCK_MODE 用）
│   ├── admin-session.ts               # ✅ 管理員 Session 管理
│   ├── rate-limit.ts                  # ✅ API 速率限制
│   ├── site-config.ts                 # ✅ 站台設定
│   ├── env.ts                         # ✅ 環境變數輔助
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

本系統需要主系統提供以下 Internal API：

| 主系統端點 | 方法 | 用途 | LINE OA 呼叫位置 |
|-----------|------|------|-----------------|
| `/api/internal/users/lookup-by-phone` | POST | 用電話查詢 User+Student | bind/lookup |
| `/api/internal/users/line-binding` | PATCH | 更新 line_user_id | bind, unbind |
| `/api/internal/users/lookup-by-line` | POST | 用 LINE ID 查詢已綁定 User | webhook (unfollow, 狀態查詢) |
| `/api/internal/users/courses` | GET | 查詢學生/教師課表 | liff/courses |
| `/api/internal/users/points` | GET | 查詢學生點數餘額與歷史 | liff/points |
| `/api/internal/users/leave` | POST | 提交請假申請 | liff/courses（請假） |
| `/api/internal/users/teacher-students` | GET | 查詢教師的學生清單 | points/teacher |
| `/api/internal/points/award` | POST | 教師獎勵點數 | points/teacher/award |

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
| `/api/line/bind/status` | GET | 查詢綁定狀態 | LIFF（LINE userId） |
| `/api/line/unbind` | POST | 管理員解綁 | X-Internal-Key |
| `/api/line/unbind/self` | POST | 用戶自行解綁 | LIFF（LINE userId） |
| `/api/line/notify` | POST | 推播通知（主系統呼叫） | X-Internal-Key |
| `/api/line/notify` | GET | 查詢推播紀錄 | X-Internal-Key |
| `/api/line/notify/broadcast` | POST | 廣播推播 | X-Internal-Key |
| `/api/internal/users/bound-students` | GET | 查詢 LINE 用戶已綁定學生 | LIFF |
| `/api/internal/users/courses` | GET | 代轉主系統課表查詢 | LIFF |
| `/api/internal/users/points` | GET | 代轉主系統點數查詢 | LIFF |
| `/api/internal/users/leave` | POST | 代轉主系統請假申請 | LIFF |
| `/api/admin/login` | POST | 管理員登入 | 帳號密碼 |
| `/api/admin/broadcast` | POST | 管理員廣播推播 | Session |
| `/api/admin/logs/bind` | GET | 綁定日誌查詢 | Session |
| `/api/admin/logs/notify` | GET | 推播日誌查詢 | Session |
| `/api/admin/stats` | GET | 統計數據 | Session |
| `/api/admin/test-push` | POST | 試發推播 | Session |

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
| Flex Message 模板 | ✅ |
| 推播函式封裝與優化 | ✅ |
| Webhook API (follow/unfollow/message/postback) | ✅ |
| 綁定查詢 + 確認 + 解綁 API | ✅ |
| 推播 API (含錯誤處理) | ✅ |
| 廣播 API (Batch Push) | ✅ |
| LIFF Provider + 綁定頁面 | ✅ |
| LIFF 綁定狀態頁 | ✅ |
| LIFF 課表頁（含請假功能） | ✅ |
| LIFF 點數頁 | ✅ |
| 全域 UI 元件 (Toast + ConfirmDialog) | ✅ |
| 管理員後台 (登入/廣播/日誌/統計) | ✅ |
| 請假 API 主系統串接 | ✅ |
| 主系統 Internal API 全部串接 | ✅ |
| 健康檢查 API | ✅ |
| Docker 部署設定 | ✅ |
| TypeScript 編譯 0 errors | ✅ |

### 9.2 待完成

| 項目 | 說明 |
|------|------|
| Rich Menu 設計與上傳 | 6 格選單圖片 |
| 實際部署 | NAS Docker 容器啟動 |