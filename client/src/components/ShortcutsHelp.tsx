import { useEffect, useRef } from 'react'
import { Icon } from '@/components/Icon'

interface Props {
  open: boolean
  onClose: () => void
}

interface ShortcutGroup {
  title: string
  shortcuts: { keys: string; label: string }[]
}

const groups: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: '⌘K', label: 'Command palette' },
      { keys: '?', label: 'Keyboard shortcuts (this)' },
      { keys: 'G then D', label: 'Go to Dashboard' },
      { keys: 'G then N', label: 'Go to New Session' },
      { keys: 'G then S', label: 'Go to Settings' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: '↵', label: 'Select / confirm' },
      { keys: 'Esc', label: 'Close / cancel' },
      { keys: '/', label: 'Focus search' },
    ],
  },
  {
    title: 'Test Case Review',
    shortcuts: [
      { keys: '↑↓', label: 'Navigate test case list' },
      { keys: 'Space', label: 'Select / expand test case' },
      { keys: 'Ctrl+A', label: 'Select all test cases' },
    ],
  },
  {
    title: 'Execution',
    shortcuts: [
      { keys: '1', label: 'Mark test as Pass' },
      { keys: '2', label: 'Mark test as Fail' },
      { keys: '3', label: 'Mark test as Blocked' },
    ],
  },
]

export function ShortcutsHelp({ open, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      // Trap focus
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
    containerRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center glass-overlay animate-[fadeIn_200ms_ease-out]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className="w-full max-w-lg mx-4 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-floating overflow-hidden animate-[fadeInScale_200ms_var(--ease-spring)] outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <Icon name="keyboard" size={20} className="text-on-surface-variant" />
            <h2 className="font-heading text-[18px] text-primary font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container transition-colors duration-150"
            aria-label="Close"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Shortcut groups */}
        <div className="max-h-[60vh] overflow-y-auto p-5 space-y-6">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant/70 font-semibold mb-3">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.keys + shortcut.label}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-surface-container transition-colors duration-150 -mx-2"
                  >
                    <span className="font-body-md text-[13px] text-on-surface">{shortcut.label}</span>
                    <kbd className="font-mono text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded border border-outline-variant ml-4 whitespace-nowrap">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-outline-variant bg-surface-container-low flex items-center justify-between">
          <span className="font-mono text-[11px] text-on-surface-variant/60">Press <kbd className="px-1 py-0.5 bg-surface-container-lowest rounded border border-outline-variant text-[10px]">Esc</kbd> to close</span>
          <span className="font-mono text-[11px] text-on-surface-variant/60">Docket v0.1.0</span>
        </div>
      </div>
    </div>
  )
}
