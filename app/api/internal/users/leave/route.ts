export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { submitLeaveRequest, getLeaveRequests } from '@/lib/main-system-client'
import { verifyLineIdToken } from '@/lib/line/verify-id-token'
import { verifyOwnership } from '@/lib/verify-ownership'

// GET /api/internal/users/leave?id_token=...&user_id=...
// 查詢該學生近期請假進度（LIFF 課表頁「我的請假」分頁）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id_token = searchParams.get('id_token')
    const user_id = searchParams.get('user_id')

    if (!id_token || !user_id) {
      return NextResponse.json({ data: null, error: '缺少必要參數' }, { status: 400 })
    }

    const verified = await verifyLineIdToken(id_token)
    if (!verified) {
      return NextResponse.json({ data: null, error: '身份驗證失敗' }, { status: 401 })
    }
    const line_user_id = verified.userId

    // 所有權驗證：確保該 LINE 使用者有權限查看此 user_id 的請假紀錄
    const isOwner = await verifyOwnership(line_user_id, user_id)
    if (!isOwner) {
      console.warn(`[leave] Ownership check failed: LINE ${line_user_id} tried to read leave of user ${user_id}`)
      return NextResponse.json({ data: null, error: '無權限查看此帳號的請假紀錄' }, { status: 403 })
    }

    const result = await getLeaveRequests(user_id)
    if (result.error) {
      return NextResponse.json({ data: null, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ data: result.data ?? [], error: null })
  } catch (err) {
    console.error('[leave] GET Error:', err)
    return NextResponse.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { id_token, user_id, course_id, reason } = await request.json()

    if (!id_token || !user_id || !course_id) {
      return NextResponse.json({ data: null, error: '缺少必要參數' }, { status: 400 })
    }

    const verified = await verifyLineIdToken(id_token)
    if (!verified) {
      return NextResponse.json({ data: null, error: '身份驗證失敗' }, { status: 401 })
    }
    const line_user_id = verified.userId

    // 所有權驗證：確保該 LINE 使用者有權限幫此 user_id 請假
    const isOwner = await verifyOwnership(line_user_id, user_id)
    if (!isOwner) {
      console.warn(`[leave] Ownership check failed: LINE ${line_user_id} tried to submit leave for user ${user_id}`)
      return NextResponse.json({ data: null, error: '無權限幫此帳號請假' }, { status: 403 })
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
