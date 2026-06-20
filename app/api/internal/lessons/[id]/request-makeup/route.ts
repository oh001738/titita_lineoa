export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { verifyLineIdToken } from '@/lib/line/verify-id-token'
import { verifyOwnership } from '@/lib/verify-ownership'

interface Params {
  params: Promise<{ id: string }>  // Next.js 15：params 為 Promise，需 await
}

function mainSystem() {
  const url = process.env.MAIN_SYSTEM_URL
  const key = process.env.INTERNAL_API_KEY
  return { url: url?.replace(/\/$/, ''), key }
}

// POST：老師為缺席學生登記/取消「需補課」
// body: { id_token, teacher_user_id, student_id, action?: 'create' | 'cancel' }
export async function POST(request: Request, { params }: Params) {
  const { id } = await params

  try {
    const body = await request.json()
    const { id_token, teacher_user_id, student_id, action } = body

    if (!id_token || !teacher_user_id || !student_id) {
      return NextResponse.json({ data: null, error: 'Missing parameters' }, { status: 400 })
    }

    const verified = await verifyLineIdToken(id_token)
    if (!verified) {
      return NextResponse.json({ data: null, error: '身份驗證失敗' }, { status: 401 })
    }
    const isOwner = await verifyOwnership(verified.userId, teacher_user_id)
    if (!isOwner) {
      return NextResponse.json({ data: null, error: '無權限操作此帳號' }, { status: 403 })
    }

    const { url, key } = mainSystem()
    if (!url || !key) return NextResponse.json({ data: null, error: '伺服器缺少設定檔' }, { status: 500 })

    const res = await fetch(`${url}/api/internal/lessons/${id}/request-makeup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': key },
      body: JSON.stringify({ teacher_user_id, student_id, action: action ?? 'create' }),
    })
    return NextResponse.json(await res.json(), { status: res.status })
  } catch (err) {
    console.error('[request-makeup POST] Fetch error:', err)
    return NextResponse.json({ data: null, error: '主系統串接失敗' }, { status: 500 })
  }
}
