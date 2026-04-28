# 主系統 Internal API 規格書
> 供主系統團隊預留，給 LINE OA 周圍系統呼叫

---

## 0. 背景

LINE OA 系統作為獨立部署的周圍系統，**不直接連接主系統的 MongoDB**。
所有資料交換透過 Internal API 完成，雙方用 `X-Internal-Key` header 做身份驗證。

```
主系統 (port 3000)          LINE OA 系統 (port 3001)
┌──────────────────┐        ┌──────────────────┐
│                  │        │                  │
│  /api/internal/* │ ←───── │  綁定/查詢需求    │
│  (本文件定義)     │        │                  │
│                  │        │                  │
│  主動呼叫 ───────────────→│  /api/line/notify │
│  notifications.ts│        │  (推播通知)       │
│                  │        │                  │
└──────────────────┘        └──────────────────┘
      各自的 MongoDB              各自的 MongoDB
```

---

## 1. 驗證機制

所有 Internal API 都需要驗證 `X-Internal-Key` header：

```typescript
// 主系統建議的驗證中間邏輯
function validateInternalKey(request: Request): boolean {
  const key = request.headers.get('x-internal-key')
  return key === process.env.INTERNAL_API_KEY
}
```

> [!IMPORTANT]
> `INTERNAL_API_KEY` 兩套系統的 `.env.local` 必須設定相同的值。

---

## 2. 需預留的 API 端點（共 4 支）

### 2.1 根據電話查詢使用者

LINE OA 綁定流程需要用家長手機號碼查詢對應的 User。

```
POST /api/internal/users/lookup-by-phone
```

**Request:**
```json
{
  "phone": "0912345678",
  "roles": ["family", "teacher"]
}
```

**Response (200):**
```json
{
  "data": {
    "users": [
      {
        "_id": "665a...",
        "name": "王小明",
        "role": "family",
        "phone": "0912345678",
        "disabled": false,
        "line_user_id": null,
        "student_name": "王小明",
        "student_id": "665b..."
      },
      {
        "_id": "665c...",
        "name": "王小美",
        "role": "family",
        "phone": "0912345678",
        "disabled": false,
        "line_user_id": null,
        "student_name": "王小美",
        "student_id": "665d..."
      }
    ]
  },
  "error": null
}
```

**Response (404):**
```json
{
  "data": null,
  "error": "查無此手機號碼的帳號"
}
```

**實作提示：**
```typescript
// app/api/internal/users/lookup-by-phone/route.ts
export async function POST(request: Request) {
  if (!validateInternalKey(request)) {
    return Response.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { phone, roles } = await request.json()
  await connectDB()

  // 查 User
  const users = await User.find({
    phone,
    role: { $in: roles },
    disabled: false,
  }).select('_id name role phone line_user_id').lean()

  // 查對應 Student（family 角色）
  const familyIds = users.filter(u => u.role === 'family').map(u => u._id)
  const students = await Student.find({ user_id: { $in: familyIds } })
    .select('user_id student_name').lean()

  const studentMap = new Map(students.map(s => [String(s.user_id), s]))

  const result = users.map(u => ({
    ...u,
    _id: String(u._id),
    student_name: studentMap.get(String(u._id))?.student_name || null,
    student_id: studentMap.get(String(u._id)) ? String(studentMap.get(String(u._id))._id) : null,
  }))

  return Response.json({ data: { users: result }, error: null })
}
```

---

### 2.2 更新使用者的 LINE 綁定資訊

LINE OA 綁定成功後，需要將 `line_user_id` 寫回主系統的 User。

```
PATCH /api/internal/users/line-bindingRequest:
```

**Request:**
```json
{
  "user_ids": ["665a...", "665c..."],
  "line_user_id": "U1234567890abcdef",
  "action": "bind"
}
```

解綁時：
```json
{
  "user_ids": ["665a..."],
  "line_user_id": "U1234567890abcdef",
  "action": "unbind"
}
```

**Response (200):**
```json
{
  "data": {
    "modified_count": 2,
    "users": [
      { "_id": "665a...", "name": "王小明" },
      { "_id": "665c...", "name": "王小美" }
    ]
  },
  "error": null
}
```

**實作提示：**
```typescript
// app/api/internal/users/line-binding/route.ts
export async function PATCH(request: Request) {
  if (!validateInternalKey(request)) {
    return Response.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { user_ids, line_user_id, action } = await request.json()
  await connectDB()

  if (action === 'bind') {
    await User.updateMany(
      { _id: { $in: user_ids } },
      { $set: { line_user_id, line_bound_at: new Date() } }
    )
  } else if (action === 'unbind') {
    await User.updateMany(
      { _id: { $in: user_ids } },
      { $set: { line_user_id: null, line_bound_at: null } }
    )
  }

  const users = await User.find({ _id: { $in: user_ids } })
    .select('_id name').lean()

  return Response.json({
    data: {
      modified_count: users.length,
      users: users.map(u => ({ _id: String(u._id), name: u.name })),
    },
    error: null,
  })
}
```

---

### 2.3 根據 LINE User ID 查詢已綁定使用者

Webhook 收到 unfollow 事件時，需要知道哪些 User 綁了這個 LINE 帳號。
也用於「查詢綁定狀態」的訊息回覆。

