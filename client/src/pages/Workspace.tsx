import { useStaggerOnce } from '@/hooks/useStaggerOnce'
import { StaggerItem } from '@/components/react-bits/StaggerItem'
import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useSessionsWithStats, type SessionWithStats } from '@/hooks/useSessionsWithStats'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Icon } from '@/components/Icon'
import { DataErrorState } from '@/components/DataErrorState'

interface SessionGroup {
  label: string
  sessions: SessionWithStats[]
}

function formatDuration(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function groupSessionsByWeek(sessions: SessionWithStats[]): SessionGroup[] {
  const groups = new Map<string, SessionWithStats[]>()

  for (const s of sessions) {
    const d = new Date(s.created_at)
    const startOfWeek = new Date(d)
    startOfWeek.setDate(d.getDate() - d.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const key = startOfWeek.toISOString().slice(0, 10)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(s)
  }

  const now = new Date()
  const thisWeekStart = new Date(now)
  thisWeekStart.setDate(now.getDate() - now.getDay())
  thisWeekStart.setHours(0, 0, 0, 0)

  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const result: SessionGroup[] = []
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a))

  for (const key of sortedKeys) {
    const groupDate = new Date(key)
    let label: string
    if (groupDate.getTime() === thisWeekStart.getTime()) {
      label = 'This week'
    } else if (groupDate.getTime() === lastWeekStart.getTime()) {
      label = 'Last week'
    } else if (groupDate >= thisMonthStart) {
      label = groupDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    } else {
      label = groupDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
    result.push({ label, sessions: groups.get(key)!.sort((a, b) => b.created_at.localeCompare(a.created_at)) })
  }

  return result
}

function getSessionColor(s: { status: string; passCount: number; failCount: number }): string {
  if (s.status === 'complete') return s.failCount > 0 ? 'bg-warning' : 'bg-success'
  if (s.status === 'executing' || s.status === 'generating') return 'bg-primary'
  return 'bg-outline-variant'
}

function statusBadge(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'complete': return { label: 'Complete', bg: 'bg-success/10', text: 'text-success' }
    case 'executing': return { label: 'Running', bg: 'bg-primary/8', text: 'text-primary' }
    case 'generating': return { label: 'Generating', bg: 'bg-primary/8', text: 'text-primary' }
    case 'ready': return { label: 'Ready', bg: 'bg-surface-container-high', text: 'text-on-surface-variant' }
    default: return { label: 'Draft', bg: 'bg-outline-variant/20', text: 'text-on-surface-variant/60' }
  }
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full h-1 bg-outline-variant/20 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function renderTimelineSession(
  s: SessionWithStats,
  expandedNotes: Record<string, boolean>,
  noteTexts: Record<string, string>,
  setNoteTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  toggleNote: (id: string) => void,
  navigate: ReturnType<typeof useNavigate>,
  customGroups: SessionTagGroup[],
  _getSessionGroup: (id: string) => SessionTagGroup | undefined,
  toggleSessionGroup: (sessionId: string, groupId: string | null) => void,
) {
  const executedCount = s.passCount + s.failCount + s.blockedCount
  const badge = statusBadge(s.status)
  const hasScreenshot = !!s.screenshot_url
  const hasRequirements = !!s.requirements_text?.trim()

  return (
    <div key={s.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-4 shadow-rest hover:shadow-elevated transition-all duration-200 group">
      {/* Top row: title + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => navigate(`/sessions/${s.id}`)}
              className="font-mono text-[13px] text-primary font-medium truncate block hover:underline text-left"
            >
              {s.title}
            </button>
            <span className={`font-mono text-[8px] uppercase tracking-[0.06em] px-1.5 py-0.5 rounded ${badge.bg} ${badge.text} font-semibold shrink-0`}>
              {badge.label}
            </span>
          </div>

          {/* Metadata row: icons for screenshot, requirements, test count, timestamps */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
            {hasScreenshot && (
              <span className="flex items-center gap-1 font-mono text-[9px] text-on-surface-variant/50" title="Screenshot attached">
                <Icon name="image" size={11} />
                <span>screen</span>
              </span>
            )}
            {hasRequirements && (
              <span className="flex items-center gap-1 font-mono text-[9px] text-on-surface-variant/50" title="Requirements attached">
                <Icon name="description" size={11} />
                <span>PRD</span>
              </span>
            )}
            <span className="font-mono text-[9px] text-on-surface-variant/50">
              {s.testCount} test{s.testCount !== 1 ? 's' : ''}
            </span>
            <span className="font-mono text-[9px] text-on-surface-variant/40">
              created {formatDuration(s.created_at)}
            </span>
            {s.updated_at !== s.created_at && (
              <span className="font-mono text-[9px] text-on-surface-variant/30">
                updated {formatDuration(s.updated_at)}
              </span>
            )}
          </div>

          {/* Results row */}
          {s.testCount > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <ProgressBar value={executedCount} max={s.testCount} color={s.failCount > 0 ? 'bg-warning' : 'bg-success'} />
              <span className="font-mono text-[9px] text-on-surface-variant/50 whitespace-nowrap">
                {executedCount}/{s.testCount}
              </span>
            </div>
          )}
          {(s.passCount > 0 || s.failCount > 0 || s.blockedCount > 0) && (
            <div className="flex items-center gap-2 mt-1.5">
              {s.passCount > 0 && <span className="font-mono text-[9px] text-success">{s.passCount} passed</span>}
              {s.failCount > 0 && <span className="font-mono text-[9px] text-warning">{s.failCount} failed</span>}
              {s.blockedCount > 0 && <span className="font-mono text-[9px] text-on-surface-variant/50">{s.blockedCount} blocked</span>}
              {(s.keptCount > 0 || s.editedCount > 0) && (
                <span className="font-mono text-[9px] text-on-surface-variant/30 ml-auto">
                  {s.keptCount > 0 && `${s.keptCount} kept`}
                  {s.keptCount > 0 && s.editedCount > 0 && ' · '}
                  {s.editedCount > 0 && `${s.editedCount} edited`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Group assignment dropdown */}
          <div className="relative group/dropdown">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); const dd = e.currentTarget.nextElementSibling; if (dd) dd.classList.toggle('hidden') }}
              className="p-1.5 text-on-surface-variant/40 hover:text-primary opacity-0 group-hover:opacity-100 transition-all duration-150 rounded hover:bg-surface-container"
              title="Move to group"
            >
              <Icon name="folder" size={14} />
            </button>
            <div className="hidden absolute right-0 top-full mt-1 bg-surface-container-lowest border border-outline-variant/50 rounded-lg shadow-elevated z-20 min-w-[140px] py-1 animate-[fadeIn_100ms_ease-out]">
              <div className="px-3 py-1.5 font-heading text-[9px] uppercase tracking-[0.08em] text-on-surface-variant/40 font-semibold">
                Assign group
              </div>
              {customGroups.map((g) => {
                const isInGroup = g.sessionIds.includes(s.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleSessionGroup(s.id, isInGroup ? null : g.id)}
                    className={`w-full text-left px-3 py-1.5 font-mono text-[11px] transition-colors flex items-center gap-2 ${
                      isInGroup ? 'text-primary bg-surface-container' : 'text-on-surface-variant hover:bg-surface-container/50'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${
                      isInGroup ? 'bg-primary border-primary' : 'border-outline-variant'
                    }`}>
                      {isInGroup && <span className="text-on-primary text-[8px]">✓</span>}
                    </span>
                    {g.name}
                  </button>
                )
              })}
              {customGroups.length === 0 && (
                <div className="px-3 py-2 font-mono text-[10px] text-on-surface-variant/50 italic">
                  No groups yet
                </div>
              )}
            </div>
          </div>
          {/* Notes toggle */}
          <button
            type="button"
            onClick={() => toggleNote(s.id)}
            className={`p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-150 rounded hover:bg-surface-container ${
              expandedNotes[s.id] ? 'text-primary' : 'text-on-surface-variant/40 hover:text-primary'
            }`}
            title="Notes"
          >
            <Icon name="note" size={14} />
          </button>
        </div>
      </div>

      {/* Expandable notes */}
      {expandedNotes[s.id] && (
        <div className="mt-3 pt-3 border-t border-outline-variant/20 animate-[fadeIn_150ms_ease-out]">
          <textarea
            value={noteTexts[s.id] ?? ''}
            onChange={(e) => setNoteTexts((t) => ({ ...t, [s.id]: e.target.value }))}
            onBlur={() => noteTexts[s.id] !== undefined && saveNote(s.id, noteTexts[s.id])}
            placeholder="Add notes about this session..."
            rows={2}
            className="w-full bg-surface-container border border-outline-variant/30 rounded px-3 py-2 font-mono text-[11px] text-primary placeholder:text-on-surface-variant/30 resize-none focus:outline-none focus:ring-1 focus:ring-focus-ring"
          />
        </div>
      )}
    </div>
  )
}

function CalendarView({ sessions, month, year, onPrevMonth, onNextMonth, onSessionClick }: {
  sessions: SessionWithStats[]
  month: number
  year: number
  onPrevMonth: () => void
  onNextMonth: () => void
  onSessionClick: (id: string) => void
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0=Sun
  const today = new Date()
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year

  // Map sessions to their day-of-month
  const sessionsByDay = new Map<number, typeof sessions>()
  for (const s of sessions) {
    const d = new Date(s.created_at)
    if (d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate()
      if (!sessionsByDay.has(day)) sessionsByDay.set(day, [])
      sessionsByDay.get(day)!.push(s)
    }
  }

  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  // Convert Sunday-first to Monday-first offset
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-rest overflow-hidden animate-[fadeIn_200ms_ease-out]">
      {/* Month header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/30">
        <button type="button" onClick={onPrevMonth} className="p-1 text-on-surface-variant hover:text-primary transition-colors" aria-label="Previous month">
          <Icon name="chevron-left" size={16} />
        </button>
        <span className="font-heading text-[13px] text-primary font-semibold">{monthName}</span>
        <button type="button" onClick={onNextMonth} className="p-1 text-on-surface-variant hover:text-primary transition-colors" aria-label="Next month">
          <Icon name="chevron-right" size={16} />
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-outline-variant/30">
        {days.map((d) => (
          <div key={d} className="px-1 py-2 text-center font-heading text-[9px] uppercase tracking-[0.08em] text-on-surface-variant/50 font-semibold">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum = i - startOffset + 1
          const isValid = dayNum >= 1 && dayNum <= daysInMonth
          const daySessions = isValid ? sessionsByDay.get(dayNum) ?? [] : []
          const isToday = isValid && isCurrentMonth && dayNum === today.getDate()

          return (
            <div
              key={i}
              className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-outline-variant/20 p-1.5 overflow-hidden
                ${!isValid ? 'bg-surface-container/30' : 'hover:bg-surface-container/50 transition-colors'}
                ${isToday ? 'bg-surface-container/70 ring-1 ring-inset ring-outline-variant/40' : ''}`}
            >
              {isValid && (
                <>
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-mono mb-1
                    ${isToday ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant'}`}
                  >
                    {dayNum}
                  </span>
                  <div className="space-y-1">
                    {daySessions.slice(0, 3).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onSessionClick(s.id)}
                        className="w-full text-left flex items-center gap-1 px-1 py-0.5 rounded hover:bg-surface-container-highest/50 transition-colors group"
                        title={s.title}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getSessionColor(s)}`} />
                        <span className="font-mono text-[8px] sm:text-[9px] text-on-surface-variant truncate leading-tight group-hover:text-primary transition-colors">
                          {s.title}
                        </span>
                      </button>
                    ))}
                    {daySessions.length > 3 && (
                      <span className="block font-mono text-[8px] text-on-surface-variant/60 pl-2">
                        +{daySessions.length - 3} more
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface SessionTagGroup {
  id: string
  name: string
  sessionIds: string[]
}

function loadGroups(): SessionTagGroup[] {
  try { return JSON.parse(localStorage.getItem('ws-groups') ?? '[]') } catch { return [] }
}

function saveGroups(groups: SessionTagGroup[]) {
  try { localStorage.setItem('ws-groups', JSON.stringify(groups)) } catch {}
}

function loadNote(sessionId: string): string {
  try { return localStorage.getItem(`ws-note-${sessionId}`) ?? '' } catch { return '' }
}

function saveNote(sessionId: string, text: string) {
  try { localStorage.setItem(`ws-note-${sessionId}`, text) } catch {}
}

export function Workspace() {
  const staggerStats = useStaggerOnce('workspace-stats')
  const staggerTimeline = useStaggerOnce('workspace-timeline')
  useDocumentTitle('Workspace')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { data: pageData, isLoading, error } = useSessionsWithStats(0, 50)
  const sessions = pageData?.sessions
  const { toast } = useToast()
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})
  const [noteTexts, setNoteTexts] = useState<Record<string, string>>({})
  const [showQuickSession, setShowQuickSession] = useState(false)
  const [quickTitle, setQuickTitle] = useState('')
  const [quickCreating, setQuickCreating] = useState(false)
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline')
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear())

  // Custom session groups
  const [customGroups, setCustomGroups] = useState<SessionTagGroup[]>(() => loadGroups())
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editingGroupName, setEditingGroupName] = useState('')

  const persistGroups = (groups: SessionTagGroup[]) => {
    setCustomGroups(groups)
    saveGroups(groups)
  }

  const createGroup = () => {
    const name = newGroupName.trim()
    if (!name) return
    const newGroup: SessionTagGroup = {
      id: `g-${Date.now()}`,
      name,
      sessionIds: [],
    }
    persistGroups([...customGroups, newGroup])
    setNewGroupName('')
    setShowCreateGroup(false)
    toast(`Group "${name}" created`, 'success')
  }

  const renameGroup = (id: string) => {
    const name = editingGroupName.trim()
    if (!name) return
    persistGroups(customGroups.map((g) => g.id === id ? { ...g, name } : g))
    setEditingGroupId(null)
    setEditingGroupName('')
    toast('Group renamed', 'info')
  }

  const deleteGroup = (id: string) => {
    const group = customGroups.find((g) => g.id === id)
    if (!group) return
    persistGroups(customGroups.filter((g) => g.id !== id))
    toast(`Group "${group.name}" deleted`, 'info')
  }

  const toggleSessionGroup = (sessionId: string, groupId: string | null) => {
    // Remove session from all groups first
    const updated = customGroups.map((g) => ({
      ...g,
      sessionIds: g.sessionIds.filter((id) => id !== sessionId),
    }))
    if (groupId) {
      // Add to the selected group
      const target = updated.find((g) => g.id === groupId)
      if (target) target.sessionIds.push(sessionId)
    }
    persistGroups(updated)
  }

  const getSessionGroup = (sessionId: string): SessionTagGroup | undefined => {
    return customGroups.find((g) => g.sessionIds.includes(sessionId))
  }

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? ''

  const handleQuickSession = useCallback(async () => {
    const title = quickTitle.trim()
    if (!title || !user || quickCreating) return
    setQuickCreating(true)

    try {
      // Find or create a workspace for the user
      let workspaceId: string
      const { data: existing } = await supabase
        .from('workspaces')
        .select('id')
        .eq('created_by', user.id)
        .limit(1)
        .maybeSingle()

      if (existing) {
        workspaceId = existing.id
      } else {
        const { data: newWs, error: wsError } = await supabase
          .from('workspaces')
          .insert({ name: 'My Workspace', created_by: user.id })
          .select()
          .single()
        if (wsError || !newWs) throw wsError ?? new Error('Failed to create workspace')
        workspaceId = newWs.id
      }

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          title,
          workspace_id: workspaceId,
          requirements_text: '',
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast(`"${title}" created`, 'success')
      setShowQuickSession(false)
      setQuickTitle('')
      queryClient.invalidateQueries({ queryKey: ['sessions-with-stats'] })
      navigate(`/sessions/${data.id}`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create session', 'error')
    } finally {
      setQuickCreating(false)
    }
  }, [quickTitle, user, quickCreating, toast, queryClient, navigate])

  const totalSessions = sessions?.length ?? 0
  const totalTests = sessions?.reduce((sum, s) => sum + s.testCount, 0) ?? 0
  const totalPasses = sessions?.reduce((sum, s) => sum + s.passCount, 0) ?? 0
  const totalFails = sessions?.reduce((sum, s) => sum + s.failCount, 0) ?? 0
  const totalExecuted = sessions?.reduce((sum, s) => sum + s.passCount + s.failCount + s.blockedCount, 0) ?? 0
  const passRate = totalTests > 0 ? Math.round((totalPasses / totalTests) * 100) : 0
  const execRate = totalTests > 0 ? Math.round((totalExecuted / totalTests) * 100) : 0
  const recentSessions = sessions?.slice(0, 5) ?? []

  const groups = useMemo(() => sessions ? groupSessionsByWeek(sessions) : [], [sessions])

  const toggleNote = (id: string) => {
    setExpandedNotes((prev) => {
      const next = { ...prev }
      if (next[id]) {
        // Save on collapse
        if (noteTexts[id] !== undefined) saveNote(id, noteTexts[id])
        delete next[id]
      } else {
        next[id] = true
        setNoteTexts((t) => ({ ...t, [id]: loadNote(id) }))
      }
      return next
    })
  }

  // Flatten custom groups + week groups into one array so stagger indices
  // match the visual DOM order (custom groups first, then week groups).
  const flatTimelineItems = useMemo(() => {
    if (!sessions) return []
    const items: Array<
      | { type: 'custom'; group: SessionTagGroup; sessions_: SessionWithStats[] }
      | { type: 'week'; label: string; sessions_: SessionWithStats[] }
    > = []

    // Custom groups first
    for (const group of customGroups) {
      const groupSessions = sessions.filter((s) => group.sessionIds.includes(s.id))
      if (groupSessions.length === 0) continue
      items.push({ type: 'custom', group, sessions_: groupSessions })
    }

    // Then week-based ungrouped sessions
    for (const weekGroup of groups) {
      const ungrouped = weekGroup.sessions.filter(
        (s) => !customGroups.find((g) => g.sessionIds.includes(s.id)),
      )
      if (ungrouped.length === 0) continue
      items.push({ type: 'week', label: weekGroup.label, sessions_: ungrouped })
    }

    return items
  }, [customGroups, groups, sessions])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 bg-background">
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div className="flex-1">
            <h1 className="font-heading text-[28px] md:text-[32px] text-primary mb-1">Workspace</h1>
            <p className="font-body-md text-[14px] text-on-surface-variant">
              {displayName ? `${displayName}'s workspace` : 'Your workspace'} — {totalSessions} session{totalSessions !== 1 ? 's' : ''} across {groups.length} period{groups.length !== 1 ? 's' : ''}.
            </p>
          </div>
          {!showQuickSession ? (
            <button
              type="button"
              onClick={() => setShowQuickSession(true)}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold flex items-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all duration-150 whitespace-nowrap shrink-0 self-start"
            >
              <Icon name="add" size={16} />
              Quick Session
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0 self-start animate-[fadeIn_150ms_ease-out]">
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleQuickSession(); if (e.key === 'Escape') { setShowQuickSession(false); setQuickTitle('') } }}                placeholder="Session title..."
                                autoFocus
                                disabled={quickCreating}
                                className="w-48 px-3 py-2 font-body-md text-[13px] bg-surface-container border border-outline-variant rounded-lg
                                           text-primary placeholder:text-on-surface-variant/50
                                           focus:outline-none focus:ring-2 focus:ring-focus-ring ring-offset-2
                                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleQuickSession}
                disabled={quickCreating || !quickTitle.trim()}
                className="bg-primary text-on-primary px-3 py-2 rounded-lg font-heading text-[10px] uppercase tracking-[0.05em] font-semibold
                           hover:opacity-90 active:scale-[0.97] transition-all duration-150
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {quickCreating ? (
                  <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Create'
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowQuickSession(false); setQuickTitle('') }}
                className="p-2 text-on-surface-variant hover:text-primary transition-colors"
                aria-label="Cancel"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
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
            {/* Timeline-shaped card skeletons */}
            <div className="space-y-6">
              {/* Group header skeleton */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 rounded-full bg-outline-variant/30" />
                  <div className="h-3 w-24 bg-surface-container-highest rounded skeleton-shimmer" />
                </div>
                <div className="space-y-3 pl-5 border-l-2 border-outline-variant/15">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-4 skeleton-shimmer"
                         style={{ animationDelay: `${j * 80}ms` }}>
                      {/* Title row */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-4 w-3/5 bg-surface-container-highest rounded" />
                        <div className="h-3 w-14 bg-surface-container-highest rounded" />
                      </div>
                      {/* Metadata row */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-2.5 w-12 bg-surface-container-highest rounded" />
                        <div className="h-2.5 w-10 bg-surface-container-highest rounded" />
                        <div className="h-2.5 w-16 bg-surface-container-highest rounded" />
                      </div>
                      {/* Progress bar */}
                      <div className="h-2 w-full bg-surface-container-highest rounded mb-2" />
                      {/* Results row */}
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-14 bg-surface-container-highest rounded" />
                        <div className="h-2.5 w-10 bg-surface-container-highest rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {error && (
          <DataErrorState
            message="Could not load workspace data. Please check your connection and try again."
            onRetry={() => queryClient.invalidateQueries({ queryKey: ['sessions-with-stats'] })}
          />
        )}

        {!isLoading && !error && (
          <>
            {/* Stats Overview */}
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-8${staggerStats ? ' stagger-enter' : ''}`}>
              <StaggerItem index={0}><div className="bg-surface-container-lowest p-6 border border-outline-variant/50 rounded-lg shadow-rest card-interactive">
                <div className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold mb-4">Total Sessions</div>
                <div className="font-heading text-[24px] text-primary font-semibold">{totalSessions}</div>
                <div className="font-mono text-[11px] text-on-surface-variant mt-2">
                  {totalSessions > 0 ? `${totalTests} test cases` : 'No sessions yet'}
                </div>
              </div></StaggerItem>
              <StaggerItem index={1}><div className="bg-surface-container-lowest p-6 border border-outline-variant/50 rounded-lg shadow-rest card-interactive">
                <div className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold mb-4">Pass Rate</div>
                <div className="font-heading text-[24px] text-primary font-semibold">{passRate}%</div>
                <div className="font-mono text-[11px] text-on-surface-variant mt-2">
                  {totalPasses} of {totalTests} passed
                </div>
              </div></StaggerItem>
              <StaggerItem index={2}><div className="bg-surface-container-lowest p-6 border border-outline-variant/50 rounded-lg shadow-rest card-interactive">
                <div className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold mb-4">Failures</div>
                <div className="font-heading text-[24px] font-semibold" style={{ color: totalFails > 0 ? 'var(--color-warning)' : 'var(--color-primary)' }}>
                  {totalFails}
                </div>
                <div className="font-mono text-[11px] text-on-surface-variant mt-2">
                  {totalFails > 0 ? 'Needs review' : 'All clear'}
                </div>
              </div></StaggerItem>
              <StaggerItem index={3}><div className="bg-surface-container-lowest p-6 border border-outline-variant/50 rounded-lg shadow-rest card-interactive">
                <div className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold mb-4">Tests Executed</div>
                <div className="font-heading text-[24px] text-primary font-semibold">{execRate}%</div>
                <div className="font-mono text-[11px] text-on-surface-variant mt-2">
                  {totalExecuted} of {totalTests} executed
                </div>
                <div className="w-full h-1 bg-outline-variant/20 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-success rounded-full transition-all duration-700" style={{ width: `${execRate}%` }} />
                </div>
              </div></StaggerItem>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Timeline / Calendar */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-[16px] md:text-[18px] text-primary font-semibold flex items-center gap-2">
                    <Icon name="schedule" size={18} className="text-on-surface-variant" />
                    {viewMode === 'timeline' ? 'Activity Timeline' : 'Calendar View'}
                  </h2>
                  <div className="flex items-center gap-1 bg-surface-container rounded-lg p-0.5 border border-outline-variant/30">
                    <button
                      type="button"
                      onClick={() => setViewMode('timeline')}
                      className={`px-3 py-1 rounded text-[10px] font-heading uppercase tracking-[0.05em] font-semibold transition-all ${
                        viewMode === 'timeline'
                          ? 'bg-surface-container-lowest text-primary shadow-rest'
                          : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      Timeline
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('calendar')}
                      className={`px-3 py-1 rounded text-[10px] font-heading uppercase tracking-[0.05em] font-semibold transition-all ${
                        viewMode === 'calendar'
                          ? 'bg-surface-container-lowest text-primary shadow-rest'
                          : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      Calendar
                    </button>
                  </div>
                </div>

                {viewMode === 'calendar' && (
                  <CalendarView
                    sessions={sessions ?? []}
                    month={calendarMonth}
                    year={calendarYear}
                    onPrevMonth={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear((y) => y - 1) } else setCalendarMonth((m) => m - 1) }}
                    onNextMonth={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear((y) => y + 1) } else setCalendarMonth((m) => m + 1) }}
                    onSessionClick={(id) => navigate(`/sessions/${id}`)}
                  />
                )}

                {viewMode === 'timeline' && (
                  <>
                {sessions && sessions.length === 0 && (
                  <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-10 text-center shadow-rest">
                    <Icon name="dashboard" size={48} className="text-on-surface-variant/30 block mx-auto mb-3" />
                    <p className="font-body-md text-on-surface-variant">No sessions yet. Create your first session to populate your workspace.</p>
                  </div>
                )}

                {sessions && sessions.length > 0 && (
                  <div className={`space-y-6${staggerTimeline ? ' stagger-enter' : ''}`}>
                    {flatTimelineItems.map((item, i) => {
                      if (item.type === 'custom') {
                        const isExpanded = (expandedNotes[`group-${item.group.id}`] ?? true)
                        return (
                          <StaggerItem key={item.group.id} index={i}><div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => toggleNote(`group-${item.group.id}`)}
                              className="w-full flex items-center gap-3 group/divider"
                            >
                              <div className="h-px flex-1 bg-outline-variant/30" />
                              <span className="font-heading text-[10px] uppercase tracking-[0.08em] text-primary/80 font-semibold shrink-0 flex items-center gap-1.5">
                                <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={12} />
                                {item.group.name}
                              </span>
                              <span className="font-mono text-[9px] text-on-surface-variant/50">{item.sessions_.length}</span>
                              <div className="h-px flex-1 bg-outline-variant/30" />
                              <div className="flex items-center gap-1 opacity-0 group-hover/divider:opacity-100 transition-opacity">
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => { e.stopPropagation(); setEditingGroupId(item.group.id); setEditingGroupName(item.group.name) }}
                                  className="p-0.5 text-on-surface-variant/50 hover:text-primary transition-colors cursor-pointer"
                                  title="Rename group"
                                >
                                  <Icon name="edit" size={12} />
                                </span>
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => { e.stopPropagation(); deleteGroup(item.group.id) }}
                                  className="p-0.5 text-on-surface-variant/50 hover:text-warning transition-colors cursor-pointer"
                                  title="Delete group"
                                >
                                  <Icon name="delete" size={12} />
                                </span>
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="space-y-2 animate-[fadeIn_150ms_ease-out]">
                                {item.sessions_.map((s) => renderTimelineSession(s, expandedNotes, noteTexts, setNoteTexts, toggleNote, navigate, customGroups, getSessionGroup, toggleSessionGroup))}
                              </div>
                            )}
                            {/* Inline rename */}
                            {editingGroupId === item.group.id && (
                              <div className="flex items-center gap-2 px-2 animate-[fadeIn_150ms_ease-out]">
                                <input
                                  type="text"
                                  value={editingGroupName}
                                  onChange={(e) => setEditingGroupName(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') renameGroup(item.group.id); if (e.key === 'Escape') setEditingGroupId(null) }}
                                  className="flex-1 px-2 py-1 font-mono text-[11px] bg-surface-container border border-outline-variant/30 rounded
                                             text-primary placeholder:text-on-surface-variant/50
                                             focus:outline-none focus:ring-1 focus:ring-focus-ring"
                                  autoFocus
                                  placeholder="New name..."
                                />
                                <button
                                  type="button"
                                  onClick={() => renameGroup(item.group.id)}
                                  className="font-heading text-[9px] uppercase tracking-[0.05em] text-primary font-semibold hover:opacity-70 transition-opacity"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingGroupId(null)}
                                  className="font-mono text-[10px] text-on-surface-variant/50 hover:text-primary transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div></StaggerItem>
                        )
                      }
                      return (
                        <StaggerItem key={`week-${item.label}`} index={i}><div>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-px flex-1 bg-outline-variant/30" />
                            <span className="font-heading text-[10px] uppercase tracking-[0.08em] text-on-surface-variant/60 font-semibold shrink-0">
                              {item.label}
                            </span>
                            <span className="font-mono text-[9px] text-on-surface-variant/50">{item.sessions_.length}</span>
                            <div className="h-px flex-1 bg-outline-variant/30" />
                          </div>
                          <div className="space-y-2">
                            {item.sessions_.map((s) => renderTimelineSession(s, expandedNotes, noteTexts, setNoteTexts, toggleNote, navigate, customGroups, getSessionGroup, toggleSessionGroup))}
                          </div>
                        </div></StaggerItem>
                      )
                    })}
                  </div>
                )}
                </>
                )}
              </div>

              {/* Right sidebar — Quick info */}
              <div className="space-y-6">
                {/* Groups Panel */}
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-5 shadow-rest">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold">Session Groups</h3>
                    {!showCreateGroup && (
                      <button
                        type="button"
                        onClick={() => setShowCreateGroup(true)}
                        className="text-on-surface-variant hover:text-primary transition-colors p-0.5"
                        title="Create group"
                      >
                        <Icon name="add" size={14} />
                      </button>
                    )}
                  </div>

                  {/* Create group inline */}
                  {showCreateGroup && (
                    <div className="flex items-center gap-2 mb-3 animate-[fadeIn_150ms_ease-out]">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') createGroup(); if (e.key === 'Escape') { setShowCreateGroup(false); setNewGroupName('') } }}
                        placeholder="Group name..."
                        autoFocus
                        className="flex-1 px-2 py-1.5 font-mono text-[11px] bg-surface-container border border-outline-variant/30 rounded
                                   text-primary placeholder:text-on-surface-variant/50
                                   focus:outline-none focus:ring-1 focus:ring-focus-ring"
                      />
                      <button
                        type="button"
                        onClick={createGroup}
                        disabled={!newGroupName.trim()}
                        className="font-heading text-[9px] uppercase tracking-[0.05em] text-primary font-semibold disabled:opacity-30 hover:opacity-70 transition-opacity"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCreateGroup(false); setNewGroupName('') }}
                        className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <Icon name="close" size={12} />
                      </button>
                    </div>
                  )}

                  {/* Group list */}
                  <div className="space-y-1">
                    {customGroups.length === 0 && (
                      <p className="font-mono text-[10px] text-on-surface-variant/40 italic py-1">
                        No groups yet. Create one to organize your sessions.
                      </p>
                    )}
                    {customGroups.map((g) => {
                      const count = sessions?.filter((s) => g.sessionIds.includes(s.id)).length ?? 0
                      return (
                        <div key={g.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-surface-container transition-colors group/row">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon name="folder" size={12} className="text-on-surface-variant/50 shrink-0" />
                            <span className="font-mono text-[11px] text-on-surface-variant truncate">{g.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-[9px] text-on-surface-variant/40">{count}</span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={() => deleteGroup(g.id)}
                              className="p-0.5 text-on-surface-variant/30 hover:text-warning opacity-0 group-hover/row:opacity-100 transition-all cursor-pointer"
                              title={`Delete ${g.name}`}
                            >
                              <Icon name="delete" size={11} />
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-5 shadow-rest">
                  <h3 className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => navigate('/sessions/new')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 bg-primary text-on-primary rounded font-heading text-[10px] uppercase tracking-[0.05em] font-semibold hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                    >
                      <Icon name="add" size={14} />
                      New Session
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/sessions')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:text-primary bg-surface-container hover:bg-surface-container-higher rounded font-heading text-[10px] uppercase tracking-[0.05em] font-semibold transition-all duration-150"
                    >
                      <Icon name="assignment" size={14} />
                      View All Sessions
                    </button>
                  </div>
                </div>

                {/* Recent Sessions */}
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-5 shadow-rest">
                  <h3 className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {recentSessions.length === 0 && (
                      <p className="font-mono text-[11px] text-on-surface-variant">No recent activity.</p>
                    )}
                    {recentSessions.map((s) => {
                      const executed = s.passCount + s.failCount + s.blockedCount
                      const badge = statusBadge(s.status)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => navigate(`/sessions/${s.id}`)}
                          className="w-full text-left flex items-center gap-3 px-2 py-1.5 rounded hover:bg-surface-container transition-colors group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                s.status === 'complete' ? (s.failCount > 0 ? 'bg-warning' : 'bg-success')
                                : s.status === 'executing' || s.status === 'generating' ? 'bg-primary'
                                : 'bg-outline-variant'
                              }`} />
                              <span className="font-mono text-[11px] text-primary truncate">{s.title}</span>
                              <span className={`font-mono text-[7px] uppercase tracking-[0.06em] px-1 py-0.5 rounded ${badge.bg} ${badge.text} font-semibold shrink-0`}>
                                {badge.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[9px] text-on-surface-variant/60">{formatDuration(s.updated_at)}</span>
                              {s.testCount > 0 && (
                                <span className="font-mono text-[9px] text-on-surface-variant/40">
                                  {executed}/{s.testCount} done
                                </span>
                              )}
                            </div>
                            {s.testCount > 0 && (
                              <div className="w-full h-0.5 bg-outline-variant/15 rounded-full overflow-hidden mt-1">
                                <div className={`h-full rounded-full transition-all ${s.failCount > 0 ? 'bg-warning' : 'bg-success'}`}
                                     style={{ width: `${Math.round((executed / s.testCount) * 100)}%` }} />
                              </div>
                            )}
                            {(s.screenshot_url || s.requirements_text?.trim()) && (
                              <div className="flex items-center gap-1 mt-0.5">
                                {s.screenshot_url && <Icon name="image" size={9} className="text-on-surface-variant/30" />}
                                {!!s.requirements_text?.trim() && <Icon name="description" size={9} className="text-on-surface-variant/30" />}
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-5 shadow-rest">
                  <h3 className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold mb-4">Session Summary</h3>
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Complete</span>
                      <span className="text-primary font-medium">{sessions?.filter((s) => s.status === 'complete').length ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">In Progress</span>
                      <span className="text-primary font-medium">{sessions?.filter((s) => s.status === 'executing' || s.status === 'generating').length ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Draft</span>
                      <span className="text-primary font-medium">{sessions?.filter((s) => s.status === 'draft').length ?? 0}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-outline-variant/30">
                      <span className="text-on-surface-variant font-semibold">Total</span>
                      <span className="text-primary font-semibold">{totalSessions}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
