import { lookupUsersByLineId } from '@/lib/main-system-client'
import { verifyLineIdToken } from '@/lib/line/verify-id-token'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/line/status?id_token=xxx
 * 查詢目前 LINE 帳號綁定的系統帳號
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const idToken = searchParams.get('id_token')

  if (!idToken) {
    return Response.json(
      { data: null, error: '缺少 id_token 參數' } satisfies ApiResponse<null>,
      { status: 400 }
    )
  }

  try {
    const verified = await verifyLineIdToken(idToken)
    if (!verified) {
      return Response.json(
        { data: null, error: '身份驗證失敗' } satisfies ApiResponse<null>,
        { status: 401 }
      )
    }
    const lineUserId = verified.userId

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
