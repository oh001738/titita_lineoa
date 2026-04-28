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

  return hash === signature
}
