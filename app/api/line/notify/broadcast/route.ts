import { connectDB } from '@/lib/db/mongoose'
import LineNotifyLog from '@/lib/models/LineNotifyLog'
import { pushMessage } from '@/lib/line/push'
import { getLineClient } from '@/lib/line/client'
import { generalNotifyMessage } from '@/lib/line/templates'
import { getSetting } from '@/lib/models/SystemSetting'
import { NOTIFY_TYPES, NOTIFY_STATUS, type NotifyType } from '@/lib/constants'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

// 超過此人數時改用 LINE multicast（不含學生姓名個人化，速度快）
const MULTICAST_THRESHOLD = 10
const MULTICAST_BATCH_SIZE = 500 // LINE API 上限

interface BroadcastRecipient {
  user_id: string
  line_user_id: string
  student_name: string
}

/**
 * POST /api/line/notify/broadcast
 * 批次推播通知
 * 功能：人數 <= 10 用個別 push（含學生姓名）；人數 > 10 用 multicast（速度快）
 *
 * Headers: X-Internal-Key
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
    const { recipients, title, message, notify_type = NOTIFY_TYPES.BROADCAST } = body

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return Response.json(
        { data: null, error: '缺少收件人列表 (recipients)' } satisfies ApiResponse<null>,
        { status: 400 }
      )
    }
    if (!message) {
      return Response.json(
        { data: null, error: '缺少訊息內容 (message)' } satisfies ApiResponse<null>,
        { status: 400 }
      )
    }

    // 檢查推播開關
    const isPushEnabled = await getSetting('is_push_enabled', true)
    if (!isPushEnabled) {
      return Response.json({
        data: { total: recipients.length, success: 0, failed: 0, skipped: recipients.length },
        error: null,
      })
    }

    const broadcastTitle = title || '系統公告'
    const notifyType = notify_type as NotifyType

    let successCount = 0
    let failCount = 0

    if (recipients.length <= MULTICAST_THRESHOLD) {
      // ── 少人數：個別 push，保留學生姓名 ──
      const results = await Promise.allSettled(
        recipients.map((r: BroadcastRecipient) =>
          pushMessage({
            lineUserId: r.line_user_id,
            userId: r.user_id,
            studentName: r.student_name,
            notifyType,
            messages: [generalNotifyMessage(r.student_name, broadcastTitle, message)],
            messageContent: `[${broadcastTitle}] ${message}`,
          })
        )
      )
      successCount = results.filter(
        (r) => r.status === 'fulfilled' && (r as PromiseFulfilledResult<any>).value.success
      ).length
      failCount = recipients.length - successCount
    } else {
      // ── 大量廣播：LINE multicast API，一次最多 500 人 ──
      await connectDB()
      const lineUserIds = recipients.map((r: BroadcastRecipient) => r.line_user_id)
      const flexMsg = generalNotifyMessage('各位家長/學員', broadcastTitle, message)

      // 分批送出
      for (let i = 0; i < lineUserIds.length; i += MULTICAST_BATCH_SIZE) {
        const batch = lineUserIds.slice(i, i + MULTICAST_BATCH_SIZE)
        try {
          const client = getLineClient()
          await client.multicast({ to: batch, messages: [flexMsg] })
          successCount += batch.length
        } catch (err) {
          console.error('[Broadcast Multicast] Batch failed:', err)
          failCount += batch.length
        }
      }

      // 批次寫入 log（一筆代表整批）
      const logDocs = recipients.map((r: BroadcastRecipient) => ({
        user_id: r.user_id,
        line_user_id: r.line_user_id,
        student_name: r.student_name,
        notify_type: notifyType,
        message_content: `[${broadcastTitle}] ${message}`,
        status: failCount === 0 ? NOTIFY_STATUS.SENT : NOTIFY_STATUS.FAILED,
      }))
      await LineNotifyLog.insertMany(logDocs, { ordered: false })
    }

    return Response.json({
      data: { total: recipients.length, success: successCount, failed: failCount },
      error: null,
    })
  } catch (err) {
    console.error('[Broadcast API] Error:', err)
    return Response.json(
      { data: null, error: '伺服器錯誤' } satisfies ApiResponse<null>,
      { status: 500 }
    )
  }
}
