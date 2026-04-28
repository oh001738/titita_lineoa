import { lookupUsersByLineId } from '@/lib/main-system-client'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/line/status?line_user_id=xxx
 * 查詢目前 LINE 帳號綁定的系統帳號
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lineUserId = searchParams.get('line_user_id')

  if (!lineUserId) {
    return Response.json(
      { data: null, error: '缺少 line_user_id' } satisfies ApiResponse<null>,
      { status: 400 }
    )
  }

  try {
    const result = await lookupUsersByLineId(lineUserId)
    return Response.json(result)
  } catch (err) {
    console.error('[Status API] Error:', err)
    return Response.json(
      { data: null, error: '伺服器錯誤' } satisfies ApiResponse<null>,
      { status: 500 }
    )
  }
}
