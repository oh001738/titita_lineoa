/**
 * 主系統 Internal API Client
 * LINE OA 透過此模組與主系統溝通，不直接存取主系統 DB
 *
 * MOCK_MODE=true 時自動切換至 mock 實作，無需主系統即可開發測試
 */

import {
  mockLookupByPhone,
  mockUpdateBinding,
  mockLookupByLineId,
} from './mock-main-system-client'

const isMockMode = () => process.env.MOCK_MODE === 'true'

const getMainSystemUrl = () => {
  const url = process.env.MAIN_SYSTEM_URL
  if (!url) throw new Error('請在 .env.local 設定 MAIN_SYSTEM_URL')
  return url.replace(/\/$/, '')
}

const getInternalKey = () => {
  const key = process.env.INTERNAL_API_KEY
  if (!key) throw new Error('請在 .env.local 設定 INTERNAL_API_KEY')
  return key
}

interface InternalApiResponse<T> {
  data: T | null
  error: string | null
}

async function callInternal<T>(
  path: string,
  method: string,
  body?: unknown
): Promise<InternalApiResponse<T>> {
  const res = await fetch(`${getMainSystemUrl()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Key': getInternalKey(),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  })

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    console.error(`[callInternal] Non-JSON response from ${path}: HTTP ${res.status}`)
    return { data: null, error: `主系統回應異常 (HTTP ${res.status})` }
  }

  return res.json() as Promise<InternalApiResponse<T>>
}

// ── 型別定義 ──

export interface MainSystemUser {
  _id: string
  name: string
  role: string
  phone: string
  disabled: boolean
  line_user_id: string | null
  student_name: string | null
  student_id: string | null
}

interface LookupByPhoneResult {
  users: MainSystemUser[]
}

interface LineBindingResult {
  modified_count: number
  users: Array<{ _id: string; name: string; student_name: string | null }>
}

interface LookupByLineResult {
  users: Array<{ _id: string; name: string; student_name: string | null; role: string }>
}

interface TeacherStudentsResult {
  students: Array<{ user_id: string; name: string; student_id: string }>
}

interface LeaveRequestResult {
  leave_request_id: string
}

interface AwardPointsResult {
  success: boolean
  log_id: string
}

// ── API 函式 ──

export async function lookupUsersByPhone(
  phone: string,
  roles: string[] = ['family', 'teacher']
): Promise<InternalApiResponse<LookupByPhoneResult>> {
  if (isMockMode()) return mockLookupByPhone(phone, roles) as InternalApiResponse<LookupByPhoneResult>
  return callInternal<LookupByPhoneResult>('/api/internal/users/lookup-by-phone', 'POST', { phone, roles })
}

export async function updateLineBinding(
  userIds: string[],
  lineUserId: string,
  action: 'bind' | 'unbind'
): Promise<InternalApiResponse<LineBindingResult>> {
  if (isMockMode()) return mockUpdateBinding(userIds, lineUserId, action) as InternalApiResponse<LineBindingResult>
  return callInternal<LineBindingResult>('/api/internal/users/line-binding', 'PATCH', {
    user_ids: userIds,
    line_user_id: lineUserId,
    action,
  })
}

export async function getAllLineBindings(): Promise<InternalApiResponse<{ users: MainSystemUser[] }>> {
  if (isMockMode()) {
    return {
      data: {
        users: [
          { _id: 'mock_1', name: '王大同', role: 'family', phone: '0912345678', disabled: false, line_user_id: 'U12345', student_name: '王小明', student_id: 's1' }
        ]
      },
      error: null
    }
  }
  return callInternal<{ users: MainSystemUser[] }>('/api/internal/users/line-binding', 'GET')
}

export async function lookupUsersByLineId(
  lineUserId: string
): Promise<InternalApiResponse<LookupByLineResult>> {
  if (isMockMode()) return mockLookupByLineId(lineUserId) as InternalApiResponse<LookupByLineResult>
  return callInternal<LookupByLineResult>('/api/internal/users/lookup-by-line', 'POST', { line_user_id: lineUserId })
}

export async function getTeacherStudents(
  teacherId: string
): Promise<InternalApiResponse<TeacherStudentsResult>> {
  if (isMockMode()) {
    return {
      data: { students: [{ user_id: 'mock_user_001', name: '王小明 (測試)', student_id: 'mock_student_001' }] },
      error: null,
    }
  }
  return callInternal<TeacherStudentsResult>(
    `/api/internal/users/teacher-students?teacher_id=${teacherId}`,
    'GET'
  )
}

export async function submitLeaveRequest(data: {
  user_id: string
  lesson_id: string
  reason: string
}): Promise<InternalApiResponse<LeaveRequestResult>> {
  if (isMockMode()) {
    return { data: { leave_request_id: 'mock_leave_' + Date.now() }, error: null }
  }
  return callInternal<LeaveRequestResult>('/api/internal/users/leave', 'POST', data)
}

export interface LeaveRequestRecord {
  id: string
  status: 'pending' | 'makeup_arranged' | 'no_makeup' | 'rejected' | 'completed' | 'attendance_confirmed'
  reason: string
  decision_note: string
  course_name: string
  original_date: string | null
  original_start_time: string | null
  original_end_time: string | null
  makeup: { date: string; start_time: string; end_time: string; teacher: string; room: string } | null
  created_at: string | null
}

/** 查詢學生近期請假單與處理進度（LIFF 課表頁「我的請假」分頁） */
export async function getLeaveRequests(
  userId: string
): Promise<InternalApiResponse<LeaveRequestRecord[]>> {
  if (isMockMode()) {
    return {
      data: [
        {
          id: 'mock_lr_1', status: 'makeup_arranged', reason: '感冒', decision_note: '',
          course_name: '進階鋼琴課',
          original_date: '2026-04-24', original_start_time: '18:00', original_end_time: '19:00',
          makeup: { date: '2026-05-08', start_time: '18:00', end_time: '19:00', teacher: '張老師', room: 'A教室' },
          created_at: '2026-04-20T02:00:00.000Z',
        },
        {
          id: 'mock_lr_2', status: 'pending', reason: '家裡有事', decision_note: '',
          course_name: '基礎樂理',
          original_date: '2026-05-03', original_start_time: '14:00', original_end_time: '15:30',
          makeup: null,
          created_at: '2026-04-28T02:00:00.000Z',
        },
      ],
      error: null,
    }
  }
  return callInternal<LeaveRequestRecord[]>(
    `/api/internal/users/leave?user_id=${encodeURIComponent(userId)}`,
    'GET'
  )
}

export async function awardPoints(data: {
  teacher_id: string
  user_id: string
  amount: number
  reason: string
}): Promise<InternalApiResponse<AwardPointsResult>> {
  if (isMockMode()) return { data: { success: true, log_id: 'mock_log_award' }, error: null }
  return callInternal<AwardPointsResult>('/api/internal/points/award', 'POST', data)
}
