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
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🎵</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{SCHOOL_NAME}</h1>
        <p className="text-sm text-gray-500 mt-1">LINE 帳號綁定</p>
      </div>

      {/* Profile Card */}
      {profile && (
        <div className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm mb-6 border border-gray-100">
          {profile.pictureUrl && (
            <img
              src={profile.pictureUrl}
              alt={profile.displayName}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <p className="font-medium text-gray-900">{profile.displayName}</p>
            <p className="text-xs text-gray-400">LINE 帳號</p>
          </div>
        </div>
      )}

      {/* Step: Loading */}
      {step === 'loading' && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 text-sm">正在確認綁定狀態...</p>
        </div>
      )}

      {/* Step: Already Bound */}
      {step === 'already_bound' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            ✓
          </div>
          <h2 className="font-bold text-xl text-gray-900 mb-2">您已綁定過帳號</h2>
          <p className="text-sm text-gray-500 mb-6">以下是目前與此 LINE 連動的系統帳號：</p>
          
          <div className="space-y-3 mb-8 text-left">
            {alreadyBoundUsers.map((u: any, i) => (
              <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{u.role === 'teacher' ? '👨‍🏫' : '👨‍🎓'}</span>
                  <div>
                    <p className="font-bold text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.role === 'teacher' ? '教師身份' : '家長/學生身份'}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnbind(u._id, u.name)}
                  disabled={isLoading}
                  className="text-xs text-red-500 font-bold px-3 py-1.5 border border-red-200 rounded-lg bg-white hover:bg-red-50 active:scale-95 transition-all"
                >
                  解除
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mb-4">若您還有其他小孩/帳號需要綁定，請點擊下方按鈕：</p>
          <button
            onClick={() => setStep('phone')}
            className="w-full bg-indigo-50 text-indigo-600 border border-indigo-200 py-3 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
          >
            ✚ 繼續綁定其他帳號
          </button>
          <button
            onClick={() => liff?.closeWindow()}
            className="w-full mt-3 bg-gray-100 text-gray-600 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            ✕ 返回聊天室
          </button>
        </div>
      )}

      {/* Step: Phone Input */}
      {step === 'phone' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">輸入手機號碼</h2>
          <p className="text-sm text-gray-500 mb-4">
            請輸入報名時填寫的手機號碼，系統將自動查詢您的帳號。
          </p>

          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0912345678"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-lg text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            maxLength={10}
          />

          {error && (
            <p className="text-red-500 text-sm mt-3 text-center">{error}</p>
          )}

          <button
            onClick={handleLookup}
            disabled={isLoading}
            className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                查詢中...
              </span>
            ) : (
              '查詢帳號'
            )}
          </button>
        </div>
      )}

      {/* Step: Select Users */}
      {step === 'select' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-2">選擇要綁定的帳號</h2>
          <p className="text-sm text-gray-500 mb-4">
            找到 {users.length} 個帳號，請勾選要綁定的帳號。
          </p>

          <div className="space-y-3">
            {users.map((user) => (
              <label
                key={user._id}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedIds.has(user._id)
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(user._id)}
                  onChange={() => toggleUser(user._id)}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {user.student_name || user.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {user.role === 'family' ? '學生/家長' : '教師'}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-sm mt-3 text-center">{error}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { setStep('phone'); setError(null) }}
              className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              返回
            </button>
            <button
              onClick={handleBind}
              disabled={isLoading || selectedIds.size === 0}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  綁定中...
                </span>
              ) : (
                `綁定 (${selectedIds.size})`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step: Success */}
      {step === 'success' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="font-semibold text-gray-900 text-lg mb-2">綁定成功！</h2>
          <p className="text-sm text-gray-500 mb-4">
            您已成功綁定以下帳號：
          </p>
          <div className="space-y-2 mb-6">
            {boundNames.map((name, i) => (
              <div
                key={i}
                className="bg-green-50 text-green-800 px-4 py-2 rounded-lg text-sm font-medium"
              >
                {name}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mb-6">
            您將透過 LINE 接收課程通知、學費提醒等訊息。
          </p>
          <button
            onClick={() => liff?.closeWindow()}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            完成，返回聊天室
          </button>
        </div>
      )}
    </div>
  )
}
