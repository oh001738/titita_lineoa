import type { Metadata } from 'next'
import { LiffProvider } from '@/components/liff/LiffProvider'
import { ToastProvider } from '@/components/liff/Toast'
import { ConfirmProvider } from '@/components/liff/ConfirmDialog'
import { SCHOOL_NAME } from '@/lib/site-config'

export const metadata: Metadata = {
  title: SCHOOL_NAME,
  description: `${SCHOOL_NAME} LINE 服務`,
}

export default function LiffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ConfirmProvider>
      <ToastProvider>
        <LiffProvider>
          <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
            {children}
          </div>
        </LiffProvider>
      </ToastProvider>
    </ConfirmProvider>
  )
}
