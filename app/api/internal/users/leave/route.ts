import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { line_user_id, course_id, reason } = await request.json()

    if (!line_user_id || !course_id) {
      return NextResponse.json({ data: null, error: '缺少必要參數' }, { status: 400 })
    }

    if (process.env.MOCK_MODE === 'true') {
      await new Promise(resolve => setTimeout(resolve, 1000)) // 模擬處理時間
      
      // 這裡可以選擇是否觸發一個 Flex Message 推播給家長，確認請假成功
      // 但為了單純，這裡我們只回傳成功
      return NextResponse.json({ data: { success: true, message: '請假申請已送出' }, error: null })
    }

    // TODO: 串接主系統 API
    return NextResponse.json({ data: null, error: '主系統尚未串接' })
  } catch (err) {
    return NextResponse.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}
