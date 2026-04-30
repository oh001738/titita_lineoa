# 主系統 Internal API 規格書
> 供主系統團隊預留，給 LINE OA 周圍系統呼叫

---

## 0. 背景

LINE OA 系統作為獨立部署的周圍系統，**不直接連接主系統的 MongoDB**。
所有資料交換透過 Internal API 完成，雙方用 `X-Internal-Key` header 做身份驗證。

---

## 1. 驗證機制

所有 Internal API 都需要驗證 `X-Internal-Key` header：

```typescript
function validateInternalKey(request: Request): boolean {
  const key = request.headers.get('x-internal-key')
  return key === process.env.INTERNAL_API_KEY
}
```

---

## 2. API 端點清單

### 2.1 帳號與綁定
*   `POST /api/internal/users/lookup-by-phone`: 根據電話查詢 User。
*   `PATCH /api/internal/users/line-binding`: 更新 `line_user_id` (綁定/解綁)。
*   `POST /api/internal/users/lookup-by-line`: 根據 LINE ID 反查已綁定 User。
*   `POST /api/internal/users/bound-students`: 查詢該 LINE 帳號下所有已綁定的學員姓名。

### 2.2 業務數據 (LIFF 代理)
*   `GET /api/internal/users/courses`: 取得特定學生的課表。
*   `GET /api/internal/users/points`: 取得特定學生的積點餘額與歷史紀錄。
*   `POST /api/internal/users/leave`: 提交請假申請。

### 2.3 教師功能 (LIFF 代理)
*   `GET /api/internal/users/teacher-students`: 取得該教師授課的所有學生清單。
*   `POST /api/internal/points/award`: 代理教師發放積點。

---

## 3. 推播通知 (反向呼叫)

主系統在 `lib/notifications.ts` 中觸發，呼叫 LINE OA 系統：
`POST http://lineoa:3001/api/line/notify`

**Payload 範例：**
```json
{
  "user_id": "665a...",
  "student_name": "王小明",
  "notify_type": "leave_approved",
  "message": "【王小明】4/20 鋼琴課請假已核准"
}
```

---

## 4. 當前狀態

所有上述 API 已在 `titita_onecloud` 中實作完成。
雙向串接已測試通過，系統進入正式運行狀態。
