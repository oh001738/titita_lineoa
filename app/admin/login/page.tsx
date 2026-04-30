'use client'

import { useState, useEffect } from 'react'
import { useLiff } from '@/components/liff/LiffProvider'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const { liff, profile, idToken, isReady, error: liffError } = useLiff()
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (type: 'line' | 'manual') => {
    setIsLoading(true)
    setError(null)

    try {
      const payload: any = {}
      if (type === 'line') {
        if (!idToken) {
          if (liff) liff.login({ redirectUri: window.location.href })
          return
        }
        payload.id_token = idToken
      } else {
        payload.username = username
        payload.password = password
      }

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (result.error) {
        if (res.status === 403) {
          setError('此 LINE 帳號尚未獲得管理員授權。您可以改用下方的「帳密登入」。')
        } else {
          setError(result.error)
        }
      } else {
        // 登入成功，使用原生跳轉確保 Cookie 生效
        window.location.href = '/admin'
      }
    } catch (err) {
      console.error('[Login Error]', err)
      setError('網路錯誤，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  // 自動嘗試登入（如果已 Ready）
  useEffect(() => {
    // 檢查是否已經有 Session
    fetch('/api/admin/health')
      .then(res => {
        if (res.ok) {
          // 已經登入了，直接跳轉
          window.location.href = '/admin'
        }
      })

    if (isReady && profile?.userId) {
      // 這裡不自動登入，讓使用者點擊
    }
  }, [isReady, profile?.userId])

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center text-white">
          <div className="text-5xl mb-4">🎵</div>
          <h1 className="text-2xl font-bold">LINE OA 管理登入</h1>
          <p className="text-indigo-100 text-sm mt-1">請使用管理員 LINE 帳號驗證</p>
        </div>

        <div className="p-8 space-y-6">
          {/* 1. LINE 登入區塊 (僅在 LINE 內有效) */}
          <div className="space-y-4">
            {!isReady ? (
              <div className="text-center py-2">
                <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
              </div>
            ) : liffError ? (
              <p className="text-[10px] text-gray-400 text-center">LINE 登入僅限 LINE 應用程式內使用</p>
            ) : (
              <>
                {profile && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    {profile.pictureUrl && (
                      <img src={profile.pictureUrl} className="w-8 h-8 rounded-full" alt="" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{profile.displayName}</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => handleLogin('line')}
                  disabled={isLoading}
                  className="w-full bg-[#06C755] text-white py-3 rounded-xl font-bold shadow-lg shadow-green-100 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="text-xl">LINE</span> 帳號登入
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-2 text-gray-300">或者使用帳密登入</span>
            </div>
          </div>

          {/* 2. 帳號密碼登入區塊 (始終顯示) */}
          <div id="manual-login" className="space-y-3">
            {error && (
              <div className={`p-3 text-xs rounded-lg border ${
                error.includes('帳密登入') 
                ? 'bg-amber-50 text-amber-700 border-amber-100' 
                : 'bg-red-50 text-red-600 border-red-100'
              }`}>
                ⚠️ {error}
              </div>
            )}
            <input
              type="text"
              placeholder="管理員帳號"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <input
              type="password"
              placeholder="管理員密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
            <button
              onClick={() => handleLogin('manual')}
              disabled={isLoading}
              className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 disabled:opacity-50 transition-all"
            >
              帳密登入
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
