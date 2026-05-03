import { NextResponse } from 'next/server'
import { verifyLineIdToken } from '@/lib/line/verify-id-token'
import { verifyOwnership } from '@/lib/verify-ownership'
import type { ApiResponse } from '@/types'

// Mock Data
const MOCK_COURSES_S1 = [
  { id: 'c1', name: '進階鋼琴課', date: '2026-04-24', startTime: '18:00', endTime: '19:00', teacher: '張老師', room: 'A教室', status: 'scheduled' },
  { id: 'c3', name: '進階鋼琴課', date: '2026-05-01', startTime: '18:00', endTime: '19:00', teacher: '張老師', room: 'A教室', status: 'scheduled' },
]

const MOCK_COURSES_S2 = [
  { id: 'c2', name: '基礎樂理', date: '2026-04-26', startTime: '14:00', endTime: '15:30', teacher: '李老師', room: 'B教室', status: 'scheduled' },
  { id: 'c4', name: '爵士鼓體驗', date: '2026-05-05', startTime: '10:00', endTime: '11:00', teacher: '王老師', room: '鼓房', status: 'scheduled' },
]

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

    // 2. 所有權驗證：確保該 LINE 使用者有權限查看此 user_id 的課表
    const isOwner = await verifyOwnership(lineUserId, userId)
    if (!isOwner) {
      console.warn(`[courses] Ownership check failed: LINE ${lineUserId} tried to access user ${userId}`)
      return NextResponse.json({ data: null, error: '無權限查看此帳號的課表' }, { status: 403 })
    }

    // 檢查是否為 MOCK_MODE
    if (process.env.MOCK_MODE === 'true') {
      await new Promise(resolve => setTimeout(resolve, 800))
      const data = userId === 's2' ? MOCK_COURSES_S2 : MOCK_COURSES_S1;
      return NextResponse.json({ data, error: null })
    }

    const url = process.env.MAIN_SYSTEM_URL
    const key = process.env.INTERNAL_API_KEY
    
    if (!url || !key) {
      return NextResponse.json({ data: [], error: '伺服器缺少設定檔' }, { status: 500 })
    }

    const res = await fetch(`${url}/api/internal/users/courses?user_id=${userId}`, {
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
    console.error('[courses] Fetch error:', err)
    return NextResponse.json({ data: [], error: '主系統串接失敗' }, { status: 500 })
  }
}
