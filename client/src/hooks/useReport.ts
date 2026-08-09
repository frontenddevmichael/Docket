import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Report, TestCase, ExecutionEvidence } from '@/types/database'

async function fetchReports(sessionId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('session_id', sessionId)
    .order('version', { ascending: false })

  if (error) throw error
  return data
}

export function useReports(sessionId: string) {
  return useQuery({
    queryKey: ['reports', sessionId],
    queryFn: () => fetchReports(sessionId),
    enabled: !!sessionId,
  })
}

type SectionCommentary = {
  coverage: string
  failed: string
  notRun: string
  timeline: string
}

function generateSectionCommentary(
  _summary: { total: number; pass: number; fail: number; blocked: number; notRun: number; passRate: number },
  coverage: Record<string, { total: number; executed: number; passed: number }>,
  failedCases: { title: string; status: string }[],
  notRunCases: { title: string }[],
  evidenceTimeline: { executed_at: string; status: string }[]
): SectionCommentary {
  const coverageCommentary = (() => {
    const refs = Object.keys(coverage)
    if (refs.length === 0) return 'No requirement references were found in the generated test cases. Consider adding source references to track coverage against specific requirements or PRD sections.'
    const covered = refs.filter((r) => coverage[r].executed > 0).length
    const pct = Math.round((covered / refs.length) * 100)
    if (pct >= 90) return `Coverage across ${refs.length} requirement references is strong at ${pct}%. Most requirements have at least one executed test case. ${refs.filter((r) => coverage[r].passed === coverage[r].total).length} references have full pass coverage.`
    if (pct >= 50) return `Coverage stands at ${pct}% across ${refs.length} requirement references. ${refs.length - covered} references lack any executed test cases. Focus on closing gaps for: ${refs.filter((r) => coverage[r].executed === 0).slice(0, 3).join(', ')}.`
    return `Only ${pct}% of ${refs.length} requirement references have been reached. Priorities: ${refs.filter((r) => coverage[r].executed === 0).slice(0, 5).join(', ')} require immediate attention to improve traceability.`
  })()

  const failedCommentary = (() => {
    if (failedCases.length === 0) return 'No critical failures or blocked test cases were identified. All executed tests passed successfully.'
    const fails = failedCases.filter((f) => f.status === 'fail').length
    const blocks = failedCases.filter((f) => f.status === 'blocked').length
    const total = fails + blocks
    return `${total} test case${total > 1 ? 's' : ''} require${total === 1 ? 's' : ''} attention: ${fails} failed and ${blocks} blocked. Review the evidence for each case and determine whether these are genuine defects, environment issues, or test case inaccuracies. Top items: ${failedCases.slice(0, 3).map((f) => f.title).join(', ')}.`
  })()

  const notRunCommentary = (() => {
    if (notRunCases.length === 0) return 'All test cases have been executed. No remaining items in the pending queue.'
    return `${notRunCases.length} test case${notRunCases.length > 1 ? 's' : ''} ha${notRunCases.length === 1 ? 's' : 've'} not been executed. These should be reviewed for prioritization — some may be low-risk and skippable, while others may represent critical gaps. Pending: ${notRunCases.slice(0, 5).map((n) => n.title).join(', ')}${notRunCases.length > 5 ? ` and ${notRunCases.length - 5} more` : ''}.`
  })()

  const timelineCommentary = (() => {
    if (evidenceTimeline.length === 0) return 'No execution timeline data is available. Evidence was not captured during test execution.'
    const timeSpan = evidenceTimeline.length > 1
      ? `${new Date(evidenceTimeline[0].executed_at).toLocaleDateString()} – ${new Date(evidenceTimeline[evidenceTimeline.length - 1].executed_at).toLocaleDateString()}`
      : new Date(evidenceTimeline[0].executed_at).toLocaleDateString()
    const passCount = evidenceTimeline.filter((e) => e.status === 'pass').length
    const passPct = Math.round((passCount / evidenceTimeline.length) * 100)
    return `Execution ran from ${timeSpan} with ${evidenceTimeline.length} evidence entries recorded. The pass rate across timed entries is ${passPct}%. ${passPct >= 80 ? 'The overall execution trend is healthy.' : passPct >= 50 ? 'Several items need investigation to improve the pass rate.' : 'The majority of entries indicate failures or blockers requiring immediate review.'}`
  })()

  return { coverage: coverageCommentary, failed: failedCommentary, notRun: notRunCommentary, timeline: timelineCommentary }
}

