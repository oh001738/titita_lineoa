// ── 角色常數（與主系統一致）──
export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  FAMILY: 'family',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// ── LINE 綁定操作類型 ──
export const BIND_ACTIONS = {
  BIND: 'bind',
  UNBIND: 'unbind',
} as const

export type BindAction = typeof BIND_ACTIONS[keyof typeof BIND_ACTIONS]

// ── LINE 綁定操作者 ──
export const BIND_OPERATORS = {
  SELF: 'self',
  ADMIN: 'admin',
} as const

export type BindOperator = typeof BIND_OPERATORS[keyof typeof BIND_OPERATORS]

// ── LINE 推播通知類型 ──
export const NOTIFY_TYPES = {
  LEAVE_REQUESTED: 'leave_requested',  // 學生送出請假 → 通知授課老師與管理員
  LEAVE_APPROVED: 'leave_approved',
  LEAVE_REJECTED: 'leave_rejected',
  MAKEUP_ARRANGED: 'makeup_arranged',
  COURSE_CHANGE: 'course_change',
  NEW_TERM: 'new_term',
  TERM_EXPIRING: 'term_expiring',
  TUITION_REMINDER: 'tuition_reminder',
  TUITION_RECEIVED: 'tuition_received',
  TUITION_NOTICE: 'tuition_notice',
  CLASS_REMINDER: 'class_reminder',
  POINTS_EARNED: 'points_earned',
  BROADCAST: 'broadcast',
  BIND_SUCCESS: 'bind_success',
} as const

export type NotifyType = typeof NOTIFY_TYPES[keyof typeof NOTIFY_TYPES]

// ── 推播狀態 ──
export const NOTIFY_STATUS = {
  SENT: 'sent',
  FAILED: 'failed',
  PENDING: 'pending',
  SKIPPED: 'skipped', // 系統開關關閉時跳過
} as const

export type NotifyStatus = typeof NOTIFY_STATUS[keyof typeof NOTIFY_STATUS]

// ── 電話號碼格式化（台灣手機）──
export function normalizePhone(phone: string): string {
  // 移除所有非數字字元
  const digits = phone.replace(/\D/g, '')
  // +886 開頭轉 0 開頭
  if (digits.startsWith('886') && digits.length === 12) {
    return '0' + digits.slice(3)
  }
  return digits
}

// ── 速率限制常數 ──
export const RATE_LIMIT = {
  BIND_LOOKUP_MAX: 5,        // 每分鐘最多查詢次數
  BIND_LOOKUP_WINDOW: 60000, // 視窗大小 (ms)
  LOGIN_MAX: 10,             // 15 分鐘內最多嘗試次數
  LOGIN_WINDOW: 15 * 60 * 1000,
} as const
