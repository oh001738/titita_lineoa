import { connectDB } from '@/lib/db/mongoose'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 * 健康檢查端點（含 DB 連線檢查）
 */
export async function GET() {
  try {
    await connectDB()
    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'titita-lineoa',
    })
  } catch (err) {
    return Response.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
