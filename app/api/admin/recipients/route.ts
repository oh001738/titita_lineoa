import { connectDB } from '@/lib/db/mongoose'
import LineBindLog from '@/lib/models/LineBindLog'
import { BIND_ACTIONS } from '@/lib/constants'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/recipients
 * 取得所有「目前有效綁定」的 LINE 使用者清單
 */
export async function GET() {
  try {
    await connectDB()

    // 透過聚合查詢找出所有目前處於「綁定」狀態的唯一 LINE 使用者
    // 邏輯：按 line_user_id 分組，取出最後一筆 action，若為 bind 則視為有效
    const activeBindings = await LineBindLog.aggregate([
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: '$line_user_id',
          lastAction: { $last: '$action' },
          userId: { $last: '$user_id' },
          line_name: { $last: '$line_name' },
          student_name: { $last: '$student_name' },
          phone: { $last: '$phone_used' },
          updatedAt: { $last: '$createdAt' }
        }
      },
      { $match: { lastAction: BIND_ACTIONS.BIND } }
    ])

    return Response.json({
      data: activeBindings.map(b => ({
        line_user_id: b._id,
        user_id: b.userId,
        line_name: b.line_name,
        student_name: b.student_name,
        last_updated: b.updatedAt
      })),
      error: null
    })
  } catch (err) {
    console.error('[Recipients API] Error:', err)
    return Response.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}
