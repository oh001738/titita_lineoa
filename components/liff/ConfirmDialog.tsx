'use client'

import { useState, createContext, useContext, useCallback } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'info'
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ConfirmOptions | null>(null)
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfig(options)
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve)
    })
  }, [])

  const handleClose = (value: boolean) => {
    if (resolver) resolver(value)
    setConfig(null)
    setResolver(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {config && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => handleClose(false)} />
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative z-10 animate-in slide-in-from-bottom-8 duration-300">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                config.type === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-600'
              }`}>
                {config.type === 'danger' ? '⚠️' : '❓'}
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{config.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{config.message}</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleClose(true)}
                className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 ${
                  config.type === 'danger' 
                  ? 'bg-rose-500 text-white shadow-rose-200' 
                  : 'bg-indigo-600 text-white shadow-indigo-200'
                }`}
              >
                {config.confirmText || '確定'}
              </button>
              <button
                onClick={() => handleClose(false)}
                className="w-full py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-all"
              >
                {config.cancelText || '取消'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}
