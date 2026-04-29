import { getAllLineBindings, updateLineBinding } from '@/lib/main-system-client'
import { connectDB } from '@/lib/db/mongoose'
import LineBindLog from '@/lib/models/LineBindLog'
import { BIND_ACTIONS, BIND_OPERATORS } from '@/lib/constants'

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
    const { user_id, line_user_id } = await request.json()
    if (!user_id || !line_user_id) {
      return Response.json({ data: null, error: '缺少必要資訊' }, { status: 400 })
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
