import { useMemo, useState, useCallback } from 'react'
import { ToastContext } from './toastContext.js'

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, variant = 'info') => {
    setToast({ message, variant, id: Date.now() })
    window.setTimeout(() => setToast(null), 4200)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          className={`fixed bottom-24 left-1/2 z-[100] max-w-md -translate-x-1/2 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg sm:bottom-8 ${
            toast.variant === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-900'
              : toast.variant === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-slate-200 bg-white text-slate-800'
          }`}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}
    </ToastContext.Provider>
  )
}