```
POST /api/internal/users/lookup-by-line
```

**Request:**
```json
{
  "line_user_id": "U1234567890abcdef"
}
```

**Response (200):**
```json
{
  "data": {
    "users": [
      { "_id": "665a...", "name": "王小明", "role": "family" },
      { "_id": "665c...", "name": "王小美", "role": "family" }
    ]
  },
  "error": null
}
```

**實作提示：**
```typescript
// app/api/internal/users/lookup-by-line/route.ts
export async function POST(request: Request) {
  if (!validateInternalKey(request)) {
    return Response.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { line_user_id } = await request.json()
  await connectDB()

  const users = await User.find({ line_user_id })
    .select('_id name role').lean()

  return Response.json({
    data: { users: users.map(u => ({ ...u, _id: String(u._id) })) },
    error: null,
  })
}
```

---

### 2.4 觸發推播通知（主系統 → LINE OA）

這支 API 在 **LINE OA 系統** 上，不是主系統要開的。
但主系統的 `lib/notifications.ts` 需要呼叫它。

```
POST http://lineoa:3001/api/line/notify
```

**Request:**
```json
{
  "user_id": "665a...",
  "student_name": "王小明",
  "notify_type": "leave_approved",
  "message": "【王小明】4/20 鋼琴課請假已核准，不安排補課"
}
```

**主系統 `lib/notifications.ts` 填入範例：**
```typescript
export async function notifyLeaveRequestResult(
  leaveRequest: LeaveRequestWithRefs,
  action: string
) {
  try {
    const student = await Student.findById(leaveRequest.student_id)
    if (!student) return

    const user = await User.findById(student.user_id).select('line_user_id')
    if (!user?.line_user_id) return  // 沒綁定就不推

    const message = action === 'approve_no_makeup'
      ? `【${student.student_name}】請假已核准，不安排補課`
      : action === 'reject'
        ? `【${student.student_name}】請假申請未通過`
        : `【${student.student_name}】已安排補課`

    await fetch(`${process.env.LINE_OA_URL}/api/line/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': process.env.INTERNAL_API_KEY!,
      },
      body: JSON.stringify({
        user_id: String(user._id),
        student_name: student.student_name,
        notify_type: `leave_${action}`,
        message,
      }),
    })
  } catch (err) {
    console.error('[Notification] Failed:', err)
    // 推播失敗不影響主流程
  }
}
```

---

## 3. 主系統需要新增的環境變數

```bash
# .env.local 新增
INTERNAL_API_KEY=兩套系統共用的密鑰_請用隨機字串
LINE_OA_URL=http://lineoa:3001     # Docker 內部網路用 container name
# 或 LINE_OA_URL=http://localhost:3001  # 本地開發用
```

---

## 4. 主系統需要的程式碼變更清單

| 檔案 | 變更 | 優先度 |
|------|------|--------|
| `app/api/internal/users/lookup-by-phone/route.ts` | **新增** | 🔴 高 |
| `app/api/internal/users/line-binding/route.ts` | **新增** | 🔴 高 |
| `app/api/internal/users/lookup-by-line/route.ts` | **新增** | 🔴 高 |
| `lib/notifications.ts` | **修改**（填入推播呼叫） | 🟡 中 |
| `.env.local` | **新增** `INTERNAL_API_KEY` + `LINE_OA_URL` | 🔴 高 |

> [!TIP]
> 建議把 internal API 都放在 `app/api/internal/` 目錄下，與正常 API 分開管理。
> 未來如果有更多周圍系統（例如 LINE Pay、簡訊系統），都可以走同樣的 internal API 模式。

---

## 5. 安全注意事項

- `X-Internal-Key` 必須足夠長且隨機（建議 32+ 字元）
- `/api/internal/*` 路由**不應該**出現在前端的任何 fetch 呼叫中
- 如果部署在 Docker，兩個 container 走同一 docker network，不需要暴露 internal API 到公網
- 如果不是 Docker 同網路部署，考慮加上 IP 白名單檢查

---

## 6. 當前開發與串接狀態 (2026-04 最新狀態)

LINE OA 系統目前已完成所有前端 UI 流程，並在獨立的 `MOCK_MODE` 下驗證了完整的綁定、查詢與推播邏輯。

**目前等待主系統團隊的實作事項：**
1. 實作上述第 2 節定義的 **3 支核心 API** (`lookup-by-phone`, `line-binding`, `lookup-by-line`)。
2. 決定推播觸發時機，並於主系統適當的地方呼叫 `LINE OA` 系統的 `/api/line/notify` 端點 (實作發送邏輯)。
3. 提供主系統的 `MAIN_SYSTEM_URL` 與統一協定的 `INTERNAL_API_KEY`，供 LINE OA 系統正式連線使用。

**對接測試流程建議：**
1. 主系統啟動本地伺服器 (例: `http://localhost:3000`)。
2. LINE OA 系統關閉 Mock (`MOCK_MODE=false`)，並將 `.env.local` 的 `MAIN_SYSTEM_URL` 指向主系統。
3. 透過 **Pinggy** (`ssh -p 443 -R0:localhost:3001 a.pinggy.io`) 等無警告頁面的穿透工具啟動 LINE OA，實際從手機端點擊 LIFF 進行完整帳號綁定測試。
