import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
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

const FEATURES = [
  {
    id: 'screen-to-cases',
    title: 'Screen → Cases',
    desc: 'Drop a screenshot. Docket reads every button, input, modal, and error state. Test cases appear. No prompt engineering needed.',
    illustration: <ScreenToCases className="w-16 h-16 md:w-20 md:h-20" />,
  },
  {
    id: 'prd-to-matrix',
    title: 'PRD → Matrix',
    desc: 'Paste your PRD. The AI extracts requirements, edge cases, and constraints. A full coverage matrix in seconds.',
    illustration: <PrdToMatrix className="w-12 h-12 md:w-14 md:h-14" />,
  },
  {
    id: 'live-execution',
    title: 'Live Execution',
    desc: 'Run cases against staging or production. Results stream in real time. Pass/fail per step. No polling.',
    illustration: <LiveExecution className="w-12 h-12 md:w-14 md:h-14" />,
  },
  {
    id: 'workspace-dashboard',
    title: 'Workspace Dashboard',
    desc: 'A single view of all sessions, pass rates, blockers, and team activity. Filter, sort, drill in.',
    illustration: <WorkspaceDashboard className="w-12 h-12 md:w-14 md:h-14" />,
  },
  {
    id: 'drag-organize',
    title: 'Drag & Organize',
    desc: 'Reorder cases, drag into groups, bulk-delete, bulk-pass. The workspace is fast because it skips the ceremony.',
    illustration: <DragOrganize className="w-full max-w-[120px] h-12" />,
  },
  {
    id: 'export-integrate',
    title: 'Export & Integrate',
    desc: 'PDF reports, JSON exports, Jira sync, Linear integration. Your data belongs in your workflow, not locked in a tool.',
    illustration: <ExportIntegrate className="w-full max-w-[120px] h-12" />,
  },
]

const HOW_STEPS = [
  { step: 'Upload', desc: 'Upload a screenshot or paste a URL. Add your requirements text.', metric: '4.2s', metricLabel: 'avg generation' },
  { step: 'Generate', desc: 'Docket cross-references both. A complete test matrix appears.', metric: '96%', metricLabel: 'kept as-is' },
  { step: 'Execute & Report', desc: 'Run each case, stamp pass or fail, export the report.', metric: '3.1s', metricLabel: 'avg execution' },
]

const TESTIMONIALS = [
  { quote: 'We cut regression testing from three days to four hours. Docket finds edge cases our manual review kept missing.', name: 'Sarah Chen', role: 'QA Lead' },
  { quote: 'The PRD-to-test-case pipeline is the killer feature. Our PM writes specs, and we have a full matrix in minutes.', name: 'Marcus J.', role: 'Engineering Manager' },
  { quote: 'Finally, a test generation tool that actually works. No prompt engineering, no configuration — just results.', name: 'Priya Patel', role: 'QA Engineer' },
  { quote: 'Onboarding a new feature used to take a full sprint just for test writing. Now it is a single afternoon.', name: 'Alex T.', role: 'SDET' },
]

