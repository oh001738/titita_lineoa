'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface LiffProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

interface LiffContextType {
  liff: any | null
  profile: LiffProfile | null
  idToken: string | null   // LIFF ID Token，用於 server-side 身份驗證
  isReady: boolean
  isInClient: boolean
  error: string | null
}

const LiffContext = createContext<LiffContextType>({
  liff: null,
  profile: null,
  idToken: null,
  isReady: false,
  isInClient: false,
  error: null,
})

export function useLiff() {
  return useContext(LiffContext)
}

export function LiffProvider({ children }: { children: ReactNode }) {
  const [liffInstance, setLiffInstance] = useState<any>(null)
  const [profile, setProfile] = useState<LiffProfile | null>(null)
  const [idToken, setIdToken] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isInClient, setIsInClient] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const initLiff = async () => {
      try {
        // localhost 開發模式：使用 mock 資料，不呼叫 LINE API
        if (window.location.hostname === 'localhost') {
          console.warn('[LIFF] Localhost detected, using mock profile')
          setProfile({
            userId: 'U1234567890mockuser',
            displayName: '開發測試員',
          })
          setIdToken('MOCK_ID_TOKEN')
          setIsReady(true)
          setIsInClient(false)
          return
        }

        const liff = (await import('@line/liff')).default

        const liffId = process.env.NEXT_PUBLIC_LIFF_ID
        if (!liffId) {
          setError('LIFF ID 未設定')
          return
        }

        await liff.init({ liffId })
        setLiffInstance(liff)
        setIsInClient(liff.isInClient())

        if (!liff.isLoggedIn()) {
          liff.login()
          return
        }

        const [userProfile, token] = await Promise.all([
          liff.getProfile(),
          Promise.resolve(liff.getIDToken()),
        ])

        setProfile({
          userId: userProfile.userId,
          displayName: userProfile.displayName,
          pictureUrl: userProfile.pictureUrl,
        })
        setIdToken(token)
        setIsReady(true)
      } catch (err: any) {
        console.error('[LIFF ERROR]', err)
        setError(`LIFF 錯誤: ${err?.message || String(err)}`)
      }
    }

    initLiff()
  }, [])

  return (
    <LiffContext.Provider value={{ liff: liffInstance, profile, idToken, isReady, isInClient, error }}>
      {children}
    </LiffContext.Provider>
  )
}
