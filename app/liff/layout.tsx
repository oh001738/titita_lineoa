import type { Metadata } from 'next'
import { LiffProvider } from '@/components/liff/LiffProvider'

export const metadata: Metadata = {
  title: '音樂補習班 LINE 帳號綁定',
  description: '綁定您的 LINE 帳號以接收課程通知',
}

export default function LiffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LiffProvider>
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
        {children}
      </div>
    </LiffProvider>
  )
}
