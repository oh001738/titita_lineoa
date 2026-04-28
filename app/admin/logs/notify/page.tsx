'use client'

import { useState, useEffect } from 'react'
import type { LineNotifyLog } from '@/types'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  sent:    { label: '已發送', color: 'bg-green-100 text-green-700' },
  failed:  { label: '失敗',   color: 'bg-red-100 text-red-700' },
  pending: { label: '等待中', color: 'bg-yellow-100 text-yellow-700' },
  skipped: { label: '已略過', color: 'bg-gray-100 text-gray-500' },
}

const NOTIFY_TYPE_LABELS: Record<string, string> = {
  leave_approved:   '請假核准',
  leave_rejected:   '請假馳回',
  makeup_arranged:  '補課安排',
  course_change:    '課程變動',
  tuition_reminder: '學費提醒',
  tuition_received: '學費收訖',
  points_earned:    '點數獎勵',
  broadcast:        '廣播公告',
  bind_success:     '帳號綁定成功',
}

export default function NotifyLogsPage() {
  const [logs, setLogs] = useState<LineNotifyLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetch('/api/admin/logs/notify?limit=100')
      .then(res => res.json())
      .then(result => {
        if (result.data?.logs) {
          setLogs(result.data.logs)
          setTotal(result.data.pagination?.total ?? 0)
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">推播紀錄</h1>
          <p className="text-gray-500 text-sm">共 {total} 筆紀錄（顯示最近 100 筆）</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">時間</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">狀態</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">學生</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">類型</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">內容摘要</th>
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
                        const s = STATUS_LABELS[log.status] ?? { label: log.status, color: 'bg-gray-100 text-gray-600' }
                        return (
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${s.color}`}>
                            {s.label}
                          </span>
                        )
                      })()}
                      {log.error_message && (
                        <p className="text-[10px] text-red-500 mt-1 max-w-[150px] truncate" title={log.error_message}>
                          {log.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">
                      {log.student_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {NOTIFY_TYPE_LABELS[log.notify_type] ?? log.notify_type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 max-w-[300px] truncate" title={log.message_content}>
                      {log.message_content}
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
