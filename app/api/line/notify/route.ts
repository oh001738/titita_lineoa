import { connectDB } from '@/lib/db/mongoose'
import LineNotifyLog from '@/lib/models/LineNotifyLog'
import { pushMessage } from '@/lib/line/push'
import {
  generalNotifyMessage,
  leaveResultMessage,
  bindSuccessMessage,
  pointsEarnedMessage,
  tuitionReminderMessage,
  tuitionReceivedMessage,
  courseChangeMessage,
} from '@/lib/line/templates'
import type { ApiResponse } from '@/types'
import { NOTIFY_TYPES, type NotifyType } from '@/lib/constants'

export const dynamic = 'force-dynamic'

/**
 * POST /api/line/notify
 * 推播通知給指定使用者
 *
 * 主系統呼叫時需提供 line_user_id（主系統的 User 已有此欄位）
 * → LINE OA 系統不需要再去查主系統 DB
 *
 * Headers: X-Internal-Key
 * Body: {
 *   user_id,
 *   line_user_id,
 *   student_name,
 *   message,
 *   notify_type,
 *   payload? // 選填，特定模板所需的資料
 * }
 */
export async function POST(request: Request) {
  const internalKey = process.env.INTERNAL_API_KEY
  const providedKey = request.headers.get('x-internal-key')

  if (!internalKey || providedKey !== internalKey) {
    return Response.json(
      { data: null, error: 'Unauthorized' } satisfies ApiResponse<null>,
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { user_id, line_user_id, student_name, message, notify_type, payload } = body

    if (!user_id || !line_user_id || !student_name || !message || !notify_type) {
      return Response.json(
        { data: null, error: '缺少必要欄位（需要 user_id, line_user_id, student_name, message, notify_type）' } satisfies ApiResponse<null>,
        { status: 400 }
      )
    }

    // ── 根據通知類型選擇模板 ──
    let lineMessages: any[] = []

    switch (notify_type) {
      case NOTIFY_TYPES.LEAVE_APPROVED:
      case NOTIFY_TYPES.LEAVE_REJECTED:
      case NOTIFY_TYPES.MAKEUP_ARRANGED:
        // 如果有 payload 則使用結構化模板，否則退回通用模板
        if (payload?.course_name && payload?.date) {
          lineMessages = [
            leaveResultMessage({
              studentName: student_name,
              courseName: payload.course_name,
              date: payload.date,
              result:
                notify_type === NOTIFY_TYPES.LEAVE_APPROVED
                  ? 'approved'
                  : notify_type === NOTIFY_TYPES.MAKEUP_ARRANGED
                    ? 'approved_makeup'
                    : 'rejected',
              reason: payload.reason,
              makeupInfo: payload.makeup_info,
            }),
          ]
        } else {
          lineMessages = [generalNotifyMessage(student_name, '請假/補課通知', message)]
        }
        break;

      case NOTIFY_TYPES.BIND_SUCCESS:
        lineMessages = [bindSuccessMessage([student_name])]
        break;

      case NOTIFY_TYPES.TUITION_REMINDER:
      case NOTIFY_TYPES.TUITION_NOTICE:
        if (payload?.amount !== undefined) {
          lineMessages = [tuitionReminderMessage({
            studentName: student_name,
            amount: payload.amount,
            dueDate: payload.dueDate,
            note: payload.note ?? message
          })]
        } else {
          lineMessages = [generalNotifyMessage(student_name, '學費繳費提醒', message)]
        }
        break;

      case NOTIFY_TYPES.TUITION_RECEIVED:
        if (payload?.amount !== undefined) {
          lineMessages = [tuitionReceivedMessage({
            studentName: student_name,
            amount: payload.amount,
            paidDate: payload.paidDate,
            note: payload.note ?? message
          })]
        } else {
          lineMessages = [generalNotifyMessage(student_name, '學費收訖通知', message)]
        }
        break;

      case NOTIFY_TYPES.CLASS_REMINDER:
        lineMessages = [generalNotifyMessage(student_name, '上課提醒', message)]
        break;

      case NOTIFY_TYPES.COURSE_CHANGE:
        if (payload?.courseName || payload?.originalDate || payload?.newDate) {
          lineMessages = [courseChangeMessage({
            studentName: student_name,
            courseName: payload.courseName,
            changeType: payload.changeType,
            originalDate: payload.originalDate,
            newDate: payload.newDate,
            note: payload.note ?? message
          })]
        } else {
          lineMessages = [generalNotifyMessage(student_name, '課程異動通知', message)]
        }
        break;

      case NOTIFY_TYPES.POINTS_EARNED:
        lineMessages = [
          pointsEarnedMessage({
            studentName: student_name,
            amount: payload?.amount ?? 0,
            reason: payload?.reason ?? message,
            balance: payload?.balance,
            teacherName: payload?.teacherName,
          }),
        ]
        break;

      default:
        lineMessages = [generalNotifyMessage(student_name, '系統通知', message)]
        break;
    }

    // 推播（pushMessage 會自動寫 LineNotifyLog 到 LINE OA 自己的 DB）
    const result = await pushMessage({
      lineUserId: line_user_id,
      userId: user_id,
      studentName: student_name,
      notifyType: notify_type as NotifyType,
      messages: lineMessages,
      messageContent: message,
    })

    if (!result.success) {
      return Response.json(
        { data: null, error: result.error || '推播失敗' } satisfies ApiResponse<null>,
        { status: 500 }
      )
    }

    return Response.json(
      { data: { success: true }, error: null } satisfies ApiResponse<{ success: boolean }>
    )
  } catch (err) {
    console.error('[Notify] Error:', err)
    return Response.json(
      { data: null, error: '伺服器錯誤' } satisfies ApiResponse<null>,
      { status: 500 }
    )
  }
}

/**
 * GET /api/line/notify
 * 查詢推播紀錄
 */
export async function GET(request: Request) {
  const internalKey = process.env.INTERNAL_API_KEY
  const providedKey = request.headers.get('x-internal-key')

  if (!internalKey || providedKey !== internalKey) {
    return Response.json(
      { data: null, error: 'Unauthorized' } satisfies ApiResponse<null>,
      { status: 401 }
    )
  }

  try {
    await connectDB()
    const logs = await LineNotifyLog.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return Response.json({ data: logs, error: null })
  } catch (err) {
    console.error('[Notify GET] Error:', err)
    return Response.json(
      { data: null, error: '伺服器錯誤' } satisfies ApiResponse<null>,
      { status: 500 }
    )
  }
}
