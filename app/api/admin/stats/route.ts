import { connectDB } from '@/lib/db/mongoose'
import LineBindLog from '@/lib/models/LineBindLog'
import LineNotifyLog from '@/lib/models/LineNotifyLog'
import { BIND_ACTIONS, NOTIFY_STATUS } from '@/lib/constants'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

async function fetchLineQuota(): Promise<{ quota: number | null; consumption: number | null }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return { quota: null, consumption: null }

  try {
    const [quotaRes, consumptionRes] = await Promise.all([
      fetch('https://api.line.me/v2/bot/message/quota', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch('https://api.line.me/v2/bot/message/quota/consumption', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])

    const quotaData = quotaRes.ok ? await quotaRes.json() : null
    const consumptionData = consumptionRes.ok ? await consumptionRes.json() : null

    // LINE 免費方案 quota type 為 "limited"，value 是上限；付費方案為 "unlimited"
    const quota = quotaData?.type === 'limited' ? quotaData.value : null
    const consumption = consumptionData?.totalUsage ?? null

    return { quota, consumption }
  } catch {
    return { quota: null, consumption: null }
  }
}

/**
 * GET /api/admin/stats
 * 取得管理後台概覽數據（含 LINE 額度）
 */
export async function GET() {
  try {
    await connectDB()

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      totalBindings,
      todayBindings,
      totalNotifies,
      todayNotifies,
      failedNotifies,
      lineQuota,
    ] = await Promise.all([
      LineBindLog.countDocuments({ action: BIND_ACTIONS.BIND }),
      LineBindLog.countDocuments({ action: BIND_ACTIONS.BIND, createdAt: { $gte: startOfToday } }),
      LineNotifyLog.countDocuments({}),
      LineNotifyLog.countDocuments({ createdAt: { $gte: startOfToday } }),
      LineNotifyLog.countDocuments({ status: NOTIFY_STATUS.FAILED }),
      fetchLineQuota(),
    ])

    return Response.json({
      data: {
        total_bindings: totalBindings,
        today_bindings: todayBindings,
        total_notifies: totalNotifies,
        today_notifies: todayNotifies,
        failed_notifies: failedNotifies,
        line_quota: lineQuota.quota,           // 本月總額度（免費方案有上限；付費方案為 null）
        line_consumption: lineQuota.consumption, // 本月已發送數
      },
      error: null,
    } satisfies ApiResponse<object>)
  } catch (err) {
    console.error('[Admin Stats] Error:', err)
    return Response.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}
