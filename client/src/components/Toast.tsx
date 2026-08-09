import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { Icon } from '@/components/Icon'

interface ToastAction {
  label: string
  onClick: () => void
}

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  action?: ToastAction
  duration?: number
}

interface ToastContextValue {
  toast: (message: string, type?: Toast['type'], action?: ToastAction, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const TOAST_ICONS: Record<string, 'check-circle' | 'error' | 'info'> = {
  success: 'check-circle',
  error: 'error',
  info: 'info',
}

const TOAST_COLORS: Record<string, string> = {
  success: 'bg-primary text-on-primary',
  error: 'bg-error text-on-error border border-error-container',
  info: 'bg-surface-container-lowest text-on-surface border border-outline-variant',
}

const TOAST_DURATION = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: Toast['type'] = 'info', action?: ToastAction, duration?: number) => {
    const id = crypto.randomUUID()
    const toastDuration = duration ?? (action ? 6000 : TOAST_DURATION)
    setToasts((prev) => [...prev, { id, message, type, action, duration: toastDuration }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, toastDuration)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-32px)] sm:max-w-sm" role="alert" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto relative flex items-start gap-2.5 px-4 py-3 rounded-lg shadow-lifted text-[13px] font-medium
              animate-[fadeInScale_200ms_var(--ease-smooth)]
              ${TOAST_COLORS[t.type]}`}
          >
            <Icon name={TOAST_ICONS[t.type]} size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1 pt-0.5">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick()
                  dismiss(t.id)
                }}
                className="shrink-0 px-2 py-0.5 text-[12px] font-semibold rounded
                           bg-white/15 hover:bg-white/25 transition-colors
                           uppercase tracking-wider"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 p-0.5 rounded hover:opacity-60 transition-opacity"
              aria-label="Dismiss"
            >
              <Icon name="close" size={16} />
            </button>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg overflow-hidden bg-black/10">
              <div
                className="h-full bg-current opacity-20 toast-progress"
                style={{ '--toast-duration': `${t.duration ?? TOAST_DURATION}ms` } as React.CSSProperties}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
