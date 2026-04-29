'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLiff } from '@/components/liff/LiffProvider'
import { useToast } from '@/components/liff/Toast'
import { useConfirm } from '@/components/liff/ConfirmDialog'
import type { BindLookupUser } from '@/types'

const SCHOOL_NAME = process.env.NEXT_PUBLIC_SCHOOL_NAME || '音樂補習班'

export default function StatusPage() {
  const { profile, idToken, isReady, error: liffError } = useLiff()
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  const [boundUsers, setBoundUsers] = useState<BindLookupUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUnbinding, setIsUnbinding] = useState<string | null>(null)

  const fetchStatus = useCallback(async (token: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/line/status?id_token=${token}`)
      const result = await res.json()
      if (result.error) {
        setError(result.error)
      } else {
        setBoundUsers(result.data.users || [])
      }
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isReady && idToken) {
      fetchStatus(idToken)
    } else if (isReady && !idToken) {
      setIsLoading(false)
      setError('無法取得 LINE 使用者資訊')
    }
  }, [isReady, profile?.userId, fetchStatus])

  const handleUnbind = async (userId: string) => {
    if (!profile?.userId) return
    
    const isConfirmed = await confirm({
      title: '確定解除綁定？',
      message: '確定要解除此帳號的 LINE 綁定嗎？解除後將無法收到相關通知。',
      confirmText: '確定解除',
      cancelText: '取消',
      type: 'danger'
    })

    if (!isConfirmed) return

    setIsUnbinding(userId)
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
        showToast(result.error, 'error')
      } else {
        // 重新整理清單
        setBoundUsers((prev) => prev.filter((u) => u._id !== userId))
        showToast('已解除綁定', 'success')
      }
    } catch {
      showToast('網路錯誤，解綁失敗', 'error')
    } finally {
      setIsUnbinding(null)
    }
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="w-10 h-10 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🎵</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">帳號綁定狀態</h1>
        <p className="text-sm text-gray-500 mt-1">{SCHOOL_NAME} 系統</p>
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
          <div className="flex-1">
            <p className="font-medium text-gray-900">{profile.displayName}</p>
            <p className="text-xs text-gray-400">LINE 帳號</p>
          </div>
          <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            Connected
          </span>
        </div>
      )}

      {/* Status List */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">已綁定的系統帳號</h2>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-16 bg-gray-50 animate-pulse rounded-lg" />
            <div className="h-16 bg-gray-50 animate-pulse rounded-lg" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 text-sm mb-2">⚠️ {error}</p>
            <button
              onClick={() => idToken && fetchStatus(idToken)}
              className="text-indigo-600 text-sm font-medium"
            >
              再試一次
            </button>
          </div>
        ) : boundUsers.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm mb-6">目前尚未綁定任何帳號</p>
            <a
              href="/liff/bind"
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors inline-block"
            >
              前往綁定帳號
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {boundUsers.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {user.student_name || user.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {user.role === 'family' ? '學生/家長' : '教師'}
                  </p>
                </div>
                <button
                  onClick={() => handleUnbind(user._id)}
                  disabled={!!isUnbinding}
                  className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {isUnbinding === user._id ? '解綁中...' : '解除綁定'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      {boundUsers.length > 0 && (
        <div className="mt-8 bg-indigo-50 rounded-xl p-4 border border-indigo-100">
          <div className="flex gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="text-xs text-indigo-800 font-medium mb-1">關於通知發送</p>
              <p className="text-[11px] text-indigo-600/80 leading-relaxed">
                綁定成功後，系統將會透過此 LINE 帳號主動推送該學生的課程異動、請假結果與學費繳費提醒。若有多位小孩，請確保皆已完成綁定。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
