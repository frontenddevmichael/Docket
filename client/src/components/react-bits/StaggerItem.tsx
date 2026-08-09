import React from 'react'

type StaggerItemProps = {
  /** Position in the stagger-enter container (0 = first child). */
  index: number
  /** A single React element to receive the `--stagger-delay` inline style. */
  children: React.ReactElement
}

/**
 * Wraps a single child element and injects `--stagger-delay` into its inline
 * style so the `.stagger-enter` entrance animation cascades in visual order.
 *
 * Unlike a `<div>` wrapper, this uses `React.cloneElement` and adds **no**
 * extra DOM node — the child keeps its original tag, className, event handlers,
 * ref, and any existing inline styles (which are merged in).
 *
 * ```tsx
 * <div className="stagger-enter">
 *   <StaggerItem index={0}><div className="card">First</div></StaggerItem>
 *   <StaggerItem index={1}><button className="btn">Second</button></StaggerItem>
 *   {items.map((item, i) => (
 *     <StaggerItem key={item.id} index={i}>
 *       <div className="item">{item.name}</div>
 *     </StaggerItem>
 *   ))}
 * </div>
 * ```
 */
export function StaggerItem({ index, children }: StaggerItemProps) {
  const child = React.Children.only(children)
  const existingStyle = (child.props as Record<string, unknown>).style as
    | React.CSSProperties
    | undefined
  return React.cloneElement(child, {
    style: {
      '--stagger-delay': `${index * 40}ms`,
      ...existingStyle,
    } as unknown as React.CSSProperties,
  } as Record<string, unknown>)
}
