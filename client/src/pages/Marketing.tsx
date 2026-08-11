import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import AnimatedContent from '../components/react-bits/AnimatedContent'
import TiltedCard from '../components/react-bits/TiltedCard'
import Counter from '../components/react-bits/Counter'
import GlassSurface from '../components/react-bits/GlassSurface'
import PillNav from '../components/react-bits/PillNav'
import AnimatedList from '../components/react-bits/AnimatedList'
import Carousel from '../components/react-bits/Carousel'
import Folder from '../components/react-bits/Folder'
import Beams from '../components/react-bits/Beams'
import { Stamp } from '../components/Stamp'
import {
  ScreenToCases,
  PrdToMatrix,
  LiveExecution,
  WorkspaceDashboard,
  DragOrganize,
  ExportIntegrate,
} from '../components/marketing/FeatureIllustrations'
import { Icon } from '../components/Icon'
import { StaggerItem } from '../components/react-bits/StaggerItem'

/* ── Data ── */

const HERO_CASES = [
  { title: 'Login rejects short password', ref: 'PRD §2.3', verdict: 'pass' as const },
  { title: 'Password reset expiry window', ref: 'PRD §4.1', verdict: 'fail' as const },
  { title: 'Remember-me checkbox persists', ref: 'PRD §2.5', verdict: 'pass' as const },
  { title: 'Lockout after 5 failed attempts', ref: 'PRD §2.8', verdict: 'pass' as const },
  { title: 'Session expires on idle', ref: 'PRD §2.9', verdict: 'pass' as const },
  { title: 'Error state on malformed OTP', ref: 'PRD §3.2', verdict: 'fail' as const },
]

const LOGO_WALL = ['NORTHWIND', 'HELIO LABS', 'VANTAGE', 'KANVAS', 'SIGNAL', 'TRAILHEAD']

const METRICS = [
  { value: 12400, suffix: '+', label: 'test cases generated' },
  { value: 96, suffix: '%', label: 'kept as-is after review' },
  { value: 160, suffix: 's', label: 'screen to first report' },
  { value: 11, suffix: '×', label: 'faster than manual matrices' },
]

const FEATURES = [
  {
    id: 'screen-to-cases',
    title: 'Screen → Cases',
    desc: 'Drop a screenshot. Docket reads every button, input, modal, and error state. Test cases appear — no prompt engineering.',
    illustration: <ScreenToCases className="w-16 h-16 md:w-20 md:h-20" />,
  },
  {
    id: 'prd-to-matrix',
    title: 'PRD → Matrix',
    desc: 'Paste your PRD. The AI extracts requirements, edge cases, and constraints into a coverage matrix in seconds.',
    illustration: <PrdToMatrix className="w-12 h-12 md:w-14 md:h-14" />,
  },
  {
    id: 'live-execution',
    title: 'Live Execution',
    desc: 'Run cases with 8 verdicts — pass, fail, blocked, N/A, fixed, reopened, controlled live, UAT — each stamped with evidence.',
    illustration: <LiveExecution className="w-12 h-12 md:w-14 md:h-14" />,
  },
  {
    id: 'workspace-dashboard',
    title: 'Workspace Dashboard',
    desc: 'One view of sessions, pass rates, blockers, and team activity. Filter, sort, drill in, export.',
    illustration: <WorkspaceDashboard className="w-12 h-12 md:w-14 md:h-14" />,
  },
  {
    id: 'drag-organize',
    title: 'Drag & Organize',
    desc: 'Reorder cases, bulk-select, bulk-delete. The workspace skips the ceremony so review stays fast.',
    illustration: <DragOrganize className="w-full max-w-[120px] h-12" />,
  },
  {
    id: 'export-integrate',
    title: 'Export & Share',
    desc: 'Editable PDF reports, CSV, and JSON export. A shareable verdict your team can actually read.',
    illustration: <ExportIntegrate className="w-full max-w-[120px] h-12" />,
  },
]

