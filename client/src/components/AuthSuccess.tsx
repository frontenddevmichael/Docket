import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { authBtnPrimary } from '@/lib/authStyles'
import type { ReactNode } from 'react'

interface AuthSuccessProps {
  /**
   * 'success' — checkmark stamp + "…" copy, then a progress bar fills and
   *             onRedirect fires (auto-logged-in flow).
   * 'verify'  — "Check your email" with the submitted address and a path
   *             back to sign-in (email-confirmation flow, no redirect).
   */
  phase: 'success' | 'verify'
  /** Big heading under the stamp, e.g. "Account created" or "Signed in". */
  heading: string
  /** Supporting copy under the heading. */
  message: ReactNode
  /** Email shown in the 'verify' state ("we sent a link to …"). */
  email?: string
  /** Called after the progress bar completes (success state). */
  onRedirect: () => void
  /** Called from the "Back to Sign In" button (verify state). */
  onSignIn: () => void
}

/**
 * Inline post-submit state. Rendered in place of the form (same card), so
 * the transition reads as a morph, not a page change. Motion pauses for
 * prefers-reduced-motion (shorter pre-redirect delay, no draw animation).
 */
export function AuthSuccess({ phase, heading, message, email, onRedirect, onSignIn }: AuthSuccessProps) {
  const reduceMotion = useReducedMotion() ?? false
  const isSuccess = phase === 'success'

  useEffect(() => {
    if (!isSuccess) return
    // Give the stamp + bar a beat to land before navigating.
    const t = setTimeout(onRedirect, reduceMotion ? 600 : 1600)
    return () => clearTimeout(t)
  }, [isSuccess, reduceMotion, onRedirect])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      role="status"
      className="text-center py-4"
    >
      {/* Checkmark stamp */}
      <div className="relative w-16 h-16 mx-auto mb-5">
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/15"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.05 }}
        />
        <svg viewBox="0 0 24 24" className="w-16 h-16 relative" fill="none" aria-hidden="true">
          <motion.circle
            cx="12"
            cy="12"
            r="10"
            stroke="var(--color-primary)"
            strokeWidth="1.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: 'easeOut' }}
          />
          <motion.path
            d="M8 12.5l2.6 2.6L16 9.5"
            stroke="var(--color-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: reduceMotion ? 0 : 0.35 }}
          />
        </svg>
      </div>

      {isSuccess ? (
        <>
          <h2 className="font-heading text-[22px] font-semibold text-on-surface mb-1.5">{heading}</h2>
          <p className="font-body-md text-[13px] text-on-surface-variant mb-6">{message}</p>
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-32 h-1 bg-surface-container-high rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: reduceMotion ? 0 : 1.4, ease: 'easeInOut' }}
              />
            </div>
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-[0.08em]">→ workspace</span>
          </div>
        </>
      ) : (
        <>
          <h2 className="font-heading text-[22px] font-semibold text-on-surface mb-1.5">Check your email</h2>
          <p className="font-body-md text-[13px] text-on-surface-variant mb-6 leading-relaxed">
            We sent a confirmation link to <span className="font-semibold text-on-surface break-all">{email}</span>.
            Confirm it, then sign in to start your first session.
          </p>
          <button type="button" onClick={onSignIn} className={authBtnPrimary}>
            Back to Sign In
          </button>
        </>
      )}
    </motion.div>
  )
}
