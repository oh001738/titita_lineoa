# LINE OA 整合系統 — 架構設計圖

本文件記錄 `titita_lineoa` (LINE 模組) 與 `titita_onecloud` (主管理系統) 之間的元件互動架構。

## 1. 系統交互總覽

```mermaid
graph TD
    subgraph "LINE 生態圈"
        User["使用者 (家長/學生)"]
        LINE_App["LINE App (對話視窗 / LIFF)"]
        LINE_Platform["LINE Messaging API 平台"]
    end

    subgraph "LINE OA 系統 (titita_lineoa)"
        LOA_API["LINE OA API <br/>(Next.js)"]
        LOA_DB[("LINE OA DB <br/>(MongoDB) <br/>紀錄日誌、設定、快取")]
        LIFF_App["LIFF 前端 <br/>(查課表、點數、綁定)"]
        Admin_Panel["管理員後台 <br/>(廣播、紀錄查看、統計)"]
    end

    subgraph "主管理系統 (titita_onecloud)"
        Main_API["主系統 Internal API <br/>(Next.js)"]
        Main_DB[("主系統 DB <br/>(MongoDB) <br/>學員資料、排課、點數")]
    end

    %% 使用者互動
    User <--> LINE_App
    LINE_App <--> LINE_Platform

    %% LINE 平台與 LINE OA 溝通
    LINE_Platform -- "1. Webhook (訊息/事件)" --> LOA_API
    LOA_API -- "2. Push/Reply Message" --> LINE_Platform

    %% LINE OA 與主系統溝通 (雙向)
    LOA_API -- "3. 查詢/綁定學員資料 <br/>(Internal API Proxy)" --> Main_API
    Main_API -- "4. 發送推播請求 <br/>(例: 調課通知)" --> LOA_API

    %% LIFF 互動
    LINE_App -- "5. 開啟 LIFF" --> LIFF_App
    LIFF_App -- "6. 呼叫 API (需驗證 id_token)" --> LOA_API

    %% 管理後台
    Admin_Panel -- "管理操作" --> LOA_API

    %% 資料庫存取
    LOA_API <--> LOA_DB
    Main_API <--> Main_DB

    %% 樣式設定
    style LOA_API fill:#f9f,stroke:#333,stroke-width:2px
    style Main_API fill:#bbf,stroke:#333,stroke-width:2px
    style LOA_DB fill:#fcc,stroke:#333
    style Main_DB fill:#ccf,stroke:#333
    style LINE_Platform fill:#dfd,stroke:#333
```

## 2. 核心元件說明

### 2.1 LINE OA 系統 (titita_lineoa)
*   **職責**：作為橋樑，處理 LINE 平台的所有 Webhook、推送 Push Message、以及託管 LIFF 頁面。
*   **獨立資料庫**：擁有獨立的 MongoDB，用於儲存推播日誌 (`LineNotifyLog`)、綁定日誌 (`LineBindLog`) 與系統設定。
*   **管理後台**：提供管理員進行「全體/多選廣播」以及查看所有發送紀錄與統計。

### 2.2 主管理系統 (titita_onecloud)
*   **職責**：補習班的核心營運系統，包含學員、課程、點數、學費等真實數據。
*   **Internal API**：不對外公開，專供 `titita_lineoa` 進行數據交換。
*   **觸發通知**：在 `lib/notifications.ts` 中，當業務邏輯（如請假被核准）完成時，主動呼叫 `titita_lineoa` 的推播端點。

### 2.3 安全機制
*   **Internal Key**：雙方系統透過 `X-Internal-Key` 進行身份驗證，確保 API 呼叫安全。
*   **LIFF 驗證**：LIFF 前端呼叫 LINE OA API 時，皆需夾帶 `id_token`，後端會向 LINE 伺服器驗證身份後才進行代理請求。
