import { validateSignature } from '@/lib/line/signature'
import { lookupUsersByLineId, updateLineBinding } from '@/lib/main-system-client'
import { replyMessage } from '@/lib/line/push'
import { welcomeMessage, bindStatusMessage, notBoundMessage, bindGuideMessage, liffGuideMessage } from '@/lib/line/templates'

export const dynamic = 'force-dynamic'

/**
 * LINE Webhook 接收端點
 * 處理：follow / unfollow / message / postback
 */
export async function POST(request: Request) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET

  if (!channelSecret) {
    console.error('[Webhook] LINE_CHANNEL_SECRET not configured')
    return Response.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('x-line-signature') || ''

  if (!validateSignature(body, channelSecret, signature)) {
    // 簽名失敗仍回 200，避免 LINE 認為服務異常而重試
    console.warn('[Webhook] Invalid signature — ignoring')
    return Response.json({ status: 'ok' })
  }

  let events
  try {
    const parsed = JSON.parse(body)
    events = parsed.events || []
  } catch {
    console.error('[Webhook] Failed to parse body')
    return Response.json({ status: 'ok' })
  }

  // 非同步處理，不阻塞回應（Webhook 鐵則：先回 200）
  Promise.all(
    events.map(async (event: WebhookEvent) => {
      try {
        await handleEvent(event)
      } catch (err) {
        console.error('[Webhook] Event handling error:', err)
      }
    })
  ).catch((err) => {
    console.error('[Webhook] Batch processing error:', err)
  })

  return Response.json({ status: 'ok' })
}

// ── 型別 ──
interface WebhookEvent {
  type: string
  replyToken?: string
  source?: { type: string; userId?: string }
  message?: { type: string; text?: string }
  postback?: { data: string; params?: Record<string, string> }
}

async function handleEvent(event: WebhookEvent): Promise<void> {
  switch (event.type) {
    case 'follow':
      await handleFollow(event)
      break
    case 'unfollow':
      await handleUnfollow(event)
      break
    case 'message':
      await handleMessage(event)
      break
    case 'postback':
      await handlePostback(event)
      break
    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`)
  }
}

// ── 加入好友 ──
async function handleFollow(event: WebhookEvent): Promise<void> {
  const lineUserId = event.source?.userId
  if (!lineUserId || !event.replyToken) return

  console.log(`[Webhook] New follower: ${lineUserId}`)
  await replyMessage(event.replyToken, [welcomeMessage()])
}

// ── 封鎖/刪除好友 → 清除主系統綁定 ──
async function handleUnfollow(event: WebhookEvent): Promise<void> {
  const lineUserId = event.source?.userId
  if (!lineUserId) return

  console.log(`[Webhook] Unfollowed: ${lineUserId}`)
  try {
    const lookupResult = await lookupUsersByLineId(lineUserId)
    if (!lookupResult.data?.users.length) return

    const userIds = lookupResult.data.users.map((u) => u._id)
    await updateLineBinding(userIds, lineUserId, 'unbind')
    console.log(`[Webhook] Cleared ${userIds.length} user(s) for unfollowed LINE user`)
  } catch (err) {
    console.error('[Webhook] Failed to clear unfollowed user:', err)
  }
}

// ── 文字訊息 → 關鍵字回覆 ──
async function handleMessage(event: WebhookEvent): Promise<void> {
  if (event.message?.type !== 'text' || !event.replyToken) return

  const text = event.message.text?.trim() || ''
  const lineUserId = event.source?.userId
  if (!lineUserId) return

  if (text === '綁定' || text === '綁定帳號') {
    const liffId = process.env.LIFF_ID
    if (liffId) {
      await replyMessage(event.replyToken, [bindGuideMessage(liffId)])
    }
    return
  }

  if (text === '狀態' || text === '綁定狀態') {
    const result = await lookupUsersByLineId(lineUserId)
    const users = result.data?.users || []

    if (users.length === 0) {
      await replyMessage(event.replyToken, [notBoundMessage()])
    } else {
      await replyMessage(event.replyToken, [
        bindStatusMessage(users.map((u) => ({ name: u.name || '未命名', role: u.role }))),
      ])
    }
    return
  }

  // 其他訊息不自動回覆，由真人客服處理
  console.log(`[Webhook] Ignoring non-keyword message from ${lineUserId}: ${text}`)
}

/**
 * ── Postback 處理 ──
 *
 * 什麼是 postback？
 * Rich Menu 按鈕設定 action type = "postback" 時，用戶點擊按鈕不會顯示訊息，
 * 但 LINE Platform 會送一個 postback event 到 Webhook，包含按鈕設定的 data 字串。
 * 這讓 Rich Menu 按鈕可以觸發後台邏輯，而不只是開啟 URL。
 *
 * Rich Menu 按鈕對應的 data 格式：action=xxx
 * - action=bind        → 引導綁定
 * - action=status      → 查詢綁定狀態
 * - action=courses     → 查看課表（導至 LIFF）
 * - action=points      → 查看點數（導至 LIFF）
 */
async function handlePostback(event: WebhookEvent): Promise<void> {
  const lineUserId = event.source?.userId
  if (!lineUserId || !event.replyToken || !event.postback?.data) return

  const params = new URLSearchParams(event.postback.data)
  const action = params.get('action')
  const liffId = process.env.LIFF_ID

  console.log(`[Webhook] Postback from ${lineUserId}: action=${action}`)

  if (!liffId) return

  switch (action) {
    case 'bind':
      await replyMessage(event.replyToken, [bindGuideMessage(liffId)])
      break

    case 'status':
      await replyMessage(event.replyToken, [
        liffGuideMessage({ liffId, path: '/liff/status', title: '綁定狀態', icon: '📋', description: '查看目前與此 LINE 帳號連動的系統帳號。', buttonLabel: '查看綁定狀態' }),
      ])
      break

    case 'courses':
      await replyMessage(event.replyToken, [
        liffGuideMessage({ liffId, path: '/liff/courses', title: '課表查詢', icon: '📅', description: '查看未來兩週的課程安排，也可以直接申請請假。', buttonLabel: '查看課表' }),
      ])
      break

    case 'points':
      await replyMessage(event.replyToken, [
        liffGuideMessage({ liffId, path: '/liff/points', title: '點數查詢', icon: '⭐', description: '查看目前累計點數與獲得紀錄。', buttonLabel: '查看點數', color: '#f59e0b' }),
      ])
      break

    default:
      console.log(`[Webhook] Unknown postback action: ${action}`)
      await replyMessage(event.replyToken, [
        { type: 'text', text: '請使用下方選單操作 📋' },
      ])
  }
}
