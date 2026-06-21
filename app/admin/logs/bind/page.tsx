'use client'

import { useState, useEffect } from 'react'
import type { LineBindLog } from '@/types'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  bind:   { label: '綁定', color: 'bg-green-100 text-green-700' },
  unbind: { label: '解除綁定', color: 'bg-red-100 text-red-700' },
}

const OPERATOR_LABELS: Record<string, string> = {
  self:   '本人',
  admin:  '管理員',
  system: '系統',
}

export default function BindLogsPage() {
  const [logs, setLogs] = useState<LineBindLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/logs/bind')
      .then(r => r.json())
      .then(d => { if (d.data) setLogs(d.data) })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">綁定日誌</h1>
        <p className="text-gray-500 text-sm">追蹤使用者綁定與解除綁定的行為</p>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">載入中...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">尚無紀錄</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const a = ACTION_LABELS[log.action] ?? { label: log.action, color: 'bg-gray-100 text-gray-600' }
                        return (
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${a.color}`}>
                            {a.label}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-400 truncate max-w-[100px]">
                      {log.user_id}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-400 truncate max-w-[100px]" title={log.line_user_id}>
                      {log.line_user_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {OPERATOR_LABELS[log.operator] ?? log.operator}
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