const FAQ_DATA = [
  { q: 'How does Docket generate test cases from screenshots?', a: 'Docket uses vision AI to analyze UI screenshots — detecting buttons, inputs, modals, and error states. Combined with your PRD text, it produces a complete test matrix covering happy paths, edge cases, and error scenarios.' },
  { q: 'Can I edit the generated test cases?', a: 'Every generated case is fully editable. Modify steps, add new ones, delete cases, bulk-select and delete, or regenerate individual cases with updated context.' },
  { q: 'What formats can I export?', a: 'Reports export as PDFs. Raw test data exports as JSON for integration. Pro and Enterprise plans include direct Jira and Linear sync.' },
  { q: 'Is my data secure?', a: 'All data is encrypted at rest and in transit. Enterprise plans offer dedicated infrastructure, SSO/SAML, audit logging, and optional on-premise deployment.' },
  { q: 'Can I try it before committing?', a: 'Yes. The Free plan gives you 25 test generations per month with no credit card required. Upgrade is instant and you can cancel anytime.' },
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
        {/* Grid lines */}
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
          { href: '#features', label: 'Features' },
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
        <section className="pt-24 pb-20 md:pt-28 md:pb-24 px-4 md:px-10 max-w-[1280px] mx-auto">
          <AnimatedContent direction="vertical" distance={32} duration={0.6} once="marketing-hero">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary/5 border border-outline-variant/30 font-heading text-[11px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                AI-Powered Test Generation
              </div>
              <h1 className="font-heading text-[clamp(2rem,5vw,4rem)] leading-[1.1] tracking-[-0.02em] text-primary mb-4">
                Tests from screens &amp; specs<br />
                <span className="text-on-surface-variant">in one click.</span>
              </h1>
              <p className="font-body-md text-[15px] md:text-[16px] text-on-surface-variant max-w-2xl mx-auto leading-relaxed mb-8">
                Drop a screenshot. Paste a PRD. Docket generates a complete, executable test matrix —&nbsp;
                covering happy paths, edge cases, and error states — in seconds, not hours.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <RippleButton
                  onClick={() => navigate('/sign-up')}
                  className="bg-primary text-on-primary font-heading text-[13px] font-semibold px-7 py-3 rounded-lg shadow-lifted"
                >
                  Start Free — No Credit Card
                </RippleButton>
                <a
                  href="#features"
                  className="inline-flex items-center gap-1.5 font-body-md text-[13px] text-on-surface-variant hover:text-primary transition-colors px-5 py-3"
                >
                  See how it works
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </a>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent direction="vertical" distance={48} duration={0.8} delay={0.2} once="marketing-hero-mockup">
            <TiltedCard rotateAmplitude={4} scaleOnHover={1.01} containerHeight="auto" className="max-w-4xl mx-auto">
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-floating overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-outline-variant/20 bg-surface-container-low">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ed6a5e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f5bd4f]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#61c454]" />
                  <span className="ml-2 font-mono text-[10px] text-on-surface-variant">docket generate --session login-flow</span>
                </div>
                <div className="flex">
                  <div className="hidden sm:flex flex-col items-center gap-2 px-3 py-4 border-r border-outline-variant/20 bg-surface-container-low">
                    <div className="w-5 h-5 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 text-primary">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18M9 21V9" />
                      </svg>
                    </div>
                    <div className="w-5 h-0.5 rounded bg-outline-variant/30" />
                    <div className="w-5 h-0.5 rounded bg-outline-variant/30" />
                    <div className="w-5 h-0.5 rounded bg-outline-variant/30" />
                    <div className="w-5 h-0.5 rounded bg-outline-variant/30" />
                  </div>
                  <div className="flex-1 p-4 space-y-2">
                    {[
                      'Verify login form renders all 4 fields',
                      'Confirm error state on invalid email',
                      'Validate password strength indicator',
                    ].map((tc, i) => (
                      <div
                        key={tc}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/20"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${i < 2 ? 'bg-success/15 border-success/30' : 'border-outline-variant/40'}`}>
                          {i < 2 && (
                            <svg className="w-2.5 h-2.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-[12px] font-medium text-on-surface truncate">{tc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TiltedCard>
          </AnimatedContent>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <AnimatedContent distance={0} duration={0.6} once="marketing-how-section">
          <section className="py-16 border-y border-outline-variant/20 bg-surface-container-low">
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
                  No fluff. No marketing speak. Here is exactly what happens when you use the tool.
                </p>
              </div>
            </AnimatedContent>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-enter">
              {FEATURES.map((f, i) => (
                <StaggerItem key={f.id} index={i}>
                  <TiltedCard rotateAmplitude={2} scaleOnHover={1.01} containerHeight="100%" className="h-full">
                    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-5 h-full card-interactive hover:shadow-lifted transition-all duration-200">
                      {f.illustration && (
                        <div className="mb-3">{f.illustration}</div>
                      )}
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

        {/* ═══ TESTIMONIALS ═══ */}
        <AnimatedContent distance={0} duration={0.6} once="marketing-testimonials-section">
          <section className="py-20 bg-surface-container-low border-y border-outline-variant/20">
            <div className="max-w-[640px] mx-auto px-4 md:px-10 text-center">
              <AnimatedContent distance={20} duration={0.5} once="marketing-testimonials-label">
                <span className="inline-block font-heading text-[11px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-6">Testimonials</span>
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
                    A screen. Its requirements. One click.
                  </h2>
                  <RippleButton
                    onClick={() => navigate('/sign-up')}
                    className="bg-primary text-on-primary font-heading text-[13px] font-semibold px-7 py-3 rounded-lg shadow-lifted"
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
            <a href="#features" className="font-body-md text-[12px] text-on-surface-variant hover:text-primary transition-colors">Features</a>
            <p className="font-body-md text-[11px] text-on-surface-variant">&copy; {new Date().getFullYear()} Docket.</p>
          </div>
        </footer>
      </main>
    </div>
  )
}
