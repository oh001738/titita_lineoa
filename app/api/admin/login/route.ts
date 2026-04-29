import { connectDB } from '@/lib/db/mongoose'
import AdminUser from '@/lib/models/AdminUser'
import { verifyLineIdToken } from '@/lib/line/verify-id-token'
import { createAdminToken } from '@/lib/admin-session'
import type { ApiResponse } from '@/types'
import { cookies } from 'next/headers'
import { isRateLimited } from '@/lib/rate-limit'
import { RATE_LIMIT } from '@/lib/constants'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/login
 * 管理員登入驗證
 * 安全：LINE 登入必須驗證 idToken，不信任前端傳來的 userId
 *       Cookie 改用 HMAC 簽名 token，防止偽造
 */
export async function POST(request: Request) {
  try {
    const { id_token, master_password, username, password } = await request.json()

    // ── 0. 速率限制 ──
    const rateLimitKey = username ? `login_${username}` : `login_token_${id_token?.slice(-10)}`
    if (isRateLimited(rateLimitKey, RATE_LIMIT.LOGIN_MAX, RATE_LIMIT.LOGIN_WINDOW)) {
      return Response.json({ data: null, error: '嘗試次數過多，請於 15 分鐘後再試' }, { status: 429 })
    }

    // ── 1. 帳密手動登入 ──
    if (username && password) {
      const envUser = process.env.ADMIN_USER
      const envPass = process.env.ADMIN_PASS

      if (!envUser || !envPass) {
        console.error('[Login API] ADMIN_USER or ADMIN_PASS is not set')
        return Response.json({ data: null, error: '伺服器未設定管理員帳密，請聯絡開發人員' }, { status: 500 })
      }

      if (username.trim() === envUser && password.trim() === envPass) {
        const token = await createAdminToken('manual_admin')
        const cookieStore = await cookies()
        cookieStore.set('admin_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24,
          path: '/',
        })
        return Response.json({ data: { success: true, name: '系統管理員' }, error: null })
      }

      console.warn('[Login API] Manual login failed for:', username)
      return Response.json({ data: null, error: '帳號或密碼錯誤' }, { status: 401 })
    }

    // ── 2. LINE 登入（驗證 idToken）──
    if (id_token) {
      // 驗證 idToken，取得真實的 LINE userId
      const verified = await verifyLineIdToken(id_token)
      if (!verified) {
        return Response.json({ data: null, error: 'LINE 身份驗證失敗' }, { status: 401 })
      }
      const line_user_id = verified.userId

      await connectDB()

      let admin = await AdminUser.findOne({ line_user_id, is_active: true })

      // 初次設定：用 master_password 自動升格
      if (!admin && master_password && master_password === process.env.INTERNAL_API_KEY) {
        console.log('[Login API] Master Setup triggered for:', line_user_id)
        admin = await AdminUser.create({
          line_user_id,
          name: verified.name || '初始管理員',
          added_by: 'master_password',
        })
      }

      if (!admin) {
        console.warn('[Login API] Unauthorized LINE ID:', line_user_id)
        return Response.json({ data: null, error: '您沒有管理員權限' }, { status: 403 })
      }

      const token = await createAdminToken(line_user_id)
      const cookieStore = await cookies()
      cookieStore.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      })

      return Response.json({ data: { success: true, name: admin.name }, error: null })
    }

    return Response.json({ data: null, error: '缺少登入資訊' }, { status: 400 })
  } catch (err) {
    console.error('[Login API] Error:', err)
    return Response.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}
