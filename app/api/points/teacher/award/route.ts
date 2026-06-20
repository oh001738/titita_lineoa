export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { lookupUsersByLineId, awardPoints } from '@/lib/main-system-client'
import { pushMessage } from '@/lib/line/push'
import { NOTIFY_TYPES } from '@/lib/constants'
import { verifyLineIdToken } from '@/lib/line/verify-id-token'

export async function POST(request: Request) {
  try {
    const { id_token, target_user_id, target_line_user_id, target_name, amount, reason } = await request.json()

    if (!id_token || !target_user_id || !amount) {
      return NextResponse.json({ error: '缺少參數' }, { status: 400 })
    }

    // 1. 驗證 ID Token
    const verified = await verifyLineIdToken(id_token)
    if (!verified) {
      return NextResponse.json({ error: '身份驗證失敗' }, { status: 401 })
    }
    const line_user_id = verified.userId

    // 2. 找出老師 ID
    const userResult = await lookupUsersByLineId(line_user_id)
    const teacher = userResult.data?.users.find(u => u.role === 'teacher')

    if (!teacher) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    // 2. 執行給點
    const awardResult = await awardPoints({
      teacher_id: teacher._id,
      user_id: target_user_id,
      amount: Number(amount),
      reason: reason || '表現優異'
    })

    if (awardResult.error) {
      return NextResponse.json({ error: awardResult.error }, { status: 500 })
    }

    // 3. 推播通知給家長 (如果有綁定 LINE 的話)
    if (target_line_user_id) {
      try {
        const { pointsEarnedMessage } = await import('@/lib/line/templates')
        
        await pushMessage({
          lineUserId: target_line_user_id,
          userId: target_user_id,
          studentName: target_name,
          notifyType: NOTIFY_TYPES.POINTS_EARNED,
          messageContent: `🌟 點數獎勵：【${target_name}】獲得 ${amount} 點！`,
          messages: [
            pointsEarnedMessage({
              studentName: target_name,
              amount: Number(amount),
              reason: reason || '表現優異',
              teacherName: teacher.name,
            }),
          ],
        })
      } catch (pushErr) {
        console.error('[Award Push Error]', pushErr)
      }
    }

    return NextResponse.json({ data: { success: true }, error: null })
  } catch (err) {
    console.error('[Award Points API] Error:', err)
    return NextResponse.json({ error: '發放失敗' }, { status: 500 })
  }
}
