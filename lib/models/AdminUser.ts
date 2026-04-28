import { Schema, models, model } from 'mongoose'

/**
 * AdminUser — LINE OA 系統管理員名單
 * 存放具有進入 /admin 權限的 LINE User ID
 */
const AdminUserSchema = new Schema(
  {
    line_user_id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    added_by: { type: String }, // 記錄是誰授權的 (例如: "initial_setup" 或另一個 admin_id)
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const AdminUser = models.AdminUser || model('AdminUser', AdminUserSchema)

export default AdminUser
