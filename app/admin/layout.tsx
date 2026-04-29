import Link from 'next/link'
import AdminLogoutButton from '@/components/admin/AdminLogoutButton'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-2xl">🎵</span>
            <span className="font-bold text-xl tracking-tight">LINE OA 管理</span>
          </div>
          
          <nav className="space-y-1">
            <Link 
              href="/admin" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
            >
              📊 系統概覽
            </Link>
            <Link 
              href="/admin/recipients" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
            >
              👥 綁定成員
            </Link>
            <Link 
              href="/admin/logs/bind" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
            >
              🔗 綁定日誌
            </Link>
            <Link 
              href="/admin/logs/notify" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
            >
              🔔 推播紀錄
            </Link>
            <Link 
              href="/admin/notify" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
            >
              📣 發送通知
            </Link>
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
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0">
          <h2 className="font-semibold text-gray-800 md:hidden flex items-center gap-2">
             🎵 LINE OA 管理
          </h2>
          <div className="flex items-center gap-6 ml-auto">
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold uppercase hidden sm:inline-block">
              Admin Mode
            </span>
            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
            <AdminLogoutButton />
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
