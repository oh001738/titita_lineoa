# LINE OA 整合系統 — 設計方案

> **目標**：作為音樂補習班管理系統的**周圍系統**，透過 LINE Messaging API 讓家長/教師用手機號碼綁定 LINE OA，接收課程通知、請假結果、學費提醒等推播訊息。

---

## 1. 系統定位與架構

### 1.1 周圍系統 vs 主系統

```
┌─────────────────────────────────────────────────────────┐
│                    主系統 (既有)                          │
│  Next.js 14 · MongoDB · NextAuth · Synology NAS         │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 教室管理 │ │ 教師管理 │ │ 課程管理 │ │ 學生管理 │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 選課管理 │ │ 請假補課 │ │ 學費(待) │ │ 獎勵(待) │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                       │                                  │
│              lib/notifications.ts                        │
│              (骨架已預留，待填入)                          │
└───────────────────────┬─────────────────────────────────┘
                        │ 共用 MongoDB · 共用 User Model
                        │
┌───────────────────────▼─────────────────────────────────┐
│                LINE OA 周圍系統 (本次設計)                │
│  Next.js 14 · 同一 MongoDB · @line/bot-sdk · @line/liff │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Webhook  │ │ LIFF     │ │ 推播引擎 │ │ Rich     │   │
│  │ 接收     │ │ 綁定頁   │ │ Push API │ │ Menu     │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
                  LINE Platform
                        │
              ┌─────────▼─────────┐
              │   家長/教師手機    │
              │   LINE App        │
              └───────────────────┘
```

### 1.2 兩種部署方案

| 方案 | 說明 | 優缺點 |
|------|------|--------|
| **A. 獨立專案** | 本專案 `titita_lineoa` 為獨立 Next.js App，共用同一 MongoDB | ✅ 獨立部署/重啟不影響主系統 ✅ 職責分離清晰 ⚠ 需複製部分 Model 定義 |
| **B. 主系統內嵌** | 直接在主系統新增 `/api/line/*` 路由與 LIFF 頁面 | ✅ 共用所有 Model ⚠ 部署耦合 |

> [!IMPORTANT]
> **建議採用方案 A（獨立專案）**：LINE Webhook 需要公開 HTTPS endpoint，獨立部署可避免主系統內部 API 暴露風險。透過共用 MongoDB，兩系統的資料天然同步。

---

## 2. 技術棧（與主系統一致）

| 層級 | 技術 | 版本 | 說明 |
|------|------|------|------|
| 框架 | Next.js (App Router) | 14 | 與主系統一致 |
| 語言 | TypeScript | 5+ | 與主系統一致 |
| 資料庫 | MongoDB Atlas | 同一實例 | **共用主系統 DB** |
| ORM | Mongoose | 9+ | 與主系統一致 |
| LINE SDK | @line/bot-sdk | 11.0.0 | Webhook 簽名驗證 + Push API |
| LIFF SDK | @line/liff | 2.28+ | 前端綁定頁面 |
| 樣式 | Tailwind CSS | 3+ | LIFF 頁面樣式 |
| 部署 | Docker (Synology NAS) | — | 與主系統同 NAS，不同 container |

---

## 3. 專案目錄結構

```
titita_lineoa/
├── app/
│   ├── api/
│   │   └── line/
│   │       ├── webhook/route.ts       # LINE Webhook 接收（POST）
│   │       ├── bind/route.ts          # 綁定請求（POST）
│   │       ├── bind/lookup/route.ts   # 查詢可綁定學生（POST）
│   │       ├── unbind/route.ts        # 解除綁定（POST，管理員用）
│   │       ├── notify/route.ts        # 單人推播（POST）
│   │       └── notify/broadcast/route.ts  # 群組推播（POST）
│   ├── liff/
│   │   ├── layout.tsx                 # LIFF 共用 layout（載入 LIFF SDK）
│   │   ├── bind/page.tsx              # 綁定頁面（輸入電話 → 選擇學生）
│   │   └── status/page.tsx            # 綁定狀態查看頁
│   └── layout.tsx                     # Root layout
├── components/
│   └── liff/
│       ├── LiffProvider.tsx           # LIFF SDK 初始化 Context
│       ├── PhoneInput.tsx             # 電話輸入元件
│       ├── StudentSelector.tsx        # 多學生選擇元件
│       └── BindResult.tsx             # 綁定結果顯示
├── lib/
│   ├── db/
│   │   └── mongoose.ts                # 複用主系統連線邏輯
│   ├── models/
│   │   ├── User.ts                    # 複用主系統 User Model
│   │   ├── Student.ts                 # 複用主系統 Student Model
│   │   ├── LineBindLog.ts             # 綁定/解綁操作紀錄
│   │   └── LineNotifyLog.ts           # 推播紀錄
│   ├── line/
│   │   ├── client.ts                  # LINE Messaging API client 封裝
│   │   ├── signature.ts               # Webhook 簽名驗證
│   │   ├── templates.ts               # 訊息模板（Flex Message）
│   │   └── push.ts                    # 推播函式封裝
│   ├── constants.ts                   # 常數（複用主系統 + LINE 專用）
│   └── utils.ts                       # 工具函式
├── types/
│   └── index.ts                       # 型別定義
├── .env.local                         # 環境變數
├── docker-compose.yml
├── Dockerfile
├── CLAUDE.md                          # 本專案規範
└── package.json
```

