/**
 * 啟動時環境變數驗證
 * 在第一個 API 請求前盡早發現設定錯誤
 * 使用方式：在 lib/db/mongoose.ts 或 app layout 頂層 import
 */

const REQUIRED_SERVER_VARS = [
  'MONGODB_URI',
  'INTERNAL_API_KEY',
  'LINE_CHANNEL_ID',
  'LINE_CHANNEL_SECRET',
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LIFF_ID'
] as const

let validated = false

export function validateEnv(): void {
  if (validated) return
  validated = true

  const missing: string[] = []

  for (const key of REQUIRED_SERVER_VARS) {
    if (!process.env[key]) missing.push(key)
  }


  if (missing.length > 0) {
    const msg = `[env] 缺少必要環境變數：${missing.join(', ')}`
    console.error(msg)
    // 只在真正缺失時 throw，MOCK_MODE 下放寬部分限制
    if (process.env.MOCK_MODE !== 'true') {
      const criticals = missing.filter((k) =>
        ['MONGODB_URI', 'INTERNAL_API_KEY', 'LINE_CHANNEL_SECRET', 'LINE_CHANNEL_ACCESS_TOKEN'].includes(k)
      )
      if (criticals.length > 0) {
        throw new Error(msg)
      }
    }
  }
}
