'use client'

import { useState, useEffect } from 'react'

interface Stats {
  total_bindings: number
  today_bindings: number
  total_notifies: number
  today_notifies: number
  failed_notifies: number
  line_quota: number | null      // null = 付費無上限方案
  line_consumption: number | null
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPushEnabled, setIsPushEnabled] = useState(true)
  const [enabledNotifies, setEnabledNotifies] = useState<Record<string, boolean>>({
    leave_approved: true,
    leave_rejected: true,
    makeup_arranged: true,
    course_change: true,
    tuition_reminder: true,
    tuition_received: true,
    points_earned: true,
    broadcast: true,
    bind_success: true,
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [systemStatus, setSystemStatus] = useState({
    line_api: false,
    main_system: false,
    mongodb: false
  })

  useEffect(() => {
    const checkHealth = () => {
      fetch('/api/admin/health')
        .then(res => res.json())
        .then(result => {
          if (result.data) setSystemStatus(result.data)
        })
    }

    checkHealth()
    const timer = setInterval(checkHealth, 600000) // 每 10 分鐘檢查一次

    // 取得統計數據
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(result => {
        if (result.data) setStats(result.data)
      })

    // 取得設定
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(result => {
        if (result.data) {
          setIsPushEnabled(result.data.is_push_enabled)
          setEnabledNotifies(result.data.enabled_notifies || {})
        }
      })
      .finally(() => setIsLoading(false))

    return () => clearInterval(timer)
  }, [])

  const togglePush = async () => {
    setIsUpdating(true)
    const newValue = !isPushEnabled
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_push_enabled: newValue })
      })
      if (res.ok) setIsPushEnabled(newValue)
    } catch (err) {
      alert('更新失敗')
    } finally {
      setIsUpdating(false)
    }
  }

  const toggleNotifyType = async (type: string) => {
    const newConfig = { ...enabledNotifies, [type]: !enabledNotifies[type] }
    setEnabledNotifies(newConfig)
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled_notifies: newConfig })
      })
    } catch (err) {
      alert('更新失敗')
    }
  }

  const notifyLabels: Record<string, string> = {
    leave_approved: '請假審核通過',
    leave_rejected: '請假審核駁回',
    makeup_arranged: '補課安排通知',
    course_change: '課程變動通知',
    tuition_reminder: '繳費提醒',
    tuition_received: '繳費確認回報',
    points_earned: '點數獎勵通知',
    broadcast: '全體廣播訊息',
    bind_success: '帳號綁定成功'
  }


  if (isLoading) {
    return <div className="flex items-center justify-center h-full">載入中...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">系統概覽</h1>
          <p className="text-gray-500">監控 LINE OA 系統的運作狀態</p>
        </div>
        
        {/* 推播總開關 UI */}
        <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div>
            <p className="text-sm font-bold text-gray-800">推播總開關</p>
            <p className="text-xs text-gray-400">{isPushEnabled ? '運行中' : '已關閉'}</p>
          </div>
          <button 
            onClick={togglePush}
            disabled={isUpdating}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              isPushEnabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isPushEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="總綁定人數" 
          value={stats?.total_bindings ?? 0} 
          icon="👥" 
          color="bg-blue-500"
        />
        <StatCard 
          title="今日新增綁定" 
          value={stats?.today_bindings ?? 0} 
          icon="🆕" 
          color="bg-green-500"
        />
        <StatCard 
          title="累計發送推播" 
          value={stats?.total_notifies ?? 0} 
          icon="🔔" 
          color="bg-indigo-500"
        />
        <StatCard 
          title="發送失敗次數" 
          value={stats?.failed_notifies ?? 0} 
          icon="⚠️" 
          color="bg-red-500"
        />
        {/* LINE 本月額度使用量 */}
        {stats?.line_consumption !== null && stats?.line_consumption !== undefined && (
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center text-white text-xl">💬</div>
              <div>
                <p className="text-xs text-gray-400">本月 LINE 推播</p>
                <p className="text-2xl font-bold text-gray-900">{stats.line_consumption.toLocaleString()}</p>
              </div>
            </div>
            {stats.line_quota !== null ? (
              <>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (stats.line_consumption / stats.line_quota) > 0.9 ? 'bg-red-500' :
                      (stats.line_consumption / stats.line_quota) > 0.7 ? 'bg-yellow-400' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((stats.line_consumption / stats.line_quota) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  額度：{stats.line_consumption.toLocaleString()} / {stats.line_quota.toLocaleString()}
                  （剩 {(stats.line_quota - stats.line_consumption).toLocaleString()} 則）
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-400">付費方案・無限制</p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">今日活動</h3>
          <div className="flex items-end gap-4">
            <div className="text-4xl font-bold text-indigo-600">{stats?.today_notifies ?? 0}</div>
            <div className="text-gray-500 pb-1">則推播訊息已發送</div>
          </div>
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all" 
              style={{ width: `${Math.min(((stats?.today_notifies ?? 0) / 100) * 100, 100)}%` }} 
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">基於今日 00:00 起的統計</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>⚙️ 推播細節設定</span>
            {!isPushEnabled && <span className="text-xs font-normal text-red-500">(總開關已關閉)</span>}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {Object.entries(notifyLabels).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{label}</span>
                <button 
                  onClick={() => toggleNotifyType(key)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                    enabledNotifies[key] !== false ? 'bg-indigo-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      enabledNotifies[key] !== false ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">即時系統狀態</h3>
          <ul className="space-y-4">
            <li className="flex items-center justify-between">
              <span className="text-sm text-gray-600">LINE Messaging API</span>
              <span className={`flex items-center gap-1.5 text-sm font-medium ${systemStatus.line_api ? 'text-green-600' : 'text-red-600'}`}>
                <span className={`w-2 h-2 rounded-full ${systemStatus.line_api ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
                {systemStatus.line_api ? '正常運行' : '設定錯誤'}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sm text-gray-600">主系統連接</span>
              <span className={`flex items-center gap-1.5 text-sm font-medium ${systemStatus.main_system ? 'text-green-600' : 'text-orange-600'}`}>
                <span className={`w-2 h-2 rounded-full ${systemStatus.main_system ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></span>
                {systemStatus.main_system ? '連線成功' : '連線失敗 / 等待對接'}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sm text-gray-600">MongoDB 儲存</span>
              <span className={`flex items-center gap-1.5 text-sm font-medium ${systemStatus.mongodb ? 'text-green-600' : 'text-red-600'}`}>
                <span className={`w-2 h-2 rounded-full ${systemStatus.mongodb ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {systemStatus.mongodb ? '已連線' : '連線中斷'}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: string, color: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-12 h-12 ${color} text-white rounded-lg flex items-center justify-center text-2xl shadow-lg`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      </div>
    </div>
  )
}
