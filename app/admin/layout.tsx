'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import AdminLogoutButton from '@/components/admin/AdminLogoutButton'

const navItems = [
  { href: '/admin', label: '系統概覽', icon: '📊' },
  { href: '/admin/recipients', label: '綁定成員', icon: '👥' },
  { href: '/admin/logs/bind', label: '綁定日誌', icon: '🔗' },
  { href: '/admin/logs/notify', label: '推播紀錄', icon: '🔔' },
  { href: '/admin/notify', label: '發送通知', icon: '📣' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white flex flex-col
          transform transition-transform duration-200
          md:static md:translate-x-0 md:flex-shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-2xl">🎵</span>
            <span className="font-bold text-xl tracking-tight">LINE OA 管理</span>
          </div>

          <nav className="space-y-1">
            {navItems.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
              >
                {icon} {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800">
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← 返回首頁
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-8 flex-shrink-0 gap-4">
          {/* Hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="開啟選單"
          >
            <div className="w-5 h-0.5 bg-gray-700 mb-1"></div>
            <div className="w-5 h-0.5 bg-gray-700 mb-1"></div>
            <div className="w-5 h-0.5 bg-gray-700"></div>
          </button>

          <span className="font-semibold text-gray-800 md:hidden">🎵 LINE OA 管理</span>

          <div className="flex items-center gap-6 ml-auto">
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold uppercase hidden sm:inline-block">
              Admin Mode
            </span>
            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
            <AdminLogoutButton />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
