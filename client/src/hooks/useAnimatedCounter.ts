import { useState, useEffect } from 'react'
import { useMotionValue, useSpring, useMotionValueEvent } from 'framer-motion'

/**
 * Animates a number from 0 to `end` using framer-motion's spring physics.
 * Returns the current displayed value (integer).
 * `_durationHint` is accepted for API compatibility but ignored —
 * spring physics self-terminates based on stiffness/damping.
 */
export function useAnimatedCounter(end: number, _durationHint = 600, enabled = true) {
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 200, damping: 25, mass: 0.5 })
  const [value, setValue] = useState(0)

  useMotionValueEvent(spring, 'change', (latest) => {
    setValue(Math.round(latest))
  })

  useEffect(() => {
    if (!enabled) {
      mv.set(end)
      return
    }
    mv.set(end)
  }, [end, enabled, mv])

  return value
}
