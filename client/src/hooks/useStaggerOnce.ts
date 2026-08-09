import { useState } from 'react'

/**
 * Returns `true` the first time a page is visited during this browser session,
 * `false` on subsequent visits. Uses sessionStorage to persist the flag.
 * When `true`, apply the `stagger-enter` CSS class to animate entrance.
 * When `false`, skip the animation — content is immediately visible.
 *
 * @param pageKey A unique identifier for the page/container (e.g. 'dashboard-metrics')
 */
export function useStaggerOnce(pageKey: string): boolean {
  const [animate] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      const key = `__docket_stagger_${pageKey}`
      if (sessionStorage.getItem(key)) return false
      sessionStorage.setItem(key, '1')
      return true
    } catch {
      return true // sessionStorage unavailable, animate anyway
    }
  })
  return animate
}
