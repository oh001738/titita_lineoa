/**
 * 全站共用設定
 * 透過環境變數控制，修改 .env.local 的 NEXT_PUBLIC_SCHOOL_NAME 即可套用到所有頁面
 */
export const SCHOOL_NAME = process.env.NEXT_PUBLIC_SCHOOL_NAME || '音樂補習班'

/** 格式化頁面標題：「頁面名稱 | 學校名稱」 */
export function pageTitle(page: string): string {
  return `${page} | ${SCHOOL_NAME}`
}
