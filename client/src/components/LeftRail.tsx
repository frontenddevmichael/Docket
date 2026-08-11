import { useState } from 'react'
import { isFailed } from '@/lib/status'
import type { Session, TestCase } from '@/types/database'
import { ActivityTimeline } from '@/components/ActivityTimeline'

interface Props {
  session: Session
  testCases?: TestCase[]
  activeId?: string | null
  onSelect?: (id: string) => void
  userId?: string
}

const statusDotColors: Record<string, string> = {
  pass: 'bg-success',
  fail: 'bg-warning',
  blocked: 'bg-warning',
  not_run: 'bg-outline-variant',
}

export function LeftRail({ session, testCases, activeId, onSelect }: Props) {
  const [showInputs, setShowInputs] = useState(true)
  const passCount = testCases?.filter((tc) => tc.status === 'pass').length ?? 0
  const failCount = testCases?.filter((tc) => isFailed(tc.status)).length ?? 0
  const notRunCount = testCases?.filter((tc) => tc.status === 'not_run').length ?? 0

  return (
    <aside className="w-full h-full flex flex-col overflow-hidden bg-surface-container-low border-r border-outline-variant">
      {/* Session title */}
      <div className="px-4 py-3 border-b border-outline-variant">
        <h2 className="font-heading text-[14px] text-primary truncate">{session.title}</h2>
      </div>

      {/* Source material — screenshot + requirements, collapsible, pinned at top */}
      <div className="border-b border-outline-variant">
        <button
          type="button"
          onClick={() => setShowInputs((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-2 text-on-surface-variant hover:text-primary transition-colors text-[10px] font-heading uppercase tracking-[0.05em] font-semibold"
        >
          Source material
          <svg className={`w-3 h-3 transition-transform duration-200 ${showInputs ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {showInputs && (
          <div className="px-4 pb-4 space-y-3 animate-[fadeIn_200ms_ease-out]">
            {/* Screenshot thumbnail */}
            {session.screenshot_url ? (
              <div className="aspect-video bg-surface-dim border border-outline-variant rounded-lg overflow-hidden">
                <img src={session.screenshot_url} alt="Session screenshot" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ) : (
              <div className="aspect-video bg-surface-container border border-dashed border-outline-variant rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-on-surface-variant/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )}
            {/* Requirements excerpt */}
            {session.requirements_text && (
              <div className="max-h-[120px] overflow-y-auto bg-surface-container border border-outline-variant rounded-lg p-2">
                <p className="font-mono text-[10px] text-on-surface-variant leading-relaxed whitespace-pre-wrap line-clamp-6">
                  {session.requirements_text}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity timeline */}
      <div className="px-4 py-3 border-b border-outline-variant">
        {session.id && <ActivityTimeline sessionId={session.id} />}
      </div>

      {/* Status summary counts */}
      {testCases && testCases.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-outline-variant bg-surface-container/50">
          {passCount > 0 && <span className="font-mono text-[12px] text-on-surface-variant">{passCount} pass</span>}
          {failCount > 0 && <span className="font-mono text-[12px] text-warning">{failCount} fail</span>}
          {notRunCount > 0 && <span className="font-mono text-[12px] text-on-surface-variant">{notRunCount} not run</span>}
          <span className="font-mono text-[12px] text-on-surface-variant ml-auto">{testCases.length}</span>
        </div>
      )}

      {/* Test case navigator */}
      <div className="flex-1 overflow-y-auto">
        {testCases && testCases.length > 0 ? (
          <div className="py-1">
            {testCases.map((tc) => (
              <button
                key={tc.id}
                type="button"
                onClick={() => onSelect?.(tc.id)}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left font-body-md transition-colors duration-150
                  ${activeId === tc.id ? 'bg-surface-container-high/70 text-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-high/50 hover:text-primary'}
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring`}
              >
                <span className={`shrink-0 w-2 h-2 rounded-full ${statusDotColors[tc.status] ?? 'bg-outline-variant'}`} />
                <span className="truncate">{tc.title}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 font-mono text-[12px] text-on-surface-variant text-center">No test cases</div>
        )}
      </div>
    </aside>
  )
}

export function LeftRailSkeleton() {
  return (
    <aside className="w-full h-full flex flex-col bg-surface-container-low border-r border-outline-variant">
      <div className="p-4 border-b border-outline-variant">
        <div className="h-4 w-32 bg-surface-container-highest rounded skeleton-shimmer" />
      </div>
      <div className="p-4 space-y-3 border-b border-outline-variant">
        <div className="h-24 bg-surface-container-highest rounded skeleton-shimmer" />
        <div className="h-12 bg-surface-container-highest rounded skeleton-shimmer" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-surface-container-highest skeleton-shimmer" />
            <div className="h-3 flex-1 bg-surface-container-highest rounded skeleton-shimmer" />
          </div>
        ))}
      </div>
    </aside>
  )
}
