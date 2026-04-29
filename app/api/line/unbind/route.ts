import { connectDB } from '@/lib/db/mongoose'
import LineBindLog from '@/lib/models/LineBindLog'
import { BIND_ACTIONS, BIND_OPERATORS } from '@/lib/constants'
import { updateLineBinding } from '@/lib/main-system-client'
import { getLineClient } from '@/lib/line/client'
import { unbindNotifyMessage } from '@/lib/line/templates'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/line/unbind
 * 管理員（或主系統）解除指定使用者的 LINE 綁定
 * Headers: X-Internal-Key
 * Body: { user_id, line_user_id, student_name? }
 */
export async function POST(request: Request) {
  const internalKey = process.env.INTERNAL_API_KEY
  const providedKey = request.headers.get('x-internal-key')

  if (!internalKey || providedKey !== internalKey) {
    return Response.json(
      { data: null, error: 'Unauthorized' } satisfies ApiResponse<null>,
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { user_id, line_user_id, student_name } = body

    if (!user_id || !line_user_id) {
      return Response.json(
        { data: null, error: '缺少必要參數' } satisfies ApiResponse<null>,
        { status: 400 }
      )
    }

    // 1. 推播解綁通知（需在清除 line_user_id 之前發送）
    try {
      const client = getLineClient()
      await client.pushMessage({
        to: line_user_id,
        messages: [unbindNotifyMessage(student_name || '學生帳號', 'admin')],
      })
    } catch (pushErr) {
      console.error('[Admin Unbind Push Failed]', pushErr)
    }

    // 2. 呼叫主系統進行解綁
    const result = await updateLineBinding([user_id], line_user_id, 'unbind')
    if (result.error) {
      return Response.json(
        { data: null, error: result.error } satisfies ApiResponse<null>,
        { status: 500 }
      )
    }

    // 3. 紀錄解綁日誌
    await connectDB()
    await LineBindLog.create({
      user_id,
      line_user_id,
      action: BIND_ACTIONS.UNBIND,
      operator: BIND_OPERATORS.ADMIN,
    })

    return Response.json(
      { data: { success: true }, error: null } satisfies ApiResponse<{ success: boolean }>
    )
  } catch (err) {
    console.error('[Unbind API] Error:', err)
    return Response.json(
      { data: null, error: '解除綁定失敗' } satisfies ApiResponse<null>,
      { status: 500 }
    )
  }
}
