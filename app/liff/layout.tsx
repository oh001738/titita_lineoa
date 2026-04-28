import type { Metadata } from 'next'
import { LiffProvider } from '@/components/liff/LiffProvider'
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
    <LiffProvider>
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
        {children}
      </div>
    </LiffProvider>
  )
}
