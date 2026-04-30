'use client'

import { useState, useEffect } from 'react'
import { useLiff } from '@/components/liff/LiffProvider'
import { useToast } from '@/components/liff/Toast'
import { useConfirm } from '@/components/liff/ConfirmDialog'
import type { BindLookupUser } from '@/types'

const SCHOOL_NAME = process.env.NEXT_PUBLIC_SCHOOL_NAME || '音樂補習班'

type BindStep = 'phone' | 'select' | 'success' | 'error' | 'already_bound' | 'loading'

export default function BindPage() {
  const { liff, profile, idToken, isReady, error: liffError } = useLiff()
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const [step, setStep] = useState<BindStep>('loading')
  const [phone, setPhone] = useState('')
  const [users, setUsers] = useState<BindLookupUser[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [boundNames, setBoundNames] = useState<string[]>([])
  const [alreadyBoundUsers, setAlreadyBoundUsers] = useState<Array<{name: string, role: string}>>([])

  // ── 檢查是否已綁定 ──
  useEffect(() => {
    let isMounted = true;
    if (isReady && idToken) {
      fetch(`/api/line/status?id_token=${idToken}`)
        .then(res => res.json())
        .then(result => {
          if (!isMounted) return;
          if (result && result.data && result.data.users && result.data.users.length > 0) {
            setAlreadyBoundUsers(result.data.users);
            setStep('already_bound');
          } else {
            setStep('phone');
          }
        })
        .catch(err => {
          console.error('Check bind status failed:', err);
          if (isMounted) setStep('phone');
        });
    }
    return () => { isMounted = false; };
  }, [isReady, profile?.userId])

  // ── LIFF 載入中 ──
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="max-w-xs w-full text-center">
          {liffError ? (
            <div className="space-y-3">
              <div className="text-5xl">⚠️</div>
              <p className="text-red-600 font-medium">{liffError}</p>
              <p className="text-sm text-gray-500">請確認是否從 LINE 開啟此頁面</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto" />
              <p className="text-gray-500 font-medium">載入中...</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── 查詢手機號碼 ──
  const handleLookup = async () => {
    if (!phone.trim()) {
      setError('請輸入手機號碼')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/line/bind/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          id_token: idToken,
        }),
      })

      const result = await res.json()

      if (result.error) {
        setError(result.error)
        return
      }

      const foundUsers: BindLookupUser[] = result.data.users
      setUsers(foundUsers)

      if (foundUsers.length === 1) {
        // 只有一個帳號，自動選取
        setSelectedIds(new Set([foundUsers[0]._id]))
      } else {
        // 多個帳號，預設全選
        setSelectedIds(new Set(foundUsers.map((u) => u._id)))
      }

      setStep('select')
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  // ── 確認綁定 ──
  const handleBind = async () => {
    if (selectedIds.size === 0) {
      setError('請至少選擇一個帳號')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/line/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: Array.from(selectedIds),
          id_token: idToken,
          phone: phone.trim(),
        }),
      })

      const result = await res.json()

      if (result.error) {
        setError(result.error)
        return
      }

      setBoundNames(result.data.names)
      
      // 成功後，重新抓取狀態並切換到「已綁定」列表畫面，方便用戶直接管理（如解綁）
      const statusRes = await fetch(`/api/line/status?id_token=${idToken}`)
      const statusData = await statusRes.json()
      if (statusData.data?.users) {
        setAlreadyBoundUsers(statusData.data.users)
      }
      setStep('already_bound')
      showToast('綁定成功！', 'success')
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  // ── 解除綁定 ──
  const handleUnbind = async (userId: string, userName: string) => {
    const isConfirmed = await confirm({
      title: '確定解除綁定？',
      message: `確定要解除與【${userName}】的綁定嗎？\n解除後您將無法收到相關的課程通知。`,
      confirmText: '確定解除',
      cancelText: '我再想想',
      type: 'danger'
    })

    if (!isConfirmed) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/line/unbind/self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          id_token: idToken,
        }),
      })
      const result = await res.json()
      if (result.error) {
        showToast(`解除失敗: ${result.error}`, 'error')
      } else {
        showToast('已成功解除綁定', 'success')
        // 重新取得最新狀態
        const statusRes = await fetch(`/api/line/status?id_token=${idToken}`)
        const statusData = await statusRes.json()
        if (statusData.data?.users && statusData.data.users.length > 0) {
          setAlreadyBoundUsers(statusData.data.users)
        } else {
          setAlreadyBoundUsers([])
          setStep('phone')
        }
      }
    } catch {
      showToast('網路錯誤', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // ── 勾選/取消勾選 ──
  const toggleUser = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  return (
    <div className="min-h-screen bg-[#FFDF6F] relative overflow-x-hidden flex flex-col font-nunito">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        .font-nunito { font-family: 'Nunito', sans-serif; }
        @keyframes float-up {
            0% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(10deg); }
            100% { transform: translateY(0) rotate(0deg); }
        }
        @keyframes float-down {
            0% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(20px) rotate(-10deg); }
            100% { transform: translateY(0) rotate(0deg); }
        }
        @keyframes wave-bg {
            0% { background-position-x: 0; }
            100% { background-position-x: 1000px; }
        }
        .animate-wave { animation: wave-bg 20s linear infinite; }
        .animate-float-up { animation: float-up 4s ease-in-out infinite; }
        .animate-float-down { animation: float-down 5s ease-in-out infinite; }
      `}} />

      {/* Dynamic Wave Background */}
      <div 
        className="absolute top-0 left-0 w-full h-[350px] animate-wave z-0"
        style={{
          background: "url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 1000 300\" xmlns=\"http://www.w3.org/2000/svg\"><path fill=\"%23FFFFFF\" opacity=\"0.5\" d=\"M0,150 C300,300 700,0 1000,150 L1000,0 L0,0 Z\"></path><path fill=\"%2366CCCC\" opacity=\"0.3\" d=\"M0,200 C400,0 600,300 1000,200 L1000,0 L0,0 Z\"></path></svg>') repeat-x",
          backgroundSize: '1000px 300px'
        }}
      />
      
      {/* Floating Music Notes */}
      <div className="absolute top-[60px] right-[30px] text-4xl text-[#FE7A7B] opacity-60 z-0 animate-float-up pointer-events-none">🎵</div>
      <div className="absolute top-[180px] left-[20px] text-4xl text-[#99D8B9] opacity-60 z-0 animate-float-down pointer-events-none">🎶</div>

      <div className="max-w-md mx-auto w-full px-4 py-8 relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="text-center mb-6 pt-2">
          <h1 className="text-2xl font-black text-[#F56E4A] tracking-wide drop-shadow-sm">{SCHOOL_NAME}</h1>
          <p className="inline-block mt-2 px-3 py-1 bg-[#F56E4A] text-white rounded-full text-xs font-bold tracking-widest shadow-sm">系統帳號綁定</p>
        </div>

        {/* Profile Card */}
        {profile && (
          <div className="flex items-center gap-4 bg-white/85 backdrop-blur-md rounded-[24px] p-4 shadow-lg mb-8 border-2 border-white/50">
            {profile.pictureUrl ? (
              <img
                src={profile.pictureUrl}
                alt={profile.displayName}
                className="w-14 h-14 rounded-[20px] border-4 border-[#66CCCC] shadow-sm object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-[20px] border-4 border-[#66CCCC] shadow-sm bg-[#66CCCC] text-white flex items-center justify-center text-2xl">👦</div>
            )}
            <div>
              <p className="font-extrabold text-gray-800 text-lg leading-tight">{profile.displayName}</p>
              <p className="text-[10px] text-[#FF9966] font-black uppercase mt-1 tracking-wider">當前 LINE 帳號</p>
            </div>
          </div>
        )}

        {/* Step: Loading */}
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12 bg-white/80 backdrop-blur-md rounded-[28px] border-2 border-white/50 shadow-xl">
            <div className="w-10 h-10 border-4 border-[#FF9966]/30 border-t-[#FF9966] rounded-full animate-spin mb-4" />
            <p className="text-[#F56E4A] font-bold text-sm tracking-widest">系統準備中...</p>
          </div>
        )}

        {/* Step: Already Bound */}
        {step === 'already_bound' && (
          <div className="bg-white/95 backdrop-blur-md rounded-[28px] p-6 shadow-xl border-2 border-white/50 text-center">
            <div className="w-16 h-16 bg-[#99D8B9] text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm rotate-3">
              ✓
            </div>
            <h2 className="font-black text-xl text-gray-800 mb-2">您已綁定過帳號</h2>
            <p className="text-sm text-gray-500 font-bold mb-6">目前與此 LINE 連動的系統帳號：</p>
            
            <div className="space-y-3 mb-8 text-left">
              {alreadyBoundUsers.map((u: any, i) => (
                <div key={i} className="bg-white p-3 rounded-2xl border-2 border-[#E5E1E0] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{u.role === 'teacher' ? '👨‍🏫' : '👨‍🎓'}</span>
                    <div>
                      <p className="font-black text-gray-800">{u.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold tracking-widest">{u.role === 'teacher' ? '教師身份' : '家長/學生身份'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnbind(u._id, u.name)}
                    disabled={isLoading}
                    className="text-xs text-[#FE7A7B] font-black px-3 py-1.5 border-2 border-[#FE7A7B]/20 rounded-xl bg-[#FE7A7B]/5 hover:bg-[#FE7A7B]/10 active:scale-95 transition-all"
                  >
                    解除
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 font-bold mb-4">若還有其他寶貝需要綁定：</p>
            <button
              onClick={() => setStep('phone')}
              className="w-full bg-[#66CCCC] text-white py-4 rounded-2xl font-black text-base shadow-[0_4px_0_#4EA6A6] hover:translate-y-[2px] hover:shadow-[0_2px_0_#4EA6A6] active:translate-y-[4px] active:shadow-none transition-all mb-3"
            >
              ✚ 繼續綁定其他帳號
            </button>
            <button
              onClick={() => liff?.closeWindow()}
              className="w-full bg-white text-gray-500 border-2 border-[#E5E1E0] py-4 rounded-2xl font-black hover:bg-gray-50 transition-colors"
            >
              ✕ 返回聊天室
            </button>
          </div>
        )}

        {/* Step: Phone Input */}
        {step === 'phone' && (
          <div className="bg-white/95 backdrop-blur-md rounded-[28px] p-6 shadow-xl border-2 border-white/50">
            <h2 className="font-black text-gray-800 text-lg mb-2">尋找寶貝的帳號</h2>
            <p className="text-sm text-gray-500 mb-6 font-bold">
              請輸入報名時填寫的手機號碼，系統將自動尋找寶貝的專屬帳號喔！
            </p>

            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912345678"
              className="w-full px-4 py-4 border-2 border-dashed border-[#FF9966] rounded-2xl text-xl font-black text-center tracking-widest focus:outline-none focus:border-[#F56E4A] focus:bg-[#FFF5ED] transition-colors text-gray-700 placeholder-gray-300"
              maxLength={10}
            />

            {error && (
              <p className="text-[#FE7A7B] text-sm mt-3 text-center font-bold bg-[#FE7A7B]/10 py-2 rounded-xl">{error}</p>
            )}

            <button
              onClick={handleLookup}
              disabled={isLoading}
              className="w-full mt-6 bg-[#FF9966] text-white py-4 rounded-2xl font-black text-lg shadow-[0_6px_0_#D95433] hover:translate-y-[2px] hover:shadow-[0_4px_0_#D95433] active:translate-y-[6px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  查詢中...
                </span>
              ) : (
                '立刻查詢'
              )}
            </button>
          </div>
        )}

        {/* 所有步驟都顯示返回聊天室按鈕（除了 loading 跟 already_bound 已經有了） */}
        {step !== 'loading' && step !== 'already_bound' && step !== 'success' && (
          <button
            onClick={() => liff?.closeWindow()}
            className="mt-auto mx-auto bg-white/60 backdrop-blur-md px-6 py-3 rounded-2xl text-gray-500 font-bold hover:bg-white/80 transition-colors border border-white/50 shadow-sm"
          >
            ✕ 先不要綁定
          </button>
        )}

        {/* Step: Select Users */}
        {step === 'select' && (
          <div className="bg-white/95 backdrop-blur-md rounded-[28px] p-6 shadow-xl border-2 border-white/50">
            <h2 className="font-black text-gray-800 text-lg mb-2">選擇要綁定的帳號</h2>
            <p className="text-sm text-[#FF9966] font-bold mb-4 bg-[#FF9966]/10 inline-block px-3 py-1 rounded-xl">
              找到 {users.length} 個帳號，請勾選。
            </p>

            <div className="space-y-3">
              {users.map((user) => (
                <label
                  key={user._id}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-colors ${
                    selectedIds.has(user._id)
                      ? 'border-[#66CCCC] bg-[#66CCCC]/10'
                      : 'border-[#E5E1E0] hover:border-[#66CCCC]/50 bg-white'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                    selectedIds.has(user._id) ? 'bg-[#66CCCC] border-[#66CCCC]' : 'border-gray-300 bg-white'
                  }`}>
                    {selectedIds.has(user._id) && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-black text-gray-800 text-base">
                      {user.student_name || user.name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold tracking-widest mt-0.5">
                      {user.role === 'family' ? '學生/家長' : '教師'}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {error && (
              <p className="text-[#FE7A7B] text-sm mt-3 text-center font-bold">{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setStep('phone'); setError(null) }}
                className="w-1/3 py-4 rounded-2xl border-2 border-[#E5E1E0] text-gray-500 font-black hover:bg-gray-50 transition-colors"
              >
                返回
              </button>
              <button
                onClick={handleBind}
                disabled={isLoading || selectedIds.size === 0}
                className="flex-1 bg-[#66CCCC] text-white py-4 rounded-2xl font-black text-lg shadow-[0_6px_0_#4EA6A6] hover:translate-y-[2px] hover:shadow-[0_4px_0_#4EA6A6] active:translate-y-[6px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    綁定中...
                  </span>
                ) : (
                  `確認綁定 (${selectedIds.size})`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="bg-white/95 backdrop-blur-md rounded-[28px] p-6 shadow-xl border-2 border-white/50 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#99D8B9]"></div>
            <div className="w-16 h-16 bg-[#99D8B9] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-sm">
              ✨
            </div>
            <h2 className="font-black text-gray-800 text-xl mb-2">太棒了，綁定成功！</h2>
            <p className="text-sm text-gray-500 font-bold mb-4">
              您已成功連動以下帳號：
            </p>
            <div className="space-y-2 mb-6">
              {boundNames.map((name, i) => (
                <div
                  key={i}
                  className="bg-[#99D8B9]/20 text-[#2B7A54] px-4 py-3 rounded-xl text-sm font-black tracking-wide"
                >
                  {name}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 font-bold tracking-wider mb-6">
              未來將透過此 LINE 接收通知與提醒。
            </p>
            <button
              onClick={() => liff?.closeWindow()}
              className="w-full bg-[#FFDF6F] text-[#F56E4A] py-4 rounded-2xl font-black text-lg shadow-[0_4px_0_#E5C864] hover:translate-y-[2px] hover:shadow-[0_2px_0_#E5C864] active:translate-y-[4px] active:shadow-none transition-all"
            >
              完成，返回聊天室
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
