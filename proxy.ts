import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-session'

/**
 * Middleware — 保護 /admin 路由
 * 安全：驗證 HMAC 簽名的 admin_token，防止偽造 cookie
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isApiRoute = pathname.startsWith('/api/admin')
  const isPage = pathname.startsWith('/admin')

  // 放行登入相關路由
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next()
  }

  if (isPage || isApiRoute) {
    const adminTokenCookie = request.cookies.get('admin_token')

    if (!adminTokenCookie?.value) {
      if (isApiRoute) {
        return NextResponse.json({ error: '未授權的存取' }, { status: 401 })
      }
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }

    // 驗證 HMAC 簽名，確保 token 未被偽造
    const adminId = await verifyAdminToken(adminTokenCookie.value)
    if (!adminId) {
      if (isApiRoute) {
        return NextResponse.json({ error: '登入憑證無效或已過期' }, { status: 401 })
      }
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
