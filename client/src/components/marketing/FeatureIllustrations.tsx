/**
 * Hand-drawn / doodle-style SVG illustrations for each MagicBento feature card.
 *
 * Each illustration is ~80×80, uses irregular hand-drawn paths with
 * stroke-dasharray drawing animations, and subtle floating/pulsing motions
 * to bring the bento cards to life without overwhelming the copy.
 */

/* ─── Screen → Cases ─────────────────────────────────────── */
export function ScreenToCases({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      className={`${className} text-on-surface-variant/60`}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <style>{`.si-draw { stroke-dasharray:120; stroke-dashoffset:120; animation:doodle-draw 1.2s ease-out forwards; }.si-draw2 { stroke-dasharray:60; stroke-dashoffset:60; animation:doodle-draw 0.8s ease-out 0.3s forwards; }.si-draw3 { stroke-dasharray:40; stroke-dashoffset:40; animation:doodle-draw 0.6s ease-out 0.6s forwards; }.si-float { animation:doodle-float 3s ease-in-out infinite; }.si-float2 { animation:doodle-float 3s ease-in-out 1s infinite; }`}</style>
      {/* Monitor */}
      <g className="si-draw">
        <rect x="12" y="18" width="34" height="24" rx="2" />
        <line x1="29" y1="42" x2="29" y2="48" />
        <line x1="22" y1="48" x2="36" y2="48" />
      </g>
      {/* Screen glow */}
      <rect x="15" y="21" width="28" height="18" rx="1" className="si-draw3" opacity={0.3} />
      {/* Arrows pointing down-right */}
      <g className="si-draw2" opacity={0.5}>
        <path d="M52 26 Q58 26 58 32" />
        <polyline points="54,29 58,32 55,33" />
        <path d="M52 34 Q60 34 60 40" />
        <polyline points="56,37 60,40 57,41" />
      </g>
      {/* Document stack */}
      <g className="si-draw3">
        <rect x="52" y="42" width="16" height="20" rx="1.5" opacity={0.7} />
        <rect x="54" y="44" width="12" height="16" rx="1" opacity={0.5} />
        <line x1="57" y1="48" x2="63" y2="48" opacity={0.4} />
        <line x1="57" y1="51" x2="63" y2="51" opacity={0.4} />
        <line x1="57" y1="54" x2="60" y2="54" opacity={0.4} />
      </g>
    </svg>
  )
}

/* ─── PRD → Matrix ───────────────────────────────────────── */
export function PrdToMatrix({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      className={`${className} text-on-surface-variant/60`}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <style>{`.pm-d1 { stroke-dasharray:80; stroke-dashoffset:80; animation:doodle-draw 1s ease-out forwards; }.pm-d2 { stroke-dasharray:60; stroke-dashoffset:60; animation:doodle-draw 0.8s ease-out 0.3s forwards; }.pm-d3 { stroke-dasharray:30; stroke-dashoffset:30; animation:doodle-draw 0.5s ease-out 0.6s forwards; }.pm-pulse { animation:doodle-pulse 2s ease-in-out infinite; }`}</style>
      {/* Document (hand-drawn) */}
      <g className="pm-d1">
        <path d="M14 22 Q14 18 18 18 L28 18 Q32 18 32 22 L32 58 Q32 62 28 62 L18 62 Q14 62 14 58 Z" />
        <line x1="18" y1="28" x2="28" y2="28" opacity={0.4} />
        <line x1="18" y1="34" x2="26" y2="34" opacity={0.4} />
        <path d="M18 40 Q22 42 28 40" opacity={0.4} />
      </g>
      {/* Arrow */}
      <g className="pm-d2" opacity={0.6}>
        <path d="M38 40 Q44 36 50 40" />
        <polyline points="46,36 50,40 47,42" />
      </g>
      {/* Matrix grid (hand-drawn) */}
      <g className="pm-d3">
        <rect x="52" y="22" width="22" height="36" rx="2" />
        <line x1="52" y1="34" x2="74" y2="34" opacity={0.5} />
        <line x1="52" y1="46" x2="74" y2="46" opacity={0.5} />
        <line x1="63" y1="22" x2="63" y2="58" opacity={0.5} />
        {/* Small checkmarks in cells */}
        <path d="M56 29 L58 31 L61 27" className="pm-pulse" opacity={0.7} strokeWidth={1.2} />
        <path d="M67 41 L69 43 L72 39" className="pm-pulse" opacity={0.5} strokeWidth={1.2} style={{ animationDelay: '0.5s' }} />
      </g>
    </svg>
  )
}

