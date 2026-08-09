/**
 * `useLongPress` — detect long-press gestures on touch devices.
 *
 * Extracts the timer + ref + click-suppression pattern into a reusable hook.
 */

import { useRef, useCallback, useEffect } from 'react'

interface UseLongPressOptions {
  /** How long the touch must be held before firing (ms). Default 400. */
  delay?: number
}

interface UseLongPressReturn<T> {
  /** Spread these handlers onto the target element. */
  handlers: {
    onTouchStart: (data: T) => void
    onTouchEnd: () => void
    onTouchMove: () => void
  }
  /**
   * Call inside `onClick` before handling the tap.
   * Returns `true` if the click was preceded by a long press (swallows it).
   */
  consume: () => boolean
}

export function useLongPress<T>(
  callback: (data: T) => void,
  options?: UseLongPressOptions,
): UseLongPressReturn<T> {
  const delay = options?.delay ?? 400

  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const triggeredRef = useRef(false)

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const onTouchStart = useCallback(
    (data: T) => {
      timerRef.current = setTimeout(() => {
        callbackRef.current(data)
        triggeredRef.current = true
      }, delay)
    },
    [delay],
  )

  const onTouchEnd = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
  }, [])

  const consume = useCallback(() => {
    if (triggeredRef.current) {
      triggeredRef.current = false
      return true
    }
    return false
  }, [])

  return {
    handlers: { onTouchStart, onTouchEnd, onTouchMove: onTouchEnd },
    consume,
  }
}
