import type { Metadata } from 'next'
import { pageTitle, SCHOOL_NAME } from '@/lib/site-config'

export const metadata: Metadata = {
  title: pageTitle('我的點數'),
  description: `查看您在${SCHOOL_NAME}的點數紀錄與兌換`,
}

export default function PointsLayout({ children }: { children: React.ReactNode }) {
  return children
}