/* ─── Live Execution ─────────────────────────────────────── */
export function LiveExecution({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      className={`${className} text-on-surface-variant/60`}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <style>{`.le-d1 { stroke-dasharray:70; stroke-dashoffset:70; animation:doodle-draw 1s ease-out forwards; }.le-d2 { stroke-dasharray:40; stroke-dashoffset:40; animation:doodle-draw 0.7s ease-out 0.4s forwards; }.le-stream { opacity:0; animation:doodle-stream 2s ease-out infinite; transform-origin:40px 56px; }@media (prefers-reduced-motion:reduce){.le-stream{opacity:1!important}}`}</style>
      {/* Play button shape */}
      <g className="le-d1">
        <circle cx="40" cy="36" r="18" />
        <polygon points="36,28 36,44 48,36" opacity={0.5} />
      </g>
      {/* Streaming lines flowing upward-right */}
      <g className="le-d2" opacity={0.4}>
        <path d="M50 58 Q54 54 56 48" className="le-stream" />
        <path d="M42 60 Q46 56 48 50" className="le-stream" style={{ animationDelay: '0.3s' }} />
        <path d="M56 56 Q60 52 62 46" className="le-stream" style={{ animationDelay: '0.6s' }} />
      </g>
      {/* Checkmarks at end of streams */}
      <g>
        <path d="M54 46 L56 48 L60 43" className="le-stream" strokeWidth={1.2} opacity={0.6} style={{ animationDelay: '0.8s' }} />
      </g>
    </svg>
  )
}

/* ─── Workspace Dashboard ────────────────────────────────── */
export function WorkspaceDashboard({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      className={`${className} text-on-surface-variant/60`}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <style>{`.wd-d1 { stroke-dasharray:80; stroke-dashoffset:80; animation:doodle-draw 1s ease-out forwards; }.wd-d2 { stroke-dasharray:50; stroke-dashoffset:50; animation:doodle-draw 0.8s ease-out 0.3s forwards; }.wd-d3 { stroke-dasharray:30; stroke-dashoffset:30; animation:doodle-draw 0.6s ease-out 0.6s forwards; }.wd-bar { transform-origin:bottom; }`}</style>
      {/* Bar chart (3 bars) */}
      <g className="wd-d2">
        <line x1="14" y1="60" x2="14" y2="28" opacity={0.3} />
        <rect x="16" y="38" width="10" height="22" rx="2" opacity={0.5} className="wd-bar" />
        <rect x="30" y="28" width="10" height="32" rx="2" opacity={0.5} className="wd-bar" />
        <rect x="44" y="44" width="10" height="16" rx="2" opacity={0.3} className="wd-bar" />
      </g>
      {/* Pie chart */}
      <g className="wd-d1">
        <circle cx="42" cy="32" r="14" opacity={0.3} />
        <path d="M42 18 A14 14 0 0 1 53 27 L42 32 Z" opacity={0.6} />
      </g>
      {/* Trend line */}
      <g className="wd-d3" opacity={0.5}>
        <polyline points="58,54 64,44 70,48 76,38" />
      </g>
      {/* X-axis */}
      <line x1="12" y1="62" x2="76" y2="62" className="wd-d2" opacity={0.2} />
    </svg>
  )
}

/* ─── Drag & Organize ────────────────────────────────────── */
export function DragOrganize({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 60"
      fill="none"
      className={`${className} text-on-surface-variant/60`}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <style>{`.do-d1 { stroke-dasharray:100; stroke-dashoffset:100; animation:doodle-draw 1s ease-out forwards; }.do-d2 { stroke-dasharray:60; stroke-dashoffset:60; animation:doodle-draw 0.8s ease-out 0.2s forwards; }.do-d3 { stroke-dasharray:40; stroke-dashoffset:40; animation:doodle-draw 0.6s ease-out 0.5s forwards; }.do-slide { animation:doodle-slide 2.5s ease-in-out infinite; }`}</style>
      {/* Stacked cards (3 cards slightly offset) */}
      <g className="do-d1">
        <rect x="24" y="16" width="48" height="32" rx="3" opacity={0.3} />
      </g>
      <g className="do-d2">
        <rect x="28" y="12" width="48" height="32" rx="3" opacity={0.4} />
      </g>
      <g className="do-d3 do-slide">
        <rect x="18" y="10" width="48" height="32" rx="3" opacity={0.6} />
        <line x1="26" y1="18" x2="58" y2="18" opacity={0.4} />
        <line x1="26" y1="24" x2="52" y2="24" opacity={0.4} />
        <rect x="26" y="28" width="14" height="8" rx="1.5" opacity={0.3} />
      </g>
      {/* Cursor / drag handle */}
      <g className="do-d2" opacity={0.5}>
        <path d="M74 26 Q82 22 88 28 Q92 32 88 36 L82 34 L86 42 L80 40 L76 46 Z" />
      </g>
      {/* Dots (grip indicator) */}
      <g className="do-d3" opacity={0.3}>
        <circle cx="20" cy="22" r="1.5" />
        <circle cx="20" cy="28" r="1.5" />
        <circle cx="20" cy="34" r="1.5" />
      </g>
    </svg>
  )
}

