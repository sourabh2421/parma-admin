import { useContext } from 'react'
import { ToastContext } from './toastContext.js'

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return { showToast: () => {} }
  }
  return ctx
}
