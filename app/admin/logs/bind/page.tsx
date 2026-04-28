'use client'

import { useState, useEffect } from 'react'
import type { LineBindLog } from '@/types'

export default function BindLogsPage() {
  const [logs, setLogs] = useState<LineBindLog[]>([])
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [logsRes, adminsRes] = await Promise.all([
        fetch('/api/admin/logs/bind'),
        fetch('/api/admin/admins')
      ])
      
      const logsData = await logsRes.json()
      const adminsData = await adminsRes.json()
      
      if (logsData.data) setLogs(logsData.data)
      if (adminsData.data) {
        setAdminIds(new Set(adminsData.data.map((a: any) => a.line_user_id)))
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handlePromote = async (lineUserId: string, name: string) => {
    if (!confirm(`確定要將「${name}」設為系統管理員嗎？\n這將賦予該 LINE 帳號進入此後台的權限。`)) return

    setIsProcessing(lineUserId)
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_user_id: lineUserId, name })
      })
      const result = await res.json()
      if (result.error) {
        alert(result.error)
      } else {
        alert('設定成功！')
        fetchData()
      }
    } catch {
      alert('網路錯誤')
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">綁定日誌</h1>
          <p className="text-gray-500 text-sm">追蹤使用者綁定與解除綁定的行為</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">時間</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">動作</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">使用者 ID</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">LINE ID</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">操作者</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">權限管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">載入中...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">尚無紀錄</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        log.action === 'bind' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-400 truncate max-w-[100px]">
                      {log.user_id}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-400 truncate max-w-[100px]" title={log.line_user_id}>
                      {log.line_user_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.operator}
                    </td>
                    <td className="px-6 py-4">
                      {log.action === 'bind' && (
                        adminIds.has(log.line_user_id) ? (
                          <span className="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-1 rounded font-bold">
                            已是管理員
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePromote(log.line_user_id, '從日誌提升')}
                            disabled={!!isProcessing}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline disabled:opacity-50"
                          >
                            {isProcessing === log.line_user_id ? '處理中...' : '提升為管理員'}
                          </button>
                        )
                      )}
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
