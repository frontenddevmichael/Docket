import { useStaggerOnce } from '@/hooks/useStaggerOnce'
import { StaggerItem } from '@/components/react-bits/StaggerItem'
import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSessionsWithStats, fetchAllSessionStats } from '@/hooks/useSessionsWithStats'
import { useDeleteSession } from '@/hooks/useDeleteSession'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter'
import { Icon } from '@/components/Icon'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/components/Toast'
import { PendingInvitations } from '@/components/PendingInvitations'
import { DataErrorState } from '@/components/DataErrorState'

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (isToday) return `${time} - Today`
  if (isYesterday) return `${time} - Yesterday`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const PAGE_SIZE = 10

const filterFieldMap = {
  kept: 'keptCount',
  edited: 'editedCount',
  deleted: 'deletedCount',
} as const

export function Dashboard() {
  const staggerMetrics = useStaggerOnce('dashboard-metrics')
  const staggerFeedback = useStaggerOnce('dashboard-feedback')
  const staggerSessions = useStaggerOnce('dashboard-sessions')
  useDocumentTitle('Sessions')
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const { user } = useAuth()
  const deleteSession = useDeleteSession()
  const { toast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: pageData, isLoading, error, refetch } = useSessionsWithStats(page, PAGE_SIZE)
  const { data: stats } = useQuery({
    queryKey: ['session-stats'],
    queryFn: fetchAllSessionStats,
    staleTime: 60_000,
  })

  const sessions = pageData?.sessions
  const totalSessions = pageData?.totalCount ?? 0
  const totalTests = stats?.totalTests ?? 0
  const totalPasses = stats?.totalPasses ?? 0
  const totalFails = stats?.totalFails ?? 0
  const totalExecuted = totalPasses + totalFails
  const passRate = totalTests > 0 ? Math.round((totalPasses / totalTests) * 100) : 0
  const activeBlockers = stats?.activeBlockers ?? 0
  const totalKept = stats?.totalKept ?? 0
  const totalEdited = stats?.totalEdited ?? 0
  const totalDeleted = stats?.totalDeleted ?? 0
  const totalFeedback = stats?.totalFeedback ?? 0
  const keptRatio = totalFeedback > 0 ? Math.round((totalKept / totalFeedback) * 100) : 0
  const editedRatio = totalFeedback > 0 ? Math.round((totalEdited / totalFeedback) * 100) : 0
  const deletedRatio = totalFeedback > 0 ? Math.round((totalDeleted / totalFeedback) * 100) : 0

  const [feedbackFilter, setFeedbackFilter] = useState<'kept' | 'edited' | 'deleted' | null>(null)
  const filteredSessions = useMemo(() => {
    if (!sessions) return undefined
    if (!feedbackFilter) return sessions
    const field = filterFieldMap[feedbackFilter]
    return sessions.filter((s) => s[field] > 0)
  }, [sessions, feedbackFilter])

  useEffect(() => {
    setPage(0)
  }, [feedbackFilter])

  const totalPages = Math.ceil(totalSessions / PAGE_SIZE)
  const pagedSessions = filteredSessions ?? sessions ?? []
  const activeFilterCount = feedbackFilter ? (filteredSessions?.length ?? 0) : 0

  // Personalized greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? ''

  const animSessions = useAnimatedCounter(totalSessions, 600, !!sessions)
  void useAnimatedCounter(totalTests, 600, !!sessions)
  const animPassRate = useAnimatedCounter(passRate, 600, !!sessions)
  const animExecuted = useAnimatedCounter(totalExecuted, 600, !!sessions)
  const animBlockers = useAnimatedCounter(activeBlockers, 600, !!sessions)

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 bg-background">
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        {/* Personalized Greeting */}
        <div className="mb-8">
          <h1 className="font-heading text-[28px] md:text-[32px] text-primary mb-1">
            {greeting}, {displayName}
          </h1>
          <p className="font-body-md text-[14px] text-on-surface-variant">
            {totalSessions > 0
              ? `You have ${totalSessions} session${totalSessions > 1 ? 's' : ''} — ${activeBlockers > 0 ? `${activeBlockers} need${activeBlockers > 1 ? '' : 's'} attention.` : 'all clear.'}`
              : 'Start a new session to generate and execute test cases.'}
          </p>
        </div>

        {user && <PendingInvitations userId={user.id} />}

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-heading text-[20px] md:text-[24px] text-primary mb-1">Session History</h2>
            <p className="font-body-md text-[14px] text-on-surface-variant">Review recent test executions and overall status.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/sessions/new')}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold flex items-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all duration-150 whitespace-nowrap self-start sm:self-auto"
          >
            <Icon name="add" size={18} />
            New Session
          </button>
        </div>

        {isLoading && (
          <>
            {/* Metric card skeletons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-surface-container-lowest p-6 border border-outline-variant/50 rounded-lg skeleton-shimmer">
                  <div className="h-3 w-16 bg-surface-container-highest rounded mb-4" />
                  <div className="h-8 w-20 bg-surface-container-highest rounded mb-2" />
                  <div className="h-3 w-24 bg-surface-container-highest rounded" />
                </div>
              ))}
            </div>
            {/* Session card skeletons — matches the actual grid layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-5 skeleton-shimmer">
                  {/* Status badge + date */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-3 w-14 bg-surface-container-highest rounded" />
                    <div className="h-3 w-20 bg-surface-container-highest rounded" />
                  </div>
                  {/* Title */}
                  <div className="h-4 w-4/5 bg-surface-container-highest rounded mb-1" />
                  {/* Subtitle */}
                  <div className="h-3 w-1/4 bg-surface-container-highest rounded mb-3" />
                  {/* Metadata badges */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-4 w-14 bg-surface-container-highest rounded" />
                    <div className="h-4 w-12 bg-surface-container-highest rounded" />
                    <div className="h-3 w-16 bg-surface-container-highest rounded ml-auto" />
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 w-full bg-surface-container-highest rounded mb-1" />
                  <div className="h-2 w-1/2 bg-surface-container-highest rounded" />
                </div>
              ))}
            </div>
          </>
        )}

        {error && (
          <DataErrorState
            message="Could not load sessions. Please check your connection and try again."
            onRetry={() => { refetch(); queryClient.invalidateQueries({ queryKey: ['session-stats'] }) }}
          />
        )}

        {!isLoading && !error && totalSessions === 0 && (            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-16 text-center shadow-rest">
            <Icon name="assignment" size={64} className="text-on-surface-variant/40 block mx-auto mb-6" />
            <p className="font-heading text-[20px] text-primary mb-2 font-semibold">No test sessions yet</p>
            <p className="font-body-md text-on-surface-variant mb-8 max-w-sm mx-auto leading-relaxed">
              Upload a screenshot and its requirements to generate your first set of test cases.
            </p>
            <button
              type="button"
              onClick={() => navigate('/sessions/new')}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold hover:opacity-90 active:scale-[0.97] transition-all duration-150"
            >
              Create your first session
            </button>
          </div>
        )}

        {totalSessions > 0 && (
          <>
            {/* Metrics Overview */}
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-8${staggerMetrics ? ' stagger-enter' : ''}`}>
              <StaggerItem index={0}><div className="bg-surface-container-lowest p-6 border border-outline-variant/50 rounded-lg shadow-rest card-interactive">
                <div className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold mb-4">Total Sessions</div>
                <div className="font-heading text-[24px] text-primary font-semibold">{animSessions}</div>
                {totalSessions > 0 && (
                  <div className="font-mono text-[11px] text-on-surface-variant mt-2 text-success flex items-center gap-1">
                    <Icon name="check-circle" size={14} className="text-success" />
                    {totalTests} total tests
                  </div>
                )}
              </div></StaggerItem>
              <StaggerItem index={1}><div className="bg-surface-container-lowest p-6 border border-outline-variant/50 rounded-lg shadow-rest card-interactive">
                <div className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold mb-4">Pass Rate</div>
                <div className="font-heading text-[24px] text-primary font-semibold">{animPassRate}%</div>
                {totalTests > 0 && (
                  <div className="font-mono text-[11px] mt-2 flex items-center gap-1" style={{ color: passRate >= 80 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    <Icon name={passRate >= 80 ? 'arrow-up' : 'warning'} size={14} />
                    {totalPasses} of {totalTests} passed
                  </div>
                )}
              </div></StaggerItem>
              <StaggerItem index={2}><div className="bg-surface-container-lowest p-6 border border-outline-variant/50 rounded-lg shadow-rest card-interactive">
                <div className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold mb-4">Active Blockers</div>
                <div className="font-heading text-[24px] font-semibold" style={{ color: activeBlockers > 0 ? 'var(--color-warning)' : 'var(--color-primary)' }}>{animBlockers}</div>
                {activeBlockers > 0 ? (
                  <div className="font-mono text-[11px] mt-2 text-warning flex items-center gap-1">
                    <Icon name="warning" size={14} className="text-warning" />
                    Requires attention
                  </div>
                ) : (
                  <div className="font-mono text-[11px] mt-2 text-on-surface-variant flex items-center gap-1">
                    <Icon name="check-circle" size={14} className="text-on-surface-variant" />
                    All clear
                  </div>
                )}
              </div></StaggerItem>
              <StaggerItem index={3}><div className="bg-surface-container-lowest p-6 border border-outline-variant/50 rounded-lg shadow-rest card-interactive">
                <div className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold mb-4">Total Executed</div>
                <div className="font-heading text-[24px] text-primary font-semibold">{animExecuted}</div>
                <div className="font-mono text-[11px] text-on-surface-variant mt-2 flex items-center gap-1">
                  <Icon name="schedule" size={14} className="text-on-surface-variant" />
                  {totalPasses} passed · {totalFails} failed
                </div>
              </div></StaggerItem>
            </div>

            {/* Feedback Health — generation quality signals */}
            {totalFeedback > 0 && (
              <div className={`col-span-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-5 shadow-rest mb-8${staggerFeedback ? ' stagger-enter' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold">Feedback Health</span>
                    <span className="font-mono text-[9px] text-on-surface-variant/40">{totalFeedback} total signals</span>
                  </div>
                  {feedbackFilter && (
                    <button
                      type="button"
                      onClick={() => setFeedbackFilter(null)}
                      className="font-mono text-[9px] text-on-surface-variant hover:text-primary underline underline-offset-2 transition-colors"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Kept */}
                  <StaggerItem index={0}><button
                    type="button"
                    onClick={() => setFeedbackFilter(feedbackFilter === 'kept' ? null : 'kept')}
                    className={`flex-1 space-y-1.5 p-2 -m-2 rounded-lg transition-all duration-150 text-left
                      ${feedbackFilter === 'kept' ? 'bg-success/5 ring-2 ring-success/30' : 'hover:bg-surface-container'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-[11px] font-medium flex items-center gap-1.5 transition-colors
                        ${feedbackFilter === 'kept' ? 'text-success' : 'text-success'}`}>
                        <Icon name="check-circle" size={12} className="text-success" />
                        Kept
                      </span>
                      <span className="font-mono text-[11px] text-on-surface-variant">{totalKept} ({keptRatio}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-outline-variant/15 rounded-full overflow-hidden">
                      <div className="h-full bg-success rounded-full transition-all duration-500 ease-out" style={{ width: `${keptRatio}%` }} />
                    </div>
                  </button></StaggerItem>
                  {/* Edited */}
                  <StaggerItem index={1}><button
                    type="button"
                    onClick={() => setFeedbackFilter(feedbackFilter === 'edited' ? null : 'edited')}
                    className={`flex-1 space-y-1.5 p-2 -m-2 rounded-lg transition-all duration-150 text-left
                      ${feedbackFilter === 'edited' ? 'bg-warning/5 ring-2 ring-warning/30' : 'hover:bg-surface-container'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-[11px] font-medium flex items-center gap-1.5 transition-colors
                        ${feedbackFilter === 'edited' ? 'text-warning' : 'text-warning'}`}>
                        <Icon name="pencil" size={12} className="text-warning" />
                        Edited
                      </span>
                      <span className="font-mono text-[11px] text-on-surface-variant">{totalEdited} ({editedRatio}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-outline-variant/15 rounded-full overflow-hidden">
                      <div className="h-full bg-warning rounded-full transition-all duration-500 ease-out" style={{ width: `${editedRatio}%` }} />
                    </div>
                  </button></StaggerItem>
                  {/* Deleted */}
                  <StaggerItem index={2}><button
                    type="button"
                    onClick={() => setFeedbackFilter(feedbackFilter === 'deleted' ? null : 'deleted')}
                    className={`flex-1 space-y-1.5 p-2 -m-2 rounded-lg transition-all duration-150 text-left
                      ${feedbackFilter === 'deleted' ? 'bg-on-surface-variant/5 ring-2 ring-on-surface-variant/30' : 'hover:bg-surface-container'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-[11px] font-medium flex items-center gap-1.5 transition-colors
                        ${feedbackFilter === 'deleted' ? 'text-on-surface-variant' : 'text-on-surface-variant'}`}>
                        <Icon name="trash" size={12} className="text-on-surface-variant" />
                        Deleted
                      </span>
                      <span className="font-mono text-[11px] text-on-surface-variant">{totalDeleted} ({deletedRatio}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-outline-variant/15 rounded-full overflow-hidden">
                      <div className="h-full bg-on-surface-variant rounded-full transition-all duration-500 ease-out" style={{ width: `${deletedRatio}%` }} />
                    </div>
                  </button></StaggerItem>
                </div>
              </div>
            )}

            {/* Active filter indicator */}
            {feedbackFilter && (
              <div className="flex items-center gap-2 mb-4 px-1">
                <span className="font-mono text-[11px] text-on-surface-variant">
                  Showing <strong className="text-primary">{activeFilterCount}</strong> session{activeFilterCount !== 1 ? 's' : ''} with <strong className="capitalize">{feedbackFilter}</strong> test cases
                </span>
                <button
                  type="button"
                  onClick={() => setFeedbackFilter(null)}
                  className="font-mono text-[9px] text-on-surface-variant hover:text-primary underline underline-offset-2 transition-colors"
                >
                  Show all
                </button>
              </div>
            )}

            {/* Session Cards — modular grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4${staggerSessions ? ' stagger-enter' : ''}`}>
              {pagedSessions.map((session, i) => {
                const executed = session.passCount + session.failCount + session.blockedCount
                const execRate = session.testCount > 0 ? Math.round((executed / session.testCount) * 100) : 0
                const hasFails = session.failCount > 0
                const hasScreenshot = !!session.screenshot_url
                const hasRequirements = !!session.requirements_text?.trim()

                const badge: { label: string; bg: string; text: string } =
                  session.status === 'complete' ? { label: 'Complete', bg: 'bg-success/10', text: 'text-success' }
                  : session.status === 'executing' || session.status === 'generating' ? { label: session.status === 'executing' ? 'Running' : 'Generating', bg: 'bg-primary/8', text: 'text-primary' }
                  : session.status === 'ready' ? { label: 'Ready', bg: 'bg-surface-container-high', text: 'text-on-surface-variant' }
                  : { label: 'Draft', bg: 'bg-outline-variant/20', text: 'text-on-surface-variant/60' }

                return (
                  <StaggerItem key={session.id} index={i}><div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/sessions/${session.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/sessions/${session.id}`) }}
                    className="w-full text-left bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-5 shadow-rest
                               hover:shadow-elevated transition-all duration-200 group relative cursor-pointer"
                  >
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(session.id) }}
                      className="absolute top-3 right-3 p-1.5 text-on-surface-variant/30 hover:text-error hover:bg-surface-container rounded-lg
                                 opacity-0 group-hover:opacity-100 transition-all duration-150 z-10"
                      title="Delete session"
                      aria-label={`Delete ${session.title}`}
                    >
                      <Icon name="trash" size={14} />
                    </button>

                    {/* Top: status badge + date */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`font-mono text-[9px] uppercase tracking-[0.06em] px-1.5 py-0.5 rounded ${badge.bg} ${badge.text} font-semibold`}>
                        {badge.label}
                      </span>
                      <span className="font-mono text-[9px] text-on-surface-variant/40">{formatDate(session.created_at)}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-body-md text-[14px] text-primary font-medium truncate mb-1 group-hover:text-primary/80 transition-colors">
                      {session.title}
                    </h3>

                    {/* ID */}
                    <span className="font-mono text-[9px] text-on-surface-variant/30 block mb-3">#{session.id.slice(0, 8)}</span>

                    {/* Metadata row: screenshot + requirements badges */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap min-h-[20px]">
                      {hasScreenshot && (
                        <span className="flex items-center gap-1 font-mono text-[9px] text-on-surface-variant/50 bg-surface-container px-1.5 py-0.5 rounded">
                          <Icon name="image" size={10} />
                          Screen
                        </span>
                      )}
                      {hasRequirements && (
                        <span className="flex items-center gap-1 font-mono text-[9px] text-on-surface-variant/50 bg-surface-container px-1.5 py-0.5 rounded">
                          <Icon name="description" size={10} />
                          PRD
                        </span>
                      )}
                      <span className="font-mono text-[9px] text-on-surface-variant/40 ml-auto">{session.testCount} test{session.testCount !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Progress bar */}
                    {session.testCount > 0 ? (
                      <div className="space-y-1">
                        <div className="w-full h-1.5 bg-outline-variant/15 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ease-out ${hasFails ? 'bg-warning' : 'bg-success'}`}
                            style={{ width: `${execRate}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] text-on-surface-variant/50">{executed}/{session.testCount} executed</span>
                          <span className="font-mono text-[9px] text-primary font-medium">{execRate}%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2">
                        <span className="font-mono text-[9px] text-on-surface-variant/40 italic">No tests yet</span>
                      </div>
                    )}

                    {/* Results breakdown */}
                    {(session.passCount > 0 || session.failCount > 0 || session.blockedCount > 0) && (
                      <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-outline-variant/20">
                        {session.passCount > 0 && <span className="font-mono text-[9px] text-success font-medium">{session.passCount} passed</span>}
                        {session.failCount > 0 && <span className="font-mono text-[9px] text-warning font-medium">{session.failCount} failed</span>}
                        {session.blockedCount > 0 && <span className="font-mono text-[9px] text-on-surface-variant/50">{session.blockedCount} blocked</span>}
                      </div>
                    )}
                  </div></StaggerItem>
                )
              })}

              {/* New Session card */}
              <button
                type="button"
                onClick={() => navigate('/sessions/new')}
                className="w-full bg-surface-container-lowest border-2 border-dashed border-outline-variant/30 rounded-lg p-5
                           hover:border-primary/40 hover:bg-surface-container/30 transition-all duration-200
                           flex flex-col items-center justify-center gap-2 min-h-[180px]"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/30">
                  <Icon name="add" size={20} className="text-on-surface-variant" />
                </div>
                <span className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold">New Session</span>
              </button>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 px-1">
                <span className="font-mono text-[10px] text-on-surface-variant/50">
                  Page {page + 1} of {totalPages} · {totalSessions} session{totalSessions !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="w-7 h-7 rounded-lg border border-outline-variant/30 flex items-center justify-center
                               text-on-surface-variant hover:text-primary hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <Icon name="chevron-left" size={14} />
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPage(i)}
                      className={`w-7 h-7 rounded-lg text-[10px] font-mono font-medium transition-all ${
                        i === page
                          ? 'bg-primary text-on-primary shadow-rest'
                          : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="w-7 h-7 rounded-lg border border-outline-variant/30 flex items-center justify-center
                               text-on-surface-variant hover:text-primary hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <Icon name="chevron-right" size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete session"
        message="Are you sure you want to delete this session, its test cases, and all related evidence? This cannot be undone."
        confirmLabel="Delete session"
        onConfirm={() => {
          if (deleteTarget) {
            deleteSession.mutate(deleteTarget)
            toast('Session deleted', 'info')
          }
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
