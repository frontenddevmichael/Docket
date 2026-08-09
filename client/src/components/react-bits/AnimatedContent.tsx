import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface AnimatedContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  distance?: number;
  direction?: 'vertical' | 'horizontal';
  reverse?: boolean;
  duration?: number;
  ease?: string;
  initialOpacity?: number;
  animateOpacity?: boolean;
  scale?: number;
  threshold?: number;
  delay?: number;
  /**
   * Pass a unique key to gate the animation behind sessionStorage.
   * On first visit the animation plays; on subsequent visits it's skipped
   * and the content appears immediately.
   */
  once?: string;
}

export default function AnimatedContent({
  children,
  distance = 100,
  direction = 'vertical',
  reverse = false,
  duration = 0.8,
  ease = 'power3.out',
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.1,
  delay = 0,
  once,
  className = '',
  ...props
}: AnimatedContentProps) {
  const ref = useRef<HTMLDivElement>(null);

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
    const el = ref.current;
    if (!el) return;

    if (seenOnce) {
      // Returning visitor — make content visible immediately, no animation
      gsap.set(el, { opacity: 1, scale: 1, visibility: 'visible' });
      return;
    }

    const axis = direction === 'horizontal' ? 'x' : 'y';
    const offset = reverse ? -distance : distance;
    const startPct = (1 - threshold) * 100;

    gsap.set(el, {
      [axis]: offset,
      scale,
      opacity: animateOpacity ? initialOpacity : 1,
      visibility: 'visible',
    });

    const tl = gsap.timeline({ paused: true, delay });

    tl.to(el, {
      [axis]: 0,
      scale: 1,
      opacity: 1,
      duration,
      ease,
    });

    const st = ScrollTrigger.create({
      trigger: el,
      scroller: typeof window !== 'undefined' ? window : undefined,
      start: `top ${startPct}%`,
      once: true,
      onEnter: () => tl.play(),
    });

    return () => {
      st.kill();
      tl.kill();
    };
  }, [distance, direction, reverse, duration, ease, initialOpacity, animateOpacity, scale, threshold, delay, seenOnce]);

  return (
    <div ref={ref} className={`invisible ${className}`} {...props}>
      {children}
    </div>
  );
}
