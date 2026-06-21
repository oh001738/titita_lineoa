'use client'

import { useState, useEffect } from 'react'

interface BoundUser {
  _id: string
  name: string
  role: string
  line_user_id: string
  line_bound_at: string
  student_name: string | null
  line_name?: string | null
  is_admin?: boolean
}

export default function RecipientsPage() {
  const [users, setUsers] = useState<BoundUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [filter, setFilter] = useState('')
  const [adminBusy, setAdminBusy] = useState<string | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [recipientsRes, adminsRes] = await Promise.all([
        fetch('/api/admin/recipients'),
        fetch('/api/admin/admins'),
      ])
      const [recipientsResult, adminsResult] = await Promise.all([
        recipientsRes.json(),
        adminsRes.json(),
      ])

      const adminIds = new Set<string>(
        (adminsResult.data || []).map((a: any) => a.line_user_id)
      )

      if (recipientsResult.data?.users) {
        setUsers(
          recipientsResult.data.users.map((u: BoundUser) => ({
            ...u,
            is_admin: adminIds.has(u.line_user_id),
          }))
        )
      }
    } catch {
      alert('載入失敗')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    const lineIds = users.map(u => u.line_user_id).filter(id => !!id)
    if (lineIds.length === 0) return

    setIsSyncing(true)
    try {
      const res = await fetch('/api/admin/recipients/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_user_ids: lineIds }),
      })
      const result = await res.json()
      if (result.data) {
        await fetchData()
        alert('同步完成')
      }
    } catch {
      alert('同步失敗')
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleUnbind = async (user: BoundUser) => {
    if (!confirm(`確定要為 ${user.student_name || user.name} 解除 LINE 綁定嗎？`)) return

    try {
      const res = await fetch('/api/admin/recipients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user._id,
          line_user_id: user.line_user_id,
          name: user.student_name || user.name,
        }),
      })
      const result = await res.json()
      if (result.data?.success) {
        setUsers(prev => prev.filter(u => u._id !== user._id))
        alert('已解除綁定')
      } else {
        alert(result.error || '解綁失敗')
      }
    } catch {
      alert('網路錯誤')
    }
  }

  const handleToggleAdmin = async (user: BoundUser) => {
    const action = user.is_admin ? '移除管理員權限' : '設為管理員'
    if (!confirm(`確定要${action}：${user.name}？`)) return

    setAdminBusy(user._id)
    try {
      const res = await fetch('/api/admin/admins', {
        method: user.is_admin ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_user_id: user.line_user_id, name: user.name }),
      })
      const result = await res.json()
      if (result.data?.success) {
        setUsers(prev =>
          prev.map(u => u._id === user._id ? { ...u, is_admin: !user.is_admin } : u)
        )
      } else {
        alert(result.error || '操作失敗')
      }
    } catch {
      alert('網路錯誤')
    } finally {
      setAdminBusy(null)
    }
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(filter.toLowerCase()) ||
    u.student_name?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">綁定成員管理</h1>
        <p className="text-gray-500 text-sm">管理所有已連結 LINE OA 的系統成員</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="搜尋姓名、學生..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={isSyncing || isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 disabled:opacity-50 transition-all"
            >
              {isSyncing ? (
                <span className="w-3 h-3 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin" />
              ) : '🔄'}
              同步最新資訊
            </button>
            <button
              onClick={fetchData}
              className="text-gray-400 hover:text-indigo-600 transition-colors"
              title="重新整理"
            >
              🔁
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">成員 / 學生</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">身分</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">綁定時間</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-6 py-8">
                      <div className="h-4 bg-gray-50 animate-pulse rounded w-1/3" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                    {filter ? '找不到符合條件的成員' : '目前尚無任何綁定資料'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {user.student_name || user.name}
                          </span>
                          {user.line_name && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              LINE: {user.line_name}
                            </span>
                          )}
                        </div>
                        {user.student_name && user.name !== user.student_name && (
                          <span className="text-xs text-gray-400">家長：{user.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          user.role === 'teacher' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {user.role === 'teacher' ? '教師' : '家長/學生'}
                        </span>
                        {user.is_admin && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-700">
                            管理員
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500">
                        {user.line_bound_at ? new Date(user.line_bound_at).toLocaleString('zh-TW') : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.role === 'teacher' && (
                          <button
                            onClick={() => handleToggleAdmin(user)}
                            disabled={adminBusy === user._id}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                              user.is_admin
                                ? 'text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100'
                                : 'text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
                            }`}
                          >
                            {adminBusy === user._id ? '處理中...' : user.is_admin ? '移除管理員' : '設為管理員'}
                          </button>
                        )}
                        <button
                          onClick={() => handleUnbind(user)}
                          className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          解除綁定
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
