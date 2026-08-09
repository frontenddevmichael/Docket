interface Props {
  status: 'pass' | 'fail' | 'blocked'
  visible: boolean
}

export function Stamp({ status, visible }: Props) {
  if (!visible) return null

  const isFail = status === 'fail' || status === 'blocked'
  const glyph = status === 'blocked' ? '\u2298' : '\u2713'
  const label = status === 'blocked' ? 'BLOCKED' : status === 'fail' ? 'FAIL' : 'PASS'

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
