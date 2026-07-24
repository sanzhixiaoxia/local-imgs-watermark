import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Check, X, Info, Loader2 } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'loading'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
  /** 展示一个持续型加载气泡，返回 id 用于后续关闭 */
  showLoading: (message?: string) => number
  /** 关闭指定 id 的加载气泡 */
  dismissLoading: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

const STYLES: Record<ToastType, { bg: string; icon: ReactNode }> = {
  success: { bg: 'bg-green-600', icon: <Check size={16} /> },
  error: { bg: 'bg-red-600', icon: <X size={16} /> },
  info: { bg: 'bg-gray-800', icon: <Info size={16} /> },
  loading: { bg: 'bg-gray-800', icon: <Loader2 size={16} className="animate-spin" /> },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2600)
  }, [])

  const showLoading = useCallback((message = '加载中…') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type: 'loading' }])
    return id
  }, [])

  const dismissLoading = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, showLoading, dismissLoading }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toast-in pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-white text-sm font-medium ${STYLES[t.type].bg}`}
          >
            {STYLES[t.type].icon}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast 必须在 ToastProvider 内使用')
  }
  return ctx
}
