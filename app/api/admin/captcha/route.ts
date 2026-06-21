import { createChallenge, sha } from 'altcha/lib'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hmacKey = process.env.ALTCHA_HMAC_KEY
  if (!hmacKey) {
    return Response.json({ error: 'ALTCHA_HMAC_KEY not set' }, { status: 500 })
  }
  const challenge = await createChallenge({
    algorithm: 'SHA-256',
    cost: 50_000,
    deriveKey: sha.deriveKey,
    hmacSignatureSecret: hmacKey,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  })
  return Response.json(challenge)
}
