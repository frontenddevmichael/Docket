import { useState, useEffect, useRef } from 'react'
import { Icon } from '@/components/Icon'
import { supabase } from '@/lib/supabase'
import type { ActivityLog } from '@/types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface ActivityRow extends ActivityLog {
  profiles?: { email: string; full_name: string | null } | null
}

async function fetchActivity(sessionId: string): Promise<ActivityRow[]> {
  const { data, error: fetchError } = await supabase
    .from('activity_log')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (fetchError) throw fetchError

  const userIds = [...new Set((data ?? []).map(r => r.user_id))]
  if (userIds.length === 0) return (data ?? []) as ActivityRow[]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))
  return (data ?? []).map(a => ({
    ...a,
    profiles: profileMap.get(a.user_id) ?? null,
  })) as ActivityRow[]
}

async function fetchProfile(userId: string): Promise<ActivityRow['profiles']> {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', userId)
    .single()
  return data
}

export function ActivityTimeline({ sessionId }: { sessionId: string }) {
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    async function load() {
      try {
        const rows = await fetchActivity(sessionId)
        if (mountedRef.current) setActivity(rows)
      } catch {
        if (mountedRef.current) setError('Could not load activity')
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }

    load()

    /* ── Realtime subscription (gracefully degraded) ── */
    let realtimeOk = false

    const sub = supabase
      .channel(`activity-${sessionId}`)
      .on<ActivityRow>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<ActivityRow>) => {
          realtimeOk = true
          const newRow = payload.new as ActivityRow
          if (!newRow || !mountedRef.current) return

          fetchProfile(newRow.user_id)
            .then(profile => {
              if (mountedRef.current) {
                setActivity(prev => [{ ...newRow, profiles: profile ?? null }, ...prev].slice(0, 50))
              }
            })
            .catch(() => {
              if (mountedRef.current) {
                setActivity(prev => [newRow, ...prev].slice(0, 50))
              }
            })
        }
      )
      .subscribe((status: string) => {
        // CHANNEL_ERROR / TIMED_OUT = realtime unavailable (local dev, Supabase free tier, etc.)
        // No warning — just fall through to the polling fallback below.
        if (status === 'SUBSCRIBED') realtimeOk = true
      })

    /* ── Polling fallback (only active when realtime is down) ── */
    const checkTimeout = setTimeout(() => {
      if (!realtimeOk && mountedRef.current) {
        const POLL_INTERVAL = 15_000

        async function poll() {
          if (!mountedRef.current) return
          try {
            const rows = await fetchActivity(sessionId)
            if (mountedRef.current) setActivity(rows)
          } catch {
            // Silently ignore poll errors
          }
        }

        // Poll less frequently when the tab is hidden
        function getEffectiveInterval() {
          return document.hidden ? POLL_INTERVAL * 4 : POLL_INTERVAL
        }

        pollRef.current = setInterval(poll, getEffectiveInterval())

        const handleVisibilityChange = () => {
          if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = setInterval(poll, getEffectiveInterval())
          }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
      }
    }, 10_000)

    return () => {
      mountedRef.current = false
      clearTimeout(checkTimeout)
      if (pollRef.current) clearInterval(pollRef.current)
      supabase.removeChannel(sub)
    }
  }, [sessionId])

  const actionLabel = (action: string): string => {
    const map: Record<string, string> = {
      'assigned': 'assigned session',
      'unassigned': 'removed assignment',
      'generated': 'generated test cases',
      'status_change': 'changed status',
      'test_case_added': 'added test case',
      'test_case_updated': 'updated test case',
      'test_case_deleted': 'deleted test case',
    }
    return map[action] || action.replace(/_/g, ' ')
  }

  const actionIcon = (action: string): string => {
    const map: Record<string, string> = {
      'assigned': 'person-add',
      'unassigned': 'close',
      'generated': 'auto-awesome',
      'status_change': 'swap',
      'test_case_added': 'add',
      'test_case_updated': 'edit',
      'test_case_deleted': 'trash',
    }
    return map[action] || 'info'
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 bg-surface-container rounded skeleton-shimmer" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h4 className="font-heading text-[10px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold mb-3">Activity</h4>
        <p className="text-[11px] text-on-surface-variant/50 italic">{error}</p>
      </div>
    )
  }

  if (activity.length === 0) {
    return (
      <div>
        <h4 className="font-heading text-[10px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold mb-3">Activity</h4>
        <p className="text-[11px] text-on-surface-variant/40 italic">No activity yet</p>
      </div>
    )
  }

  return (
    <div>
      <h4 className="font-heading text-[10px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold mb-3">Activity</h4>
      <div className="space-y-2">
        {activity.map(a => (
          <div key={a.id} className="flex items-start gap-2 text-[11px]">
            <div className="w-5 h-5 rounded-full bg-surface-container-higher flex items-center justify-center shrink-0 mt-0.5">
              <Icon name={actionIcon(a.action) as any} size={10} className="text-on-surface-variant" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-primary">
                <span className="font-medium">{a.profiles?.full_name || a.profiles?.email || 'Someone'}</span>
                {' '}{actionLabel(a.action)}
                {String((a.details as Record<string, unknown>)?.assigned_name ?? '') && <span> to <span className="font-medium">{String((a.details as Record<string, unknown>).assigned_name)}</span></span>}
              </div>
              <div className="text-on-surface-variant/50 font-mono">
                {new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
