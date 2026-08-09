import { useEffect, useRef } from 'react'
import { Icon } from '@/components/Icon'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  confirmDisabled?: boolean
  children?: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', confirmDisabled, children, onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll-lock body when dialog is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Tab') {
        const focusable = containerRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center glass-overlay animate-[fadeIn_200ms_ease-out]"
    >
      <div className="bg-surface-container-lowest rounded-lg shadow-floating p-6 max-w-sm w-full mx-4 animate-[fadeInScale_250ms_var(--ease-spring)]">
        <div className="flex items-center gap-3 mb-2">
          <Icon name="warning" size={20} className="text-warning" />
          <h3 id="confirm-title" className="text-[16px] text-on-surface font-medium">{title}</h3>
        </div>
        <p className="text-[14px] text-on-surface-variant mb-6 pl-[32px]">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 text-[14px] text-on-surface-variant hover:text-on-surface rounded-lg transition-colors
                       active:scale-[0.94] duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-variant"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="px-5 py-2 text-[14px] font-medium bg-warning text-white rounded-lg
                       hover:opacity-90 active:scale-[0.94] transition-all duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-variant
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {confirmLabel}
          </button>
        </div>

        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
  )
}
