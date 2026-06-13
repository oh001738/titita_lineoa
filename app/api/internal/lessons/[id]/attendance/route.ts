import { NextResponse } from 'next/server'
import { verifyLineIdToken } from '@/lib/line/verify-id-token'
import { verifyOwnership } from '@/lib/verify-ownership'

interface Params {
  params: Promise<{ id: string }>  // Next.js 15：params 為 Promise，需 await
}

// 共用：驗證 LINE 身分 + 教師帳號所有權，回傳 { ok } 或錯誤 Response
async function authorize(idToken: string | null, teacherUserId: string | null) {
  if (!idToken || !teacherUserId) {
    return { res: NextResponse.json({ data: null, error: 'Missing parameters' }, { status: 400 }) }
  }
  const verified = await verifyLineIdToken(idToken)
  if (!verified) {
    return { res: NextResponse.json({ data: null, error: '身份驗證失敗' }, { status: 401 }) }
  }
  const isOwner = await verifyOwnership(verified.userId, teacherUserId)
  if (!isOwner) {
    return { res: NextResponse.json({ data: null, error: '無權限操作此帳號' }, { status: 403 }) }
  }
  return { ok: true as const }
}

function mainSystem() {
  const url = process.env.MAIN_SYSTEM_URL
  const key = process.env.INTERNAL_API_KEY
  return { url: url?.replace(/\/$/, ''), key }
}

// GET：取得這堂課的學生 roster + 目前缺席名單
export async function GET(request: Request, { params }: Params) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const idToken = searchParams.get('id_token')
  const teacherUserId = searchParams.get('teacher_user_id')

  const auth = await authorize(idToken, teacherUserId)
  if (!auth.ok) return auth.res

  try {
    const { url, key } = mainSystem()
    if (!url || !key) return NextResponse.json({ data: null, error: '伺服器缺少設定檔' }, { status: 500 })

    const res = await fetch(
      `${url}/api/internal/lessons/${id}/attendance?teacher_user_id=${teacherUserId}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json', 'X-Internal-Key': key } }
    )
    return NextResponse.json(await res.json(), { status: res.status })
  } catch (err) {
    console.error('[attendance GET] Fetch error:', err)
    return NextResponse.json({ data: null, error: '主系統串接失敗' }, { status: 500 })
  }
}

// PATCH：標記這堂課的缺席學生（body: { absent_student_ids: string[] }）
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const idToken = searchParams.get('id_token')
  const teacherUserId = searchParams.get('teacher_user_id')

  const auth = await authorize(idToken, teacherUserId)
  if (!auth.ok) return auth.res

  try {
    const body = await request.json()
    const { url, key } = mainSystem()
    if (!url || !key) return NextResponse.json({ data: null, error: '伺服器缺少設定檔' }, { status: 500 })

    const res = await fetch(
      `${url}/api/internal/lessons/${id}/attendance?teacher_user_id=${teacherUserId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Key': key },
        body: JSON.stringify({ absent_student_ids: body.absent_student_ids }),
      }
    )
    return NextResponse.json(await res.json(), { status: res.status })
  } catch (err) {
    console.error('[attendance PATCH] Fetch error:', err)
    return NextResponse.json({ data: null, error: '主系統串接失敗' }, { status: 500 })
  }
}
