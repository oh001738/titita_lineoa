import { connectDB } from '@/lib/db/mongoose'
import LineBindLog from '@/lib/models/LineBindLog'
import LineNotifyLog from '@/lib/models/LineNotifyLog'
import { BIND_ACTIONS, NOTIFY_STATUS } from '@/lib/constants'
import { checkAdminAuth } from '@/lib/admin-session'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/stats
 * 取得管理後台概覽數據
 */
export async function GET() {
  const adminId = await checkAdminAuth()
  if (!adminId) {
    return Response.json({ data: null, error: '未經授權' }, { status: 401 })
  }

  try {
    await connectDB()

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      activeBindingsCount,
      todayBindings,
      totalNotifies,
      todayNotifies,
      failedNotifies
    ] = await Promise.all([
      // 1. 總綁定人數：計算目前處於「已綁定」狀態的唯一 (user_id + line_user_id) 對數
      LineBindLog.aggregate([
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: { user_id: '$user_id', line_user_id: '$line_user_id' },
            lastAction: { $last: '$action' }
          }
        },
        { $match: { lastAction: BIND_ACTIONS.BIND } },
        { $count: 'count' }
      ]).then(res => res[0]?.count || 0),

      // 2. 今日新增綁定：今日有發生過 BIND 動作的唯一對數（排除重複操作）
      LineBindLog.aggregate([
        { $match: { action: BIND_ACTIONS.BIND, createdAt: { $gte: startOfToday } } },
        {
          $group: {
            _id: { user_id: '$user_id', line_user_id: '$line_user_id' }
          }
        },
        { $count: 'count' }
      ]).then(res => res[0]?.count || 0),

      LineNotifyLog.countDocuments({}),
      LineNotifyLog.countDocuments({ createdAt: { $gte: startOfToday } }),
      LineNotifyLog.countDocuments({ status: NOTIFY_STATUS.FAILED })
    ])

    return Response.json({
      data: {
        total_bindings: activeBindingsCount,
        today_bindings: todayBindings,
        total_notifies: totalNotifies,
        today_notifies: todayNotifies,
        failed_notifies: failedNotifies,
      },
      error: null
    })
  } catch (err) {
    console.error('[Admin Stats] Error:', err)
    return Response.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}
