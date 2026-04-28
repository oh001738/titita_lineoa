import { pushMessage } from '@/lib/line/push'
import { getLineClient } from '@/lib/line/client'
import { generalNotifyMessage } from '@/lib/line/templates'
import { connectDB } from '@/lib/db/mongoose'
import LineNotifyLog from '@/lib/models/LineNotifyLog'
import { getSetting } from '@/lib/models/SystemSetting'
import { NOTIFY_TYPES, NOTIFY_STATUS } from '@/lib/constants'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

const MULTICAST_THRESHOLD = 10
const MULTICAST_BATCH_SIZE = 500

interface Recipient {
  line_user_id: string
  user_id: string
  student_name: string
}

/**
 * POST /api/admin/broadcast
 * 管理員後台廣播（受 admin cookie 保護，不需 X-Internal-Key）
 * 邏輯與 /api/line/notify/broadcast 相同，但驗證方式不同
 */
export async function POST(request: Request) {
  try {
    const { recipients, title, message, notify_type = NOTIFY_TYPES.BROADCAST } = await request.json()

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return Response.json(
        { data: null, error: '缺少收件人列表' } satisfies ApiResponse<null>,
        { status: 400 }
      )
    }
    if (!message) {
      return Response.json(
        { data: null, error: '缺少訊息內容' } satisfies ApiResponse<null>,
        { status: 400 }
      )
    }

    const isPushEnabled = await getSetting('is_push_enabled', true)
    if (!isPushEnabled) {
      return Response.json({
        data: { total: recipients.length, success: 0, failed: 0, skipped: recipients.length },
        error: null,
      })
    }

    const broadcastTitle = title || '系統公告'
    let successCount = 0
    let failCount = 0

    if (recipients.length <= MULTICAST_THRESHOLD) {
      const results = await Promise.allSettled(
        recipients.map((r: Recipient) =>
          pushMessage({
            lineUserId: r.line_user_id,
            userId: r.user_id,
            studentName: r.student_name,
            notifyType: notify_type,
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
      await connectDB()
      const lineUserIds = recipients.map((r: Recipient) => r.line_user_id)
      const flexMsg = generalNotifyMessage('各位家長/學員', broadcastTitle, message)

      for (let i = 0; i < lineUserIds.length; i += MULTICAST_BATCH_SIZE) {
        const batch = lineUserIds.slice(i, i + MULTICAST_BATCH_SIZE)
        try {
          const client = getLineClient()
          await client.multicast({ to: batch, messages: [flexMsg] })
          successCount += batch.length
        } catch (err) {
          console.error('[Admin Broadcast Multicast] Batch failed:', err)
          failCount += batch.length
        }
      }

      const logDocs = recipients.map((r: Recipient) => ({
        user_id: r.user_id,
        line_user_id: r.line_user_id,
        student_name: r.student_name,
        notify_type,
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
    console.error('[Admin Broadcast] Error:', err)
    return Response.json(
      { data: null, error: '伺服器錯誤' } satisfies ApiResponse<null>,
      { status: 500 }
    )
  }
}