/* ─── Export & Integrate ─────────────────────────────────── */
export function ExportIntegrate({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 60"
      fill="none"
      className={`${className} text-on-surface-variant/60`}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <style>{`.ei-d1 { stroke-dasharray:80; stroke-dashoffset:80; animation:doodle-draw 1s ease-out forwards; }.ei-d2 { stroke-dasharray:50; stroke-dashoffset:50; animation:doodle-draw 0.7s ease-out 0.3s forwards; }.ei-d3 { stroke-dasharray:40; stroke-dashoffset:40; animation:doodle-draw 0.6s ease-out 0.6s forwards; }.ei-pulse { animation:doodle-pulse 2s ease-in-out infinite; }`}</style>
      {/* Central hub */}
      <g className="ei-d1">
        <circle cx="60" cy="30" r="10" opacity={0.5} />
        <circle cx="60" cy="30" r="4" opacity={0.3} />
      </g>
      {/* Radiating arrows to destination icons */}
      {/* Top-right: PDF */}
      <g className="ei-d2">
        <path d="M70 24 Q76 20 82 22" opacity={0.5} />
        <polyline points="78,18 82,22 80,24" opacity={0.4} />
      </g>
      <g className="ei-d3 ei-pulse" style={{ animationDelay: '0s' }}>
        <rect x="84" y="18" width="10" height="12" rx="1.5" opacity={0.5} />
        <line x1="87" y1="22" x2="91" y2="22" opacity={0.4} />
        <line x1="87" y1="25" x2="90" y2="25" opacity={0.4} />
        <text x="86" y="16" fontSize="5" strokeWidth={0.5} opacity={0.3}>PDF</text>
      </g>
      {/* Bottom-right: JSON */}
      <g className="ei-d2">
        <path d="M74 38 Q80 42 86 40" opacity={0.5} />
        <polyline points="82,36 86,40 83,42" opacity={0.4} />
      </g>
      <g className="ei-d3 ei-pulse" style={{ animationDelay: '0.4s' }}>
        <rect x="88" y="34" width="10" height="12" rx="1.5" opacity={0.5} />
        <path d="M91 38 L93 42 L91 44" opacity={0.4} strokeWidth={1} />
        <path d="M95 38 L93 42 L95 44" opacity={0.4} strokeWidth={1} />
      </g>
      {/* Top-left: Jira */}
      <g className="ei-d2">
        <path d="M50 22 Q44 18 38 20" opacity={0.5} />
        <polyline points="42,16 38,20 41,22" opacity={0.4} />
      </g>
      <g className="ei-d3 ei-pulse" style={{ animationDelay: '0.8s' }}>
        <circle cx="34" cy="18" r="6" opacity={0.4} />
        <path d="M34 14 L34 22" opacity={0.3} strokeWidth={1} />
        <path d="M30 18 L38 18" opacity={0.3} strokeWidth={1} />
      </g>
      {/* Bottom-left: Linear */}
      <g className="ei-d2">
        <path d="M52 40 Q46 44 40 42" opacity={0.5} />
        <polyline points="44,46 40,42 43,40" opacity={0.4} />
      </g>
      <g className="ei-d3 ei-pulse" style={{ animationDelay: '1.2s' }}>
        <path d="M32 38 L38 46" opacity={0.5} />
        <path d="M32 46 L38 38" opacity={0.5} />
        <circle cx="35" cy="42" r="6" opacity={0.2} />
      </g>
    </svg>
  )
}

