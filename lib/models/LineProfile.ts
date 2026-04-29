import { Schema, models, model } from 'mongoose'

/**
 * LineProfile — 快取使用者的 LINE 個人檔案資訊
 * 用於在後台顯示頭像與暱稱，不需每次都調用 LINE API
 */
const LineProfileSchema = new Schema(
  {
    line_user_id: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, default: '' },
    pictureUrl: { type: String, default: '' },
    statusMessage: { type: String, default: '' },
    lastUpdated: { type: Date, default: Date.now }
  },
  { timestamps: true }
)

const LineProfile = models.LineProfile || model('LineProfile', LineProfileSchema)
export default LineProfile
