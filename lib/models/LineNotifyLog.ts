import { Schema, models, model } from 'mongoose'
import { NOTIFY_TYPES, NOTIFY_STATUS } from '@/lib/constants'

/**
 * LineNotifyLog — 推播紀錄
 * 每次推播都留一筆 log，記錄成功/失敗狀態
 */
const LineNotifyLogSchema = new Schema(
  {
    user_id: { type: String, required: true, index: true },
    line_user_id: { type: String, required: true },
    student_name: { type: String, required: true },
    notify_type: { type: String, enum: Object.values(NOTIFY_TYPES), required: true },
    message_content: { type: String, required: true },
    status: { type: String, enum: Object.values(NOTIFY_STATUS), default: NOTIFY_STATUS.PENDING },
    error_message: { type: String, default: null },
    line_request_id: { type: String, default: null },
  },
  { timestamps: true }
)

LineNotifyLogSchema.index({ user_id: 1, createdAt: -1 })
LineNotifyLogSchema.index({ status: 1, createdAt: -1 })
// TTL：自動刪除 180 天前的紀錄，避免無限累積
LineNotifyLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 })

const LineNotifyLog = models.LineNotifyLog || model('LineNotifyLog', LineNotifyLogSchema)
export default LineNotifyLog
