import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SessionWithStats {
  id: string
  title: string
  status: string
  screenshot_url: string | null
  requirements_text: string
  created_at: string
  updated_at: string
  testCount: number
  passCount: number
  failCount: number
  blockedCount: number
  keptCount: number
  editedCount: number
  deletedCount: number
}

interface PaginatedResult {
  sessions: SessionWithStats[]
  totalCount: number
}

async function fetchSessionsWithStats(page: number, pageSize: number): Promise<PaginatedResult> {
  const from = page * pageSize
  const to = from + pageSize - 1

  const { data: sessions, error, count } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  const ids = sessions.map((s) => s.id)
  if (ids.length === 0) return { sessions: [], totalCount: count ?? 0 }

  const { data: testCases, error: tcError } = await supabase
    .from('test_cases')
    .select('session_id, status, feedback')
    .in('session_id', ids)

  if (tcError) throw tcError

  const stats = new Map<string, { total: number; pass: number; fail: number; blocked: number; kept: number; edited: number; deleted: number }>()
  for (const tc of testCases ?? []) {
    const s = stats.get(tc.session_id) ?? { total: 0, pass: 0, fail: 0, blocked: 0, kept: 0, edited: 0, deleted: 0 }
    s.total++
    if (tc.status === 'pass') s.pass++
    if (tc.status === 'fail') s.fail++
    if (tc.status === 'blocked') s.blocked++
    if (tc.feedback === 'kept') s.kept++
    if (tc.feedback === 'edited') s.edited++
    if (tc.feedback === 'deleted') s.deleted++
    stats.set(tc.session_id, s)
  }

  const result = sessions.map((s) => {
    const st = stats.get(s.id) ?? { total: 0, pass: 0, fail: 0, blocked: 0, kept: 0, edited: 0, deleted: 0 }
    return {
      id: s.id,
      title: s.title,
      status: s.status,
      screenshot_url: s.screenshot_url,
      requirements_text: s.requirements_text ?? '',
      created_at: s.created_at,
      updated_at: s.updated_at,
      testCount: st.total,
      passCount: st.pass,
      failCount: st.fail,
      blockedCount: st.blocked,
      keptCount: st.kept,
      editedCount: st.edited,
      deletedCount: st.deleted,
    }
  })

  return { sessions: result, totalCount: count ?? 0 }
}

export function useSessionsWithStats(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['sessions-with-stats', page, pageSize],
    queryFn: () => fetchSessionsWithStats(page, pageSize),
    staleTime: 30_000,
  })
}

export async function fetchAllSessionStats(): Promise<{
  totalSessions: number
  totalTests: number
  totalPasses: number
  totalFails: number
  totalKept: number
  totalEdited: number
  totalDeleted: number
  totalFeedback: number
  activeBlockers: number
}> {
  const { count: totalSessions, error: sessionError } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })

  if (sessionError) throw sessionError

  const { data: testCases, error: tcError } = await supabase
    .from('test_cases')
    .select('session_id, status, feedback')

  if (tcError) throw tcError

  let totalTests = 0
  let totalPasses = 0
  let totalFails = 0
  let totalKept = 0
  let totalEdited = 0
  let totalDeleted = 0
  let activeBlockers = 0

  const sessionBlockers = new Map<string, number>()
  for (const tc of testCases ?? []) {
    totalTests++
    if (tc.status === 'pass') totalPasses++
    if (tc.status === 'fail') totalFails++
    if (tc.feedback === 'kept') totalKept++
    if (tc.feedback === 'edited') totalEdited++
    if (tc.feedback === 'deleted') totalDeleted++
    if (tc.status === 'blocked') {
      sessionBlockers.set(tc.session_id, (sessionBlockers.get(tc.session_id) ?? 0) + 1)
    }
  }

  for (const [, count] of sessionBlockers) {
    if (count > 0) activeBlockers++
  }

  const totalFeedback = totalKept + totalEdited + totalDeleted

  return { totalSessions: totalSessions ?? 0, totalTests, totalPasses, totalFails, totalKept, totalEdited, totalDeleted, totalFeedback, activeBlockers }
}
