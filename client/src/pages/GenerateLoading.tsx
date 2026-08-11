import { useEffect, useState, useRef } from 'react'
import { Icon } from '@/components/Icon'
import { FALLBACK_LOADING_MESSAGES } from '@/lib/loading-messages'

type TipCategory = 'general' | 'new' | 'power' | 'team' | 'shortcut'

interface TipDef {
  text: string
  category: TipCategory
}

const tipDefinitions: TipDef[] = [
  // Always shown
  { text: 'Tip: Edit test case steps before executing them.', category: 'general' },
  { text: 'Tip: Export your report as PDF for stakeholder reviews.', category: 'general' },
  { text: 'Tip: Sessions are auto-saved — your work is never lost.', category: 'general' },
  { text: 'Tip: Click "Configure Stats" to customise what appears in your report.', category: 'general' },
  // Keyboard shortcuts — shown until the user opens the command palette
  { text: 'Tip: Press \u2318K to open the command palette and navigate faster.', category: 'shortcut' },
  // Shown when the user has few or no test cases (onboarding)
  { text: 'Tip: Attach a screenshot or PRD for more accurate test cases.', category: 'new' },
  // Shown when the user has enough test cases to benefit from advanced features
  { text: 'Tip: You can drag to reorder test cases after generation.', category: 'power' },
  { text: 'Tip: Failed tests can be linked to GitHub issues with one click.', category: 'power' },
  { text: 'Tip: You can mark test cases as BLOCKED if a dependency isn\'t ready.', category: 'power' },
  // Shown when the workspace has multiple members
  { text: 'Tip: Tag team members to review specific test cases.', category: 'team' },
]

export interface TipContext {
  /** Total test cases in the current session */
  testCaseCount: number
  /** Whether the workspace has more than one member */
  hasTeam: boolean
  /** Whether the user has ever opened the command palette (\u2318K) */
  hasUsedCmdK: boolean
}

/** @visibleForTesting */
export function filterTips(ctx?: TipContext): string[] {
  if (!ctx) return tipDefinitions.map((t) => t.text)

  const categories = new Set<TipCategory>(['general'])

  // Show 'new' tips when the user has 5 or fewer test cases (onboarding phase)
  if (ctx.testCaseCount <= 5) categories.add('new')

  // Show 'power' tips when the user has more than 5 test cases
  if (ctx.testCaseCount > 5) categories.add('power')

  // Show 'team' tips when the workspace has multiple members
  if (ctx.hasTeam) categories.add('team')

  // Keyboard shortcut tip: show until the user opens the command palette
  if (!ctx.hasUsedCmdK) categories.add('shortcut')

  // Return tips in definition order, filtered by category
  // General tips come first (always) followed by context-matched tips
  const matched = tipDefinitions.filter((t) => categories.has(t.category))
  const general = matched.filter((t) => t.category === 'general')
  const contextual = matched.filter((t) => t.category !== 'general')

  return [...general, ...contextual].map((t) => t.text)
}

interface Props {
  messages?: string[]
  error?: string | null
  onRetry?: () => void
  onCancel?: () => void
  /** Context used to show relevant tips during the loading screen */
  tipContext?: TipContext
}

export function GenerateLoading({ messages, error, onRetry, onCancel, tipContext }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [tipIndex, setTipIndex] = useState(0)
  const displayMessages = messages ?? FALLBACK_LOADING_MESSAGES
  const activeTips = filterTips(tipContext)
  // Clamp tipIndex whenever the tip list shrinks so we never render out of bounds
  const safeTipIndex = Math.min(tipIndex, Math.max(activeTips.length - 1, 0))
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()
    function trap(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    el.addEventListener('keydown', trap)
    return () => el.removeEventListener('keydown', trap)
  }, [error, onCancel, onRetry])

  useEffect(() => {
    if (error) return

    const step = () => {
      setCurrentStep((i) => {
        const next = i + 1
        if (next < displayMessages.length) {
          setTimeout(step, Math.random() * 2000 + 1500)
        }
        return next >= displayMessages.length ? displayMessages.length - 1 : next
      })
    }

    const initialDelay = setTimeout(() => {
      setCurrentStep(0)
      setTimeout(step, Math.random() * 2000 + 1500)
    }, 1000)

    return () => clearTimeout(initialDelay)
  }, [error, displayMessages.length])

  useEffect(() => {
    if (error || activeTips.length === 0) return
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % activeTips.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [error, activeTips.length])

  if (error) {
    return (
      <div ref={containerRef} className="fixed inset-0 z-10 flex flex-col items-center justify-center glass-overlay">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <Icon name="error" size={48} className="text-warning" />
          <p className="text-[14px] text-on-surface-variant">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="bg-warning text-white rounded px-5 py-2 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold hover:opacity-90 transition-opacity"
            >
              Try again
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-on-surface-variant underline underline-offset-2 hover:text-primary transition-colors font-body-md"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-10 flex flex-col items-center justify-center glass-overlay">
      {/* Indeterminate Spinner — pulsing arcs, no fake progress */}
      <div className="relative w-24 h-24 mb-12 flex items-center justify-center">
        {/* Outer dashed ring — slow clockwise spin */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin text-outline-variant"
          style={{ animationDuration: '8s' }}
          viewBox="0 0 100 100"
        >
          <circle cx="50" cy="50" fill="none" r="48" stroke="currentColor" strokeDasharray="4 8" strokeWidth="1" />
        </svg>

        {/* Inner solid arc ring — faster counter-clockwise spin (indeterminate) */}
        <svg
          className="absolute inset-0 w-full h-full text-primary animate-[spin-reverse_2.5s_linear_infinite]"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50" cy="50" fill="none"
            r="38"
            stroke="currentColor"
            strokeDasharray="175 65"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
        </svg>

        {/* Center pulsing icon */}
        <div className="text-primary animate-[pulse-op_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">
          <Icon name="memory" size={32} className="text-primary" />
        </div>
      </div>

      {/* Cycling Status Messages */}
      <div className="text-center h-20 flex flex-col items-center justify-start">
        <h2 className="font-heading text-[24px] text-primary mb-2 font-semibold">Processing Input</h2>
        <div className="font-mono text-[13px] text-on-surface-variant flex items-center gap-2 h-6">
          <Icon name="autorenew" size={16} className="text-on-surface-variant animate-spin" />
          <span key={currentStep} className="inline-block typewriter-cursor animate-[fadeIn_350ms_ease-out]">
            {displayMessages[currentStep] ?? displayMessages[displayMessages.length - 1]}
          </span>
        </div>
      </div>

      {/* Rotating tips */}
      <div className="h-10 flex items-center justify-center mt-2">          {activeTips.length > 0 && (
            <span
              key={safeTipIndex}
              className="inline-flex items-center gap-1.5 text-[12px] text-outline animate-[fadeIn_400ms_ease-out]"
            >
              <Icon name="lightbulb" size={14} className="text-outline-variant" />
              {activeTips[safeTipIndex]}
            </span>
          )}
      </div>

      {/* Cancel */}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="mt-8 text-on-surface-variant underline underline-offset-2 hover:text-primary transition-colors font-body-md"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
