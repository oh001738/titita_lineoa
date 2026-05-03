/**
 * Bind Token — 防止綁定流程中的帳號劫持攻擊
 *
 * 原理：
 * 1. 在 /api/line/bind/lookup 查詢手機號碼成功後，伺服器產生一個加密簽章的 bind_token
 *    其中包含「此次查詢准許綁定的 user ID 列表」與「LINE userId」
 * 2. 在 /api/line/bind 確認綁定時，後端驗證 bind_token，
 *    確保前端送來的 user_ids 全部在准許列表內，且操作者的 LINE userId 一致
 *
 * 格式：{payload_base64url}.{signature_base64url}
 * payload = JSON.stringify({ allowedIds, lineUserId, exp })
 */

function toBase64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function fromBase64url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((str.length * 3) % 4)
  return new Uint8Array([...atob(b64)].map((c) => c.charCodeAt(0)))
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

interface BindTokenPayload {
  /** 准許綁定的 user ID 列表 */
  allowedIds: string[]
  /** 操作者的 LINE userId（從 id_token 驗證取得） */
  lineUserId: string
  /** 過期時間 (Unix timestamp, 秒) */
  exp: number
}

const BIND_TOKEN_TTL = 10 * 60 // 10 分鐘

/**
 * 產生 bind_token
 * @param allowedIds 此次手機查詢結果中准許綁定的 user ID 列表
 * @param lineUserId 操作者已驗證的 LINE userId
 */
export async function createBindToken(allowedIds: string[], lineUserId: string): Promise<string> {
  const secret = process.env.INTERNAL_API_KEY
  if (!secret) throw new Error('INTERNAL_API_KEY not set')

  const payload: BindTokenPayload = {
    allowedIds,
    lineUserId,
    exp: Math.floor(Date.now() / 1000) + BIND_TOKEN_TTL,
  }

  const payloadStr = JSON.stringify(payload)
  const payloadB64 = toBase64url(new TextEncoder().encode(payloadStr))

  const key = await getHmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64))

  return `${payloadB64}.${toBase64url(sig)}`
}

interface VerifyBindTokenResult {
  valid: boolean
  error?: string
  payload?: BindTokenPayload
}

/**
 * 驗證 bind_token 並檢查 user_ids 是否全部在准許列表內
 * @param token bind_token 字串
 * @param requestedIds 前端送來要綁定的 user_ids
 * @param lineUserId 從 id_token 驗證取得的 LINE userId
 */
export async function verifyBindToken(
  token: string,
  requestedIds: string[],
  lineUserId: string
): Promise<VerifyBindTokenResult> {
  try {
    const secret = process.env.INTERNAL_API_KEY
    if (!secret) return { valid: false, error: '伺服器設定錯誤' }

    const dotIndex = token.lastIndexOf('.')
    if (dotIndex === -1) return { valid: false, error: '綁定憑證格式錯誤' }

    const payloadB64 = token.substring(0, dotIndex)
    const sigStr = token.substring(dotIndex + 1)

    // 1. 驗證簽章
    const key = await getHmacKey(secret)
    const sigBytes = fromBase64url(sigStr)
    const payloadBytes = new TextEncoder().encode(payloadB64)
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes.buffer as ArrayBuffer,
      payloadBytes
    )
    if (!isValid) return { valid: false, error: '綁定憑證簽章無效' }

    // 2. 解析 payload
    const payloadStr = new TextDecoder().decode(fromBase64url(payloadB64))
    const payload: BindTokenPayload = JSON.parse(payloadStr)

    // 3. 檢查過期
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return { valid: false, error: '綁定憑證已過期，請重新查詢手機號碼' }

    // 4. 檢查 LINE userId 是否一致（防止 A 用 B 的 token）
    if (payload.lineUserId !== lineUserId) {
      return { valid: false, error: '身份不一致，請重新操作' }
    }

    // 5. 檢查所有要綁定的 ID 是否都在准許列表內
    const allowedSet = new Set(payload.allowedIds)
    const unauthorizedIds = requestedIds.filter(id => !allowedSet.has(id))
    if (unauthorizedIds.length > 0) {
      console.warn('[verifyBindToken] Attempted to bind unauthorized IDs:', unauthorizedIds)
      return { valid: false, error: '包含未經授權的綁定對象' }
    }

    return { valid: true, payload }
  } catch (err) {
    console.error('[verifyBindToken] Error:', err)
    return { valid: false, error: '綁定憑證驗證失敗' }
  }
}
