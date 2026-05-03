# 🎵 Titita LINE OA — 音樂教室 LINE 官方帳號整合系統

> 讓音樂補習班透過 LINE 官方帳號，自動推播課程通知、學費提醒，家長一鍵查課表、查點數。

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![LINE Messaging API](https://img.shields.io/badge/LINE-Messaging%20API-00C300?logo=line)](https://developers.line.biz/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%2FLocal-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📖 這是什麼？

`titita_lineoa` 是一套專為**音樂補習班**設計的 **LINE 官方帳號整合系統**，作為主管理系統（[titita_onecloud](https://github.com/oh001738/titita_onecloud)）的**周圍系統**，透過 LINE Messaging API 讓家長和老師在 LINE 上就能完成大部分互動。

### 🏗️ 系統架構

```
┌───────────────────────────────────────────────────────┐
│              主系統 (titita_onecloud)                    │
│  學員管理 │ 排課系統 │ 學費管理 │ 獎勵點數 │ 請假補課    │
│                     │                                   │
│           lib/notifications.ts                          │
│           (事件觸發 → 呼叫 LINE OA 推播)                  │
└─────────────────────┬───────────────────────────────────┘
                      │ Internal API (X-Internal-Key 驗證)
                      ▼
┌─────────────────────────────────────────────────────────┐
│           LINE OA 系統 (本專案 titita_lineoa)             │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Webhook  │ │ LIFF App │ │ 管理後台 │ │ 推播引擎 │   │
│  │ 事件接收 │ │ 課表/點數│ │ 廣播/統計│ │ Push Msg │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │
                LINE Platform
                      │
             ┌────────▼────────┐
             │  家長/教師手機   │
             │  LINE App       │
             └─────────────────┘
```

---

## ✨ 功能特色

### 👨‍👩‍👧 家長端（透過 LINE 操作）

| 功能 | 說明 |
|------|------|
| 📱 **帳號綁定** | 用報名手機號碼綁定 LINE 帳號，綁定後自動接收通知 |
| 📅 **課表查詢** | 在 LINE 內直接查看未來兩週課程安排 |
| ⭐ **點數查詢** | 查看孩子的獎勵點數餘額與獲得紀錄 |
| 🔔 **自動通知** | 請假結果、課程異動、學費繳費提醒、點數獲得 — 全部即時推播 |

### 🛠️ 管理員端（Web 後台）

| 功能 | 說明 |
|------|------|
| 📊 **統計儀表板** | 綁定人數、推播數據、系統狀態一目瞭然 |
| 📢 **推播廣播** | 選擇特定學生或全體發送自訂通知 |
| 📋 **發送紀錄** | 所有推播日誌可追蹤，含成功/失敗狀態與錯誤詳情 |
| 👥 **綁定管理** | 查看、管理所有 LINE 綁定關係 |

### 🤖 自動化 Webhook

- **加入好友** → 自動發送歡迎訊息 + 綁定引導
- **封鎖/刪除** → 自動清除主系統中的 LINE 綁定
- **關鍵字回覆** → 輸入「綁定」、「狀態」自動回應
- **Rich Menu Postback** → 支援 6 格選單按鈕互動

---

## 🚀 快速開始

### 前置需求

- **Node.js** ≥ 20
- **MongoDB** (Atlas 或 本機)
- **LINE 開發者帳號** ([LINE Developers Console](https://developers.line.biz/))
- **主系統** `titita_onecloud` 已部署且 Internal API 可存取

### 1. 建立 LINE 官方帳號與 Channel

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立一個 **Messaging API Channel**
3. 記下以下資訊：
   - `Channel ID`
   - `Channel Secret`
   - `Channel Access Token`（長期）
4. 建立一個 **LIFF App**，設定 Endpoint URL 為你的部署網域（例如 `https://your-domain.com`）
5. 記下 `LIFF ID`

### 2. 安裝與設定

```bash
# Clone 專案
git clone https://github.com/oh001738/titita_lineoa.git
cd titita_lineoa

# 安裝依賴
npm install

# 複製環境變數範本
cp .env.example .env.local
```

### 3. 設定環境變數

編輯 `.env.local`：

```env
# Mock 模式（首次測試可設 true，使用假資料，不需串接主系統）
MOCK_MODE=false

# LINE OA 自己的 MongoDB（不與主系統共用）
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/titita_lineoa

# 主系統 Internal API 位址與共享金鑰
MAIN_SYSTEM_URL=http://localhost:3000
INTERNAL_API_KEY=your_random_secret_key

# LINE Messaging API（從 LINE Developers Console 取得）
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token

# LIFF App ID（從 LINE Developers Console 取得）
LIFF_ID=your_liff_id

# 顯示名稱（會出現在 LIFF 頁面標題等處）
SCHOOL_NAME=你的補習班名稱

# 管理後台帳號密碼
ADMIN_USER=admin
ADMIN_PASS=your_secure_password
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

服務預設啟動在 `http://localhost:3001`。

### 5. 設定 LINE Webhook

在 LINE Developers Console 中，將 Webhook URL 設定為：

```
https://your-domain.com/api/line/webhook
```

> ⚠️ 開發環境中，你需要使用 [ngrok](https://ngrok.com/) 等工具產生 HTTPS 公開網址。

---

## 🐳 Docker 部署

本專案提供完整的 Docker 支援，適用於生產環境部署。

### 使用 Docker Compose

```bash
# 建立外部網路（如果與主系統共用 Docker 網路）
docker network create titita-network

# 啟動服務
docker compose up -d --build
```

### 環境變數

Docker 部署時，將環境變數寫在專案根目錄的 `.env` 檔案中（非 `.env.local`），Docker Compose 會自動讀取。

### docker-compose.yml 說明

```yaml
services:
  lineoa:
    build:
      context: .
      args:
        - LIFF_ID=${LIFF_ID}          # 建置時需要（LIFF 前端嵌入）
        - SCHOOL_NAME=${SCHOOL_NAME}  # 建置時需要（前端顯示）
    ports:
      - "3001:3001"                   # 對外開放 3001 port
    environment:
      - MAIN_SYSTEM_URL=http://titita-onecloud:3000  # Docker 內部用 container name
      # ... 其他環境變數
    networks:
      - titita-network                # 與主系統共用的 Docker 網路

networks:
  titita-network:
    external: true                    # 需先手動建立
```

---

## 📂 專案目錄結構

```
titita_lineoa/
├── app/
│   ├── admin/                         # 管理員後台
│   │   ├── login/                     #   └ 登入頁
│   │   ├── notify/                    #   └ 推播發送工具
│   │   ├── logs/                      #   └ 推播/綁定紀錄
│   │   ├── recipients/                #   └ 綁定成員管理
│   │   └── page.tsx                   #   └ 統計儀表板首頁
│   ├── api/
│   │   ├── admin/                     # 管理後台 API
│   │   │   ├── broadcast/route.ts     #   └ 群組/全體推播
│   │   │   └── stats/route.ts         #   └ 統計數據
│   │   ├── internal/                  # LIFF 代理 API（驗證 id_token 後轉發至主系統）
│   │   │   ├── users/courses/         #   └ 課表查詢代理
│   │   │   ├── users/points/          #   └ 點數查詢代理
│   │   │   └── users/leave/           #   └ 請假代理
│   │   ├── line/
│   │   │   ├── webhook/route.ts       #   └ LINE Webhook 接收
│   │   │   ├── bind/route.ts          #   └ 帳號綁定 API
│   │   │   ├── unbind/route.ts        #   └ 帳號解綁 API
│   │   │   └── notify/route.ts        #   └ 主系統觸發推播入口
│   │   └── health/                    # 健康檢查端點
│   └── liff/                          # LIFF 頁面（在 LINE App 內開啟）
│       ├── bind/                      #   └ 手機號碼綁定頁
│       ├── courses/                   #   └ 課表查詢頁
│       ├── points/                    #   └ 點數查詢頁
│       └── status/                    #   └ 綁定狀態頁
├── lib/
│   ├── line/
│   │   ├── templates.ts               # Flex Message 模板（Jelly Kids 童趣風格）
│   │   └── push.ts                    # 推播發送引擎（含日誌紀錄）
│   ├── db/mongoose.ts                 # MongoDB 連線
│   ├── models/                        # Mongoose 資料模型
│   │   ├── LineBindLog.ts             #   └ 綁定日誌
│   │   ├── LineNotifyLog.ts           #   └ 推播日誌
│   │   └── SystemSetting.ts           #   └ 系統設定
│   ├── main-system-client.ts          # 主系統 API 客戶端
│   ├── bind-token.ts                  # 綁定安全令牌（防帳號劫持）
│   ├── verify-ownership.ts            # 所有權驗證
│   ├── rate-limit.ts                  # 速率限制
│   └── constants.ts                   # 常數定義
├── docker-compose.yml
├── Dockerfile
└── .env.example                       # 環境變數範本
```

---

## 🔌 API 端點

### LINE Webhook

| Method | Endpoint | 說明 |
|--------|----------|------|
| `POST` | `/api/line/webhook` | LINE Platform Webhook 接收 |

### 推播通知（供主系統呼叫）

| Method | Endpoint | 驗證 | 說明 |
|--------|----------|------|------|
| `POST` | `/api/line/notify` | `X-Internal-Key` | 觸發推播通知 |

**Payload 範例：**

```json
{
  "user_id": "665a...",
  "student_name": "王小明",
  "notify_type": "leave_approved",
  "message": "【王小明】4/20 鋼琴課請假已核准"
}
```

**支援的 `notify_type`：**

| 類型 | 說明 |
|------|------|
| `leave_approved` | 請假已核准 |
| `leave_rejected` | 請假未通過 |
| `makeup_arranged` | 補課安排通知 |
| `course_change` | 課程異動 |
| `tuition_reminder` | 學費繳費提醒 |
| `tuition_received` | 學費收訖確認 |
| `points_earned` | 點數獲得通知 |
| `broadcast` | 管理員廣播 |

### LIFF 代理 API（LIFF 前端使用）

| Method | Endpoint | 說明 |
|--------|----------|------|
| `GET` | `/api/internal/users/courses` | 課表查詢（代理至主系統） |
| `GET` | `/api/internal/users/points` | 點數查詢（代理至主系統） |
| `POST` | `/api/internal/users/leave` | 請假申請（代理至主系統） |

> 所有 LIFF API 都需要在 Header 中帶上 LINE `id_token`，後端會向 LINE 伺服器驗證身份。

### 管理後台 API

| Method | Endpoint | 說明 |
|--------|----------|------|
| `POST` | `/api/admin/broadcast` | 推播廣播 |
| `GET` | `/api/admin/stats` | 統計數據 |

---

## 🔐 安全機制

| 機制 | 說明 |
|------|------|
| **Internal API Key** | 主系統與 LINE OA 之間透過 `X-Internal-Key` Header 驗證身份 |
| **LINE Webhook 簽名** | 使用 `x-line-signature` 驗證 Webhook 來源確實為 LINE Platform |
| **LIFF id_token 驗證** | LIFF 頁面所有 API 請求都需驗證 LINE 身份令牌 |
| **Bind Token** | 綁定流程使用簽名令牌，防止帳號劫持攻擊 |
| **所有權驗證** | 敏感資料請求需驗證使用者只能存取自己的資料 |
| **速率限制** | 綁定查詢每分鐘最多 5 次，登入嘗試 15 分鐘最多 10 次 |

---

## 🔗 與主系統的整合

本系統**不直接存取主系統資料庫**，所有數據交換透過 Internal API 完成。

主系統 (`titita_onecloud`) 需實作以下 API：

| Endpoint | 說明 |
|----------|------|
| `POST /api/internal/users/lookup-by-phone` | 依電話號碼查詢使用者 |
| `PATCH /api/internal/users/line-binding` | 更新 LINE 綁定狀態 |
| `POST /api/internal/users/lookup-by-line` | 依 LINE ID 反查使用者 |
| `POST /api/internal/users/bound-students` | 查詢綁定的學員清單 |
| `GET /api/internal/users/courses` | 取得學生課表 |
| `GET /api/internal/users/points` | 取得點數紀錄 |

詳細規格請參閱 [`main_system_internal_api_spec.md`](./main_system_internal_api_spec.md)。

---

## 🧑‍💻 開發指南

### 本地開發 (Mock 模式)

如果尚未架設主系統，可以先用 Mock 模式開發：

```env
MOCK_MODE=true
```

Mock 模式下會使用假資料，不需要串接主系統 API，方便前端開發與測試。

### 技術棧

- **框架**：Next.js 16 (App Router)
- **語言**：TypeScript
- **資料庫**：MongoDB (Mongoose)
- **LINE SDK**：@line/bot-sdk、@line/liff
- **樣式**：Tailwind CSS
- **部署**：Docker + Standalone 模式

### Flex Message 風格

所有推播訊息採用統一的 **「Jelly Kids 童趣果凍風」** 設計：
- Header：高飽和底色 (`#FFDF6F`, `#FF9966`, `#66CCCC`, `#F56E4A`)
- Body：圓角淺灰色資訊卡片
- Footer：大圓角按鈕

---

## 📄 相關文件

| 文件 | 說明 |
|------|------|
| [`system_architecture.md`](./system_architecture.md) | 系統架構圖 (含 Mermaid 圖表) |
| [`line_oa_integration_design.md`](./line_oa_integration_design.md) | 整合設計方案與目錄結構說明 |
| [`main_system_internal_api_spec.md`](./main_system_internal_api_spec.md) | 主系統 Internal API 規格書 |

---

## 📝 License

MIT © [oh001738](https://github.com/oh001738)
