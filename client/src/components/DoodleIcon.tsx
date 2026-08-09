/**
 * `<DoodleIcon>` — renders any hand-drawn SVG illustration by feature name.
 *
 * Use in tooltips, empty states, menu items, and anywhere a small
 * personality-rich icon fits better than a flat glyph.
 *
 * ```tsx
 * <DoodleIcon name="screen-to-cases" className="w-8 h-8" />
 * <DoodleIcon name="prd-to-matrix" size="md" />
 * <span className="mr-2"><DoodleIcon name="live-execution" size="sm" /></span>
 * ```
 *
 * @param name — Feature name from the DoodleIconName union (autocompletes).
 * @param className — Tailwind sizing/color classes passed to the SVG itself.
 *   For layout spacing (margins, positioning), wrap in a parent element instead.
 * @param size — Preset shortcut (sm=24px, md=32px, lg=48px, xl=64px).
 *   Wide illustrations (drag-organize, export-integrate, auth-doodle) use
 *   `h-auto` with proportional width. Overridden by `className` if given.
 */

import {
  ScreenToCases,
  PrdToMatrix,
  LiveExecution,
  WorkspaceDashboard,
  DragOrganize,
  ExportIntegrate,
  SignInDoodle,
  SignUpDoodle,
} from './marketing/FeatureIllustrations'

/* ── Type ── */

export type DoodleIconName =
  | 'screen-to-cases'
  | 'prd-to-matrix'
  | 'live-execution'
  | 'workspace-dashboard'
  | 'drag-organize'
  | 'export-integrate'
  | 'sign-in-doodle'
  | 'sign-up-doodle'

/* ── Registry ── */

const ICON_MAP: Record<
  DoodleIconName,
  React.ComponentType<{ className?: string }>
> = {
  'screen-to-cases': ScreenToCases,
  'prd-to-matrix': PrdToMatrix,
  'live-execution': LiveExecution,
  'workspace-dashboard': WorkspaceDashboard,
  'drag-organize': DragOrganize,
  'export-integrate': ExportIntegrate,
  'sign-in-doodle': SignInDoodle,
  'sign-up-doodle': SignUpDoodle,
}

/* ── Sizing ── */

/** Names whose SVGs have a wide (non-square) viewBox. */
const WIDE_NAMES: ReadonlySet<DoodleIconName> = new Set([
  'drag-organize',
  'export-integrate',
  'sign-in-doodle',
  'sign-up-doodle',
])

const SIZE_PX: Record<string, number> = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
}

function resolveSizeClasses(_name: DoodleIconName, size: 'sm' | 'md' | 'lg' | 'xl') {
  switch (size) {
    case 'sm': return 'w-6 h-6'
    case 'md': return 'w-8 h-8'
    case 'lg': return 'w-12 h-12'
    case 'xl': return 'w-16 h-16'
    default: return 'w-8 h-8'
  }
}

/* ── Component ── */

export function DoodleIcon({
  name,
  className,
  size,
}: {
  /** Feature name — autocompletes. */
  name: DoodleIconName
  /**
   * Tailwind sizing / color classes passed directly to the SVG.
   * Overrides `size` if both given.
   * Layout spacing (mr-2, etc.) should go on a parent wrapper.
   */
  className?: string
  /** Shortcut for preset sizes (sm=24px, md=32px, lg=48px, xl=64px).
   *  Wide illustrations use proportional `h-auto`. */
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const Icon = ICON_MAP[name]

  /* ── Resolve sizing ──
     FeatureIllustration components only accept `{ className }` (no style spread),
     so for wide illustrations we constrain the wrapper span and use `w-full` on the SVG. */
  const useWidePreset = WIDE_NAMES.has(name) && !className && size
  const resolvedClassName = useWidePreset
    ? 'w-full h-auto'
    : (className ?? (size ? resolveSizeClasses(name, size) : 'w-8 h-8'))
  const wrapperStyle: React.CSSProperties | undefined = useWidePreset
    ? { width: SIZE_PX[size] }
    : undefined

  return (
    <span
      className="inline-flex items-center justify-center"
      style={wrapperStyle}
      aria-hidden="true"
    >
      <Icon className={resolvedClassName} />
    </span>
  )
}
