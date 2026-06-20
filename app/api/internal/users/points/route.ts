export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { verifyLineIdToken } from '@/lib/line/verify-id-token'
import { verifyOwnership } from '@/lib/verify-ownership'

const MOCK_POINTS_DATA_S1 = {
  balance: 1250,
  history: [
    { id: 'h1', type: 'earn', amount: 100, date: '2026-04-20', reason: '全勤獎勵' },
    { id: 'h2', type: 'spend', amount: -500, date: '2026-04-15', reason: '兌換：精美吉他撥片組' },
    { id: 'h3', type: 'earn', amount: 50, date: '2026-04-10', reason: '課堂表現優異' },
    { id: 'h4', type: 'earn', amount: 200, date: '2026-03-25', reason: '續報下期課程' },
    { id: 'h5', type: 'spend', amount: -150, date: '2026-03-01', reason: '兌換：音樂小夜燈' },
  ]
}

const MOCK_POINTS_DATA_S2 = {
  balance: 80,
  history: [
    { id: 'h1', type: 'earn', amount: 80, date: '2026-04-20', reason: '準時出席' },
  ]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const idToken = searchParams.get('id_token')
  const userId = searchParams.get('user_id')

  if (!idToken || !userId) {
    return NextResponse.json({ data: null, error: 'Missing parameters' }, { status: 400 })
  }

  try {
    // 1. 驗證 LINE idToken
    const verified = await verifyLineIdToken(idToken)
    if (!verified) {
      return NextResponse.json({ data: null, error: '身份驗證失敗' }, { status: 401 })
    }
    const lineUserId = verified.userId

    // 2. 所有權驗證：確保該 LINE 使用者有權限查看此 user_id 的點數
    const isOwner = await verifyOwnership(lineUserId, userId)
    if (!isOwner) {
      console.warn(`[points] Ownership check failed: LINE ${lineUserId} tried to access user ${userId}`)
      return NextResponse.json({ data: null, error: '無權限查看此帳號的點數' }, { status: 403 })
    }

    if (process.env.MOCK_MODE === 'true') {
      await new Promise(resolve => setTimeout(resolve, 600))
      const data = userId === 's2' ? MOCK_POINTS_DATA_S2 : MOCK_POINTS_DATA_S1;
      return NextResponse.json({ data, error: null })
    }

    const url = process.env.MAIN_SYSTEM_URL
    const key = process.env.INTERNAL_API_KEY
    
    if (!url || !key) {
      return NextResponse.json({ data: null, error: '伺服器缺少設定檔' }, { status: 500 })
    }

    const res = await fetch(`${url}/api/internal/users/points?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': key
      }
    })

    if (!res.ok) {
      throw new Error('主系統 API 回應錯誤')
    }

    const json = await res.json()
    return NextResponse.json(json)
  } catch (err) {
    console.error('[points] Fetch error:', err)
    return NextResponse.json({ data: null, error: '主系統串接失敗' }, { status: 500 })
  }
}
