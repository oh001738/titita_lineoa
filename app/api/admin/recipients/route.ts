import { getAllLineBindings, updateLineBinding } from '@/lib/main-system-client'
import { connectDB } from '@/lib/db/mongoose'
import LineBindLog from '@/lib/models/LineBindLog'
import { BIND_ACTIONS, BIND_OPERATORS } from '@/lib/constants'
import { getLineClient } from '@/lib/line/client'
import { unbindNotifyMessage } from '@/lib/line/templates'
import { checkAdminAuth } from '@/lib/admin-session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const adminId = await checkAdminAuth()
  if (!adminId) {
    return Response.json({ data: null, error: '未經授權' }, { status: 401 })
  }

  try {
    const result = await getAllLineBindings()
    if (!result.data?.users) return Response.json(result)

    await connectDB()
    const users = result.data.users

    // 取得所有 user_id 列表
    const userIds = users.map(u => u._id)
    
    // 從 LineBindLog 找出這些使用者的 line_name (取最後一筆有紀錄的)
    const logs = await LineBindLog.find({ 
      user_id: { $in: userIds },
      line_name: { $ne: null }
    }).sort({ createdAt: -1 }).lean()

    const lineNameMap = new Map()
    logs.forEach((log: any) => {
      const uid = log.user_id.toString()
      if (!lineNameMap.has(uid)) {
        lineNameMap.set(uid, log.line_name)
      }
    })

    const enrichedUsers = users.map(u => ({
      ...u,
      line_name: lineNameMap.get(u._id.toString()) || null
    }))

    return Response.json({ data: { users: enrichedUsers }, error: null })
  } catch (err) {
    console.error('[Admin Recipients GET] Error:', err)
    return Response.json({ data: null, error: 'Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const adminId = await checkAdminAuth()
  if (!adminId) {
    return Response.json({ data: null, error: '未經授權' }, { status: 401 })
  }

  try {
    const { user_id, line_user_id, name } = await request.json()
    if (!user_id || !line_user_id) {
      return Response.json({ data: null, error: '缺少必要資訊' }, { status: 400 })
    }

    // 先傳送通知
    try {
      const client = getLineClient()
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
