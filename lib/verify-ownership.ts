/**
 * 所有權驗證 — 確認 LINE 使用者是否擁有操作目標 user_id 的權限
 *
 * 用途：防止 IDOR（不安全的直接對象引用）攻擊
 * 例如：使用者 A 拿自己的 id_token 去查詢/操作使用者 B 的資料
 *
 * 原理：
 * 1. 從 id_token 取得已驗證的 lineUserId
 * 2. 呼叫主系統 API 查詢該 lineUserId 綁定了哪些帳號
 * 3. 檢查目標 user_id 是否在綁定清單內
 */

import { lookupUsersByLineId } from './main-system-client'

/**
 * 驗證 lineUserId 是否擁有操作 targetUserId 的權限
 * @param lineUserId 已驗證的 LINE userId（從 id_token 取得）
 * @param targetUserId 要操作的目標 user_id
 * @returns true = 有權限，false = 無權限
 */
export async function verifyOwnership(
  lineUserId: string,
  targetUserId: string
): Promise<boolean> {
  try {
    // MOCK_MODE 下放行
    if (process.env.MOCK_MODE === 'true') {
      return true
    }

    const result = await lookupUsersByLineId(lineUserId)

    if (!result.data || !result.data.users) {
      return false
    }

    // 檢查目標 user_id 是否在該 LINE 帳號綁定的使用者列表中
    return result.data.users.some(user => user._id === targetUserId)
  } catch (err) {
    console.error('[verifyOwnership] Error:', err)
    return false
  }
}