---

## 4. 資料模型設計

### 4.1 共用 Model — User（主系統已有，不修改）

```typescript
// 主系統 User.ts 已有的 LINE 預留欄位，直接使用
{
  phone:         { type: String, default: null, index: true, sparse: true },
  line_user_id:  { type: String, default: null, index: true, sparse: true }, // 不可 unique
  line_bound_at: { type: Date,   default: null },
}
```

### 4.2 新增 Model — LineBindLog（綁定操作紀錄）

```typescript
// lib/models/LineBindLog.ts
const LineBindLogSchema = new Schema({
  user_id:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  line_user_id:  { type: String, required: true },
  action:        { type: String, enum: ['bind', 'unbind'], required: true },
  operator:      { type: String, enum: ['self', 'admin'], required: true },
  operator_id:   { type: Schema.Types.ObjectId, ref: 'User', default: null }, // admin 操作時記錄
  phone_used:    { type: String, default: null }, // 綁定時使用的電話
  metadata:      { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true })
```

### 4.3 新增 Model — LineNotifyLog（推播紀錄）

```typescript
// lib/models/LineNotifyLog.ts
const LineNotifyLogSchema = new Schema({
  user_id:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  line_user_id:  { type: String, required: true },
  student_name:  { type: String, required: true },  // 鐵則：必須夾帶學生姓名
  notify_type:   { type: String, enum: [
    'leave_approved',      // 請假核准
    'leave_rejected',      // 請假拒絕
    'makeup_arranged',     // 補課安排
    'course_change',       // 課程異動
    'tuition_reminder',    // 學費提醒
    'tuition_received',    // 學費已收
    'points_earned',       // 積點獲得
    'broadcast',           // 全班通知
    'bind_success',        // 綁定成功
  ], required: true },
  message_content: { type: String, required: true },
  status:        { type: String, enum: ['sent', 'failed', 'pending'], default: 'pending' },
  error_message: { type: String, default: null },
  line_request_id: { type: String, default: null }, // LINE API 回傳的 request ID
}, { timestamps: true })
```

---

## 5. 核心流程設計

### 5.1 綁定流程（家長 + 教師共用）

```
家長/教師手機                    LINE Platform              LINE OA 系統              MongoDB
    │                               │                          │                        │
    │  ① 加入好友 / 點 Rich Menu    │                          │                        │
    │  「綁定帳號」                  │                          │                        │
    │ ─────────────────────────────→│                          │                        │
    │                               │  ② 開啟 LIFF 頁面       │                        │
    │                               │ ────────────────────────→│                        │
    │  ③ LIFF 載入                  │                          │                        │
    │←─────────────────────────────────────────────────────────│                        │
    │                               │                          │                        │
    │  ④ liff.getProfile()          │                          │                        │
    │  取得 LINE userId + 顯示名稱  │                          │                        │
    │                               │                          │                        │
    │  ⑤ 輸入手機號碼 → 送出        │                          │                        │
    │ ─────────────────────────────────────────────────────────→│                        │
    │                               │                          │  ⑥ POST /api/line/bind/lookup
    │                               │                          │  User.find({ phone, role })
    │                               │                          │ ──────────────────────→│
    │                               │                          │←──────────────────────│
    │                               │                          │                        │
    │  ⑦ 回傳匹配結果               │                          │                        │
    │  • 0 筆 → 「查無資料」        │                          │                        │
    │  • 1 筆 → 直接顯示確認        │                          │                        │
    │  • N 筆 → 顯示學生清單勾選    │                          │                        │
    │←─────────────────────────────────────────────────────────│                        │
    │                               │                          │                        │
    │  ⑧ 確認綁定（勾選學生）        │                          │                        │
    │ ─────────────────────────────────────────────────────────→│                        │
    │                               │                          │  ⑨ POST /api/line/bind
    │                               │                          │  User.updateMany(...)
    │                               │                          │  LineBindLog.create(...)
    │                               │                          │ ──────────────────────→│
    │                               │                          │←──────────────────────│
    │                               │                          │                        │
    │                               │  ⑩ Push 綁定成功訊息     │                        │
    │                               │←────────────────────────│                        │
    │  ⑪ 收到確認通知               │                          │                        │
    │←─────────────────────────────│                          │                        │
```

