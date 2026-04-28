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

  const channelId = process.env.LINE_CHANNEL_ID
  if (!channelId) {
    console.error('[verifyLineIdToken] LINE_CHANNEL_ID not set')
    return null
  }

  try {
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
    })

    if (!res.ok) {
      console.warn('[verifyLineIdToken] LINE verify API returned', res.status)
      return null
    }

    const payload = (await res.json()) as LineIdTokenPayload

    // 基本合理性檢查
    if (!payload.sub || payload.aud !== channelId) {
      console.warn('[verifyLineIdToken] Invalid payload:', payload)
      return null
    }

    return { userId: payload.sub, name: payload.name, picture: payload.picture }
  } catch (err) {
    console.error('[verifyLineIdToken] Error:', err)
    return null
  }
}