/* ─── Sign-In Doodle (key + door + arrow) ─────────────── */
export function SignInDoodle({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 48"
      fill="none"
      className={`${className} text-on-surface-variant/30`}
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <style>{`.sid-d1 { stroke-dasharray:100; stroke-dashoffset:100; animation:doodle-draw 1.2s ease-out forwards; }.sid-d2 { stroke-dasharray:70; stroke-dashoffset:70; animation:doodle-draw 1s ease-out 0.3s forwards; }.sid-d3 { stroke-dasharray:40; stroke-dashoffset:40; animation:doodle-draw 0.7s ease-out 0.6s forwards; }.sid-pulse { animation:doodle-pulse 2.5s ease-in-out infinite; }`}</style>
      {/* Key */}
      <g className="sid-d1">
        <circle cx="22" cy="24" r="8" opacity={0.5} />
        <path d="M28 24 L42 24" opacity={0.4} />
        <path d="M36 20 L36 28" opacity={0.4} />
        <path d="M40 20 L40 28" opacity={0.4} />
      </g>
      {/* Door */}
      <g className="sid-d2">
        <rect x="68" y="8" width="28" height="36" rx="2" opacity={0.5} />
        <circle cx="82" cy="26" r="2" opacity={0.4} />
        <path d="M68 8 Q82 2 96 8" opacity={0.3} />
      </g>
      {/* Arrow pointing from key to door */}
      <g className="sid-d2" opacity={0.5}>
        <path d="M48 24 Q56 20 64 24" />
        <polyline points="60,20 64,24 61,26" />
      </g>
      {/* Unlocked padlock */}
      <g className="sid-d3 sid-pulse" style={{ animationDelay: '0.5s' }}>
        <path d="M90 20 Q90 14 96 14 Q102 14 102 20 L102 24 L90 24 Z" opacity={0.6} />
        <rect x="90" y="24" width="12" height="10" rx="1.5" opacity={0.5} />
        <circle cx="96" cy="28" r="1.5" opacity={0.4} />
      </g>
      {/* Welcome dots */}
      <g className="sid-d3" opacity={0.3}>
        <circle cx="114" cy="14" r="1.5" />
        <circle cx="126" cy="22" r="1.5" />
        <circle cx="120" cy="34" r="1.5" />
        <circle cx="136" cy="16" r="1" />
        <circle cx="142" cy="30" r="1" />
      </g>
    </svg>
  )
}

/* ─── Sign-Up Doodle (document + plus + sparkle) ───────── */
export function SignUpDoodle({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 48"
      fill="none"
      className={`${className} text-on-surface-variant/30`}
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <style>{`.sud-d1 { stroke-dasharray:100; stroke-dashoffset:100; animation:doodle-draw 1.2s ease-out forwards; }.sud-d2 { stroke-dasharray:60; stroke-dashoffset:60; animation:doodle-draw 0.9s ease-out 0.3s forwards; }.sud-d3 { stroke-dasharray:40; stroke-dashoffset:40; animation:doodle-draw 0.6s ease-out 0.6s forwards; }.sud-float { animation:doodle-float 3.5s ease-in-out infinite; }.sud-twinkle { animation:doodle-twinkle 2s ease-in-out infinite; transform-origin:center; }`}</style>
      {/* Document with plus */}
      <g className="sud-d1">
        <path d="M14 12 Q14 8 18 8 L30 8 Q34 8 34 12 L34 36 Q34 40 30 40 L18 40 Q14 40 14 36 Z" opacity={0.5} />
        <line x1="20" y1="16" x2="30" y2="16" opacity={0.3} />
        <line x1="20" y1="21" x2="28" y2="21" opacity={0.3} />
        {/* Plus sign inside document */}
        <line x1="24" y1="28" x2="24" y2="34" opacity={0.6} />
        <line x1="21" y1="31" x2="27" y2="31" opacity={0.6} />
      </g>
      {/* Person / avatar silhouette */}
      <g className="sud-d2" style={{ animationDelay: '1s' }}>
        <circle cx="72" cy="16" r="6" opacity={0.4} />
        <path d="M62 34 Q62 26 72 26 Q82 26 82 34" opacity={0.4} />
      </g>
      {/* Arrow from document to person */}
      <g className="sud-d2" opacity={0.4}>
        <path d="M40 26 Q48 22 56 26" />
        <polyline points="52,22 56,26 53,28" />
      </g>
      {/* Star / sparkle */}
      <g className="sud-d3 sud-twinkle" style={{ animationDelay: '0.5s' }}>
        <path d="M96 12 L98 16 L102 18 L98 20 L96 24 L94 20 L90 18 L94 16 Z" opacity={0.6} />
      </g>
      { /* Small checkmark */ }
      <g className="sud-d3" opacity={0.4}>
        <path d="M88 38 L92 42 L100 34" />
      </g>
      {/* Decorative dots */}
      <g className="sud-d3" opacity={0.3}>
        <circle cx="116" cy="14" r="1.5" />
        <circle cx="130" cy="22" r="1.5" />
        <circle cx="124" cy="34" r="1.5" />
        <circle cx="144" cy="18" r="1" />
        <circle cx="138" cy="36" r="1" />
      </g>
    </svg>
  )
}

