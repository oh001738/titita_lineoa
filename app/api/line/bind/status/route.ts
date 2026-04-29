import { NextResponse } from 'next/server'
import { lookupUsersByLineId } from '@/lib/main-system-client'
import { verifyLineIdToken } from '@/lib/line/verify-id-token'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const idToken = searchParams.get('id_token')

  if (!idToken) {
    return NextResponse.json({ data: null, error: '缺少 id_token 參數' }, { status: 400 })
  }

  try {
    const verified = await verifyLineIdToken(idToken)
    if (!verified) {
      return NextResponse.json({ data: null, error: '身份驗證失敗' }, { status: 401 })
    }
    const lineUserId = verified.userId

    const result = await lookupUsersByLineId(lineUserId)
    
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        is_bound: result.data!.users.length > 0,
        users: result.data!.users
      },
      error: null
    })
  } catch (err) {
    console.error('[Bind Status API] Error:', err)
    return NextResponse.json({ data: null, error: '主系統連線失敗' }, { status: 500 })
  }
}
