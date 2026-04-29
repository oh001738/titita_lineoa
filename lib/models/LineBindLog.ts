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
    line_name: { type: String, default: null }, // 新增：LINE 顯示名稱
    student_name: { type: String, default: null }, // 新增：對應的學生姓名
    action: { type: String, enum: Object.values(BIND_ACTIONS), required: true },
    operator: { type: String, enum: Object.values(BIND_OPERATORS), required: true },
    operator_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    phone_used: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

// 建立複合索引以優化統計數據的聚合查詢效能
LineBindLogSchema.index({ user_id: 1, line_user_id: 1, createdAt: -1 })
LineBindLogSchema.index({ action: 1, createdAt: -1 }) // 優化今日新增統計

const LineBindLog = models.LineBindLog || model('LineBindLog', LineBindLogSchema)
export default LineBindLog
