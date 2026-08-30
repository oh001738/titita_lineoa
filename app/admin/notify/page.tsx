'use client'

import { useState, useEffect } from 'react'

type Tab = 'broadcast' | 'individual' | 'multiselect' | 'test'

interface Recipient {
  line_user_id: string
  _id: string
  name: string
  line_name?: string
  student_name?: string
  last_updated: string
}

const NOTIFY_TYPE_LABELS: Record<string, string> = {
  leave_approved: '請假核准通知',
  leave_requested: '請假申請通知（老師／管理員）',
  leave_rejected: '請假駁回通知',
  makeup_arranged: '補課安排通知',
  course_change: '課程異動通知',
  new_term: '期繳開課通知',
  term_expiring: '期繳到期提醒',
  tuition_reminder: '學費繳費提醒',
  tuition_received: '學費收訖通知',
  tuition_notice: '學費繳費單通知',
  class_reminder: '上課前提醒',
  points_earned: '點數獎勵通知',
  broadcast: '廣播公告',
  bind_success: '帳號綁定成功',
}

export default function AdminNotifyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('broadcast')
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true)

  // 廣播 / 多選 / 個別 states
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [targetLineId, setTargetLineId] = useState('')
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([])
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<{ success: number; total: number } | null>(null)

  // 試發 states
  const [testLineId, setTestLineId] = useState('')
  const [testNotifyType, setTestNotifyType] = useState('broadcast')
  const [testStudentName, setTestStudentName] = useState('測試學生')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/recipients')
      .then((res) => res.json())
      .then((r) => { if (r.data?.users) setRecipients(r.data.users) })
      .finally(() => setIsLoadingRecipients(false))
  }, [])

  const toggleSelection = (id: string) => {
    setSelectedLineIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  // ── 推播發送（廣播 / 多選 / 個別）──
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message) return alert('請輸入訊息內容')
    if (activeTab === 'multiselect' && selectedLineIds.length === 0) return alert('請至少選擇一位接收者')

    setIsSending(true)
    setResult(null)

    try {
      let endpoint = ''
      let body: any = {}

      if (activeTab === 'broadcast') {
        endpoint = '/api/admin/broadcast'
        body = {
          recipients: recipients.map((r) => ({ line_user_id: r.line_user_id, user_id: r._id, student_name: '系統公告對象' })),
          title: title || '系統公告',
          message,
        }
      } else if (activeTab === 'multiselect') {
        endpoint = '/api/admin/broadcast'
        body = {
          recipients: recipients
            .filter((r) => selectedLineIds.includes(r.line_user_id))
            .map((r) => ({ line_user_id: r.line_user_id, user_id: r._id, student_name: '系統通知' })),
          title: title || '系統通知',
          message,
        }
      } else {
        endpoint = '/api/admin/broadcast'
        const target = recipients.find((r) => r.line_user_id === targetLineId)
        body = {
          recipients: target ? [{ line_user_id: target.line_user_id, user_id: target._id, student_name: '個別通知' }] : [],
          title: title || '個別通知',
          message,
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else {
        setResult({ success: data.data.success, total: data.data.total })
        setMessage('')
      }
    } catch {
      alert('發送失敗，請檢查網路連線')
    } finally {
      setIsSending(false)
    }
  }

  // ── 試發推播 ──
  const handleTestPush = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testLineId.trim()) return alert('請輸入目標 LINE User ID')

    setIsTesting(true)
    setTestResult(null)

    try {
      const res = await fetch('/api/admin/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_user_id: testLineId.trim(),
          notify_type: testNotifyType,
          student_name: testStudentName.trim() || '測試學生',
        }),
      })
      const data = await res.json()
      if (data.error) {
        setTestResult({ success: false, message: data.error })
      } else if (data.data?.skipped) {
        setTestResult({ success: false, message: '推播已跳過（推播開關已關閉）' })
      } else {
        setTestResult({ success: true, message: '試發成功！請查看目標 LINE 帳號' })
      }
    } catch {
      setTestResult({ success: false, message: '網路錯誤，請稍後再試' })
    } finally {
      setIsTesting(false)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'broadcast', label: `📢 全體廣播 (${recipients.length})` },
    { key: 'multiselect', label: `☑️ 多選推播 (${selectedLineIds.length})` },
    { key: 'individual', label: '👤 個別推播' },
    { key: 'test', label: '🧪 試發測試' },
  ]

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">發送通知工具</h1>
        <p className="text-gray-500">手動向 LINE 使用者推播即時訊息</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setResult(null); setTestResult(null) }}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 試發 Tab ── */}
      {activeTab === 'test' ? (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
            <strong>試發測試：</strong>選擇通知類型，輸入目標 LINE User ID（通常是您自己），確認推播模板與 LINE Token 設定正確。
            試發紀錄會寫入 LineNotifyLog 以供追蹤。
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <form onSubmit={handleTestPush} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">通知類型</label>
                <select
                  value={testNotifyType}
                  onChange={(e) => setTestNotifyType(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  {Object.entries(NOTIFY_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">目標 LINE User ID</label>
                <input
                  type="text"
                  value={testLineId}
                  onChange={(e) => setTestLineId(e.target.value)}
                  placeholder="Uxxxxxxxxxx（填入要接收測試訊息的 LINE 帳號 ID）"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                />
                {recipients.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs text-gray-400 mb-1">或從已綁定名單選擇：</p>
                    <select
                      onChange={(e) => setTestLineId(e.target.value)}
                      defaultValue=""
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
                    >
                      <option value="" disabled>-- 選擇已綁定使用者 --</option>
                      {recipients.map((r) => (
                        <option key={r.line_user_id} value={r.line_user_id}>
                          {r.student_name || r.name}{r.line_name ? ` (${r.line_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">學生姓名（模板用）</label>
                <input
                  type="text"
                  value={testStudentName}
                  onChange={(e) => setTestStudentName(e.target.value)}
                  placeholder="測試學生"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isTesting}
                className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isTesting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    發送中...
                  </>
                ) : (
                  '🧪 發送測試訊息'
                )}
              </button>
            </form>

            {testResult && (
              <div className={`mt-6 p-4 rounded-xl border flex items-center gap-3 ${
                testResult.success
                  ? 'bg-green-50 border-green-100 text-green-800'
                  : 'bg-red-50 border-red-100 text-red-800'
              }`}>
                <span className="text-2xl">{testResult.success ? '✅' : '❌'}</span>
                <p className="text-sm font-medium">{testResult.message}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── 廣播 / 多選 / 個別 Tab ── */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSend} className="space-y-6">
            {activeTab === 'individual' && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">選擇接收者</label>
                <select
                  value={targetLineId}
                  onChange={(e) => setTargetLineId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                >
                  <option value="">-- 請選擇單一已綁定對象 --</option>
                  {recipients.map((r) => (
                    <option key={r.line_user_id} value={r.line_user_id}>
                      {r.student_name || r.name}{r.line_name ? ` (${r.line_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'multiselect' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">選擇接收者</label>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none text-sm"
                      onChange={(e) => {
                        const id = e.target.value
                        if (id && !selectedLineIds.includes(id)) setSelectedLineIds([...selectedLineIds, id])
                        e.target.value = ''
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>-- 點擊選擇 --</option>
                      {recipients
                        .filter((r) => !selectedLineIds.includes(r.line_user_id))
                        .map((r) => (
                          <option key={r.line_user_id} value={r.line_user_id}>
                            {r.student_name || r.name}{r.line_name ? ` (${r.line_name})` : ''}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setSelectedLineIds(recipients.map((r) => r.line_user_id))}
                      className="px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 whitespace-nowrap"
                    >
                      加入全部
                    </button>
                  </div>
                </div>
                <div className="min-h-[80px] p-3 bg-white border border-gray-200 rounded-xl flex flex-wrap gap-2">
                  {selectedLineIds.length === 0 ? (
                    <span className="text-sm text-gray-400 py-1">尚未選擇...</span>
                  ) : (
                    selectedLineIds.map((id) => {
                      const r = recipients.find(x => x.line_user_id === id)
                      const label = r
                        ? `${r.student_name || r.name}${r.line_name ? ` (${r.line_name})` : ''}`
                        : id.substring(0, 8)
                      return (
                        <span key={id} className="inline-flex items-center bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs rounded-full px-3 py-1.5">
                          {label}
                          <button type="button" onClick={() => toggleSelection(id)} className="ml-2 hover:text-red-600">✕</button>
                        </span>
                      )
                    })
                  )}
                </div>
                {selectedLineIds.length > 0 && (
                  <button type="button" onClick={() => setSelectedLineIds([])} className="text-xs text-red-500 hover:underline">
                    清空全部
                  </button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">通知標題</label>
              <input
                type="text"
                placeholder="例如：緊急停課通知"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">訊息內容</label>
              <textarea
                rows={5}
                placeholder="請輸入要傳送的訊息..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                required
              />
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-amber-600">⚠️ 此操作將消耗 LINE 訊息額度</p>
              <button
                type="submit"
                disabled={isSending || (activeTab === 'broadcast' && recipients.length === 0)}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    發送中...
                  </>
                ) : (
                  '🚀 立即發送'
                )}
              </button>
            </div>
          </form>

          {result && (
            <div className="mt-8 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-4">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-bold text-green-800">發送任務完成</p>
                <p className="text-xs text-green-600">成功送達：{result.success} / 總對象：{result.total}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
