import { connectDB } from '@/lib/db/mongoose'
import LineNotifyLog from '@/lib/models/LineNotifyLog'
import { checkAdminAuth } from '@/lib/admin-session'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/logs/notify
 * 查詢推播紀錄，支援分頁與篩選
 *
 * Query params:
 *   page       = 頁碼（預設 1）
 *   limit      = 每頁筆數（預設 50，最大 200）
 *   status     = sent | failed | pending | skipped
 *   notify_type = leave_approved | ... | broadcast
 *   user_id    = 篩選特定 user
 *   date_from  = ISO 日期字串（含）
 *   date_to    = ISO 日期字串（含）
 */
export async function GET(request: Request) {
  const adminId = await checkAdminAuth()
  if (!adminId) {
    return Response.json({ data: null, error: '未經授權' }, { status: 401 })
  }

  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    const filter: Record<string, any> = {}

    const status = searchParams.get('status')
    if (status) filter.status = status

    const notifyType = searchParams.get('notify_type')
    if (notifyType) filter.notify_type = notifyType

    const userId = searchParams.get('user_id')
    if (userId) filter.user_id = userId

    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    if (dateFrom || dateTo) {
      filter.createdAt = {}
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom)
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        filter.createdAt.$lte = to
      }
    }

    const [logs, total] = await Promise.all([
      LineNotifyLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      LineNotifyLog.countDocuments(filter),
    ])

    return Response.json({
      data: {
        logs,
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit),
        },
      },
      error: null,
    })
  } catch (err) {
    return Response.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}
