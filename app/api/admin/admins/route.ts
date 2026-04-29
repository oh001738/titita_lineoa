import { connectDB } from '@/lib/db/mongoose'
import AdminUser from '@/lib/models/AdminUser'
import { checkAdminAuth } from '@/lib/admin-session'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/admins
 * 列出所有管理員
 */
export async function GET() {
  const adminId = await checkAdminAuth()
  if (!adminId) {
    return Response.json({ data: null, error: '未經授權' }, { status: 401 })
  }

  try {
    await connectDB()
    const admins = await AdminUser.find({ is_active: true }).lean()
    return Response.json({ data: admins, error: null })
  } catch (err) {
    return Response.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}

/**
 * POST /api/admin/admins
 * 新增管理員 (從綁定日誌提升)
 */
export async function POST(request: Request) {
  const adminId = await checkAdminAuth()
  if (!adminId) {
    return Response.json({ data: null, error: '未經授權' }, { status: 401 })
  }

  try {
    const { line_user_id, name } = await request.json()

    if (!line_user_id || !name) {
      return Response.json({ data: null, error: '缺少必要資訊' }, { status: 400 })
    }

    await connectDB()
    
    // 檢查是否已存在
    const exists = await AdminUser.findOne({ line_user_id })
    if (exists) {
      if (!exists.is_active) {
        exists.is_active = true
        await exists.save()
        return Response.json({ data: { success: true }, error: null })
      }
      return Response.json({ data: null, error: '此用戶已經是管理員' }, { status: 400 })
    }

    await AdminUser.create({
      line_user_id,
      name,
      added_by: 'manual_promotion'
    })

    return Response.json({ data: { success: true }, error: null })
  } catch (err) {
    console.error('[Admin API] Error:', err)
    return Response.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/admins
 * 移除管理員權限
 */
export async function DELETE(request: Request) {
  const adminId = await checkAdminAuth()
  if (!adminId) {
    return Response.json({ data: null, error: '未經授權' }, { status: 401 })
  }

  try {
    const { line_user_id } = await request.json()
    await connectDB()
    await AdminUser.findOneAndUpdate({ line_user_id }, { is_active: false })
    return Response.json({ data: { success: true }, error: null })
  } catch (err) {
    return Response.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}
