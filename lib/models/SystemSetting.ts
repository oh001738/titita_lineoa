import { Schema, models, model } from 'mongoose'

/**
 * SystemSetting — 系統全域設定
 * 用於存放如「推播開關」等動態設定
 */
const SystemSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
  },
  { timestamps: true }
)

const SystemSetting = models.SystemSetting || model('SystemSetting', SystemSettingSchema)

// 記憶體 cache：key → { value, cachedAt }
const _cache = new Map<string, { value: unknown; cachedAt: number }>()
const CACHE_TTL = 5_000 // 5 秒

/**
 * 取得設定的輔助函式（含 5 秒 cache，降低高頻推播時的 DB 壓力）
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const now = Date.now()
  const cached = _cache.get(key)
  if (cached && now - cached.cachedAt < CACHE_TTL) {
    return cached.value as T
  }

  const setting = await SystemSetting.findOne({ key })
  const value = setting ? (setting.value as T) : defaultValue
  _cache.set(key, { value, cachedAt: now })
  return value
}

/**
 * 更新設定的輔助函式
 */
export async function setSetting(key: string, value: unknown, description?: string) {
  return await SystemSetting.findOneAndUpdate(
    { key },
    { value, description },
    { upsert: true, returnDocument: 'after' }
  )
}

export default SystemSetting
