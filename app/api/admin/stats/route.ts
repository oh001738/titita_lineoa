import { connectDB } from '@/lib/db/mongoose'
import LineBindLog from '@/lib/models/LineBindLog'
import LineNotifyLog from '@/lib/models/LineNotifyLog'
import { BIND_ACTIONS, NOTIFY_STATUS } from '@/lib/constants'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/stats
 * 取得管理後台概覽數據
 */
export async function GET() {
  // 這裡應有管理員驗證邏輯
  // 基於「不依賴主系統」原則，這裡未來可實作簡單的獨立密碼驗證
  
  try {
    await connectDB()

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      totalBindings,
      todayBindings,
      totalNotifies,
      todayNotifies,
      failedNotifies
    ] = await Promise.all([
      LineBindLog.countDocuments({ action: BIND_ACTIONS.BIND }),
      LineBindLog.countDocuments({ action: BIND_ACTIONS.BIND, createdAt: { $gte: startOfToday } }),
      LineNotifyLog.countDocuments({}),
      LineNotifyLog.countDocuments({ createdAt: { $gte: startOfToday } }),
      LineNotifyLog.countDocuments({ status: NOTIFY_STATUS.FAILED })
    ])

    return Response.json({
      data: {
        total_bindings: totalBindings,
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
