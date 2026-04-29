import { connectDB } from '@/lib/db/mongoose'
import LineBindLog from '@/lib/models/LineBindLog'
import { checkAdminAuth } from '@/lib/admin-session'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const adminId = await checkAdminAuth()
  if (!adminId) {
    return Response.json({ data: null, error: '未經授權' }, { status: 401 })
  }

  try {
    await connectDB()
    const logs = await LineBindLog.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    return Response.json({ data: logs, error: null })
  } catch (err) {
    return Response.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}