### 5.2 教師綁定的差異

教師用 `role: 'teacher'`，一個教師只對應一個 User，所以：
- 查詢用 `User.findOne({ phone, role: 'teacher' })`
- 不需要學生選擇步驟，直接綁定

### 5.3 Webhook 事件處理

```typescript
// 需處理的 Webhook 事件類型
const EVENT_HANDLERS = {
  follow:    handleFollow,     // 加入好友 → 歡迎訊息 + 引導綁定
  unfollow:  handleUnfollow,   // 封鎖/刪除 → 清除 line_user_id
  message:   handleMessage,    // 文字訊息 → 關鍵字回覆（查課表、查點數等）
  postback:  handlePostback,   // Rich Menu / 按鈕回調
}
```

### 5.4 推播通知觸發點（填入主系統 lib/notifications.ts）

| 觸發事件 | 主系統觸發位置 | 推播內容 |
|----------|--------------|---------|
| 請假核准（不補課） | `PATCH /api/leave-requests/:id` (approve_no_makeup) | 「【王小明】4/20 鋼琴課請假已核准，不安排補課」 |
| 補課已安排 | `PATCH /api/leave-requests/:id` (arrange_makeup) | 「【王小明】補課安排：5/1 (四) 15:00 A教室」 |
| 請假被拒 | `PATCH /api/leave-requests/:id` (reject) | 「【王小明】4/20 請假申請未通過，原因：...」 |
| 課程異動 | `PUT /api/courses/:id` | 「【幼兒爵士鼓班】上課時間調整為每週四 16:00」 |
| 學費提醒 | 未來 Tuition 模組 | 「【王小明】4 月學費 $3,000 元尚未繳納」 |
| 積點獲得 | 未來 Rewards 模組 | 「【王小明】獲得 5 點（原因：表現優異）」 |

---

## 6. API 端點設計

### 6.1 Webhook 接收

```
POST /api/line/webhook
```
- 驗證 `X-Line-Signature`
- 不需 NextAuth session（LINE Server 呼叫）
- 回傳 200 OK（即使處理失敗也要回 200，避免 LINE 重試風暴）

### 6.2 綁定相關

```
POST /api/line/bind/lookup
Body: { phone: string, line_user_id: string }
Response: { data: { users: Array<{ _id, name, role, student_name? }> }, error: null }

POST /api/line/bind
Body: { user_ids: string[], line_user_id: string, phone: string }
Response: { data: { bound_count: number }, error: null }

POST /api/line/unbind
Body: { user_id: string }  // 管理員操作
Headers: Authorization（需 ADMIN session）
Response: { data: { success: true }, error: null }
```

### 6.3 推播相關

```
POST /api/line/notify
Body: { user_id: string, student_name: string, message: string, notify_type: string }
Headers: X-Internal-Key（內部呼叫金鑰，非公開 API）

POST /api/line/notify/broadcast
Body: { course_id: string, message: string }
Headers: Authorization（需 ADMIN session）
```

---

## 7. 訊息模板設計（Flex Message）

### 7.1 綁定成功通知

```
┌─────────────────────────────┐
│  🎵 帳號綁定成功！           │
│                             │
│  已綁定學生：               │
│  ✅ 王小明                  │
│  ✅ 王小美                  │
│                             │
│  您將收到以下通知：          │
│  • 請假/補課處理結果         │
│  • 課程異動通知             │
│  • 學費繳費提醒             │
│                             │
│  [查看綁定狀態]              │
└─────────────────────────────┘
```

### 7.2 請假結果通知

