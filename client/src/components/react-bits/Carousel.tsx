import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/** @see https://www.framer.com/motion/gestures/#drag with PanInfo offset.x */
interface PanInfo {
  offset: { x: number; y: number }
  velocity: { x: number; y: number }
}

interface CarouselSlide {
  content: React.ReactNode
}

interface CarouselProps {
  slides: CarouselSlide[]
  autoAdvanceInterval?: number
  className?: string
}

const swipeConfidenceThreshold = 50

export default function Carousel({
  slides,
  autoAdvanceInterval = 6000,
  className = '',
}: CarouselProps) {
  const [idx, setIdx] = useState(0)
  const [direction, setDirection] = useState(1)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const goTo = useCallback(
    (nextIdx: number) => {
      setDirection(nextIdx > idx ? 1 : -1)
      setIdx(nextIdx)
    },
    [idx],
  )

  const next = useCallback(
    () => goTo((idx + 1) % slides.length),
    [idx, slides.length, goTo],
  )
  const prev = useCallback(
    () => goTo((idx - 1 + slides.length) % slides.length),
    [idx, slides.length, goTo],
  )

  // Auto-advance
  useEffect(() => {
    if (paused || slides.length <= 1) return
    intervalRef.current = setInterval(next, autoAdvanceInterval)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [paused, next, autoAdvanceInterval, slides.length])

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.x
    if (offset < -swipeConfidenceThreshold) next()
    else if (offset > swipeConfidenceThreshold) prev()
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  }

  if (slides.length === 0) return null

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      <div className="overflow-hidden rounded-lg">
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={idx}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="cursor-grab active:cursor-grabbing"
          >
            {slides[idx].content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Arrow buttons (desktop) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-9 h-9 rounded-full border border-outline-variant/30 bg-surface-container-lowest items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Previous slide"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={next}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-9 h-9 rounded-full border border-outline-variant/30 bg-surface-container-lowest items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label="Next slide"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                i === idx
                  ? 'w-5 bg-primary'
                  : 'w-2 bg-outline-variant/40 hover:bg-outline-variant/60'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
