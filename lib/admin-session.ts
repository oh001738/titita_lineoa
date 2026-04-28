/**
 * Admin Session Token — 用 Web Crypto API（Edge + Node.js 18+ 皆可）
 * 格式：{adminId}.{timestamp}.{base64url(HMAC-SHA256)}
 * 優點：不需外部套件，無狀態，可在 middleware（edge runtime）驗證
 */

const SEP = '.'
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 小時

function toBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function fromBase64url(str: string): ArrayBuffer {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((str.length * 3) % 4)
  const bytes = new Uint8Array([...atob(b64)].map((c) => c.charCodeAt(0)))
  return bytes.buffer as ArrayBuffer
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function createAdminToken(adminId: string): Promise<string> {
  const secret = process.env.INTERNAL_API_KEY
  if (!secret) throw new Error('INTERNAL_API_KEY not set')

  const timestamp = Date.now().toString()
  const payload = `${adminId}${SEP}${timestamp}`
  const key = await getHmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return `${payload}${SEP}${toBase64url(sig)}`
}

export async function verifyAdminToken(token: string): Promise<string | null> {
  try {
    const secret = process.env.INTERNAL_API_KEY
    if (!secret) return null

    // 從右邊拆出 sig（最後一個 SEP 之後）
    const lastDot = token.lastIndexOf(SEP)
    if (lastDot === -1) return null
    const payload = token.substring(0, lastDot)
    const sigStr = token.substring(lastDot + 1)

    const key = await getHmacKey(secret)
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64url(sigStr),
      new TextEncoder().encode(payload)
    )
    if (!isValid) return null

    // payload = "{adminId}.{timestamp}"
    const firstDot = payload.indexOf(SEP)
    if (firstDot === -1) return null
    const adminId = payload.substring(0, firstDot)
    const timestamp = parseInt(payload.substring(firstDot + 1))
    if (isNaN(timestamp)) return null

    const age = Date.now() - timestamp
    if (age < 0 || age > MAX_AGE_MS) return null

    return adminId
  } catch {
    return null
  }
}
