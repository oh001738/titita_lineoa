import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db/mongoose'

export async function GET() {
  try {
    // 1. 檢查 MongoDB 狀態
    await connectDB()
    const dbStatus = mongoose.connection.readyState === 1

    // 2. 檢查主系統連線 (Heartbeat)
    let mainSystemStatus = false
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3秒逾時
      
      const res = await fetch(`${process.env.MAIN_SYSTEM_URL}/api/internal/users/bound-students?line_user_id=test`, {
        headers: { 'X-Internal-Key': process.env.INTERNAL_API_KEY || '' },
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      // 只要主系統有回應 (即使是 200 或 404)，代表伺服器是活著的
      if (res.status !== 502 && res.status !== 504) {
        mainSystemStatus = true
      }
    } catch (e) {
      mainSystemStatus = false
    }

    // 3. LINE API 狀態 (目前暫時以 Token 是否存在判定，未來可加入更深層檢查)
    const lineStatus = !!process.env.LINE_CHANNEL_ACCESS_TOKEN

    return NextResponse.json({
      data: {
        line_api: lineStatus,
        main_system: mainSystemStatus,
        mongodb: dbStatus
      }
    })
  } catch (err) {
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 })
  }
}
