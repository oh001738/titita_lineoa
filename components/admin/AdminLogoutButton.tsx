'use client'

import { useRouter } from 'next/navigation'

export default function AdminLogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    if (!confirm('確定要登出管理系統嗎？')) return
    
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
      router.refresh()
    } catch (err) {
      alert('登出失敗')
    }
  }

  return (
    <button 
      onClick={handleLogout}
      className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
    >
      <span className="text-lg">🚪</span>
      登出
    </button>
  )
}
