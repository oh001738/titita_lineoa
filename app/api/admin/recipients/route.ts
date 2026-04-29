import { getAllLineBindings, updateLineBinding } from '@/lib/main-system-client'
import { connectDB } from '@/lib/db/mongoose'
import LineBindLog from '@/lib/models/LineBindLog'
import { BIND_ACTIONS, BIND_OPERATORS } from '@/lib/constants'
import { client } from '@/lib/line/config'
import { unbindNotifyMessage } from '@/lib/line/templates'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await getAllLineBindings()
    return Response.json(result)
  } catch (err) {
    return Response.json({ data: null, error: 'Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { user_id, line_user_id, name } = await request.json()
    if (!user_id || !line_user_id) {
      return Response.json({ data: null, error: '缺少必要資訊' }, { status: 400 })
    }

    // 先傳送通知
    try {
      await client.pushMessage({
        to: line_user_id,
        messages: [unbindNotifyMessage(name || '系統成員', 'admin')]
      })
    } catch (pushErr) {
      console.error('[Admin Unbind Push Failed]', pushErr)
    }

    const result = await updateLineBinding([user_id], line_user_id, 'unbind')
    if (result.error) {
      return Response.json({ data: null, error: result.error }, { status: 500 })
    }

    // 紀錄解綁
    await connectDB()
    await LineBindLog.create({
      user_id,
      line_user_id,
      action: BIND_ACTIONS.UNBIND,
      operator: BIND_OPERATORS.ADMIN,
    })

    return Response.json({ data: { success: true }, error: null })
  } catch (err) {
    return Response.json({ data: null, error: 'Server Error' }, { status: 500 })
  }
}