const HOW_STEPS = [
  { step: 'Upload', desc: 'Drop a screenshot or URL. Paste your requirements.', metric: '4.2s', metricLabel: 'avg generation' },
  { step: 'Generate', desc: 'Docket cross-references both and drafts the matrix.', metric: '96%', metricLabel: 'kept as-is' },
  { step: 'Execute & Report', desc: 'Stamp each case, add evidence, export the verdict.', metric: '3.1s', metricLabel: 'avg execution' },
]

const TESTIMONIALS = [
  { quote: 'We cut regression testing from three days to four hours. Docket finds edge cases our manual review kept missing.', name: 'Sarah Chen', role: 'QA Lead' },
  { quote: 'The PRD-to-test-case pipeline is the killer feature. Our PM writes specs, and we have a full matrix in minutes.', name: 'Marcus J.', role: 'Engineering Manager' },
  { quote: 'Finally, a test generation tool that actually works. No prompt engineering, no configuration — just results.', name: 'Priya Patel', role: 'QA Engineer' },
  { quote: 'Onboarding a new feature used to take a full sprint just for test writing. Now it is a single afternoon.', name: 'Alex T.', role: 'SDET' },
]

const FAQ_DATA = [
  { q: 'How does Docket generate test cases from screenshots?', a: 'Docket uses vision AI to analyze UI screenshots — detecting buttons, inputs, modals, and error states. Combined with your PRD text, it produces a complete test matrix covering happy paths, edge cases, and error scenarios, with each case linked back to the requirement that motivated it.' },
  { q: 'Can I edit the generated test cases?', a: 'Every generated case is fully editable. Modify steps, add new ones, delete cases, bulk-select and delete, duplicate, or reorder with drag-and-drop.' },
  { q: 'What formats can I export?', a: 'Reports export as PDF (print-ready) and CSV; raw test data exports as JSON. The report itself is editable before you share it — reorder sections, add commentary, add a sign-off table.' },
  { q: 'Is my data secure?', a: 'All traffic is encrypted in transit and data is encrypted at rest. Authentication, storage, and the database are handled by Supabase\'s SOC 2 compliant infrastructure. Screenshots and requirements are used only to generate your test cases.' },
  { q: 'Can I try it before committing?', a: 'Yes — the Free plan starts with no credit card. Upgrade is instant and you can cancel anytime.' },
]

function makeSlides(testimonials: typeof TESTIMONIALS) {
  return testimonials.map((t) => ({
    content: (
      <div className="px-4 md:px-8 py-8">
        <blockquote className="mb-6">
          <p className="font-heading text-[17px] md:text-[19px] text-primary leading-relaxed font-medium">
            &ldquo;{t.quote}&rdquo;
          </p>
        </blockquote>
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/5 border border-outline-variant/30 text-[11px] font-heading font-semibold text-primary">
            {t.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="text-left">
            <div className="font-heading text-[13px] font-semibold text-primary">{t.name}</div>
            <div className="font-body-md text-[11px] text-on-surface-variant">{t.role}</div>
          </div>
        </div>
      </div>
    ),
  }))
}

function RippleButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null)
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = ref.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const ripple = document.createElement('span')
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2
    ripple.style.cssText = `position:absolute;width:${size}px;height:${size}px;left:${x}px;top:${y}px;border-radius:50%;background:currentColor;opacity:0.15;transform:scale(0);animation:rippleAnim 600ms ease-out forwards;pointer-events:none`
    btn.appendChild(ripple)
    setTimeout(() => ripple.remove(), 600)
    props.onClick?.(e)
  }
  return (
    <button ref={ref} className={`relative overflow-hidden ${className}`} {...props} onClick={handleClick}>
      {children}
    </button>
  )
}

/* ── Hero: the product in real use ─────────────────────────────────────
   A miniature execution session that stamps cases pass/fail in a loop —
   the product's signature interaction, running live in the hero. */

