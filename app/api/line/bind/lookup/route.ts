import { normalizePhone, RATE_LIMIT } from '@/lib/constants'
import { lookupUsersByPhone } from '@/lib/main-system-client'
import { verifyLineIdToken } from '@/lib/line/verify-id-token'
import { isRateLimited } from '@/lib/rate-limit'
import { createBindToken } from '@/lib/bind-token'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/line/bind/lookup
 * 用電話號碼查詢可綁定的使用者清單
 * 安全：驗證 LINE idToken（避免偽造 userId）+ 速率限制（防枚舉）
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone, id_token } = body

    if (!phone || !id_token) {
      return Response.json(
        { data: null, error: '請提供手機號碼' } satisfies ApiResponse<null>,
        { status: 400 }
      )
    }

    // 1. 驗證 LINE idToken，取得已驗證的 userId
    const verified = await verifyLineIdToken(id_token)
    if (!verified) {
      return Response.json(
        { data: null, error: '身份驗證失敗，請重新開啟頁面' } satisfies ApiResponse<null>,
        { status: 401 }
      )
    }
    const lineUserId = verified.userId

    // 2. 速率限制：以 lineUserId 為 key，防止暴力枚舉手機號碼
    if (isRateLimited(lineUserId, RATE_LIMIT.BIND_LOOKUP_MAX, RATE_LIMIT.BIND_LOOKUP_WINDOW)) {
      return Response.json(
        { data: null, error: '查詢過於頻繁，請稍候再試' } satisfies ApiResponse<null>,
        { status: 429 }
      )
    }

    // 3. 手機號碼格式驗證
    const normalizedPhone = normalizePhone(phone)
    if (!/^09\d{8}$/.test(normalizedPhone)) {
      return Response.json(
        { data: null, error: '請輸入正確的手機號碼格式（例：0912345678）' } satisfies ApiResponse<null>,
        { status: 400 }
      )
    }

    // 4. 查詢主系統
    const result = await lookupUsersByPhone(normalizedPhone, ['family', 'teacher'])

    if (result.error || !result.data) {
      return Response.json(
        { data: null, error: result.error || '查無此手機號碼的帳號，請確認號碼是否正確，或聯絡補習班管理員。' } satisfies ApiResponse<null>,
        { status: 404 }
      )
    }

    const users = result.data.users
    if (users.length === 0) {
      return Response.json(
        { data: null, error: '查無此手機號碼的帳號，請確認號碼是否正確，或聯絡補習班管理員。' } satisfies ApiResponse<null>,
        { status: 404 }
      )
    }

    const lookupUsers = users.map((u) => ({
      _id: u._id,
      name: u.name,
      role: u.role as 'family' | 'teacher' | 'admin',
      student_name: u.student_name || undefined,
    }))

    // 產生加密的 bind_token，鎖定此次查詢准許綁定的 ID 列表
    const allowedIds = lookupUsers.map(u => u._id)
    const bindToken = await createBindToken(allowedIds, lineUserId)

    return Response.json({ data: { users: lookupUsers, bind_token: bindToken }, error: null })
  } catch (err) {
    console.error('[Bind Lookup] Error:', err)
    return Response.json(
      { data: null, error: '伺服器錯誤' } satisfies ApiResponse<null>,
      { status: 500 }
    )
  }
}
