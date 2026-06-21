'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLiff } from '@/components/liff/LiffProvider'

function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  return { question: `${a} + ${b}`, answer: a + b }
}

export default function AdminLoginPage() {
  const { liff, profile, idToken, isReady, error: liffError } = useLiff()
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [captcha, setCaptcha] = useState(generateCaptcha)
  const [captchaInput, setCaptchaInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const resetCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha())
    setCaptchaInput('')
  }, [])

  const handleLogin = useCallback(async (type: 'line' | 'manual') => {
    setIsLoading(true)
    setError(null)

    try {
      const payload: Record<string, string> = {}

      if (type === 'line') {
        if (!idToken) {
          if (liff) liff.login({ redirectUri: window.location.href })
          return
        }
        payload.id_token = idToken
      } else {
        if (parseInt(captchaInput) !== captcha.answer) {
          setError('驗證碼錯誤，請重新計算')
          resetCaptcha()
          setIsLoading(false)
          return
        }
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
          setError('此 LINE 帳號尚未獲得管理員授權。')
        } else {
          setError(result.error)
        }
        resetCaptcha()
      } else {
        window.location.href = '/admin'
      }
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }, [idToken, liff, username, password, captchaInput, captcha.answer, resetCaptcha])

  // 已有 session 直接跳轉
  useEffect(() => {
    fetch('/api/admin/health').then(res => {
      if (res.ok) window.location.href = '/admin'
    })
  }, [])

  // LINE Token 就緒後自動登入
  useEffect(() => {
    if (isReady && idToken && profile && !isLoading && !error) {
      handleLogin('line')
    }
  }, [isReady, idToken, profile, isLoading, error, handleLogin])

  const isInLine = isReady && !liffError && !!profile

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#FFDF6F] overflow-hidden px-4 py-10">
      {/* 動畫波浪 */}
      <div
        className="absolute top-0 left-0 right-0 h-[140px] pointer-events-none"
        style={{
          background: "url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 1000 300\" xmlns=\"http://www.w3.org/2000/svg\"><path fill=\"%23FFFFFF\" opacity=\"0.5\" d=\"M0,150 C300,300 700,0 1000,150 L1000,0 L0,0 Z\"></path><path fill=\"%2366CCCC\" opacity=\"0.3\" d=\"M0,200 C400,0 600,300 1000,200 L1000,0 L0,0 Z\"></path></svg>') repeat-x",
          backgroundSize: '1000px 300px',
          animation: 'wave-drift 30s linear infinite',
        }}
      />

      {/* 浮動音符 */}
      <span className="absolute top-[72px] right-[8%] text-3xl opacity-60 pointer-events-none select-none" style={{ animation: 'float-note 5s ease-in-out infinite' }}>🎵</span>
      <span className="absolute bottom-[12%] left-[8%] text-2xl opacity-60 pointer-events-none select-none" style={{ animation: 'float-note 6s ease-in-out 1s infinite' }}>🎶</span>
      <span className="absolute top-[42%] left-[12%] text-xl opacity-50 pointer-events-none select-none" style={{ animation: 'float-note 7s ease-in-out 0.5s infinite' }}>🎼</span>
      <span className="absolute bottom-[20%] right-[14%] text-xl opacity-40 pointer-events-none select-none" style={{ animation: 'float-note 6.5s ease-in-out 2s infinite' }}>🎵</span>

      {/* 登入卡片 */}
      <div className="w-full max-w-sm relative">
        <div className="bg-white rounded-3xl p-8 shadow-[0_8px_0_rgba(0,0,0,0.06)]">
          {/* Logo */}
          <div className="mb-7">
            <div className="p-3 w-fit rounded-2xl bg-[#66CCCC] shadow-[0_4px_0_#4EA6A6] mb-4">
              <span className="text-white text-xl leading-none block">🎵</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">LINE OA 管理後台</h1>
            <p className="text-sm text-[#FF9966] font-bold mt-1">歡迎回來，請登入 ♪</p>
          </div>

          {/* LINE 登入 */}
          {isInLine && (
            <>
              <div className="mb-5">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border-2 border-[#E5E1E0] mb-3">
                  {profile.pictureUrl && (
                    <img src={profile.pictureUrl} className="w-8 h-8 rounded-full" alt="" />
                  )}
                  <p className="text-sm font-bold text-gray-700 truncate">{profile.displayName}</p>
                </div>
                <button
                  onClick={() => handleLogin('line')}
                  disabled={isLoading}
                  className="w-full h-12 rounded-2xl bg-[#06C755] text-white font-black text-base shadow-[0_4px_0_#059245] hover:translate-y-[2px] hover:shadow-[0_2px_0_#059245] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><span className="font-black">LINE</span> 帳號登入</>
                  )}
                </button>
              </div>

              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-[#E5E1E0]" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase">
                  <span className="bg-white px-3 text-gray-400 font-bold">或使用帳密登入</span>
                </div>
              </div>
            </>
          )}

          {/* 帳密 + 驗證碼 */}
          <div className="space-y-3">
            {error && (
              <p className="text-sm text-[#FE7A7B] font-bold bg-[#FE7A7B]/10 rounded-xl px-3 py-2 text-center">
                ⚠️ {error}
              </p>
            )}

            <input
              type="text"
              placeholder="管理員帳號"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full h-11 px-4 rounded-xl border-2 border-[#E5E1E0] focus:outline-none focus:border-[#66CCCC] focus:bg-[#FFF5ED] transition-colors text-sm font-bold text-gray-700 placeholder:font-normal placeholder:text-gray-400"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="管理員密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full h-11 px-4 pr-11 rounded-xl border-2 border-[#E5E1E0] focus:outline-none focus:border-[#66CCCC] focus:bg-[#FFF5ED] transition-colors text-sm font-bold text-gray-700 placeholder:font-normal placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors text-sm"
                aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {/* 圖形驗證碼（數學題） */}
            <div className="bg-[#F8FAFC] rounded-xl border-2 border-[#E5E1E0] px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-gray-500 font-bold whitespace-nowrap">請計算：</span>
                <span className="text-base font-black text-gray-800 tracking-wider">{captcha.question} = ?</span>
              </div>
              <input
                type="number"
                placeholder="答案"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                className="w-20 h-9 px-3 rounded-lg border-2 border-[#E5E1E0] focus:outline-none focus:border-[#66CCCC] text-sm font-bold text-center text-gray-700"
              />
              <button
                type="button"
                onClick={resetCaptcha}
                title="換一題"
                className="text-gray-400 hover:text-[#66CCCC] transition-colors text-lg leading-none"
              >
                🔄
              </button>
            </div>

            <button
              onClick={() => handleLogin('manual')}
              disabled={isLoading || !username || !password || !captchaInput}
              className="w-full h-12 rounded-2xl bg-[#66CCCC] text-white font-black text-base shadow-[0_4px_0_#4EA6A6] hover:translate-y-[2px] hover:shadow-[0_2px_0_#4EA6A6] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-[0_4px_0_#4EA6A6]"
            >
              {isLoading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  登入中…
                </span>
              ) : '登入'}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">
            忘記密碼？請聯絡開發人員協助重設
          </p>
        </div>
      </div>
    </div>
  )
}
