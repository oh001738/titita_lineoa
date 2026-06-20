import { connectDB } from '@/lib/db/mongoose'
import SystemSetting, { getSetting, setSetting } from '@/lib/models/SystemSetting'
import { clearSettingsCache } from '@/lib/line/push'
import { checkAdminAuth } from '@/lib/admin-session'
import type { ApiResponse } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings
 * 取得系統設定
 */
export async function GET() {
  const adminId = await checkAdminAuth()
  if (!adminId) {
    return Response.json({ data: null, error: '未經授權' }, { status: 401 })
  }

  try {
    await connectDB()
    const isPushEnabled = await getSetting('is_push_enabled', true)
    const enabledNotifies = await getSetting('enabled_notifies', {
      leave_approved: true,
      leave_rejected: true,
      makeup_arranged: true,
      course_change: true,
      new_term: true,
      term_expiring: true,
      tuition_reminder: true,
      tuition_received: true,
      points_earned: true,
      broadcast: true,
      bind_success: true
    })
    
    return Response.json({
      data: { 
        is_push_enabled: isPushEnabled,
        enabled_notifies: enabledNotifies
      },
      error: null
    })
  } catch (err) {
    return Response.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/settings
 * 更新系統設定
 */
export async function PATCH(request: Request) {
  const adminId = await checkAdminAuth()
  if (!adminId) {
    return Response.json({ data: null, error: '未經授權' }, { status: 401 })
  }

  try {
    const { is_push_enabled, enabled_notifies } = await request.json()
    
    await connectDB()
    if (is_push_enabled !== undefined) {
      await setSetting('is_push_enabled', is_push_enabled, '推播總開關')
    }
    if (enabled_notifies !== undefined) {
      await setSetting('enabled_notifies', enabled_notifies, '推播細項開關')
    }

    // 設定更新後清除 push.ts 的 settings cache，讓下次推播立即套用新設定
    clearSettingsCache()

    return Response.json({
      data: { success: true },
      error: null
    })
  } catch (err) {
    return Response.json({ data: null, error: '伺服器錯誤' }, { status: 500 })
  }
}
