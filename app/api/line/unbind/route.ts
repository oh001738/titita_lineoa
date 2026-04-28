import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import LineBindLog from '@/lib/models/LineBindLog'
import { BIND_ACTIONS, BIND_OPERATORS } from '@/lib/constants'
import { updateLineBinding } from '@/lib/main-system-client'

export async function POST(request: Request) {
  try {
    const { user_id, line_user_id } = await request.json()

    if (!user_id || !line_user_id) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    // 1. 呼叫主系統進行解綁
    const result = await updateLineBinding([user_id], line_user_id, 'unbind')

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // 2. 紀錄解綁日誌
    await connectDB()
    await LineBindLog.create({
      user_id,
      line_user_id,
      action: BIND_ACTIONS.UNBIND,
      operator: BIND_OPERATORS.SELF
    })

    return NextResponse.json({ data: { success: true }, error: null })
  } catch (err) {
    console.error('[Unbind API] Error:', err)
    return NextResponse.json({ error: '解除綁定失敗' }, { status: 500 })
  }
}
