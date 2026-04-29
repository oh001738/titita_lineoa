import { getLineClient } from '@/lib/line/client'
import { connectDB } from '@/lib/db/mongoose'
import LineProfile from '@/lib/models/LineProfile'
import { checkAdminAuth } from '@/lib/admin-session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/recipients/sync
 * 手動同步指定或所有使用者的 LINE 暱稱
 */
export async function POST(request: Request) {
  const adminId = await checkAdminAuth()
  if (!adminId) {
    return Response.json({ data: null, error: '未經授權' }, { status: 401 })
  }

  try {
    const { line_user_ids } = await request.json()
    if (!line_user_ids || !Array.isArray(line_user_ids)) {
      return Response.json({ data: null, error: '缺少 line_user_ids' }, { status: 400 })
    }

    await connectDB()
    const client = getLineClient()
    const results = []

    // 逐一抓取並更新 (因為數量通常不多，且 LINE 有頻率限制，故序列處理較穩)
    for (const line_id of line_user_ids) {
      try {
        const profile = await client.getProfile(line_id)
        if (profile) {
          await LineProfile.findOneAndUpdate(
            { line_user_id: line_id },
            {
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
              statusMessage: profile.statusMessage,
              lastUpdated: new Date()
            },
            { upsert: true, returnDocument: 'after' }
          )
          results.push({ line_user_id: line_id, success: true, displayName: profile.displayName })
        }
      } catch (err) {
        console.error(`[Sync Profile] Failed for ${line_id}:`, err)
        results.push({ line_user_id: line_id, success: false })
      }
    }

    return Response.json({ data: { results }, error: null })
  } catch (err) {
    return Response.json({ data: null, error: 'Server Error' }, { status: 500 })
  }
}
