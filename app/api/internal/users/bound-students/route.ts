import { NextResponse } from 'next/server'
import { lookupUsersByLineId } from '@/lib/main-system-client'
import { verifyLineIdToken } from '@/lib/line/verify-id-token'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const idToken = searchParams.get('id_token')

  if (!idToken) {
    return NextResponse.json({ data: null, error: 'Missing id_token' }, { status: 400 })
  }

  try {
    const verified = await verifyLineIdToken(idToken)
    if (!verified) {
      return NextResponse.json({ data: null, error: '身份驗證失敗' }, { status: 401 })
    }
    const lineUserId = verified.userId

    // 呼叫我們剛剛在主系統寫好的 lookup-by-line API
    const result = await lookupUsersByLineId(lineUserId)
    
    if (result.error || !result.data) {
      return NextResponse.json({ data: null, error: result.error || '無法取得綁定資料' }, { status: 500 })
    }

    // 將回傳的使用者轉為前端需要的格式
    const boundStudents = result.data.users.map(u => ({
      user_id: u._id,
      student_name: u.name || '未命名',
      role: u.role
    }))

    return NextResponse.json({
      data: boundStudents,
      error: null
    })
  } catch (err) {
    console.error('[bound-students] Error:', err)
    return NextResponse.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}
