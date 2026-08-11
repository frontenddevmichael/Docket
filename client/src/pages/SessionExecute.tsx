import { useStaggerOnce } from '@/hooks/useStaggerOnce'
import { StaggerItem } from '@/components/react-bits/StaggerItem'
import { useState, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { apiGet } from '@/lib/api'
import { isExecuted } from '@/lib/status'
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

type ExecStatus = 'pass' | 'fail' | 'blocked' | 'not_applicable' | 'fixed' | 'reopened' | 'controlled_live' | 'uat'

const EXEC_STATUSES: { value: ExecStatus; label: string; glyph: string }[] = [
  { value: 'pass', label: 'Pass', glyph: '✓' },
  { value: 'fail', label: 'Fail', glyph: '⚑' },
  { value: 'blocked', label: 'Blocked', glyph: '⊘' },
  { value: 'not_applicable', label: 'N/A', glyph: '⌀' },
  { value: 'fixed', label: 'Fixed', glyph: '✎' },
  { value: 'reopened', label: 'Reopened', glyph: '↺' },
  { value: 'controlled_live', label: 'Controlled Live', glyph: '◉' },
  { value: 'uat', label: 'UAT', glyph: '⌂' },
]

const QUICK_STATUSES: ExecStatus[] = ['pass', 'fail', 'blocked']
const EXTENDED_STATUSES: ExecStatus[] = ['not_applicable', 'fixed', 'reopened', 'controlled_live', 'uat']

const ENVIRONMENTS = ['test', 'pilot', 'regression', 'production']
const SEVERITIES = ['critical', 'high', 'medium', 'low']
const PRIORITIES = ['high', 'medium', 'low']
const PAGE_SIZE = 20

const DONE_STATUSES = new Set<ExecStatus>(['pass', 'fail', 'blocked', 'not_applicable', 'fixed', 'controlled_live', 'uat'])

interface MemberOption {
  user_id: string
  role: string
  profiles?: { id: string; email: string; full_name: string | null } | null
}

interface MatrixCell {
  total: number
  executed: number
  pass: number
  fail: number
  blocked: number
}

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
  const { data: members } = useQuery({
    queryKey: ['workspace', 'members'],
    queryFn: () => apiGet<{ members: MemberOption[] }>('/api/workspace/members'),
  })
  const recordResult = useRecordResult(sessionId ?? '')
  const updateSessionStatus = useUpdateSessionStatus()
  const { toast } = useToast()
  useDocumentTitle(session ? `Execute: ${session.title}` : 'Execute')

  const [stampedCase, setStampedCase] = useState<string | null>(null)
  const [openEvidence, setOpenEvidence] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const evidenceFileRef = useRef<HTMLInputElement>(null)
  const [matrixOpen, setMatrixOpen] = useState(false)
  const [selected, setSelected] = useState<Record<string, { environment: string; severity: string; priority: string; developer: string; actualResult: string }>>({})

  const executedCount = testCases?.filter((tc) => isExecuted(tc.status)).length ?? 0
  const totalCount = testCases?.length ?? 0
  const passCount = testCases?.filter((tc) => tc.status === 'pass').length ?? 0
  const failCount = testCases?.filter((tc) => tc.status === 'fail' || tc.status === 'blocked').length ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const paged = testCases?.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) ?? []

  const matrix = useMemo(() => {
    const byModule: Record<string, MatrixCell> = {}
    for (const tc of testCases ?? []) {
      const key = tc.module || 'Unassigned'
      if (!byModule[key]) byModule[key] = { total: 0, executed: 0, pass: 0, fail: 0, blocked: 0 }
      const cell = byModule[key]
      cell.total++
      if (isExecuted(tc.status)) cell.executed++
      if (tc.status === 'pass') cell.pass++
      if (tc.status === 'fail' || tc.status === 'blocked') { cell.fail += tc.status === 'fail' ? 1 : 0; cell.blocked += tc.status === 'blocked' ? 1 : 0 }
    }
    return byModule
  }, [testCases])

  const setPanelValue = (id: string, key: keyof { environment: string; severity: string; priority: string; developer: string; actualResult: string }, value: string) => {
    setSelected((prev) => {
      const current = prev[id] ?? { environment: ENVIRONMENTS[0], severity: '', priority: '', developer: '', actualResult: '' }
      return { ...prev, [id]: { ...current, [key]: value } }
    })
  }

  const handleResult = async (testCase: TestCase, status: ExecStatus) => {
    if (!user) return
    const panel = selected[testCase.id]

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
        actualResult: panel?.actualResult.trim() || undefined,
        environment: panel?.environment || undefined,
        severity: panel?.severity || undefined,
        priority: panel?.priority || undefined,
        assignedDeveloper: panel?.developer || undefined,
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
    const remaining = optimisticCases.filter((tc) => !DONE_STATUSES.has(tc.status as ExecStatus)).length

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
      const label = EXEC_STATUSES.find((s) => s.value === status)?.label ?? status
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

  const tooltip = (status: ExecStatus) => {
    const s = EXEC_STATUSES.find((e) => e.value === status)
    return `${s?.glyph} ${s?.label}`
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

          <div className="flex items-center gap-2">
            {session.project_id && (
              <button
                type="button"
                onClick={() => navigate(`/projects/${session.project_id}/issue-log`)}
                className="inline-flex items-center gap-1.5 px-3 md:px-4 py-1.5 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold bg-surface-container text-on-surface-variant rounded-lg transition-all duration-150 ease-out hover:bg-surface-container-highest active:scale-[0.97] whitespace-nowrap"
              >
                <Icon name="flag" size={16} />
                Issue Log
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(`/sessions/${sessionId}/report`)}
              disabled={executedCount === 0}
              className="bg-primary text-on-primary rounded-lg px-3 md:px-4 py-1.5 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold
                         transition-all duration-150 ease-out
                         hover:opacity-90 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Icon name="analytics" size={16} />
              Report
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Matrix & KPIs */}
          {totalCount > 0 && (
            <div className="mb-4 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-rest">
              <button
                type="button"
                onClick={() => setMatrixOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="font-heading text-[13px] uppercase tracking-[0.05em] font-semibold text-primary flex items-center gap-2">
                  <Icon name="list-alt" size={16} />
                  Test Matrix &amp; KPIs
                </span>
                <Icon name="chevron-down" size={16} className={`text-on-surface-variant transition-transform duration-200 ${matrixOpen ? 'rotate-180' : ''}`} />
              </button>
              {matrixOpen && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { label: 'Execution', value: `${totalCount > 0 ? Math.round((executedCount / totalCount) * 100) : 0}%` },
                      { label: 'Target', value: '100%' },
                      { label: 'Variance', value: `${totalCount > 0 ? Math.round((executedCount / totalCount) * 100) - 100 : 0}%` },
                      { label: 'Pass rate', value: `${totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0}%` },
                      { label: 'Defect rate', value: `${executedCount > 0 ? Math.round((failCount / executedCount) * 100) : 0}%` },
                      { label: 'Quality score', value: `${executedCount > 0 ? Math.round((passCount / executedCount) * 100) : 0}%` },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-surface-container rounded-lg p-3">
                        <div className="font-heading text-[10px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold">{kpi.label}</div>
                        <div className="font-heading text-[20px] text-primary font-semibold">{kpi.value}</div>
                      </div>
                    ))}
                  </div>
                  <table className="w-full text-[12px] font-mono">
                    <thead>
                      <tr className="text-on-surface-variant uppercase tracking-wider border-b border-outline-variant">
                        <th className="text-left py-1.5 pr-2 font-semibold">Module</th>
                        <th className="text-right px-2 py-1.5 font-semibold">Total</th>
                        <th className="text-right px-2 py-1.5 font-semibold">Executed</th>
                        <th className="text-right px-2 py-1.5 font-semibold">Pass</th>
                        <th className="text-right px-2 py-1.5 font-semibold">Fail</th>
                        <th className="text-right px-2 py-1.5 font-semibold">Blocked</th>
                        <th className="text-right pl-2 py-1.5 font-semibold">Exec %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(matrix).map(([module, c]) => (
                        <tr key={module} className="border-b border-outline-variant/40">
                          <td className="py-1.5 pr-2 text-primary font-semibold">{module}</td>
                          <td className="text-right px-2 py-1.5">{c.total}</td>
                          <td className="text-right px-2 py-1.5">{c.executed}</td>
                          <td className="text-right px-2 py-1.5 text-success">{c.pass}</td>
                          <td className="text-right px-2 py-1.5 text-warning">{c.fail}</td>
                          <td className="text-right px-2 py-1.5 text-on-surface-variant">{c.blocked}</td>
                          <td className="text-right pl-2 py-1.5">{c.total > 0 ? Math.round((c.executed / c.total) * 100) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className={`space-y-2${staggerCards ? ' stagger-enter' : ''}`}>
            {paged.map((tc: TestCase, i: number) => {
              const isPending = pendingIds.has(tc.id)
              const steps = Array.isArray(tc.steps) ? (tc.steps as string[]) : []
              const panel = selected[tc.id] ?? { environment: ENVIRONMENTS[0], severity: '', priority: '', developer: '', actualResult: '' }
              return (
                <StaggerItem key={tc.id} index={i}><div
                  className={`bg-surface-container-lowest border border-outline-variant rounded-lg shadow-rest p-4 transition-all duration-200 ease-out hover:shadow-lifted
                    ${tc.status === 'fail' || tc.status === 'blocked' ? 'bg-[#fff8f0] border-warning/30' : ''}
                    ${isPending ? 'opacity-60 scale-[0.99]' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-body-md text-[14px] text-primary font-medium">{tc.title}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {tc.source_ref && (
                          <span className="font-mono text-[12px] text-warning">{tc.source_ref}</span>
                        )}
                        {tc.module && (
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">{tc.module}{tc.submodule ? ` / ${tc.submodule}` : ''}</span>
                        )}
                        {tc.severity && (
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">sev: {tc.severity}</span>
                        )}
                        {tc.priority && (
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">pri: {tc.priority}</span>
                        )}
                        {isExecuted(tc.status) && (
                          <span className="font-mono text-[12px] text-on-surface-variant">
                            by {user?.email?.split('@')[0]} · {tc.executed_at ? new Date(tc.executed_at).toLocaleString() : ''}
                          </span>
                        )}
                      </div>

                      {tc.test_objective && (
                        <p className="mt-2 font-mono text-[12px] text-on-surface-variant">
                          <span className="font-semibold">Objective:</span> {tc.test_objective}
                        </p>
                      )}

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
                        status={tc.status as any}
                        visible={stampedCase === tc.id}
                      />

                      <div className="flex flex-col gap-2 items-end">
                        <div className="flex gap-1">
                          {QUICK_STATUSES.map((status) => (
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

                        <select
                          value={tc.status && EXTENDED_STATUSES.includes(tc.status as ExecStatus) ? tc.status : ''}
                          onChange={(e) => {
                            if (e.target.value) handleResult(tc, e.target.value as ExecStatus)
                          }}
                          disabled={isPending}
                          className="px-2 py-1.5 font-mono text-[11px] bg-surface-container text-on-surface-variant rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-focus-ring"
                        >
                          <option value="">Extended status…</option>
                          {EXTENDED_STATUSES.map((s) => (
                            <option key={s} value={s}>{tooltip(s)}</option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                        <label className="block">
                          <span className="font-heading text-[10px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold">Environment</span>
                          <select
                            value={panel.environment}
                            onChange={(e) => setPanelValue(tc.id, 'environment', e.target.value)}
                            className="mt-0.5 w-full px-1.5 py-1 font-mono text-[11px] bg-surface-container-lowest border border-outline-variant rounded text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
                          >
                            {ENVIRONMENTS.map((env) => <option key={env} value={env}>{env}</option>)}
                          </select>
                        </label>
                        <label className="block">
                          <span className="font-heading text-[10px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold">Severity</span>
                          <select
                            value={panel.severity || tc.severity || ''}
                            onChange={(e) => setPanelValue(tc.id, 'severity', e.target.value)}
                            className="mt-0.5 w-full px-1.5 py-1 font-mono text-[11px] bg-surface-container-lowest border border-outline-variant rounded text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
                          >
                            <option value="">—</option>
                            {SEVERITIES.map((sev) => <option key={sev} value={sev}>{sev}</option>)}
                          </select>
                        </label>
                        <label className="block">
                          <span className="font-heading text-[10px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold">Priority</span>
                          <select
                            value={panel.priority || tc.priority || ''}
                            onChange={(e) => setPanelValue(tc.id, 'priority', e.target.value)}
                            className="mt-0.5 w-full px-1.5 py-1 font-mono text-[11px] bg-surface-container-lowest border border-outline-variant rounded text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
                          >
                            <option value="">—</option>
                            {PRIORITIES.map((pri) => <option key={pri} value={pri}>{pri}</option>)}
                          </select>
                        </label>
                        <label className="block">
                          <span className="font-heading text-[10px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold">Developer</span>
                          <select
                            value={panel.developer || tc.assigned_developer || ''}
                            onChange={(e) => setPanelValue(tc.id, 'developer', e.target.value)}
                            className="mt-0.5 w-full px-1.5 py-1 font-mono text-[11px] bg-surface-container-lowest border border-outline-variant rounded text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
                          >
                            <option value="">—</option>
                            {(members?.members ?? [])
                              .filter((m) => ['developer', 'tester', 'manager'].includes(m.role))
                              .map((m) => (
                                <option key={m.user_id} value={m.user_id}>
                                  {m.profiles?.full_name || m.profiles?.email || m.user_id.slice(0, 8)}
                                </option>
                              ))}
                          </select>
                        </label>
                      </div>

                      <div className="flex items-end justify-between gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setOpenEvidence(openEvidence === tc.id ? null : tc.id)}
                          className="font-body-md text-[12px] text-on-surface-variant underline underline-offset-2
                                     hover:text-primary transition-colors duration-150 ease-out"
                        >
                          {openEvidence === tc.id ? 'Hide evidence' : '+ Add evidence'}
                        </button>
                        {(panel.actualResult || tc.status !== 'not_run') && (
                          <span className="font-mono text-[11px] text-on-surface-variant truncate max-w-[60%]">
                            {panel.actualResult ? `Actual: ${panel.actualResult}` : 'No actual result'}
                          </span>
                        )}
                      </div>

                      {openEvidence === tc.id && (
                        <div className="w-full mt-2 p-3 bg-surface-container rounded-lg space-y-2">
                          <textarea
                            value={panel.actualResult}
                            onChange={(e) => setPanelValue(tc.id, 'actualResult', e.target.value)}
                            placeholder="Actual result — what actually happened…"
                            rows={2}
                            className="w-full px-2 py-1.5 font-mono text-[12px] bg-surface-container-lowest border border-outline-variant rounded
                                       text-primary placeholder:text-on-surface-variant/60 resize-none
                                       focus:outline-none focus:ring-2 focus:ring-focus-ring ring-offset-2"
                          />
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

          {pageCount > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-outline-variant/30">
              <span className="font-mono text-[12px] text-on-surface-variant">
                Page {page + 1} of {pageCount} · {totalCount} cases
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold bg-surface-container text-on-surface-variant rounded-lg disabled:opacity-40 hover:bg-surface-container-highest transition-colors"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={page >= pageCount - 1}
                  className="px-3 py-1.5 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold bg-surface-container text-on-surface-variant rounded-lg disabled:opacity-40 hover:bg-surface-container-highest transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}