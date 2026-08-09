interface BeamsProps {
  className?: string
  count?: number
  opacity?: number
}

export default function Beams({
  className = '',
  count = 3,
  opacity = 0.4,
}: BeamsProps) {
  const beams = Array.from({ length: count }, (_, i) => {
    const delay = i * 2.5
    const duration = 6 + i * 1.5
    const top = 20 + i * 25
    const left = 10 + i * 30
    const width = 30 + i * 10
    const rotation = 35 + i * 8

    return (
      <div
        key={i}
        className="absolute pointer-events-none"
        style={{
          top: `${top}%`,
          left: `${left}%`,
          width: `${width}%`,
          height: '1px',
          '--beam-rotation': `${rotation}deg`,
          '--beam-opacity': '0.6',
          transform: `rotate(${rotation}deg)`,
          background: `linear-gradient(90deg, transparent, rgba(1,1,0,${opacity * 0.06}), rgba(1,1,0,${opacity * 0.12}), rgba(1,1,0,${opacity * 0.06}), transparent)`,
          animation: `beam-sweep ${duration}s ease-in-out ${delay}s infinite`,
          opacity: 0,
        } as React.CSSProperties}
        aria-hidden
      />
    )
  })

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden>
      {beams}
      <style>{`
        @keyframes beam-sweep {
          0% { transform: translateX(-100%) translateY(-100%) rotate(var(--beam-rotation, 45deg)); opacity: 0; }
          10% { opacity: var(--beam-opacity, 0.6); }
          90% { opacity: var(--beam-opacity, 0.6); }
          100% { transform: translateX(100%) translateY(100%) rotate(var(--beam-rotation, 45deg)); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
