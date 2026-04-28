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
          phone: { $last: '$phone_used' },
          updatedAt: { $last: '$createdAt' }
        }
      },
      { $match: { lastAction: BIND_ACTIONS.BIND } }
    ])

    // 注意：因為 LINE OA 沒存學生姓名（存的是 user_id），
    // 這裡回傳的基本資訊僅供 Admin 參考。
    // 在正式環境中，可能還需要透過主系統 Client 批量查詢姓名。
    
    return Response.json({
      data: activeBindings.map(b => ({
        line_user_id: b._id,
        user_id: b.userId,
        last_updated: b.updatedAt
      })),
      error: null
    })
  } catch (err) {
    console.error('[Recipients API] Error:', err)
    return Response.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}
