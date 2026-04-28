import { pushMessage } from '@/lib/line/push'
import {
  generalNotifyMessage,
  leaveResultMessage,
  bindSuccessMessage,
  pointsEarnedMessage,
} from '@/lib/line/templates'
import { NOTIFY_TYPES, type NotifyType } from '@/lib/constants'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/test-push
 * 管理員試發推播（受 admin cookie 保護，透過 middleware）
 * 用途：驗證推播模板、確認 LINE Token 設定正確
 *
 * Body: { line_user_id, notify_type, student_name? }
 */
export async function POST(request: Request) {
  try {
    const { line_user_id, notify_type, student_name = '測試學生' } = await request.json()

    if (!line_user_id || !notify_type) {
      return Response.json(
        { data: null, error: '缺少 line_user_id 或 notify_type' } satisfies ApiResponse<null>,
        { status: 400 }
      )
    }

    const type = notify_type as NotifyType
    let messages: any[]

    switch (type) {
      case NOTIFY_TYPES.LEAVE_APPROVED:
      case NOTIFY_TYPES.LEAVE_REJECTED:
      case NOTIFY_TYPES.MAKEUP_ARRANGED:
        messages = [
          leaveResultMessage({
            studentName: student_name,
            courseName: '鋼琴基礎班',
            date: new Date().toLocaleDateString('zh-TW'),
            result:
              type === NOTIFY_TYPES.LEAVE_APPROVED
                ? 'approved'
                : type === NOTIFY_TYPES.MAKEUP_ARRANGED
                  ? 'approved_makeup'
                  : 'rejected',
            reason: '（試發測試）',
            makeupInfo:
              type === NOTIFY_TYPES.MAKEUP_ARRANGED
                ? { date: '2026-05-10', room: 'A101', teacher: '王老師' }
                : undefined,
          }),
        ]
        break

      case NOTIFY_TYPES.POINTS_EARNED:
        messages = [
          pointsEarnedMessage({ studentName: student_name, amount: 10, reason: '課堂表現優異（試發）', balance: 100 }),
        ]
        break

      case NOTIFY_TYPES.BIND_SUCCESS:
        messages = [bindSuccessMessage([student_name])]
        break

      default:
        messages = [generalNotifyMessage(student_name, `${type} 通知（試發）`, '這是一則測試訊息，確認推播功能正常運作。')]
    }

    const result = await pushMessage({
      lineUserId: line_user_id,
      userId: 'admin_test_push',
      studentName: student_name,
      notifyType: type,
      messages,
      messageContent: `[試發] ${type}`,
    })

    if (!result.success) {
      return Response.json(
        { data: null, error: result.error || '發送失敗' } satisfies ApiResponse<null>,
        { status: 500 }
      )
    }

    return Response.json({ data: { success: true, skipped: result.skipped }, error: null })
  } catch (err) {
    console.error('[Test Push] Error:', err)
    return Response.json(
      { data: null, error: '伺服器錯誤' } satisfies ApiResponse<null>,
      { status: 500 }
    )
  }
}