```
┌─────────────────────────────┐
│  📋 請假處理通知             │
│                             │
│  學生：王小明               │
│  課程：鋼琴初級             │
│  日期：2026/04/20 (一) 15:00│
│  結果：✅ 已核准（補課）     │
│                             │
│  補課安排：                 │
│  📅 2026/05/01 (四) 15:00   │
│  🏫 A教室                   │
│  👨‍🏫 李老師                  │
│                             │
│  [查看詳情]                  │
└─────────────────────────────┘
```

---

## 8. Rich Menu 設計

```
┌──────────────┬──────────────┬──────────────┐
│              │              │              │
│   🔗 綁定    │   📅 課表    │   💰 學費    │
│   帳號       │   查詢       │   查詢       │
│              │              │              │
├──────────────┼──────────────┼──────────────┤
│              │              │              │
│   ⭐ 積點    │   📝 請假    │   ❓ 說明    │
│   查詢       │   申請       │              │
│              │              │              │
└──────────────┴──────────────┴──────────────┘
```

> [!NOTE]
> Rich Menu 的「課表查詢」「學費查詢」「積點查詢」「請假申請」可先導向 LIFF 頁面，或回覆引導至主系統網頁。視主系統進度而定。

---

## 9. 環境變數

```bash
# MongoDB（與主系統共用同一 DB）
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/titita

# LINE Messaging API
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token

# LIFF
NEXT_PUBLIC_LIFF_ID=your_liff_id

# 內部通訊金鑰（主系統呼叫推播 API 用）
INTERNAL_API_KEY=your_random_secret_key

# 應用設定
NEXT_PUBLIC_MAIN_SYSTEM_URL=https://titita.example.com
```

---

## 10. 安全機制

| 項目 | 做法 |
|------|------|
| Webhook 簽名驗證 | `@line/bot-sdk` 的 `validateSignature()` 驗證 `X-Line-Signature` |
| 綁定身份驗證 | 用 `phone` 比對主系統 User 記錄，限 `role: family / teacher` |
| 推播 API 保護 | `/api/line/notify` 用 `X-Internal-Key` header 驗證，不對外公開 |
| 管理員操作 | `/api/line/unbind` 需主系統 ADMIN session |
| LIFF 域名白名單 | LINE Developer Console 設定允許的 LIFF endpoint URL |
| 敏感資料 | `LINE_CHANNEL_SECRET` / `INTERNAL_API_KEY` 存 `.env.local`，不入 Git |
| 速率限制 | 綁定 lookup 限制同一 IP 每分鐘 5 次（防暴力窮舉電話號碼） |

---

## 11. 分階段實作計畫

### Phase 1：基礎建設（第 1 週）

- [ ] 建立 Next.js 14 專案 + TypeScript + Tailwind
- [ ] 設定 MongoDB 連線（複用主系統 DB）
- [ ] 安裝 `@line/bot-sdk`、`@line/liff`
- [ ] 建立 LINE Developer Console：Messaging API Channel + LIFF App
- [ ] 實作 Webhook endpoint + 簽名驗證
- [ ] 實作 follow/unfollow 基礎事件處理
- [ ] Docker 部署設定

### Phase 2：帳號綁定（第 2 週）

- [ ] LIFF 綁定頁面（PhoneInput → StudentSelector → BindResult）
- [ ] `POST /api/line/bind/lookup`（電話查詢）
- [ ] `POST /api/line/bind`（確認綁定，更新 User + 寫 LineBindLog）
- [ ] 綁定成功 Flex Message 推送
- [ ] Rich Menu 設計與上傳
- [ ] 管理員解綁 API

### Phase 3：推播通知（第 3 週）

- [ ] 推播函式封裝（`lib/line/push.ts`）
- [ ] 訊息模板系統（`lib/line/templates.ts`）
- [ ] 請假結果推播（填入主系統 `lib/notifications.ts`）
- [ ] 課程異動推播
- [ ] LineNotifyLog 紀錄
- [ ] 全班廣播功能

### Phase 4：進階功能（第 4 週+）

- [ ] Rich Menu 互動（關鍵字回覆：查課表、查積點）
- [ ] LIFF 課表查看頁
- [ ] 學費提醒推播（待主系統 Tuition 模組完成）
- [ ] 積點通知推播（待主系統 Rewards 模組完成）
- [ ] 推播紀錄查詢（管理員後台）

---

## 12. 與主系統的整合方式

### 12.1 主系統呼叫推播的方式

