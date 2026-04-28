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
  })
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

export async function awardPoints(data: {
  teacher_id: string
  user_id: string
  amount: number
  reason: string
}): Promise<InternalApiResponse<AwardPointsResult>> {
  if (isMockMode()) return { data: { success: true, log_id: 'mock_log_award' }, error: null }
  return callInternal<AwardPointsResult>('/api/internal/points/award', 'POST', data)
}
