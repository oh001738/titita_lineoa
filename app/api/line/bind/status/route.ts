import { NextResponse } from 'next/server'
import { lookupUsersByLineId } from '@/lib/main-system-client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lineUserId = searchParams.get('line_user_id')

  if (!lineUserId) {
    return NextResponse.json({ data: null, error: '缺少 LINE ID 參數' }, { status: 400 })
  }

  try {
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