主系統 `lib/notifications.ts` 已有 3 個空實作函式，填入時改為 HTTP 呼叫本系統：

```typescript
// 主系統 lib/notifications.ts（待修改）
const LINE_OA_BASE = process.env.LINE_OA_SYSTEM_URL // e.g. http://lineoa:3001

async function notifyLeaveRequestResult(leaveRequest: LeaveRequestWithRefs) {
  // 查出學生的 User → 取 line_user_id
  const student = await Student.findById(leaveRequest.student_id)
  const user = await User.findById(student.user_id)
  
  if (!user?.line_user_id) return  // 未綁定，不推播
  
  await fetch(`${LINE_OA_BASE}/api/line/notify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Key': process.env.INTERNAL_API_KEY!,
    },
    body: JSON.stringify({
      user_id: user._id,
      student_name: student.student_name,
      notify_type: 'leave_approved',
      message: `【${student.student_name}】請假已核准...`,
    }),
  })
}
```

### 12.2 替代方案：直接 DB 寫入 + 排程推播

如果不想跨服務 HTTP 呼叫，也可以：
1. 主系統寫入一筆 `LineNotifyLog`（status=pending）
2. LINE OA 系統用 cron job 每 30 秒掃描 pending 紀錄並推播

> [!TIP]
> 建議先用 HTTP 直接呼叫（簡單直接），未來若效能需求大再改為佇列模式。

---

## 13. 前置準備 Checklist

- [ ] 申請 LINE Official Account（免費版即可，推播有月額度限制）
- [ ] LINE Developer Console 建立 Provider + Messaging API Channel
- [ ] 建立 LIFF App（設定 Endpoint URL）
- [ ] 取得 Channel ID / Channel Secret / Channel Access Token
- [ ] 確認主系統 MongoDB 連線字串可供本專案使用
- [ ] 準備公開 HTTPS 域名（或 Synology NAS reverse proxy + SSL）
- [ ] 開發期間準備 ngrok 做 webhook 測試

---

## 14. 待確認事項

| 項目 | 說明 | 優先度 |
|------|------|--------|
| LINE OA 帳號類型 | 免費版每月推播 500 則，是否足夠？若學生 50+ 人可能需升級 | **高** |
| 教師是否需要綁定 | 教師是否也需透過 LINE 收通知（如新請假申請）？ | **高** |
| 推播內容語言 | 訊息固定中文？是否需要多語言？ | 低 |
| Rich Menu 功能範圍 | 第一版 Rich Menu 需要哪些按鈕？ | 中 |
| LIFF 頁面是否需額外功能 | 除了綁定，是否要在 LIFF 內查看課表/學費？ | 中 |

---

## 15. 開發狀態與後續串接 (2026-04 最新狀態)

LINE OA 系統目前已完成前端 UI、LINE SDK 整合、Webhooks 及 Mock 測試環境建立。

### LINE OA 系統 (本系統) 目前狀態：
1. **Mock 模式啟用**：
   系統已實裝 `MOCK_MODE=true` (`lib/main-system-client.ts`)。在沒有主系統 API 的情況下，仍能用測試帳號 (如 `0912345678`) 完成整個綁定流程。
2. **解決開發環境的 Hydration 問題**：
   在開發期使用 `ngrok` 時，其警告頁面會阻擋 Next.js 15 的 JavaScript 載入 (導致畫面有載入中圖示，但 JS 完全卡死)。**強烈建議解決方案**：
   - 使用 **Pinggy** (`ssh -p 443 -R0:localhost:3000 a.pinggy.io`) 替代 ngrok，因為它沒有警告頁面。
   - 或使用正式環境啟動 (`npm run build && npm run start`) 來繞過開發模式的安全檢查。
3. **資料庫獨立**：
   已經完全與主系統 DB 解耦。LINE OA 擁有獨立的 MongoDB 用以存放 `LineBindLog` (綁定紀錄) 和 `LineNotifyLog` (推播紀錄)。

### 下一步：主系統串接步驟
1. 主系統團隊依照 `main_system_internal_api_spec.md` 規格實作 `/api/internal/users/*` 這 3 支 API。
2. 將 LINE OA `.env.local` 中的 `MAIN_SYSTEM_URL` 換成主系統的正式/測試網址。
3. 將 LINE OA `.env.local` 中的 `MOCK_MODE` 設為 `false`。
4. 設定統一的 `INTERNAL_API_KEY`，雙方系統開始對接測試。
