/**
 * LINE ID Token 驗證
 * 用 LINE OAuth verify endpoint 確認 LIFF 傳來的 id_token 是合法的
 * 並從中取出 sub（= LINE userId），避免前端偽造 userId
 */

interface LineIdTokenPayload {
  iss: string
  sub: string      // LINE userId
  aud: string      // channel ID
  exp: number
  iat: number
  name?: string
  picture?: string
}

interface VerifyResult {
  userId: string
  name?: string
  picture?: string
}

export async function verifyLineIdToken(idToken: string): Promise<VerifyResult | null> {
  // MOCK_MODE 直接放行，不呼叫 LINE API
  if (process.env.MOCK_MODE === 'true' && idToken === 'MOCK_ID_TOKEN') {
    return { userId: 'U1234567890mockuser', name: '開發測試員' }
  }

  const mainChannelId = process.env.LINE_CHANNEL_ID
  const liffId = process.env.LIFF_ID
  
  // 優先使用 LIFF ID 的前綴作為驗證用的 Channel ID (client_id)
  // 如果 LIFF 與 Messaging API 屬於不同 Channel，必須用 LIFF 的 Channel ID 驗證 idToken
  const verifyChannelId = liffId?.includes('-') ? liffId.split('-')[0] : mainChannelId

  if (!verifyChannelId) {
    console.error('[verifyLineIdToken] LINE_CHANNEL_ID or LIFF_ID not set')
    return null
  }

  try {
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: verifyChannelId }),
    })

    if (!res.ok) {
      console.warn('[verifyLineIdToken] LINE verify API returned', res.status)
      return null
    }

    const payload = (await res.json()) as LineIdTokenPayload

    // 基本合理性檢查
    if (!payload.sub || payload.aud !== verifyChannelId) {
      console.warn('[verifyLineIdToken] Invalid payload (audience mismatch):', {
        expected: verifyChannelId,
        actual: payload.aud,
        sub: payload.sub
      })
      return null
    }

    // 檢查過期時間
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      console.warn('[verifyLineIdToken] Token has expired:', { exp: payload.exp, now: now })
      return null
    }

    return { userId: payload.sub, name: payload.name, picture: payload.picture }
  } catch (err) {
    console.error('[verifyLineIdToken] Error:', err)
    return null
  }
}
