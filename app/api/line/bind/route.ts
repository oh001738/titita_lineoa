import { connectDB } from '@/lib/db/mongoose'
import LineBindLog from '@/lib/models/LineBindLog'
import { normalizePhone, BIND_ACTIONS, BIND_OPERATORS, NOTIFY_TYPES } from '@/lib/constants'
import { updateLineBinding } from '@/lib/main-system-client'
import { verifyLineIdToken } from '@/lib/line/verify-id-token'
import { verifyBindToken } from '@/lib/bind-token'
import { pushMessage } from '@/lib/line/push'
import { bindSuccessMessage } from '@/lib/line/templates'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/line/bind
 * 確認綁定：透過主系統 Internal API 寫入 line_user_id
 * 安全：驗證 LINE idToken，確保是本人操作
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { user_ids, id_token, phone, bind_token } = body

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return Response.json(
        { data: null, error: '請選擇要綁定的帳號' } satisfies ApiResponse<null>,
        { status: 400 }
      )
    }

    if (!id_token || !bind_token) {
      return Response.json(
        { data: null, error: '缺少必要驗證資訊' } satisfies ApiResponse<null>,
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
    const line_user_id = verified.userId

    // 2. 驗證 bind_token：確保 user_ids 全部在手機查詢結果的准許列表內
    const bindTokenResult = await verifyBindToken(bind_token, user_ids, line_user_id)
    if (!bindTokenResult.valid) {
      console.warn('[Bind] bind_token verification failed:', bindTokenResult.error)
      return Response.json(
        { data: null, error: bindTokenResult.error || '綁定驗證失敗，請重新查詢手機號碼' } satisfies ApiResponse<null>,
        { status: 403 }
      )
    }

    const normalizedPhone = normalizePhone(phone || '')

    // 3. 透過主系統 Internal API 更新 line_user_id
    const result = await updateLineBinding(user_ids, line_user_id, 'bind')

    if (result.error || !result.data) {
      return Response.json(
        { data: null, error: result.error || '綁定失敗' } satisfies ApiResponse<null>,
        { status: 500 }
      )
    }

    const { users } = result.data

    // 3. 寫入綁定紀錄到 LINE OA 自己的 DB
    await connectDB()
    const line_name = verified.name || 'LINE 使用者'
    const bindLogs = users.map((u) => ({
      user_id: u._id,
      line_user_id,
      line_name,
      // 優先使用主系統回傳的學生姓名，老師帳號則 fallback 到帳號名稱
      student_name: u.student_name || u.name || '未命名',
      action: BIND_ACTIONS.BIND,
      operator: BIND_OPERATORS.SELF,
      phone_used: normalizedPhone,
    }))
    await LineBindLog.insertMany(bindLogs)

    // 4. 推播綁定成功訊息
    const studentNames = users.map((u) => u.name || '未命名')
    await pushMessage({
      lineUserId: line_user_id,
      userId: users[0]._id,
      studentName: studentNames.join('、'),
      notifyType: NOTIFY_TYPES.BIND_SUCCESS,
      messages: [bindSuccessMessage(studentNames)],
      messageContent: `綁定成功：${studentNames.join('、')}`,
    })

    return Response.json(
      {
        data: { bound_count: users.length, names: studentNames },
        error: null,
      } satisfies ApiResponse<{ bound_count: number; names: string[] }>,
      { status: 200 }
    )
  } catch (err) {
    console.error('[Bind] Error:', err)
    return Response.json(
      { data: null, error: '伺服器錯誤' } satisfies ApiResponse<null>,
      { status: 500 }
    )
  }
}
