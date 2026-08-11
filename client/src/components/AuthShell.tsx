import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Icon } from '@/components/Icon'
import { Stamp } from '@/components/Stamp'
import type { ReactNode } from 'react'

interface AuthShellProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  doodle?: ReactNode
}

/* ── Ambient brand panel ───────────────────────────────────────────────
   A live miniature test session in the product's own visual language:
   test-case rows get stamped pass/fail in sequence, a progress bar fills,
   and a verdict lands. This is the "product in real use" moment on the
   left of every auth screen. Motion pauses for prefers-reduced-motion. */

const DEMO_CASES = [
  { title: 'Login rejects short password', ref: 'PRD §2.3', verdict: 'pass' as const },
  { title: 'Password reset expiry window', ref: 'PRD §4.1', verdict: 'fail' as const },
  { title: 'Remember-me checkbox persists', ref: 'PRD §2.5', verdict: 'pass' as const },
  { title: 'Lockout after 5 failed attempts', ref: 'PRD §2.8', verdict: 'pass' as const },
  { title: 'Session expires on idle', ref: 'PRD §2.9', verdict: 'pass' as const },
  { title: 'Error state on malformed OTP', ref: 'PRD §3.2', verdict: 'fail' as const },
]

function BrandPreview() {
  const reduceMotion = useReducedMotion()
  const [step, setStep] = useState(reduceMotion ? DEMO_CASES.length : 2)

  useEffect(() => {
    if (reduceMotion) return
    const interval = setInterval(() => {
      setStep((s) => (s >= DEMO_CASES.length ? 2 : s + 1))
    }, 1400)
    return () => clearInterval(interval)
  }, [reduceMotion])

  const executed = Math.min(step, DEMO_CASES.length)
  const pct = Math.round((executed / DEMO_CASES.length) * 100)
  const fails = DEMO_CASES.slice(0, executed).filter((c) => c.verdict === 'fail').length

  return (
    <div className="w-full max-w-sm mx-auto" aria-hidden="true">
      {/* Session header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#C77D25]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/50">Live execution</span>
        </div>
        <span className="font-mono text-[10px] text-white/40">#c91f4a</span>
      </div>

      {/* Test case rows */}
      <div className="space-y-1.5 mb-3">
        {DEMO_CASES.map((tc, i) => {
          const stamped = i < executed
          const done = stamped
          return (
            <div
              key={tc.title}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.07] transition-all duration-300"
              style={{ opacity: stamped ? 1 : 0.45 }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-body-md text-[12px] text-white/90 truncate">{tc.title}</p>
                <p className="font-mono text-[9px] text-[#C77D25]/80">{tc.ref}</p>
              </div>
              <div className="shrink-0">
                {done ? (
                  <Stamp status={tc.verdict} visible />
                ) : (
                  <span className="w-11 inline-flex justify-center font-mono text-[9px] uppercase tracking-[0.08em] text-white/30">○</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress + verdict */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#C77D25] rounded-full"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <span className="font-mono text-[10px] text-white/60 shrink-0">
          {executed}/{DEMO_CASES.length} · {fails} issue{fails === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  )
}

function BrandPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between p-10 xl:p-14 bg-[#141414] overflow-hidden">
      {/* Blueprint grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.05]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id="auth-grid" patternUnits="userSpaceOnUse" width="72" height="72">
            <path d="M 72 0 L 0 0 0 72" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#auth-grid)" />
      </svg>

      {/* Ambient blobs (used by the e2e smoke test) */}
      <div aria-hidden="true" className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#C77D25]/25 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-white/[0.06] blur-3xl" />

      {/* Floating particles */}
      {[
        { top: '18%', left: '72%', d: '0s' },
        { top: '64%', left: '18%', d: '2s' },
        { top: '80%', left: '80%', d: '4s' },
        { top: '30%', left: '12%', d: '5s' },
      ].map((p, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute w-2 h-2 rounded-full bg-[#C77D25]/50 animate-[float_9s_ease-in-out_infinite]"
          style={{ top: p.top, left: p.left, animationDelay: p.d }}
        />
      ))}

      {/* Brand header */}
      <div className="relative z-10 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#C77D25] flex items-center justify-center">
          <Icon name="workspaces" size={16} className="text-[#141414]" />
        </div>
        <span className="font-heading text-[18px] text-white tracking-tight font-semibold">Docket</span>
        <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/35 border border-white/15 rounded px-1.5 py-0.5">QA Workspace</span>
      </div>

      {/* Middle: pitch + live preview */}
      <div className="relative z-10 my-8">
        <h2 className="font-heading text-[26px] xl:text-[30px] text-white leading-snug tracking-[-0.01em] mb-2">
          Test cases that stamp<br />in, not get written by hand.
        </h2>
        <p className="font-body-md text-[13px] text-white/55 leading-relaxed mb-8 max-w-sm">
          Drop a screen and its requirements. Docket drafts the matrix — you review, execute, and stamp the verdict.
        </p>
        <BrandPreview />
      </div>

      {/* Footer trust line */}
      <div className="relative z-10 flex items-center gap-2 font-mono text-[10px] text-white/40">
        <Icon name="lock" size={14} className="text-[#C77D25]" />
        Encrypted at rest &amp; in transit · SOC 2 ready
      </div>
    </div>
  )
}

export function AuthShell({ title, subtitle, children, footer, doodle }: AuthShellProps) {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      {/* Ambient layer (whole screen) */}
      <div className="absolute inset-0 pointer-events-none noise-overlay" aria-hidden="true" />
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(1000px 500px at 50% -20%, color-mix(in srgb, var(--color-primary-fixed) 45%, transparent), transparent 60%), radial-gradient(900px 420px at 50% 115%, color-mix(in srgb, var(--color-secondary-fixed-dim) 30%, transparent), transparent 55%)',
        }}
      />

      {/* Brand panel — desktop */}
      <BrandPanel />

      {/* Brand strip — mobile (collapsed panel, not hidden) */}
      <div className="lg:hidden flex items-center justify-between gap-3 px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#C77D25] flex items-center justify-center">
            <Icon name="workspaces" size={14} className="text-[#141414]" />
          </div>
          <span className="font-heading text-[16px] text-primary tracking-tight font-semibold">Docket</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-on-surface-variant border border-outline-variant/40 rounded px-1.5 py-0.5">
          Screen → Cases → Verdict
        </span>
      </div>

      {/* Form column */}
      <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 lg:py-10">
        {/* doodle renders inside this column so absolute positioning stays in the form half */}
        <div className="absolute inset-0 pointer-events-none">{doodle}</div>

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-lifted p-6 sm:p-8">
            <h1 className="font-heading text-[24px] font-semibold text-on-surface mb-1">{title}</h1>
            <p className="font-body-md text-[14px] text-on-surface-variant mb-6">{subtitle}</p>

            {children}
          </div>

          {footer && (
            <div className="text-center font-body-md text-[13px] text-on-surface-variant mt-5">{footer}</div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
