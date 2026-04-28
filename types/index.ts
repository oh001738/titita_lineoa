import type { Role, NotifyType, NotifyStatus, BindAction, BindOperator } from '@/lib/constants'

// ── LINE 綁定紀錄（LINE OA 自己的 DB）──
export interface LineBindLog {
  _id: string
  user_id: string
  line_user_id: string
  action: BindAction
  operator: BindOperator
  operator_id?: string | null
  phone_used?: string | null
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// ── LINE 推播紀錄（LINE OA 自己的 DB）──
export interface LineNotifyLog {
  _id: string
  user_id: string  // 真實 User ObjectId 字串，或 'admin_test_push' 等特殊識別符
  line_user_id: string
  student_name: string
  notify_type: NotifyType
  message_content: string
  status: NotifyStatus
  error_message?: string | null
  line_request_id?: string | null
  createdAt: string
  updatedAt: string
}

// ── API 回應格式（與主系統一致）──
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// ── 綁定查詢結果（前端顯示用）──
export interface BindLookupUser {
  _id: string
  name: string
  role: Role
  student_name?: string
}

// ── LIFF Profile ──
export interface LiffProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

// ── 推播請求（主系統呼叫 /api/line/notify 時的 body）──
export interface NotifyRequest {
  user_id: string
  line_user_id: string
  student_name: string
  message: string
  notify_type: NotifyType
  payload?: {
    course_name?: string
    date?: string
    reason?: string
    amount?: number      // 點數
    balance?: number     // 點數餘額
    makeup_info?: {
      date: string
      room: string
      teacher: string
    }
  }
}

// ── 廣播請求（主系統呼叫 /api/line/notify/broadcast 時的 body）──
export interface BroadcastRequest {
  recipients: Array<{
    user_id: string
    line_user_id: string
    student_name: string
  }>
  title: string
  message: string
  notify_type?: NotifyType
}
