import { useStaggerOnce } from '@/hooks/useStaggerOnce'
import { StaggerItem } from '@/components/react-bits/StaggerItem'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  useTestCases,
  useDeleteTestCase,
  useReorderTestCases,
  useAddTestCase,
  useDuplicateTestCase,
} from '@/hooks/useTestCases'
import { LeftRail, LeftRailSkeleton } from '@/components/LeftRail'
import { Icon } from '@/components/Icon'
import { TestCaseRow } from '@/components/TestCaseRow'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/components/Toast'
import { fetchWithAuth } from '@/lib/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { GenerateLoading } from '@/pages/GenerateLoading'
import { Events } from '@/lib/analytics'
import type { Session, TestCase, WorkspaceMember } from '@/types/database'

type FilterMode = 'all' | 'not_run' | 'pass' | 'fail'

async function fetchSession(id: string): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

const filterTabs: { key: FilterMode; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'not_run', label: 'Not Run' },
  { key: 'pass', label: 'Pass' },
  { key: 'fail', label: 'Fail' },
]

export function SessionReview() {
  const staggerSkeleton = useStaggerOnce('review-skeleton')
  const staggerFiltered = useStaggerOnce('review-filtered')
  const staggerSortable = useStaggerOnce('review-sortable')
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => fetchSession(sessionId!),
    enabled: !!sessionId,
  })
  const { data: testCases, isLoading: casesLoading } = useTestCases(sessionId ?? '')
  const deleteMutation = useDeleteTestCase(sessionId ?? '')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState<string[] | undefined>(undefined)
  const reorderMutation = useReorderTestCases(sessionId ?? '')
  const addMutation = useAddTestCase(sessionId ?? '')
  const duplicateMutation = useDuplicateTestCase(sessionId ?? '')
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [confirmBulkDuplicate, setConfirmBulkDuplicate] = useState(false)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [search, setSearch] = useState('')
  const [activeTcId, setActiveTcId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  useDocumentTitle(session ? `Review: ${session.title}` : 'Review')

  // Assignment state
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchWithAuth('/api/workspace/members')
      .then(r => r.json())
      .then(d => setMembers(d.members || []))
      .catch(() => {})
  }, [user])

  const handleAssign = async (assignedTo: string | null, assignedName?: string) => {
    if (!sessionId || !user) return
    setAssigning(true)
    try {
      const res = await fetchWithAuth(`/api/sessions/${sessionId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo, assignedName }),
      })
      if (!res.ok) throw new Error('Assignment failed')
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
    } catch {
      toast('Failed to update assignment', 'error')
    } finally {
      setAssigning(false)
    }
  }

  const passCount = testCases?.filter((tc) => tc.status === 'pass').length ?? 0
  const failCount = testCases?.filter((tc) => tc.status === 'fail' || tc.status === 'blocked').length ?? 0
  const notRunCount = testCases?.filter((tc) => tc.status === 'not_run').length ?? 0

  const filteredTestCases = useCallback(() => {
    if (!testCases) return []
    let result = testCases
    if (filter === 'pass') result = result.filter((tc) => tc.status === 'pass')
    else if (filter === 'fail') result = result.filter((tc) => tc.status === 'fail' || tc.status === 'blocked')
    else if (filter === 'not_run') result = result.filter((tc) => tc.status === 'not_run')
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((tc) => tc.title.toLowerCase().includes(q))
    }
    return result
  }, [testCases, filter, search])

  const filtered = filteredTestCases()

  const handleSelectNav = (id: string) => {
    setActiveTcId(id)
    const el = document.getElementById(`tc-${id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (!testCases) return
    setSelectedIds(new Set(testCases.map((tc) => tc.id)))
  }

  const deselectAll = () => setSelectedIds(new Set())

  const handleBulkDelete = () => {
    const bulkDeleted = testCases?.filter((tc) => selectedIds.has(tc.id)) ?? []
    if (bulkDeleted.length === 0) return
    selectedIds.forEach((id) => deleteMutation.mutate(id))
    const count = selectedIds.size
    deselectAll()
    Events.testCaseDeleted({ count })
    toast(`${count} test case${count > 1 ? 's' : ''} deleted`, 'info', {
      label: 'Undo',
      onClick: () => {
        if (session && user) {
          for (const tc of bulkDeleted) {
            addMutation.mutate({
              session_id: sessionId!,
              workspace_id: session.workspace_id,
              title: tc.title,
              steps: Array.isArray(tc.steps) ? (tc.steps as string[]) : [],
              expected_result: tc.expected_result,
              created_by: user.id,
              sort_order: tc.sort_order,
            })
          }
        }
      },
    }, 6000)
  }

  const handleBulkDuplicate = () => {
    if (!testCases) return
    testCases.filter((tc) => selectedIds.has(tc.id)).forEach((tc) => duplicateMutation.mutate(tc))
    deselectAll()
    Events.testCaseDuplicated({ count: selectedIds.size })
    toast(`${selectedIds.size} test case${selectedIds.size > 1 ? 's' : ''} duplicated`, 'success')
  }

  const handleDeleteOne = (id: string) => {
    const deletedTc = testCases?.find((tc) => tc.id === id)
    if (!deletedTc) return
    deleteMutation.mutate(id)
    Events.testCaseDeleted({ count: 1 })
    toast('Test case deleted', 'info', {
      label: 'Undo',
      onClick: () => {
        if (session && user) {
          addMutation.mutate({
            session_id: sessionId!,
            workspace_id: session.workspace_id,
            title: deletedTc.title,
            steps: Array.isArray(deletedTc.steps) ? (deletedTc.steps as string[]) : [],
            expected_result: deletedTc.expected_result,
            created_by: user.id,
            sort_order: deletedTc.sort_order,
          })
        }
      },
    }, 6000)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !testCases) return

    const oldIndex = testCases.findIndex((tc) => tc.id === active.id)
    const newIndex = testCases.findIndex((tc) => tc.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...testCases]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    const updates = reordered.map((tc, i) => ({
      id: tc.id,
      sort_order: i,
    }))

    reorderMutation.mutate(updates)
  }, [testCases, reorderMutation])

  const handleAdd = () => {
    if (!session || !user || addMutation.isPending) return
    addMutation.mutate({
      session_id: sessionId!,
      workspace_id: session.workspace_id,
      title: 'New test case',
      steps: ['Step 1'],
      expected_result: 'Describe the expected result',
      created_by: user.id,
      sort_order: testCases?.length ?? 0,
    })
  }

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const genIdRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const triggerGeneration = useCallback(async () => {
    if (!sessionId || !session || !user) return
    setGenError(null)
    setLoadingMessages(undefined)
    setGenerating(true)

    try {
      const msgRes = await fetchWithAuth('/api/loading-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirementsText: session.requirements_text }),
      })
      if (msgRes.ok) {
        const msgData = await msgRes.json()
        if (msgData.messages) setLoadingMessages(msgData.messages)
      }
    } catch {
      // Silently ignore — GenerateLoading will use client-side fallbacks
    }

    const res = await fetchWithAuth('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        screenshotUrl: session.screenshot_url || undefined,
        requirementsText: session.requirements_text,
        userId: user.id,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      setGenError(errBody || 'Generation failed')
      setGenerating(false)
      return
    }

    const { generationId } = await res.json()
    genIdRef.current = generationId

    pollRef.current = setInterval(async () => {
      try {
        const statusRes = await fetchWithAuth(`/api/generate/${generationId}/status`)
        if (!statusRes.ok) {
          if (pollRef.current) clearInterval(pollRef.current)
          setGenError('Generation status check failed')
          setGenerating(false)
          return
        }

        const { status, error } = await statusRes.json()

        if (status === 'complete') {
          if (pollRef.current) clearInterval(pollRef.current)
          setGenerating(false)
          queryClient.invalidateQueries({ queryKey: ['session', sessionId] })
          queryClient.invalidateQueries({ queryKey: ['test-cases', sessionId] })
        } else if (status === 'error') {
          if (pollRef.current) clearInterval(pollRef.current)
          setGenError(error || 'Generation failed')
          setGenerating(false)
        }
      } catch {
        if (pollRef.current) clearInterval(pollRef.current)
        setGenError('Generation status check failed')
        setGenerating(false)
      }
    }, 3000)
  }, [sessionId, session, user, queryClient])

  const handleCancel = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    setGenerating(false)
    setGenError(null)
    if (genIdRef.current) {
      fetchWithAuth(`/api/generate/${genIdRef.current}/cancel`, { method: 'POST' }).catch(() => {})
    }
  }, [])

  if (generating) {
    return (
      <div className="flex-1 flex flex-col">
        <GenerateLoading
          messages={loadingMessages}
          error={genError}
          onRetry={triggerGeneration}
          tipContext={{
            testCaseCount: testCases?.length ?? 0,
            hasTeam: members.length > 1,
            hasUsedCmdK: (() => { try { return localStorage.getItem('__docket_cmdk_used') === 'true' } catch { return false } })(),
          }}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  if (sessionLoading || casesLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-gutter lg:p-margin_desktop">
        <div className="flex gap-gutter h-full">
          <div className="w-[280px] lg:w-[320px] shrink-0 hidden min-[568px]:block">
            <LeftRailSkeleton />
          </div>
          <div className={`flex-1 space-y-3${staggerSkeleton ? ' stagger-enter' : ''}`}>
            {Array.from({ length: 4 }).map((_, i) => (
              <StaggerItem key={i} index={i}><div className="h-24 bg-surface-container-lowest border border-outline-variant rounded-lg skeleton-shimmer" /></StaggerItem>
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
      {/* Left rail — test case navigator */}
      <div className="w-[280px] lg:w-[320px] shrink-0 border-r border-outline-variant/30 hidden min-[568px]:flex flex-col bg-surface-container-low">
        <LeftRail session={session} testCases={testCases} activeId={activeTcId} onSelect={handleSelectNav} userId={user?.id} />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-outline-variant/30 bg-surface shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Icon name="search" size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search test cases…"
              className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-surface-container border border-outline-variant/30 rounded-lg text-primary placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-focus-ring ring-offset-2"
            />
          </div>
          {/* Assigned to dropdown */}
          <div className="flex items-center gap-2 ml-auto">
            <label htmlFor="assigned-to" className="font-mono text-[10px] text-on-surface-variant/60 hidden sm:block">Assigned</label>
            <select
              id="assigned-to"
              value={session?.assigned_to ?? ''}
              onChange={e => {
                const val = e.target.value
                if (val === '') {
                  handleAssign(null)
                } else {
                  const m = members.find(m => m.user_id === val)
                  handleAssign(val, m?.profiles?.full_name || m?.profiles?.email || undefined)
                }
              }}
              disabled={assigning || !session}
              className="text-[11px] font-body-md bg-surface-container border border-outline-variant/30 rounded px-2 py-1 text-primary focus:outline-none focus:ring-1 focus:ring-focus-ring disabled:opacity-40"
              aria-label="Assign session to a team member"
            >
              <option value="">Unassigned</option>
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profiles?.full_name || m.profiles?.email || m.user_id.slice(0, 8)}
                </option>
              ))}
            </select>
            <span className="font-mono text-[12px] text-on-surface-variant whitespace-nowrap">
              {testCases?.length ?? 0} test case{(testCases?.length ?? 0) !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => navigate(`/sessions/${sessionId}/execute`)}
              disabled={(testCases?.length ?? 0) === 0}
              className="bg-primary text-on-primary rounded-lg px-4 py-1.5 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold
                         transition-all duration-150 ease-out
                         hover:opacity-90 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Execute
            </button>
          </div>
        </div>

        {/* Filter tabs + summary */}
        {testCases && testCases.length > 0 && (
          <div className="flex items-center gap-2 px-4 sm:px-6 py-2 border-b border-outline-variant/30 bg-surface/80 shrink-0 flex-wrap">
            <div className="flex items-center gap-1">
              {filterTabs.map((tab) => {
                const isActive = filter === tab.key
                const count =
                  tab.key === 'all' ? testCases.length
                  : tab.key === 'pass' ? passCount
                  : tab.key === 'fail' ? failCount
                  : notRunCount
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilter(tab.key)}
                    className={`px-3 py-1 text-[13px] rounded transition-colors duration-150
                      ${isActive ? 'bg-surface-container text-primary font-medium' : 'text-on-surface-variant hover:text-primary'}
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ring-offset-2`}
                  >
                    {tab.label}
                    <span className="ml-1.5 font-mono text-[12px] opacity-60">{count}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2 ml-auto font-mono text-[12px]">
              {passCount > 0 && <span className="text-success">{passCount} pass</span>}
              {failCount > 0 && <span className="text-warning">{failCount} fail</span>}
              {notRunCount > 0 && <span className="text-on-surface-variant">{notRunCount} not run</span>}
            </div>
          </div>
        )}

        {/* Source material is now in the left rail — screen real estate returned to test cases */}

        {/* Test case list */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="sticky top-0 z-10 flex items-center gap-3 mb-4 px-3 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-rest">
              <span className="font-mono text-[12px] text-on-surface-variant">{selectedIds.size} selected</span>
              <button
                type="button"
                onClick={deselectAll}
                className="font-body-md text-[12px] text-on-surface-variant hover:text-primary underline underline-offset-2 transition-colors"
              >
                Deselect all
              </button>
              <span className="text-outline-variant" aria-hidden="true">|</span>
              <button
                type="button"
                onClick={() => setConfirmBulkDuplicate(true)}
                className="font-body-md text-[12px] text-primary hover:opacity-80 transition-opacity px-2 py-1"
              >
                Duplicate selected
              </button>
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(true)}
                className="font-body-md text-[12px] text-error hover:opacity-80 transition-opacity px-2 py-1"
              >
                Delete selected
              </button>
            </div>
          )}

          {testCases && testCases.length > 0 && selectedIds.size === 0 && !search && (
            <button
              type="button"
              onClick={selectAll}
              className="mb-4 font-body-md text-[12px] text-on-surface-variant hover:text-primary underline underline-offset-2 transition-colors"
            >
              Select all
            </button>
          )}

          {testCases && testCases.length === 0 && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-12 text-center shadow-rest">
              <Icon name="playlist-check" size={48} className="text-on-surface-variant/40 block mx-auto mb-4" />
              <p className="font-heading text-[20px] text-primary mb-2 font-semibold">No test cases yet</p>
              <p className="font-body-md text-on-surface-variant mb-6 max-w-sm mx-auto leading-relaxed">
                {session.status === 'draft'
                  ? 'Generate test cases from your requirements and screenshot, or add them manually.'
                  : 'Add test cases manually or go back to generate them from your requirements and screenshot.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                {session.status === 'draft' && session.requirements_text && (
                <button
                  type="button"
                  onClick={triggerGeneration}
                  disabled={generating}
                  className="bg-primary text-on-primary rounded-lg px-5 py-2 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold
                             hover:opacity-90 active:scale-[0.97] transition-all duration-150
                             disabled:opacity-40 disabled:cursor-not-allowed
                             flex items-center gap-2"
                >
                    {generating ? (
                      <svg className="animate-[spinner_600ms_linear_infinite]" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    ) : null}
                    {generating ? 'Generating…' : 'Generate test cases'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/sessions`)}
                  className="font-body-md text-[14px] text-primary underline underline-offset-2 hover:text-on-surface-variant transition-colors"
                >
                  Back to sessions
                </button>
              </div>
            </div>
          )}

          {filtered.length === 0 && testCases && testCases.length > 0 && (
            <div className="text-center py-16">
              <p className="font-body-md text-on-surface-variant">No test cases match this filter.</p>
              <button
                type="button"
                onClick={() => { setFilter('all'); setSearch('') }}
                className="mt-2 font-body-md text-[13px] text-primary underline underline-offset-2 hover:text-on-surface-variant"
              >
                Clear filters
              </button>
            </div>
          )}

          {filtered.length > 0 && (() => {
            const isFiltered = filter !== 'all' || !!search
            const content = (
              <>
                {isFiltered && (
                  <p className="mb-3 font-mono text-[11px] text-on-surface-variant/60">Drag disabled while filter is active</p>
                )}
                <div className={`space-y-2${staggerFiltered ? ' stagger-enter' : ''}`}>
                  {filtered.map((tc: TestCase, i: number) => (
                    <StaggerItem key={tc.id} index={i}><div id={`tc-${tc.id}`}>
                      <TestCaseRow
                        testCase={tc}
                        sessionId={sessionId!}
                        selected={selectedIds.has(tc.id)}
                        onToggleSelect={toggleSelect}
                        onDuplicate={(t) => duplicateMutation.mutate(t)}
                        onDelete={(id) => setDeleteTarget(id)}
                        onExecute={(_id) => navigate(`/sessions/${sessionId}/execute`)}
                      />
                    </div></StaggerItem>
                  ))}
                </div>
              </>
            )
            if (isFiltered) return content
            return (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filtered.map((tc) => tc.id)}
                  strategy={verticalListSortingStrategy}
                >
              <div className={`space-y-2${staggerSortable ? ' stagger-enter' : ''}`}>
                {filtered.map((tc: TestCase, i: number) => (
                  <StaggerItem key={tc.id} index={i}><div id={`tc-${tc.id}`}>
                    <TestCaseRow
                      testCase={tc}
                      sessionId={sessionId!}
                      selected={selectedIds.has(tc.id)}
                      onToggleSelect={toggleSelect}
                      onDuplicate={(t) => duplicateMutation.mutate(t)}
                      onDelete={(id) => setDeleteTarget(id)}
                      onExecute={(_id) => navigate(`/sessions/${sessionId}/execute`)}
                    />
                  </div></StaggerItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
            )
          })()}

          <button
            type="button"
            onClick={handleAdd}
            disabled={addMutation.isPending}
            className="mt-4 w-full py-3 border-2 border-dashed border-outline-variant/30 rounded-lg
                       text-[14px] text-on-surface-variant
                       hover:border-outline hover:text-primary
                       transition-all duration-150 ease-out
                       disabled:opacity-40 disabled:cursor-not-allowed
                       hover:bg-surface-container/30 active:scale-[0.98]"
          >
            {addMutation.isPending ? 'Adding…' : '+ Add test case'}
          </button>
        </div>

        <ConfirmDialog
          open={!!deleteTarget}
          title="Delete test case"
          message="Are you sure you want to delete this test case? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => {
            if (deleteTarget) handleDeleteOne(deleteTarget)
            setDeleteTarget(null)
          }}
          onCancel={() => setDeleteTarget(null)}
        />

        <ConfirmDialog
          open={confirmBulkDelete}
          title={`Delete ${selectedIds.size} test case${selectedIds.size > 1 ? 's' : ''}?`}
          message={`This will permanently delete ${selectedIds.size} test case${selectedIds.size > 1 ? 's' : ''}. This cannot be undone.`}
          confirmLabel="Delete all"
          onConfirm={() => {
            setConfirmBulkDelete(false)
            handleBulkDelete()
          }}
          onCancel={() => setConfirmBulkDelete(false)}
        />

        <ConfirmDialog
          open={confirmBulkDuplicate}
          title={`Duplicate ${selectedIds.size} test case${selectedIds.size > 1 ? 's' : ''}?`}
          message={`This will create ${selectedIds.size} additional test case${selectedIds.size > 1 ? 's' : ''} in this session.`}
          confirmLabel="Duplicate"
          onConfirm={() => {
            setConfirmBulkDuplicate(false)
            handleBulkDuplicate()
          }}
          onCancel={() => setConfirmBulkDuplicate(false)}
        />
      </div>

    </div>
  )
}
