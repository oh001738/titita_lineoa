import type { messagingApi } from '@line/bot-sdk'
import { getLineClient } from './client'
import { connectDB } from '@/lib/db/mongoose'
import LineNotifyLog from '@/lib/models/LineNotifyLog'
import { getSetting } from '@/lib/models/SystemSetting'
import { NOTIFY_TYPES, NOTIFY_STATUS, type NotifyType } from '@/lib/constants'

// ── Settings cache（避免每次推播都 query DB）──
interface SettingsCache {
  isPushEnabled: boolean
  enabledNotifies: Record<string, boolean>
  cachedAt: number
}

let settingsCache: SettingsCache | null = null
const CACHE_TTL_MS = 5_000 // 5 秒

async function getSettings(): Promise<{ isPushEnabled: boolean; enabledNotifies: Record<string, boolean> }> {
  if (settingsCache && Date.now() - settingsCache.cachedAt < CACHE_TTL_MS) {
    return { isPushEnabled: settingsCache.isPushEnabled, enabledNotifies: settingsCache.enabledNotifies }
  }

  const [isPushEnabled, enabledNotifies] = await Promise.all([
    getSetting('is_push_enabled', true),
    getSetting('enabled_notifies', {} as Record<string, boolean>),
  ])

  settingsCache = { isPushEnabled, enabledNotifies, cachedAt: Date.now() }
  return { isPushEnabled, enabledNotifies }
}

// 設定更新時清除 cache（供 admin settings API 呼叫）
export function clearSettingsCache() {
  settingsCache = null
}

/**
 * 推播訊息給指定 LINE 使用者
 * 失敗時自動重試最多 2 次（exponential backoff: 1s, 2s）
 */
export async function pushMessage(params: {
  lineUserId: string
  userId: string
  studentName: string
  notifyType: NotifyType
  messages: messagingApi.Message[]
  messageContent: string
}): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  const { lineUserId, userId, studentName, notifyType, messages, messageContent } = params

  await connectDB()

  // 1. 檢查推播開關
  const { isPushEnabled, enabledNotifies } = await getSettings()
  const isTypeEnabled = enabledNotifies[notifyType] !== false
  const shouldSend = isPushEnabled && isTypeEnabled

  // 2. 建立 pending log
  const log = await LineNotifyLog.create({
    user_id: userId,
    line_user_id: lineUserId,
    student_name: studentName,
    notify_type: notifyType,
    message_content: messageContent,
    status: shouldSend ? NOTIFY_STATUS.PENDING : NOTIFY_STATUS.SKIPPED,
  })

  if (!shouldSend) {
    console.log(`[LINE Push] Skipped (${!isPushEnabled ? 'Global OFF' : 'Type OFF: ' + notifyType}) for ${lineUserId}`)
    return { success: true, skipped: true }
  }

  // 3. 發送，最多重試 2 次
  const MAX_RETRIES = 2
  let lastError = ''

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, attempt * 1000))
        console.log(`[LINE Push] Retry ${attempt}/${MAX_RETRIES} for ${lineUserId}`)
      }

      const client = getLineClient()
      const result = await client.pushMessage({ to: lineUserId, messages })

      await LineNotifyLog.findByIdAndUpdate(log._id, {
        status: NOTIFY_STATUS.SENT,
        line_request_id: result.sentMessages?.[0]?.id ?? null,
      })

      return { success: true }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error'
      console.warn(`[LINE Push] Attempt ${attempt + 1} failed for ${lineUserId}:`, lastError)
    }
  }

  // 所有重試均失敗
  await LineNotifyLog.findByIdAndUpdate(log._id, {
    status: NOTIFY_STATUS.FAILED,
    error_message: lastError,
  })

  console.error(`[LINE Push] All retries failed for ${lineUserId}:`, lastError)
  return { success: false, error: lastError }
}

/**
 * 回覆訊息（用於 Webhook 事件回覆）
 */
export async function replyMessage(
  replyToken: string,
  messages: messagingApi.Message[]
): Promise<void> {
  try {
    const client = getLineClient()
    await client.replyMessage({ replyToken, messages })
  } catch (err) {
    console.error('[LINE Reply] Failed:', err instanceof Error ? err.message : err)
  }
}
