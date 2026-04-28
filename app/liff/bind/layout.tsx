import type { Metadata } from 'next'
import { pageTitle, SCHOOL_NAME } from '@/lib/site-config'

export const metadata: Metadata = {
  title: pageTitle('帳號綁定'),
  description: `綁定您的 LINE 帳號以接收${SCHOOL_NAME}課程通知`,
}

export default function BindLayout({ children }: { children: React.ReactNode }) {
  return children
}
