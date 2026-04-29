import { NextResponse } from 'next/server'
import { submitLeaveRequest } from '@/lib/main-system-client'

export async function POST(request: Request) {
  try {
    const { line_user_id, user_id, course_id, reason } = await request.json()

    if (!line_user_id || !user_id || !course_id) {
      return NextResponse.json({ data: null, error: '缺少必要參數' }, { status: 400 })
    }

    const result = await submitLeaveRequest({
      user_id,
      lesson_id: course_id,
      reason: reason ?? '家長透過 LINE 請假',
    })

    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      data: { success: true, leave_request_id: result.data?.leave_request_id },
      error: null,
    })
  } catch (err) {
    console.error('[leave] Error:', err)
    return NextResponse.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}
