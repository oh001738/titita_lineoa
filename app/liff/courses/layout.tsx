import type { Metadata } from 'next'
import { pageTitle, SCHOOL_NAME } from '@/lib/site-config'

export const metadata: Metadata = {
  title: pageTitle('我的課程'),
  description: `查看您在${SCHOOL_NAME}的課程安排`,
}

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children
}
