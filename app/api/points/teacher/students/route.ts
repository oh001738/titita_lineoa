import { NextResponse } from 'next/server'
import { lookupUsersByLineId, getTeacherStudents } from '@/lib/main-system-client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lineUserId = searchParams.get('line_user_id')

  if (!lineUserId) {
    return NextResponse.json({ error: 'Missing LINE ID' }, { status: 400 })
  }

  try {
    // 1. 找出該 LINE ID 對應的老師 ID
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
