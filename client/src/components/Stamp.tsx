interface Props {
  status: 'pass' | 'fail' | 'blocked' | 'not_applicable' | 'fixed' | 'reopened' | 'controlled_live' | 'uat' | 'not_run'
  visible: boolean
}

export function Stamp({ status, visible }: Props) {
  if (!visible) return null

  const isFail = status === 'fail' || status === 'blocked' || status === 'reopened'
  const glyph = status === 'pass' ? '\u2713'
    : status === 'fail' ? '\u2691'
    : status === 'blocked' ? '\u2298'
    : status === 'fixed' ? '\u270E'
    : status === 'reopened' ? '\u21BA'
    : status === 'controlled_live' ? '\u25C9'
    : status === 'uat' ? '\u2302'
    : status === 'not_applicable' ? '\u2300'
    : '\u25CB'
  const label = status === 'blocked' ? 'BLOCKED'
    : status === 'fail' ? 'FAIL'
    : status === 'pass' ? 'PASS'
    : status === 'fixed' ? 'FIXED'
    : status === 'reopened' ? 'REOPENED'
    : status === 'controlled_live' ? 'CONTROLLED LIVE'
    : status === 'uat' ? 'UAT'
    : status === 'not_applicable' ? 'N/A'
    : 'UNTESTED'

  return (
    <div
      className={`inline-flex items-center gap-[3px] px-2 py-[2px] rounded-sm font-mono text-[11px] font-semibold tracking-[0.5px] uppercase
        animate-[stampLand_180ms_cubic-bezier(0.34,1.56,0.64,1)_both]
        ${isFail
          ? 'bg-warning text-white border-2 border-warning'
          : 'border-2 border-primary text-primary'
        }
        motion-reduce:animate-[stampFade_180ms_ease-out_both]`}
      role="status"
      aria-label={label}
    >
      <span>{glyph}</span>
      <span>{label}</span>
    </div>
  )
}