export function useGenerateReport(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      testCases,
      sessionTitle,
      evidenceList,
      existingCommentary,
    }: {
      testCases: TestCase[]
      sessionTitle: string
      evidenceList?: ExecutionEvidence[]
      existingCommentary?: string
    }) => {
      const pass = testCases.filter((tc) => tc.status === 'pass').length
      const fail = testCases.filter((tc) => tc.status === 'fail').length
      const blocked = testCases.filter((tc) => tc.status === 'blocked').length
      const notRun = testCases.filter((tc) => tc.status === 'not_run').length
      const total = testCases.length
      const passRate = total > 0 ? Math.round((pass / total) * 100) : 0

      const summary = { total, pass, fail, blocked, notRun, passRate }

      const requirementsCoverage = testCases
        .filter((tc) => tc.source_ref)
        .reduce<Record<string, { total: number; executed: number; passed: number }>>(
          (acc, tc) => {
            const ref = tc.source_ref ?? 'unknown'
            if (!acc[ref]) acc[ref] = { total: 0, executed: 0, passed: 0 }
            acc[ref].total++
            if (tc.status !== 'not_run') acc[ref].executed++
            if (tc.status === 'pass') acc[ref].passed++
            return acc
          },
          {}
        )

      const failedCases = testCases
        .filter((tc) => tc.status === 'fail' || tc.status === 'blocked')
        .map((tc) => ({
          id: tc.id,
          title: tc.title,
          status: tc.status,
          source_ref: tc.source_ref,
          steps: tc.steps,
          expected_result: tc.expected_result,
          evidence: evidenceList?.filter((e) => e.test_case_id === tc.id).map((e) => ({
            id: e.id,
            screenshot_url: e.screenshot_url,
            notes: e.notes,
            executed_at: e.executed_at,
            executed_by: e.executed_by,
          })) ?? [],
        }))

      const notRunCases = testCases.filter((tc) => tc.status === 'not_run')

      const evidenceTimeline = (evidenceList ?? [])
        .filter((e) => e.executed_at)
        .sort((a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime())
        .map((e) => {
          const tc = testCases.find((t) => t.id === e.test_case_id)
          return { executed_at: e.executed_at, status: tc?.status ?? 'unknown' }
        })

      const sectionCommentary = generateSectionCommentary(summary, requirementsCoverage, failedCases, notRunCases, evidenceTimeline)

      const content = {
        title: sessionTitle,
        generatedAt: new Date().toISOString(),
        commentary: existingCommentary ?? '',
        sectionCommentary,
        summary,
        requirementsCoverage,
        failedCases,
        notRunCases: notRunCases.map((tc) => ({ id: tc.id, title: tc.title, source_ref: tc.source_ref })),
        evidenceTimeline,
        allTestCases: testCases.map((tc) => ({
          id: tc.id,
          title: tc.title,
          status: tc.status,
          source_ref: tc.source_ref,
          steps: tc.steps,
          expected_result: tc.expected_result,
        })),
      } satisfies Report['content']

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('workspace_id')
        .eq('id', sessionId)
        .single()

      if (sessionError) throw new Error(`Session lookup failed: ${sessionError.message}`)
      if (!session) throw new Error('Session not found')

      const { data: latest } = await supabase
        .from('reports')
        .select('version')
        .eq('session_id', sessionId)
        .order('version', { ascending: false })
        .limit(1)

      const version = (latest?.[0]?.version ?? 0) + 1

      const { data, error } = await supabase
        .from('reports')
        .insert({
          session_id: sessionId,
          workspace_id: session.workspace_id,
          content,
          version,
          generated_by: (await supabase.auth.getUser()).data.user!.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as Report
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', sessionId] })
    },
  })
}

export function useUpdateReportCommentary(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentary, sectionCommentary }: { commentary?: string; sectionCommentary?: SectionCommentary }) => {
      const { data: reports } = await supabase
        .from('reports')
        .select('*')
        .eq('session_id', sessionId)
        .order('version', { ascending: false })
        .limit(1)

      if (!reports || reports.length === 0) {
        throw new Error('No report found to update')
      }

      const report = reports[0]
      const updatedContent = {
        ...(report.content as Record<string, unknown>),
        ...(commentary !== undefined ? { commentary } : {}),
        ...(sectionCommentary !== undefined ? { sectionCommentary } : {}),
      }

      const { error } = await supabase
        .from('reports')
        .update({ content: updatedContent })
        .eq('id', report.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', sessionId] })
    },
  })
}

export type { SectionCommentary }
