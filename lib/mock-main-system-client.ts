/**
 * 主系統 Internal API 的 Mock 實作
 * MOCK_MODE=true 時使用，開發期不需要主系統即可測試
 */

import type { MainSystemUser } from './main-system-client'

export const MOCK_USERS: MainSystemUser[] = [
  {
    _id: 'mock_user_001',
    name: '王小明',
    role: 'family',
    phone: '0912345678',
    disabled: false,
    line_user_id: null,
    student_name: '王小明',
    student_id: 'mock_student_001',
  },
  {
    _id: 'mock_user_002',
    name: '王小美',
    role: 'family',
    phone: '0912345678',
    disabled: false,
    line_user_id: null,
    student_name: '王小美',
    student_id: 'mock_student_002',
  },
  {
    _id: 'mock_user_003',
    name: '李老師',
    role: 'teacher',
    phone: '0922333444',
    disabled: false,
    line_user_id: null,
    student_name: null,
    student_id: null,
  },
]

// 記憶體綁定狀態（重啟清除）
export const mockBindings = new Map<string, string>() // user_id → line_user_id

export function mockLookupByPhone(phone: string, roles: string[]) {
  const matched = MOCK_USERS.filter(
    (u) => u.phone === phone && roles.includes(u.role) && !u.disabled
  )
  if (matched.length === 0) {
    return { data: null, error: '查無此手機號碼的帳號' }
  }
  return { data: { users: matched }, error: null }
}

export function mockUpdateBinding(userIds: string[], lineUserId: string, action: 'bind' | 'unbind') {
  console.log(`[Mock] updateLineBinding: ${action}, users: ${userIds}, line: ${lineUserId}`)
  const users = MOCK_USERS.filter((u) => userIds.includes(u._id))

  if (action === 'bind') {
    users.forEach((u) => {
      u.line_user_id = lineUserId
      mockBindings.set(u._id, lineUserId)
    })
  } else {
    users.forEach((u) => {
      u.line_user_id = null
      mockBindings.delete(u._id)
    })
  }

  return {
    data: {
      modified_count: users.length,
      users: users.map((u) => ({ _id: u._id, name: u.name })),
    },
    error: null,
  }
}

export function mockLookupByLineId(lineUserId: string) {
  console.log(`[Mock] lookupUsersByLineId: ${lineUserId}`)
  const boundUserIds = Array.from(mockBindings.entries())
    .filter(([, lid]) => lid === lineUserId)
    .map(([uid]) => uid)

  const users = MOCK_USERS.filter(
    (u) => boundUserIds.includes(u._id) || u.line_user_id === lineUserId
  ).map((u) => ({ _id: u._id, name: u.name, role: u.role }))

  return { data: { users }, error: null }
}
