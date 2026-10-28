import { renewCourseTerm } from '@/lib/main-system-client'
import { replyMessage } from '@/lib/line/push'
import { termRenewalConfirmationMessage } from '@/lib/line/templates'

// This handler is only called after validating the webhook signature.
export async function handleTermRenewal(lineUserId: string, replyToken: string, params: URLSearchParams) {
  const courseId = params.get('course_id') ?? ''
  const seq = Number(params.get('term_seq'))
  const confirming = params.get('action') === 'renew_term_confirm'
  if (!/^[a-f0-9]{24}$/i.test(courseId) || !Number.isSafeInteger(seq) || seq < 1) {
    await replyMessage(replyToken, [{ type: 'text', text: '此續期通知資料不完整，請至主系統確認。' }])
    return
  }
  try {
    const result = await renewCourseTerm(courseId, {
      line_user_id: lineUserId, expected_term_seq: seq,
      action: confirming ? 'confirm' : 'preview',
      confirmation_token: confirming ? params.get('token') ?? undefined : undefined,
    })
    if (!result.data || result.error) {
      await replyMessage(replyToken, [{ type: 'text', text: result.error || '目前無法續期，請稍後重試。' }])
      return
    }
    const data = result.data
    if (!confirming && data.confirmation_token) {
      await replyMessage(replyToken, [termRenewalConfirmationMessage({ ...data, course_id: courseId, expected_term_seq: seq })])
      return
    }
    await replyMessage(replyToken, [{ type: 'text', text:
      `${data.already_renewed ? '本次續期已完成，未重複開期。' : '續開成功！'}\n課程：${data.course_name}\n第 ${data.term_seq} 期：${data.start_date} ～ ${data.end_date}\n時段：${data.schedule_summary}\n沿用原學生名單；本次未產生帳單。`,
    }])
  } catch (err) {
    console.error('[LINE term renewal]', err)
    await replyMessage(replyToken, [{ type: 'text', text: '主系統暫時無法回應，請稍後再按一次；系統會檢查期次，避免重複續期。' }])
  }
}