function LiveHeroMockup() {
  const reduceMotion = useReducedMotion()
  const [step, setStep] = useState(reduceMotion ? 3 : 2)

  useEffect(() => {
    if (reduceMotion) return
    const interval = setInterval(() => {
      setStep((s) => (s >= HERO_CASES.length ? 2 : s + 1))
    }, 1300)
    return () => clearInterval(interval)
  }, [reduceMotion])

  const executed = Math.min(step, HERO_CASES.length)
  const pct = Math.round((executed / HERO_CASES.length) * 100)
  const fails = HERO_CASES.slice(0, executed).filter((c) => c.verdict === 'fail').length
  const verdict = fails === 0 ? 'PASS' : fails <= 2 ? 'CONDITIONAL PASS' : 'FAIL'

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-floating overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-outline-variant/20 bg-surface-container-low">
        <div className="w-2.5 h-2.5 rounded-full bg-[#ed6a5e]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#f5bd4f]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#61c454]" />
        <span className="ml-2 font-mono text-[10px] text-on-surface-variant">sessions / login-flow / execute</span>
      </div>

      <div className="flex">
        {/* Left rail */}
        <div className="hidden sm:flex flex-col items-center gap-2 px-3 py-4 border-r border-outline-variant/20 bg-surface-container-low">
          <div className="w-5 h-5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Icon name="workspaces" size={12} className="text-primary" />
          </div>
          <div className="w-5 h-0.5 rounded bg-outline-variant/30" />
          <div className="w-5 h-0.5 rounded bg-outline-variant/30" />
          <div className="w-5 h-0.5 rounded bg-outline-variant/30" />
          <div className="w-5 h-0.5 rounded bg-outline-variant/30" />
        </div>

        {/* Test case rows, stamped in sequence */}
        <div className="flex-1 p-4 space-y-2">
          {HERO_CASES.map((tc, i) => {
            const stamped = i < executed
            return (
              <div
                key={tc.title}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/20 transition-opacity duration-300"
                style={{ opacity: stamped ? 1 : 0.5 }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-on-surface truncate">{tc.title}</p>
                  <p className="font-mono text-[9px] text-warning">{tc.ref}</p>
                </div>
                <div className="shrink-0">
                  {stamped ? (
                    <Stamp status={tc.verdict} visible />
                  ) : (
                    <span className="inline-block w-12 text-center font-mono text-[10px] text-on-surface-variant/40">○</span>
                  )}
                </div>
              </div>
            )
          })}

          {/* Progress + verdict */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-warning rounded-full"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <span className="font-mono text-[10px] text-on-surface-variant shrink-0">{executed}/{HERO_CASES.length} executed</span>
            <span
              className={`font-heading text-[10px] uppercase tracking-[0.1em] font-semibold border rounded px-2 py-0.5 shrink-0 transition-colors duration-300
                ${fails === 0 ? 'border-primary text-primary' : 'border-warning text-warning'}`}
            >
              {verdict}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── The report showcase: deeper feature proof ───────────────────────── */

function LogoMarquee() {
  /* Infinite marquee. The track holds two copies of the logo list and
     translates -50% (exactly one copy) for a seamless loop; hovering the
     group pauses it. The animated track is aria-hidden — a static list is
     exposed to screen readers instead, and reduced-motion users get the
     static wall too (animation: none). */
  const items = [...LOGO_WALL, ...LOGO_WALL]
  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <ul className="sr-only">
        {LOGO_WALL.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <div
        className="logo-marquee-track flex items-center gap-x-12 md:gap-x-16 w-max mx-auto py-1 text-on-surface-variant/50 transition-colors duration-300 group-hover:text-on-surface-variant/80 group-hover:[animation-play-state:paused]"
        aria-hidden="true"
      >
        {items.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="font-heading text-[15px] font-semibold tracking-[0.08em] whitespace-nowrap select-none cursor-default"
          >
            {name}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes logo-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        /* Longhand props on purpose: the shorthand would reset
           animation-play-state to 'running' and override Tailwind's
           group-hover:[animation-play-state:paused] utility. */
        .logo-marquee-track {
          animation-name: logo-marquee;
          animation-duration: 28s;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .logo-marquee-track { animation: none; }
        }
      `}</style>
    </div>
  )
}

function ReportShowcase() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-floating overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant/20 bg-surface-container-low">
        <span className="font-mono text-[10px] text-on-surface-variant">REPORT · login-flow · v3</span>
        <span className="font-heading text-[9px] uppercase tracking-[0.1em] font-semibold text-warning border border-warning/30 rounded px-1.5 py-0.5">Conditional pass</span>
      </div>
      <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Summary */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading text-[40px] leading-none text-primary font-semibold">96</span>
            <span className="font-heading text-[16px] text-on-surface-variant font-semibold">%</span>
          </div>
          <p className="font-body-md text-[12px] text-on-surface-variant -mt-1">pass rate · 24 of 25 executed</p>
          <div className="space-y-1.5 pt-1">
            {[
              { label: 'Pass', value: 22, color: 'bg-primary' },
              { label: 'Fail / Blocked', value: 2, color: 'bg-warning' },
              { label: 'Not run', value: 1, color: 'bg-surface-container-high' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2">
                <span className="w-24 font-mono text-[10px] text-on-surface-variant">{row.label}</span>
                <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                  <div className={`h-full ${row.color} rounded-full`} style={{ width: `${(row.value / 25) * 100}%` }} />
                </div>
                <span className="w-5 text-right font-mono text-[10px] text-on-surface-variant">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Coverage */}
        <div className="md:col-span-3">
          <p className="font-heading text-[10px] uppercase tracking-[0.1em] font-semibold text-on-surface-variant mb-3">Requirements coverage</p>
          <div className="space-y-1.5">
            {[
              { ref: 'PRD §2.3', title: 'Password validation rules', done: true },
              { ref: 'PRD §2.5', title: 'Remember-me persistence', done: true },
              { ref: 'PRD §4.1', title: 'Reset link expiry', done: true },
              { ref: 'PRD §3.2', title: 'OTP error handling', done: true },
              { ref: 'PRD §5.1', title: 'Rate limiting on auth', done: false },
            ].map((c) => (
              <div key={c.ref} className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-surface-container-low border border-outline-variant/20">
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${c.done ? 'bg-primary/10 border-primary/30' : 'border-outline-variant/40'}`}>
                  {c.done && (
                    <svg className="w-2.5 h-2.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="font-mono text-[10px] text-warning shrink-0">{c.ref}</span>
                <span className="text-[12px] font-medium text-on-surface truncate">{c.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main ── */
export function Marketing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { scrollY } = useScroll()
  const parallaxY = useTransform(scrollY, [0, 800], [0, -120])
  const parallaxOpacity = useTransform(scrollY, [0, 400], [0.08, 0])

  useEffect(() => {
    if (user) navigate('/sessions', { replace: true })
  }, [user, navigate])

  const testimonialSlides = makeSlides(TESTIMONIALS)

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md overflow-x-hidden selection:bg-primary selection:text-on-primary">
      {/* Parallax background decorative layer */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ y: parallaxY, opacity: parallaxOpacity }}
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full border border-outline-variant/10" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full border border-outline-variant/8" />
        <div className="absolute top-2/5 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full border border-outline-variant/6" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="parallax-grid" patternUnits="userSpaceOnUse" width="80" height="80">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#parallax-grid)" />
        </svg>
      </motion.div>

      {/* ═══ Nav (PillNav) ═══ */}
      <PillNav
        links={[
          { href: '#how', label: 'How it works' },
          { href: '#features', label: 'Features' },
          { href: '#pricing', label: 'Pricing' },
          { href: '#faq', label: 'FAQ' },
        ]}
        logo={
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Icon name="workspaces" size={16} className="text-on-primary" />
            </div>
            <span className="font-heading text-[18px] text-primary tracking-tight font-semibold">Docket</span>
          </Link>
        }
        actions={
          <>
            <button
              onClick={() => {
                const isDark = document.documentElement.classList.toggle('dark')
                localStorage.setItem('docket-theme', isDark ? 'dark' : 'light')
              }}
              className="w-8 h-8 rounded-lg border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label="Toggle theme"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path className="dark:hidden" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                <circle className="hidden dark:block" cx="12" cy="12" r="5" />
                <line className="hidden dark:block" x1="12" y1="1" x2="12" y2="3" />
                <line className="hidden dark:block" x1="12" y1="21" x2="12" y2="23" />
                <line className="hidden dark:block" x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line className="hidden dark:block" x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line className="hidden dark:block" x1="1" y1="12" x2="3" y2="12" />
                <line className="hidden dark:block" x1="21" y1="12" x2="23" y2="12" />
                <line className="hidden dark:block" x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line className="hidden dark:block" x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            </button>
            <Link
              to="/sign-in"
              className="font-body-md text-[13px] text-on-surface-variant hover:text-primary transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              to="/sign-up"
              className="inline-block bg-primary text-on-primary font-heading text-[11px] uppercase tracking-[0.05em] font-semibold px-5 py-2 rounded-lg hover:opacity-90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Get Started
            </Link>
          </>
        }
        mobileMenu={
          <Link
            to="/sign-up"
            className="block w-full text-center bg-primary text-on-primary font-heading text-[11px] uppercase tracking-[0.05em] font-semibold px-5 py-3 rounded-lg hover:opacity-90 active:scale-[0.97] transition-all"
          >
            Get Started — Free
          </Link>
        }
      />

      <main className="relative z-10">
        {/* ═══ HERO ═══ */}
        <section className="pt-20 pb-16 md:pt-24 md:pb-20 px-4 md:px-10 max-w-[1280px] mx-auto">
          <AnimatedContent direction="vertical" distance={32} duration={0.6} once="marketing-hero">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary/5 border border-outline-variant/30 font-heading text-[11px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                AI-Powered Test Generation
              </div>
              <h1 className="font-heading text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[1.05] tracking-[-0.025em] text-primary mb-5">
                A screen, its spec,
                <br />
                <span className="text-on-surface-variant">and the verdict — stamped.</span>
              </h1>
              <p className="font-body-md text-[15px] md:text-[16px] text-on-surface-variant max-w-2xl mx-auto leading-relaxed mb-8">
                Drop a screenshot and paste the PRD. Docket drafts the full test matrix — happy paths,
                edge cases, error states — and you execute, stamp, and ship the report.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <RippleButton
                  onClick={() => navigate('/sign-up')}
                  className="bg-primary text-on-primary font-heading text-[13px] font-semibold px-7 py-3 rounded-lg shadow-lifted hover:opacity-90 active:scale-[0.97] transition-all"
                >
                  Start Free — No Credit Card
                </RippleButton>
                <a
                  href="#how"
                  className="inline-flex items-center gap-1.5 font-body-md text-[13px] text-on-surface-variant hover:text-primary transition-colors px-5 py-3"
                >
                  See it in action
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </a>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent direction="vertical" distance={48} duration={0.8} delay={0.2} once="marketing-hero-mockup">
            <TiltedCard rotateAmplitude={3} scaleOnHover={1.01} containerHeight="auto" className="max-w-3xl mx-auto">
              <LiveHeroMockup />
            </TiltedCard>
          </AnimatedContent>
        </section>

        {/* ═══ LOGO WALL ═══ */}
        <section className="py-12 border-y border-outline-variant/20 bg-surface-container-low">
          <div className="max-w-[1280px] mx-auto px-4 md:px-10">
            <AnimatedContent distance={16} duration={0.5} once="marketing-logos">
              <p className="font-body-md text-[11px] text-on-surface-variant text-center mb-6 uppercase tracking-[0.12em]">
                Trusted by QA teams shipping faster
              </p>
              <LogoMarquee />
            </AnimatedContent>
          </div>
        </section>

        {/* ═══ METRICS ═══ */}
        <section className="py-14 px-4 md:px-10 max-w-[1280px] mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 stagger-enter">
            {METRICS.map((m, i) => (
              <StaggerItem key={m.label} index={i}>
                <div className="text-center">
                  <div className="font-heading text-[34px] md:text-[40px] text-primary font-semibold tracking-tight">
                    <Counter from={0} to={m.value} duration={1.6} suffix={m.suffix} className="font-heading text-[34px] md:text-[40px] text-primary font-semibold tracking-tight" />
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-on-surface-variant mt-1">{m.label}</p>
                </div>
              </StaggerItem>
            ))}
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <AnimatedContent distance={0} duration={0.6} once="marketing-how-section">
          <section id="how" className="py-16 border-y border-outline-variant/20 bg-surface-container-low">
            <div className="max-w-[1280px] mx-auto px-4 md:px-10">
              <AnimatedContent distance={20} duration={0.5} once="marketing-how-heading">
                <h2 className="font-heading text-[22px] md:text-[26px] text-primary text-center mb-2">How it works</h2>
                <p className="font-body-md text-[13px] text-on-surface-variant text-center mb-10 max-w-lg mx-auto">
                  Three steps from idea to executable tests.
                </p>
              </AnimatedContent>

              <AnimatedList
                staggerInterval={0.15}
                distance={24}
                duration={0.6}
                direction="alternating"
                once="marketing-how-list"
                className="max-w-3xl mx-auto"
              >
                {HOW_STEPS.map((s, i) => (
                  <div key={s.step} className="flex items-start gap-5 md:gap-8">
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <span className="font-heading text-[13px] font-semibold text-on-primary">
                          {i + 1}
                        </span>
                      </div>
                      {i < HOW_STEPS.length - 1 && (
                        <div className="flex-1 w-px min-h-[40px] bg-outline-variant/30 my-2" />
                      )}
                    </div>
                    <div className="pb-8 pt-1">
                      <h3 className="font-heading text-[15px] text-primary font-semibold mb-1">{s.step}</h3>
                      <p className="font-body-md text-[12px] text-on-surface-variant leading-relaxed mb-2">
                        {s.desc}
                      </p>
                      <span className="font-heading text-[18px] text-primary font-semibold">
                        <Counter from={0} to={parseInt(s.metric) || 0} duration={1.5} suffix={s.metric.replace(/[\d.]/g, '')} className="font-heading text-[18px] text-primary font-semibold" />
                        <span className="font-body-md text-[10px] text-on-surface-variant ml-1.5">{s.metricLabel}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </AnimatedList>
            </div>
          </section>
        </AnimatedContent>

        {/* ═══ FEATURES ═══ */}
        <AnimatedContent distance={0} duration={0.6} once="marketing-features-section">
          <section id="features" className="py-20 px-4 md:px-10 max-w-[1280px] mx-auto">
            <AnimatedContent distance={20} duration={0.5} once="marketing-features-heading">
              <div className="text-center mb-12">
                <span className="inline-block font-heading text-[11px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-3">Capabilities</span>
                <h2 className="font-heading text-[28px] md:text-[32px] text-primary mb-2">What Docket actually does</h2>
                <p className="font-body-md text-[14px] text-on-surface-variant max-w-xl mx-auto">
                  No fluff. This is exactly what happens when you use the tool.
                </p>
              </div>
            </AnimatedContent>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-enter">
              {FEATURES.map((f, i) => (
                <StaggerItem key={f.id} index={i}>
                  <TiltedCard rotateAmplitude={2} scaleOnHover={1.01} containerHeight="100%" className="h-full">
                    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-5 h-full card-interactive hover:shadow-lifted transition-all duration-200">
                      <div className="mb-3">{f.illustration}</div>
                      <h3 className="font-heading text-[14px] text-primary font-medium mb-1">
                        {f.title}
                      </h3>
                      <p className="font-body-md text-[12px] text-on-surface-variant leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </TiltedCard>
                </StaggerItem>
              ))}
            </div>
          </section>
        </AnimatedContent>

        {/* ═══ THE REPORT (deeper proof) ═══ */}
        <AnimatedContent distance={0} duration={0.6} once="marketing-report-section">
          <section className="py-20 border-y border-outline-variant/20 bg-surface-container-low">
            <div className="max-w-[1080px] mx-auto px-4 md:px-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center mb-12">
                <div>
                  <span className="inline-block font-heading text-[11px] uppercase tracking-[0.06em] font-semibold text-warning mb-3">The handoff</span>
                  <h2 className="font-heading text-[28px] md:text-[32px] text-primary mb-3 leading-tight">
                    A report your team can actually read.
                  </h2>
                  <p className="font-body-md text-[14px] text-on-surface-variant leading-relaxed">
                    Verdict stamp, pass-rate summary, failure distribution, requirement coverage,
                    and a sign-off table — editable before you share, exportable as PDF.
                    The evidence travels with the verdict.
                  </p>
                </div>
                <AnimatedContent direction="vertical" distance={32} duration={0.7} once="marketing-report-visual">
                  <ReportShowcase />
                </AnimatedContent>
              </div>
            </div>
          </section>
        </AnimatedContent>

        {/* ═══ PRICING ═══ */}
        <AnimatedContent distance={0} duration={0.6} once="marketing-pricing-section">
          <section id="pricing" className="py-20 px-4 md:px-10 max-w-[1080px] mx-auto">
            <AnimatedContent distance={20} duration={0.5} once="marketing-pricing-heading">
              <div className="text-center mb-12">
                <span className="inline-block font-heading text-[11px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-3">Pricing</span>
                <h2 className="font-heading text-[28px] md:text-[32px] text-primary mb-2">Start free. Upgrade when the room grows.</h2>
                <p className="font-body-md text-[14px] text-on-surface-variant max-w-xl mx-auto">
                  No feature-gated trial. The free plan is a real workspace, not a teaser.
                </p>
              </div>
            </AnimatedContent>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger-enter">
              {[
                {
                  name: 'Free',
                  price: '$0',
                  cadence: '/mo',
                  blurb: 'For individual testers trying it on a real project.',
                  features: ['25 generations / month', 'All input types', 'Unlimited sessions', 'PDF & CSV reports'],
                  cta: 'Start Free',
                  featured: false,
                },
                {
                  name: 'Pro',
                  price: '$19',
                  cadence: '/mo',
                  blurb: 'For small QA teams running steady releases.',
                  features: ['Unlimited generations', 'Workspace roles & invitations', 'Issue Log & sign-off', 'Priority support'],
                  cta: 'Start Pro',
                  featured: true,
                },
                {
                  name: 'Enterprise',
                  price: 'Custom',
                  cadence: '',
                  blurb: 'For orgs that need control and accountability.',
                  features: ['SSO / SAML', 'Audit logging', 'Dedicated support & SLAs', 'On-prem deployment'],
                  cta: 'Contact Sales',
                  featured: false,
                },
              ].map((plan, i) => (
                <StaggerItem key={plan.name} index={i}>
                  <div
                    className={`relative flex flex-col h-full bg-surface-container-lowest border rounded-lg p-6 card-interactive hover:shadow-lifted transition-all duration-200
                      ${plan.featured ? 'border-warning/50 shadow-lifted' : 'border-outline-variant/30'}`}
                  >
                    {plan.featured && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-warning text-white font-heading text-[9px] uppercase tracking-[0.1em] font-semibold px-2.5 py-0.5 rounded">
                        Most popular
                      </span>
                    )}
                    <h3 className="font-heading text-[14px] text-primary font-semibold">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-2 mb-1">
                      <span className="font-heading text-[32px] text-primary font-semibold tracking-tight">{plan.price}</span>
                      {plan.cadence && <span className="font-body-md text-[12px] text-on-surface-variant">{plan.cadence}</span>}
                    </div>
                    <p className="font-body-md text-[12px] text-on-surface-variant mb-5">{plan.blurb}</p>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 font-body-md text-[12.5px] text-on-surface">
                          <Icon name="check-circle" size={14} className="text-success shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <RippleButton
                      onClick={() => navigate('/sign-up')}
                      className={`mt-auto w-full font-heading text-[11px] uppercase tracking-[0.06em] font-semibold py-2.5 rounded-lg transition-all active:scale-[0.97]
                        ${plan.featured ? 'bg-warning text-white hover:opacity-90' : 'bg-primary text-on-primary hover:opacity-90'}`}
                    >
                      {plan.cta}
                    </RippleButton>
                  </div>
                </StaggerItem>
              ))}
            </div>
          </section>
        </AnimatedContent>

        {/* ═══ TESTIMONIALS ═══ */}
        <AnimatedContent distance={0} duration={0.6} once="marketing-testimonials-section">
          <section className="py-20 bg-surface-container-low border-y border-outline-variant/20">
            <div className="max-w-[640px] mx-auto px-4 md:px-10 text-center">
              <AnimatedContent distance={20} duration={0.5} once="marketing-testimonials-label">
                <span className="inline-block font-heading text-[11px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-6">What teams say</span>
              </AnimatedContent>
              <Carousel
                slides={testimonialSlides}
                autoAdvanceInterval={6000}
              />
            </div>
          </section>
        </AnimatedContent>

        {/* ═══ FAQ ═══ */}
        <AnimatedContent distance={0} duration={0.6} once="marketing-faq-section">
          <section id="faq" className="py-20 px-4 md:px-10 max-w-2xl mx-auto">
            <AnimatedContent distance={20} duration={0.5} once="marketing-faq-heading">
              <div className="text-center mb-10">
                <span className="inline-block font-heading text-[11px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-3">FAQ</span>
                <h2 className="font-heading text-[28px] md:text-[32px] text-primary mb-2">Frequently asked questions</h2>
              </div>
            </AnimatedContent>
            <Folder items={FAQ_DATA} />
          </section>
        </AnimatedContent>

        {/* ═══ CTA ═══ */}
        <AnimatedContent distance={32} duration={0.7} once="marketing-cta-section">
          <section className="pb-20 px-4 md:px-10 max-w-[680px] mx-auto">
            <div className="relative">
              <Beams count={3} opacity={0.5} />
              <GlassSurface backgroundEffect={0.2} className="relative z-10">
                <div className="p-8 md:p-10 text-center">
                  <h2 className="font-heading text-[26px] md:text-[30px] text-primary mb-6 leading-tight">
                    Your next release deserves a stamped verdict.
                  </h2>
                  <RippleButton
                    onClick={() => navigate('/sign-up')}
                    className="bg-primary text-on-primary font-heading text-[13px] font-semibold px-7 py-3 rounded-lg shadow-lifted hover:opacity-90 active:scale-[0.97] transition-all"
                  >
                    Start Free — No Credit Card
                  </RippleButton>
                </div>
              </GlassSurface>
            </div>
          </section>
        </AnimatedContent>

        {/* ═══ FOOTER ═══ */}
        <footer className="py-12 border-t border-outline-variant/20 bg-surface">
          <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Icon name="workspaces" size={14} className="text-on-primary" />
              </div>
              <span className="font-heading text-[16px] text-primary font-semibold tracking-tight">Docket</span>
            </div>
            <div className="flex items-center gap-5">
              <a href="#features" className="font-body-md text-[12px] text-on-surface-variant hover:text-primary transition-colors">Features</a>
              <a href="#pricing" className="font-body-md text-[12px] text-on-surface-variant hover:text-primary transition-colors">Pricing</a>
              <Link to="/sign-in" className="font-body-md text-[12px] text-on-surface-variant hover:text-primary transition-colors">Sign in</Link>
            </div>
            <p className="font-body-md text-[11px] text-on-surface-variant">&copy; {new Date().getFullYear()} Docket.</p>
          </div>
        </footer>
      </main>
    </div>
  )
}
