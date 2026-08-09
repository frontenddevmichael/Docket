import { useMemo } from 'react'

/**
 * Returns a memoized style object with `--stagger-delay` set for the given index.
 *
 * **For hardcoded children** (at component top level):
 * ```tsx
 * const s0 = useStaggerChild(0)
 * const s1 = useStaggerChild(1)
 * return <div className="stagger-enter"><div style={s0} /><div style={s1} /></div>
 * ```
 *
 * **Merge with additional inline styles** (e.g. a progress bar width):
 * ```tsx
 * const s = useStaggerChild(i, { width: `${pct}%` })
 * return <div style={s} />
 * ```
 */
export function useStaggerChild(
  index: number,
  additionalStyles?: React.CSSProperties,
): React.CSSProperties {
  return useMemo(
    () =>
      ({
        '--stagger-delay': `${index * 40}ms`,
        ...additionalStyles,
      }) as React.CSSProperties,
    [index, additionalStyles],
  )
}

/**
 * Non-hook companion for use inside `.map()` callbacks (where hooks can't be called).
 * Returns a fresh object each call — same allocation cost as a raw inline style literal.
 *
 * ```tsx
 * {items.map((item, i) => (
 *   <div key={item.id} style={staggerChild(i, { width: `${item.pct}%` })} />
 * ))}
 * ```
 */
export function staggerChild(
  index: number,
  additionalStyles?: React.CSSProperties,
): React.CSSProperties {
  return {
    '--stagger-delay': `${index * 40}ms`,
    ...additionalStyles,
  } as React.CSSProperties
}
