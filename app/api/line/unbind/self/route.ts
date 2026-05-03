import { connectDB } from '@/lib/db/mongoose'
import LineBindLog from '@/lib/models/LineBindLog'
import { updateLineBinding } from '@/lib/main-system-client'
import { verifyLineIdToken } from '@/lib/line/verify-id-token'
import { BIND_ACTIONS, BIND_OPERATORS } from '@/lib/constants'
import { getLineClient } from '@/lib/line/client'
import { unbindNotifyMessage } from '@/lib/line/templates'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/line/unbind/self
 * 使用者自行解除 LINE 綁定 (LIFF 呼叫)
 * 安全：驗證 LINE idToken，確保只能解除自己的綁定
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { user_id, id_token, student_name } = body

    if (!user_id || !id_token) {
      return Response.json(
        { data: null, error: '缺少必要資訊' } satisfies ApiResponse<null>,
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

    // 先傳送通知
    try {
      const client = getLineClient()
      await client.pushMessage({
        to: line_user_id,
        messages: [unbindNotifyMessage(student_name || '您的帳號', 'self')]
      })
    } catch (pushErr) {
      console.error('[Self Unbind Push Failed]', pushErr)
    }

    // 2. 透過主系統 Internal API 解除綁定
    const result = await updateLineBinding([user_id], line_user_id, 'unbind')

    if (result.error) {
      return Response.json(
        { data: null, error: result.error } satisfies ApiResponse<null>,
        { status: 500 }
      )
    }

    // 3. 寫入解綁紀錄到 LINE OA 自己的 DB
    await connectDB()
    await LineBindLog.create({
      user_id,
      line_user_id,
      action: BIND_ACTIONS.UNBIND,
      operator: BIND_OPERATORS.SELF,
    })

    return Response.json(
      { data: { success: true }, error: null } satisfies ApiResponse<{ success: boolean }>
    )
  } catch (err) {
    console.error('[Self Unbind] Error:', err)
    return Response.json(
      { data: null, error: '伺服器錯誤' } satisfies ApiResponse<null>,
      { status: 500 }
    )
  }
}
