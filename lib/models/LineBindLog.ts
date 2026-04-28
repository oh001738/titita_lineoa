import { Schema, models, model } from 'mongoose'
import { BIND_ACTIONS, BIND_OPERATORS } from '@/lib/constants'

/**
 * LineBindLog — 綁定/解綁操作紀錄
 * 每次綁定或解綁都留一筆 log，便於追蹤與除錯
 */
const LineBindLogSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    line_user_id: { type: String, required: true, index: true },
    action: { type: String, enum: Object.values(BIND_ACTIONS), required: true },
    operator: { type: String, enum: Object.values(BIND_OPERATORS), required: true },
    operator_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    phone_used: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

const LineBindLog = models.LineBindLog || model('LineBindLog', LineBindLogSchema)
export default LineBindLog
