import { memo } from 'react'

const statusLabels = ['pass', 'fail', 'blocked', 'not_run', 'edited'] as const
type Status = (typeof statusLabels)[number]

const DOODLES: Record<Status, string[]> = {
  /* A flowing, celebratory checkmark — 3 curving arcs */
  pass: [
    'M 5 12 q 2 2 4 4 q 5 -6 10 -8',
    'M 6 12 q 2.5 2.5 4.5 4.5',
    'M 8.5 14.5 q 1 -1.5 1.5 -2.5',
  ],
  /* An asymmetric hand-drawn X — left stroke then right stroke */
  fail: [
    'M 7 6 c 2 2.5 3 5.5 3 6 s -1 3.5 -3 6',
    'M 17 6 c -2 2.5 -3 5.5 -3 6 s 1 3.5 3 6',
  ],
  /* A shield with an inner slash */
  blocked: [
    'M 12 4 L 6 7 v 5 c 0 3.5 6 7 6 7 s 6 -3.5 6 -7 V 7 Z',
    'M 9 13 l 6 -4',
  ],
  /* A circle that's just slightly open — waiting, pending */
  not_run: [
    'M 6 12 a 6 6 0 0 1 6 -6 a 6 6 0 0 1 5.5 3.5',
  ],
  /* A tiny pencil — editing feedback */
  edited: [
    'M 16 5 l 4 4',
    'M 6 19 l -1 -4 l 12 -12 l 4 4 l -12 12 Z',
  ],
}

/** Map status to semantic Tailwind text-color class for hover. */
const hoverColors: Record<string, string> = {
  pass: 'group-hover:text-success',
  fail: 'group-hover:text-warning',
  blocked: 'group-hover:text-warning',
  not_run: 'group-hover:text-on-surface-variant',
  edited: 'group-hover:text-primary',
}

/** Tiny hand-drawn SVG doodle that draws in on parent hover.
 *  Place inside a `group`-classed container.
 *  When `feedback` is 'edited', the pencil doodle renders instead. */
export const TestCaseDoodle = memo(function TestCaseDoodle({
  status: s,
  feedback,
}: {
  status: string
  feedback?: string | null
}) {
  const resolved = feedback === 'edited' ? 'edited' : s
  const paths = DOODLES[resolved as Status] ?? DOODLES.not_run
  const hoverColor = hoverColors[resolved] ?? 'group-hover:text-primary'

  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-4 h-4 shrink-0 overflow-visible text-on-surface-variant opacity-40 transition-all duration-500 group-hover:opacity-90 ${hoverColor}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <style>{`
        .tdoodle-path {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          transition: stroke-dashoffset 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .group:hover .tdoodle-path,
        .group:focus-within .tdoodle-path {
          stroke-dashoffset: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .tdoodle-path {
            stroke-dasharray: none !important;
            stroke-dashoffset: 0 !important;
            transition: none !important;
          }
        }
      `}</style>
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          className="tdoodle-path"
          style={{ transitionDelay: `${i * 60}ms` }}
        />
      ))}
    </svg>
  )
})
