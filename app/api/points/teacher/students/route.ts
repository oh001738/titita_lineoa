import { NextResponse } from 'next/server'
import { lookupUsersByLineId, getTeacherStudents } from '@/lib/main-system-client'
import { verifyLineIdToken } from '@/lib/line/verify-id-token'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const idToken = searchParams.get('id_token')

  if (!idToken) {
    return NextResponse.json({ error: 'Missing ID Token' }, { status: 400 })
  }

  try {
    // 1. 驗證 ID Token 並取得已驗證的 LINE userId
    const verified = await verifyLineIdToken(idToken)
    if (!verified) {
      return NextResponse.json({ error: '身份驗證失敗' }, { status: 401 })
    }
    const lineUserId = verified.userId

    // 2. 找出該 LINE ID 對應的老師 ID
    const userResult = await lookupUsersByLineId(lineUserId)
    const teacher = userResult.data?.users.find(u => u.role === 'teacher')

    if (!teacher) {
      return NextResponse.json({ error: '未找到老師身份，請先完成綁定' }, { status: 403 })
    }

    // 2. 抓取今日學生
    const studentsResult = await getTeacherStudents(teacher._id)
    
    return NextResponse.json(studentsResult)
  } catch (err) {
    console.error('[Teacher Students API] Error:', err)
    return NextResponse.json({ error: '系統錯誤' }, { status: 500 })
  }
}
