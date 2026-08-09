import { useStaggerOnce } from '@/hooks/useStaggerOnce'
import { StaggerItem } from '@/components/react-bits/StaggerItem'
import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTestCases } from '@/hooks/useTestCases'
import { useUpdateSessionStatus } from '@/hooks/useSessions'
import { useRecordResult } from '@/hooks/useExecutionEvidence'
import { LeftRail, LeftRailSkeleton } from '@/components/LeftRail'
import { Stamp } from '@/components/Stamp'
import { useToast } from '@/components/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Icon } from '@/components/Icon'
import { Events } from '@/lib/analytics'
import type { Session, TestCase } from '@/types/database'

async function fetchSession(id: string): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export function SessionExecute() {
  const staggerSkeleton = useStaggerOnce('execute-skeleton')
  const staggerCards = useStaggerOnce('execute-cards')
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => fetchSession(sessionId!),
    enabled: !!sessionId,
  })
  const { data: testCases, isLoading: casesLoading } = useTestCases(sessionId ?? '')
  const recordResult = useRecordResult(sessionId ?? '')
  const updateSessionStatus = useUpdateSessionStatus()
  const { toast } = useToast()
  useDocumentTitle(session ? `Execute: ${session.title}` : 'Execute')

  const [stampedCase, setStampedCase] = useState<string | null>(null)
  const [openEvidence, setOpenEvidence] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const evidenceFileRef = useRef<HTMLInputElement>(null)

  const executedCount = testCases?.filter(
    (tc) => tc.status === 'pass' || tc.status === 'fail' || tc.status === 'blocked'
  ).length ?? 0
  const totalCount = testCases?.length ?? 0
  const passCount = testCases?.filter((tc) => tc.status === 'pass').length ?? 0
  const failCount = testCases?.filter((tc) => tc.status === 'fail' || tc.status === 'blocked').length ?? 0

  const handleResult = async (testCase: TestCase, status: 'pass' | 'fail' | 'blocked') => {
    if (!user) return

    // Optimistic update
    queryClient.setQueryData(['test-cases', sessionId], (old: TestCase[] | undefined) =>
      old?.map((tc) => (tc.id === testCase.id ? { ...tc, status } : tc))
    )

    setPendingIds((prev) => new Set(prev).add(testCase.id))

    const file = evidenceFileRef.current?.files?.[0] ?? undefined
    try {
      await recordResult.mutateAsync({
        testCaseId: testCase.id,
        status,
        notes: notes || undefined,
        screenshotFile: file ?? undefined,
        executedBy: user.id,
      })
    } catch {
      queryClient.invalidateQueries({ queryKey: ['test-cases', sessionId] })
      toast('Failed to record result', 'error')
      return
    } finally {
      setPendingIds((prev) => { const next = new Set(prev); next.delete(testCase.id); return next })
    }

    Events.testCaseResult({ status, title: testCase.title })

    // Auto-capture feedback signal — if never edited, emit kept
    if (!testCase.feedback || testCase.feedback === 'kept') {
      Events.testCaseKept({ status, title: testCase.title })
    }

    // Read optimistic data once — shared by status transition + toast suppression
    const optimisticCases = (queryClient.getQueryData<TestCase[]>(['test-cases', sessionId]) ?? [])
    const remaining = optimisticCases.filter((tc) => tc.status === 'not_run').length

    // Session status auto-transition
    if (session && sessionId) {
      let nextStatus: string | null = null
      if (session.status === 'ready') {
        nextStatus = 'executing'
      }
      if (remaining === 0) {
        nextStatus = 'complete'
      }

      if (nextStatus) {
        updateSessionStatus.mutate({ id: sessionId, status: nextStatus })
      }

      // Celebration toast when all cases complete
      if (remaining === 0) {
        toast('All test cases executed! 🎉', 'success', {
          label: 'View Report',
          onClick: () => navigate(`/sessions/${sessionId}/report`),
        }, 8000)
      }
    }

    setStampedCase(testCase.id)
    setOpenEvidence(null)
    setNotes('')
    if (evidenceFileRef.current) evidenceFileRef.current.value = ''

    setTimeout(() => setStampedCase(null), 1800)

    // Suppress per-case toast when the celebration toast is about to fire
    if (remaining !== 0) {
      const label = status === 'pass' ? 'Pass' : status === 'fail' ? 'Fail' : 'Blocked'
      const toastType = status === 'pass' ? 'success' : status === 'fail' ? 'error' : 'info'
      toast(`Marked "${testCase.title}" as ${label}`, toastType)
    }
  }

  if (sessionLoading || casesLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="flex gap-6 h-full">
          <div className="w-[350px] shrink-0 hidden min-[568px]:block">
            <LeftRailSkeleton />
          </div>
          <div className={`flex-1 space-y-3${staggerSkeleton ? ' stagger-enter' : ''}`}>
            {Array.from({ length: 4 }).map((_, i) => (
              <StaggerItem key={i} index={i}><div className="h-28 bg-surface-container-lowest border border-outline-variant rounded-lg skeleton-shimmer" /></StaggerItem>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-on-surface-variant text-[14px]">Session not found.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="w-[350px] shrink-0 border-r border-outline-variant/30 hidden min-[568px]:flex flex-col bg-surface-container-low">
        <LeftRail session={session} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-outline-variant/30 bg-surface shrink-0 gap-3">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <span className="font-mono text-[12px] text-on-surface-variant whitespace-nowrap">
              {executedCount} of {totalCount}
            </span>

            {totalCount > 0 && (
              <div className="hidden sm:flex w-32 h-1.5 bg-surface-container rounded-full overflow-hidden">
                {passCount > 0 && (
                  <div
                    className="h-full bg-success transition-all duration-300 ease-out"
                    style={{ width: `${(passCount / totalCount) * 100}%` }}
                  />
                )}
                {failCount > 0 && (
                  <div
                    className="h-full transition-all duration-300 ease-out"
                    style={{ width: `${(failCount / totalCount) * 100}%`, backgroundColor: 'var(--color-warning)' }}
                  />
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate(`/sessions/${sessionId}/report`)}
            disabled={executedCount === 0}              className="bg-primary text-on-primary rounded-lg px-3 md:px-4 py-1.5 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold
                       transition-all duration-150 ease-out
                       hover:opacity-90 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Icon name="analytics" size={16} />
            Report
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className={`space-y-2${staggerCards ? ' stagger-enter' : ''}`}>
            {testCases?.map((tc: TestCase, i: number) => {
              const isPending = pendingIds.has(tc.id)
              const steps = Array.isArray(tc.steps) ? (tc.steps as string[]) : []
              return (
                <StaggerItem key={tc.id} index={i}><div
                  className={`bg-surface-container-lowest border border-outline-variant rounded-lg shadow-rest p-4 transition-all duration-200 ease-out hover:shadow-lifted
                    ${tc.status === 'fail' || tc.status === 'blocked' ? 'bg-[#fff8f0] border-warning/30' : ''}
                    ${isPending ? 'opacity-60 scale-[0.99]' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-body-md text-[14px] text-primary font-medium">{tc.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        {tc.source_ref && (
                          <span className="font-mono text-[12px] text-warning">{tc.source_ref}</span>
                        )}
                        {tc.status !== 'not_run' && (
                          <span className="font-mono text-[12px] text-on-surface-variant">
                            by {user?.email?.split('@')[0]} · {new Date().toLocaleTimeString()}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 font-mono text-[12px] text-on-surface-variant">
                        <span className="font-semibold">Steps:</span>
                        <ol className="list-decimal list-inside mt-0.5 space-y-0.5">
                          {steps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ol>
                      </div>

                      {tc.expected_result && (
                        <p className="mt-2 font-mono text-[12px] text-on-surface-variant">
                          <span className="font-semibold">Expected:</span> {tc.expected_result}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Stamp
                        status={tc.status as 'pass' | 'fail' | 'blocked'}
                        visible={stampedCase === tc.id}
                      />

                      <div className="flex gap-1">
                        {(['pass', 'fail', 'blocked'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleResult(tc, status)}
                            disabled={isPending}
                    className={`px-2 md:px-3 py-2.5 font-heading text-[10px] md:text-[11px] uppercase tracking-[0.05em] font-semibold rounded-lg transition-all duration-150 min-h-[44px]
                      ${tc.status === status
                        ? status === 'pass'
                          ? 'bg-success text-white'
                          : 'bg-warning text-white'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-highest active:scale-[0.97]'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ring-offset-2`}
                          >
                            {status === 'pass' ? '✓ Pass' : status === 'fail' ? '⚑ Fail' : '⊘ Blocked'}
                          </button>
                        ))}
                      </div>

                      {tc.status !== 'not_run' && (
                        <button
                          type="button"
                          onClick={() => setOpenEvidence(openEvidence === tc.id ? null : tc.id)}
                          className="font-body-md text-[12px] text-on-surface-variant underline underline-offset-2
                                     hover:text-primary transition-colors duration-150 ease-out"
                        >
                          {openEvidence === tc.id ? 'Hide evidence' : '+ Add evidence'}
                        </button>
                      )}

                      {openEvidence === tc.id && (
                        <div className="w-full mt-2 p-3 bg-surface-container rounded-lg space-y-2">
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add a note about this result…"
                            rows={3}
                            className="w-full px-2 py-1.5 font-mono text-[12px] bg-surface-container-lowest border border-outline-variant rounded
                                       text-primary placeholder:text-on-surface-variant/60 resize-none
                                       focus:outline-none focus:ring-2 focus:ring-focus-ring ring-offset-2"
                          />
                          <input
                            ref={evidenceFileRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="w-full px-2 py-1.5 font-mono text-[12px] text-on-surface-variant file:mr-2 file:py-1 file:px-3 file:rounded
                                       file:border-0 file:font-mono file:text-[12px] file:bg-primary file:text-on-primary
                                       hover:file:bg-primary/90 file:cursor-pointer file:transition-colors"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div></StaggerItem>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
