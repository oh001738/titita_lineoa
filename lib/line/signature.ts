import crypto from 'crypto'

/**
 * 驗證 LINE Webhook 簽名
 * @see https://developers.line.biz/en/reference/messaging-api/#signature-validation
 */
export function validateSignature(
  body: string,
  channelSecret: string,
  signature: string
): boolean {
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64')

  // 使用 timingSafeEqual 防禦計時攻擊 (Timing Attack)
  // 這確保了比對字串時花費的時間是固定的，不會因為前面字元匹配而變快
  try {
    const hashBuffer = Buffer.from(hash)
    const signatureBuffer = Buffer.from(signature)
    
    if (hashBuffer.length !== signatureBuffer.length) {
      return false
    }
    
    return crypto.timingSafeEqual(hashBuffer, signatureBuffer)
  } catch (err) {
    return false
  }
}
