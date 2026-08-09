import { useState, memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TestCase } from '@/types/database'
import { useUpdateTestCase } from '@/hooks/useTestCases'
import { Icon } from '@/components/Icon'
import { TestCaseDoodle } from '@/components/TestCaseDoodle'

interface Props {
  testCase: TestCase
  sessionId: string
  selected?: boolean
  onToggleSelect?: (id: string) => void
  onDuplicate: (tc: TestCase) => void
  onDelete: (id: string) => void
  onExecute?: (id: string) => void
}

const borderColors: Record<string, string> = {
  pass: 'border-l-success',
  fail: 'border-l-warning',
  blocked: 'border-l-warning',
  not_run: 'border-l-outline-variant',
}

const statusGlyphs: Record<string, string> = {
  pass: '\u2713',
  fail: '\u2691',
  blocked: '\u2298',
  not_run: '\u25CB',
}

const statusColors: Record<string, string> = {
  pass: 'border-success text-success',
  fail: 'border-warning bg-warning text-white',
  blocked: 'border-warning bg-warning text-white',
  not_run: 'border-outline-variant text-on-surface-variant',
}

export const TestCaseRow = memo(function TestCaseRow({ testCase, sessionId, selected, onToggleSelect, onDuplicate, onDelete, onExecute }: Props) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [expanded, setExpanded] = useState(false)
  const updateMutation = useUpdateTestCase(sessionId)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: testCase.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleFeedback = (feedback: 'kept' | 'edited') => {
    updateMutation.mutate({ id: testCase.id, feedback })
  }

  const steps: string[] = Array.isArray(testCase.steps) ? (testCase.steps as string[]) : [String(testCase.steps)]
  const stepsPreview = steps.length <= 2 ? steps.join(' \u2192 ') : steps.slice(0, 1).join(' \u2192 ') + ` \u2026 +${steps.length - 1} steps`

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-surface-container-lowest border border-outline-variant rounded-lg shadow-rest transition-all duration-200 ease-out border-l-[3px] overflow-hidden hover:shadow-lifted
        ${borderColors[testCase.status] ?? 'border-l-outline-variant'}
        ${editing ? 'ring-2 ring-focus-ring ring-offset-2' : ''}
        ${isDragging ? 'shadow-lg scale-[1.02] rotate-[0.5deg] z-10 opacity-90 ring-2 ring-focus-ring ring-offset-2' : 'hover:border-outline'}
        `}
    >
      <div className="flex items-start gap-2 px-3 py-3 sm:px-4">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onToggleSelect(testCase.id)}
            className="mt-1 accent-primary size-4 cursor-pointer
                       focus-visible:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-sm"
            aria-label={`Select ${testCase.title}`}
          />
        )}

        <button
          type="button"
          className={`mt-1 text-on-surface-variant hover:text-primary transition-colors shrink-0
                     ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                     focus-visible:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-sm`}
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <Icon name="drag-indicator" size={14} className="text-on-surface-variant" />
        </button>

        <TestCaseDoodle status={testCase.status} feedback={testCase.feedback} />

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded((e) => !e)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((e) => !e) } }}>
          <div className="flex items-center gap-2">
            <span
              className={`shrink-0 w-5 h-5 flex items-center justify-center font-mono text-[10px] rounded-full border transition-colors duration-150 ${statusColors[testCase.status] ?? statusColors.not_run}`}
              aria-label={testCase.status}
            >
              {statusGlyphs[testCase.status] ?? '\u25CB'}
            </span>

            {editing ? (
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => {
                  setEditing(false)
                  if (editValue !== testCase.title) {
                    updateMutation.mutate({ id: testCase.id, title: editValue, feedback: 'edited' })
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setEditing(false)
                    if (editValue !== testCase.title) {
                      updateMutation.mutate({ id: testCase.id, title: editValue, feedback: 'edited' })
                    }
                  }
                  if (e.key === 'Escape') setEditing(false)
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 px-2 py-0.5 text-[14px] bg-[#EEEEEC] border border-outline-variant rounded
                           text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring ring-offset-2"
                autoFocus
              />
            ) : (
              <span className="font-body-md text-[14px] text-primary font-medium truncate">{testCase.title}</span>
            )}

            <Icon
              name="chevron-down"
              size={14}
              className={`shrink-0 text-on-surface-variant transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </div>

          <p className={`mt-1 font-mono text-[12px] text-on-surface-variant ${expanded ? 'line-clamp-1' : 'truncate'}`}>
            {stepsPreview}
          </p>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-outline-variant px-3 py-3 sm:px-4 space-y-3 animate-[fadeIn_200ms_ease-out]">
          <div>
            <span className="font-heading text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">Steps</span>
            <ol className="list-decimal list-inside mt-1 space-y-0.5">
              {steps.map((step, i) => (
                <li key={i} className="font-body-md text-[13px] text-on-surface-variant leading-relaxed">{step}</li>
              ))}
            </ol>
          </div>

          {testCase.expected_result && (
            <div>
              <span className="font-heading text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">Expected</span>
              <p className="font-body-md text-[13px] text-on-surface-variant mt-1 leading-relaxed">{testCase.expected_result}</p>
            </div>
          )}

          {testCase.preconditions && (
            <div>
              <span className="font-heading text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">Preconditions</span>
              <p className="font-body-md text-[13px] text-on-surface-variant mt-1">{testCase.preconditions}</p>
            </div>
          )}

          {testCase.source_ref && (
            <div className="flex items-center gap-1">
              <Icon name="link" size={12} className="text-warning" />
              <span className="font-mono text-[12px] text-warning">{testCase.source_ref}</span>
            </div>
          )}

          <div className="flex items-center gap-1 pt-1 flex-wrap">
            {onExecute && (
              <button
                type="button"
                onClick={() => onExecute(testCase.id)}
                className="flex items-center gap-1 px-2.5 py-1 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold text-white bg-primary rounded
                           transition-all duration-150 hover:opacity-90 active:scale-[0.97]
                           focus-visible:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                aria-label="Execute this test case"
              >
                <Icon name="play-arrow" size={12} className="text-white" />
                Execute
              </button>
            )}
            <button
              type="button"
              onClick={() => handleFeedback('kept')}
              className={`px-2 py-1 rounded transition-colors duration-150
                ${testCase.feedback === 'kept' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'}
                focus-visible:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring`}
              aria-label="Keep"
              title="Keep"
            >
              <Icon name="keep" size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleFeedback('edited')}
              className={`px-2 py-1 rounded transition-colors duration-150
                ${testCase.feedback === 'edited' ? 'bg-primary text-white' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'}
                focus-visible:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring`}
              aria-label="Edit"
              title="Edit"
            >
              <Icon name="pencil" size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDuplicate(testCase)}
              disabled={updateMutation.isPending}
              className="px-2 py-1 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded transition-colors duration-150
                         focus-visible:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
                         disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Duplicate"
              title="Duplicate"
            >
              {updateMutation.isPending ? (
                <svg className="animate-[spinner_600ms_linear_infinite]" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <Icon name="copy" size={14} />
              )}
            </button>
            <button
              type="button"
              onClick={() => onDelete(testCase.id)}
              disabled={updateMutation.isPending}
              className="px-2 py-1 text-on-surface-variant hover:text-error hover:bg-surface-container rounded transition-colors duration-150
                         focus-visible:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
                         disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Delete"
              title="Delete"
            >
              {updateMutation.isPending ? (
                <svg className="animate-[spinner_600ms_linear_infinite]" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <Icon name="trash" size={14} className="text-on-surface-variant" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
})
