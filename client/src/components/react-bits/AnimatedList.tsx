import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

interface AnimatedListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  staggerInterval?: number
  duration?: number
  distance?: number
  ease?: string
  threshold?: number
  /** "alternating" = even from right, odd from left. "normal" = all from below. */
  direction?: 'normal' | 'alternating'
  /**
   * Pass a unique key to gate the animation behind sessionStorage.
   * On first visit the animation plays; on subsequent visits it's skipped.
   */
  once?: string
}

export default function AnimatedList({
  children,
  staggerInterval = 0.15,
  duration = 0.6,
  distance = 24,
  ease = 'power3.out',
  threshold = 0.1,
  direction = 'normal',
  once,
  className = '',
  ...props
}: AnimatedListProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Check sessionStorage once per key — skip animation on returning visits.
  // useRef lazy initializer runs only once per component mount.
  const seenOnce = useRef(
    once
      ? (() => {
          try {
            if (sessionStorage.getItem(`__docket_stagger_${once}`)) return true
            sessionStorage.setItem(`__docket_stagger_${once}`, '1')
            return false
          } catch {
            return false
          }
        })()
      : false
  ).current

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const items = Array.from(el.children) as HTMLElement[]
    if (items.length === 0) return

    if (seenOnce) {
      // Returning visitor — make all children visible immediately
      gsap.set(items, { opacity: 1, y: 0, visibility: 'visible' })
      return
    }

    const startPct = (1 - threshold) * 100

    gsap.set(items, { opacity: 0, y: distance, visibility: 'visible' })

    const tl = gsap.timeline({ paused: true })

    items.forEach((item, i) => {
      const fromX =
        direction === 'alternating' ? (i % 2 === 0 ? -distance : distance) : 0
      tl.to(
        item,
        {
          opacity: 1,
          y: 0,
          x: 0,
          duration,
          ease,
        },
        i * staggerInterval,
      )
      if (fromX !== 0) {
        gsap.set(item, { x: fromX })
      }
    })

    const st = ScrollTrigger.create({
      trigger: el,
      scroller: typeof window !== 'undefined' ? window : undefined,
      start: `top ${startPct}%`,
      once: true,
      onEnter: () => tl.play(),
    })

    return () => {
      st.kill()
      tl.kill()
    }
  }, [staggerInterval, duration, distance, ease, threshold, direction, seenOnce])

  return (
    <div ref={ref} className={`invisible ${className}`} {...props}>
      {children}
    </div>
  )
}
