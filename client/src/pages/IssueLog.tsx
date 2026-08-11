import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/components/Toast'
import { Icon } from '@/components/Icon'
import {
  useProjectIssueLog,
  useCreateIssue,
  useCreateBlocker,
  useCreateObservation,
  useUpdateIssue,
  useUpdateObservation,
  useUpdateBlocker,
  useSendIssueDraft,
} from '@/hooks/useIssueLog'
import type { Issue, Blocker, ProjectWithProfiles } from '@/types/database'

const SEVERITIES = ['critical', 'high', 'medium', 'low']
const PRIORITIES = ['high', 'medium', 'low']

interface MemberOption {
  user_id: string
  role: string
  profiles?: { id: string; email: string; full_name: string | null } | null
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-4 ${accent ? 'border-l-4' : ''}`} style={accent ? { borderLeftColor: '#C77D25' } : undefined}>
      <div className="font-heading text-[10px] uppercase tracking-[0.05em] text-[#8C8C84] font-semibold">{label}</div>
      <div className={`font-heading text-[26px] font-semibold ${accent ? 'text-[#C77D25]' : 'text-[#1C1C1A]'}`}>{value}</div>
    </div>
  )
}

function DistributionBar({ values, colors }: { values: { label: string; value: number }[]; colors: string[] }) {
  const total = values.reduce((a, b) => a + b.value, 0)
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={v.label} className="flex items-center gap-3">
          <span className="w-24 font-mono text-[11px] text-[#5C5C56]">{v.label}</span>
          <div className="flex-1 h-2 bg-[#EEEEEC] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${total > 0 ? (v.value / total) * 100 : 0}%`, backgroundColor: colors[i % colors.length] }} />
          </div>
          <span className="w-8 text-right font-mono text-[11px] text-[#5C5C56]">{v.value}</span>
        </div>
      ))}
    </div>
  )
}

export function IssueLog() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  useDocumentTitle('Issue Log')

  const { data, isLoading } = useProjectIssueLog(projectId)
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiGet<{ project: ProjectWithProfiles }>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  })
  const { data: members } = useQuery({
    queryKey: ['workspace', 'members'],
    queryFn: () => apiGet<{ members: MemberOption[] }>('/api/workspace/members'),
  })

  const createIssue = useCreateIssue(projectId)
  const createBlocker = useCreateBlocker(projectId)
  const createObservation = useCreateObservation(projectId)
  const updateIssue = useUpdateIssue(projectId)
  const updateObservation = useUpdateObservation(projectId)
  const updateBlocker = useUpdateBlocker(projectId)
  const sendDraft = useSendIssueDraft(projectId)

  const [issueForm, setIssueForm] = useState<Record<string, string>>({})
  const [blockerForm, setBlockerForm] = useState<Record<string, string>>({})
  const [observationForm, setObservationForm] = useState<Record<string, string>>({})
  const [enrichFromFailed, setEnrichFromFailed] = useState<string | null>(null)

  const projectName = project?.project.name ?? data?.project.name ?? 'Project'
  useDocumentTitle(`Issue Log: ${projectName}`)

  const failedCases = data?.failedCases ?? []
  const issues = data?.issues ?? []
  const blockers = data?.blockers ?? []
  const observations = data?.observations ?? []

  const openIssues = issues.filter((i) => i.status === 'open')
  const closedIssues = issues.filter((i) => i.status === 'closed')
  const totalDefects = failedCases.length + issues.length

  const severityDist = SEVERITIES.map((sev) => ({
    label: sev,
    value: failedCases.filter((c) => (c.severity ?? 'medium') === sev).length + issues.filter((i) => (i.severity ?? 'medium') === sev).length,
  }))
  const priorityDist = PRIORITIES.map((pri) => ({
    label: pri,
    value: failedCases.filter((c) => (c.priority ?? 'medium') === pri).length + issues.filter((i) => (i.priority ?? 'medium') === pri).length,
  }))

  const submitIssue = () => {
    const title = (issueForm.title ?? '').trim()
    if (!title) {
      toast('Issue title is required', 'error')
      return
    }
    createIssue.mutate({
      title,
      details: issueForm.details || undefined,
      severity: issueForm.severity || undefined,
      priority: issueForm.priority || undefined,
      assigned_developer: issueForm.assigned_developer || undefined,
      duration_of_impact: issueForm.duration_of_impact || undefined,
      test_case_id: enrichFromFailed ?? undefined,
    }, {
      onSuccess: () => { toast('Issue added', 'success'); setIssueForm({}); setEnrichFromFailed(null) },
      onError: (err: any) => toast(err?.message || 'Failed to add issue', 'error'),
    })
  }

  const submitBlocker = () => {
    const title = (blockerForm.title ?? '').trim()
    if (!title) {
      toast('Blocker title is required', 'error')
      return
    }
    createBlocker.mutate({ title, details: blockerForm.details || undefined }, {
      onSuccess: () => { toast('Blocker added', 'success'); setBlockerForm({}) },
      onError: (err: any) => toast(err?.message || 'Failed to add blocker', 'error'),
    })
  }

  const submitObservation = () => {
    const content = (observationForm.content ?? '').trim()
    if (!content) {
      toast('Observation content is required', 'error')
      return
    }
    createObservation.mutate({ content }, {
      onSuccess: () => { toast('Observation added', 'success'); setObservationForm({}) },
      onError: (err: any) => toast(err?.message || 'Failed to add observation', 'error'),
    })
  }

  const toggleIssue = (issue: Issue) => {
    const next = issue.status === 'open' ? 'closed' : 'open'
    updateIssue.mutate({ id: issue.id, status: next }, {
      onSuccess: () => toast(`Issue ${next === 'closed' ? 'closed' : 'reopened'}`, 'success'),
      onError: (err: any) => toast(err?.message || 'Failed to update issue', 'error'),
    })
  }

  const toggleBlocker = (blocker: Blocker) => {
    const next = blocker.status === 'open' ? 'closed' : 'open'
    updateBlocker.mutate({ id: blocker.id, status: next }, {
      onSuccess: () => toast(`Blocker ${next === 'closed' ? 'closed' : 'reopened'}`, 'success'),
      onError: (err: any) => toast(err?.message || 'Failed to update blocker', 'error'),
    })
  }

  const memberName = (id?: string | null) => {
    if (!id) return '—'
    const m = members?.members.find((x) => x.user_id === id)
    return m?.profiles?.full_name || m?.profiles?.email || id.slice(0, 8)
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-[1280px] mx-auto space-y-4 skeleton-shimmer">
          <div className="h-10 w-72 bg-surface-container-highest rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-surface-container-lowest border border-outline-variant rounded-lg" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F7F6]">
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-[#DEDEDA]">
          <div>
            <button
              type="button"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="font-body-md text-[12px] text-[#5C5C56] hover:text-[#1C1C1A] mb-2 flex items-center gap-1 transition-colors"
            >
              <Icon name="chevron-left" size={14} /> Back to project
            </button>
            <h1 className="font-heading text-[24px] md:text-[32px] text-[#1C1C1A]">Issue Log</h1>
            <p className="font-body-md text-[13px] text-[#5C5C56] mt-1">{projectName}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => sendDraft.mutate('developer', {
                onSuccess: (r: any) => toast(`Draft sent to ${r.sent} developer${r.sent === 1 ? '' : 's'}`, 'success'),
                onError: (err: any) => toast(err?.message || 'Failed to send draft', 'error'),
              })}
              disabled={sendDraft.isPending || openIssues.length === 0}
              className="bg-[#1C1C1A] text-[#F7F7F6] rounded-lg px-4 py-2 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-40"
            >
              {sendDraft.isPending ? 'Sending\u2026' : 'Save draft → Developer'}
            </button>
          </div>
        </div>

        {/* Defect summary */}
        <div className="mb-8">
          <h2 className="font-heading text-[18px] text-[#1C1C1A] font-semibold mb-4">Defect Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Defects" value={totalDefects} />
            <StatCard label="Open" value={openIssues.length + failedCases.filter((c) => !issues.some((i) => i.test_case_id === c.id)).length} accent />
            <StatCard label="Closed" value={closedIssues.length} />
            <StatCard label="Reopened" value={failedCases.filter((c) => c.status === 'reopened').length} />
            <StatCard label="N/A / UAT" value={issues.filter((i) => ['not_applicable', 'controlled_live', 'uat'].includes((i as any).status ?? '')).length + failedCases.filter((c) => ['controlled_live', 'uat'].includes(c.status)).length} />
          </div>
        </div>

        {/* Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-5">
            <h3 className="font-heading text-[14px] text-[#1C1C1A] font-semibold mb-4">Distribution by Severity</h3>
            <DistributionBar values={severityDist} colors={['#C77D25', '#1C1C1A', '#8C8C84', '#DEDEDA']} />
          </div>
          <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-5">
            <h3 className="font-heading text-[14px] text-[#1C1C1A] font-semibold mb-4">Distribution by Priority</h3>
            <DistributionBar values={priorityDist} colors={['#C77D25', '#1C1C1A', '#8C8C84']} />
          </div>
        </div>

        {/* Failed test cases (auto-derived) */}
        {failedCases.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#DEDEDA]">
              <h2 className="font-heading text-[18px] text-[#1C1C1A] font-semibold">Failed Test Cases</h2>
              <button
                type="button"
                onClick={() => setEnrichFromFailed((cur) => cur === null ? '__all__' : null)}
                className="font-body-md text-[12px] text-[#5C5C56] hover:text-[#1C1C1A] underline underline-offset-2 transition-colors"
              >
                Auto-add as issues
              </button>
            </div>
            <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg overflow-hidden">
              {failedCases.map((tc) => (
                <div key={tc.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#DEDEDA] last:border-0">
                  <span className={`font-mono text-[10px] uppercase tracking-[0.05em] px-1.5 py-0.5 rounded font-semibold
                    ${tc.status === 'fail' ? 'bg-[#F3E4D0] text-[#C77D25]' : 'bg-[#EEEEEC] text-[#5C5C56]'}`}>
                    {tc.status}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-[13px] text-[#1C1C1A] truncate">{tc.title}</p>
                    {tc.module && <p className="font-mono text-[11px] text-[#8C8C84]">{tc.module} · sev {tc.severity ?? 'medium'} · pri {tc.priority ?? 'medium'}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setIssueForm((f) => ({ ...f, title: tc.title })); setEnrichFromFailed(tc.id) }}
                    className="font-heading text-[10px] uppercase tracking-[0.05em] font-semibold border border-[#DEDEDA] px-2.5 py-1 rounded-lg text-[#1C1C1A] hover:bg-[#EEEEEC] transition-colors"
                  >
                    Log issue
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issues breakdown */}
        <div className="mb-8">
          <h2 className="font-heading text-[18px] text-[#1C1C1A] font-semibold mb-4 pb-2 border-b border-[#DEDEDA]">Open Issues</h2>
          <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-4 mb-4 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                value={issueForm.title ?? ''}
                onChange={(e) => setIssueForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Issue title *"
                className="md:col-span-2 px-3 py-2 font-body-md text-[13px] bg-[#EEEEEC] border border-[#DEDEDA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C77D25]/40"
              />
              <input
                value={issueForm.duration_of_impact ?? ''}
                onChange={(e) => setIssueForm((f) => ({ ...f, duration_of_impact: e.target.value }))}
                placeholder="Duration of impact (e.g. 2h / since 09:00)"
                className="px-3 py-2 font-body-md text-[13px] bg-[#EEEEEC] border border-[#DEDEDA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C77D25]/40"
              />
              <select
                value={issueForm.assigned_developer ?? ''}
                onChange={(e) => setIssueForm((f) => ({ ...f, assigned_developer: e.target.value }))}
                className="px-3 py-2 font-body-md text-[13px] bg-[#EEEEEC] border border-[#DEDEDA] rounded-lg focus:outline-none text-[#1C1C1A]"
              >
                <option value="">Assign developer\u2026</option>
                {(members?.members ?? []).filter((m) => m.role === 'developer').map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.profiles?.email}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select
                value={issueForm.severity ?? ''}
                onChange={(e) => setIssueForm((f) => ({ ...f, severity: e.target.value }))}
                className="px-3 py-2 font-body-md text-[13px] bg-[#EEEEEC] border border-[#DEDEDA] rounded-lg focus:outline-none text-[#1C1C1A]"
              >
                <option value="">Severity\u2026</option>
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={issueForm.priority ?? ''}
                onChange={(e) => setIssueForm((f) => ({ ...f, priority: e.target.value }))}
                className="px-3 py-2 font-body-md text-[13px] bg-[#EEEEEC] border border-[#DEDEDA] rounded-lg focus:outline-none text-[#1C1C1A]"
              >
                <option value="">Priority\u2026</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button
                type="button"
                onClick={submitIssue}
                disabled={createIssue.isPending}
                className="bg-[#C77D25] text-white rounded-lg px-4 py-2 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-40"
              >
                {createIssue.isPending ? 'Adding\u2026' : '+ Add issue'}
              </button>
            </div>
            <textarea
              value={issueForm.details ?? ''}
              onChange={(e) => setIssueForm((f) => ({ ...f, details: e.target.value }))}
              placeholder="Details / reproduction steps\u2026"
              rows={2}
              className="w-full px-3 py-2 font-body-md text-[13px] bg-[#EEEEEC] border border-[#DEDEDA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C77D25]/40 resize-none"
            />
          </div>

          {issues.length === 0 ? (
            <p className="font-body-md text-[13px] text-[#8C8C84] italic">No issues logged yet.</p>
          ) : (
            <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg overflow-hidden">
              {issues.map((issue) => (
                <div key={issue.id} className="flex items-start gap-3 px-4 py-3 border-b border-[#DEDEDA] last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-mono text-[10px] uppercase tracking-[0.05em] px-2 py-0.5 rounded font-semibold ${issue.status === 'open' ? 'bg-[#F3E4D0] text-[#C77D25]' : 'bg-[#EEEEEC] text-[#5C5C56]'}`}>
                        {issue.status}
                      </span>
                      {issue.severity && <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#EEEEEC] text-[#5C5C56]">sev {issue.severity}</span>}
                      {issue.priority && <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#EEEEEC] text-[#5C5C56]">pri {issue.priority}</span>}
                      {issue.test_case?.source_ref && <span className="font-mono text-[10px] text-[#C77D25]">{issue.test_case.source_ref}</span>}
                    </div>
                    <p className="font-body-md text-[14px] text-[#1C1C1A] mt-1 font-medium">{issue.title}</p>
                    {issue.details && <p className="font-body-md text-[13px] text-[#5C5C56] mt-1 whitespace-pre-wrap">{issue.details}</p>}
                    <p className="font-mono text-[11px] text-[#8C8C84] mt-1">
                      Developer: {memberName(issue.assigned_developer)} · Opened {new Date(issue.opened_at).toLocaleDateString()}
                      {issue.duration_of_impact ? ` · Impact: ${issue.duration_of_impact}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleIssue(issue)}
                    disabled={updateIssue.isPending}
                    className="shrink-0 font-heading text-[10px] uppercase tracking-[0.05em] font-semibold border border-[#DEDEDA] px-2.5 py-1 rounded-lg hover:bg-[#EEEEEC] transition-colors disabled:opacity-40"
                  >
                    {issue.status === 'open' ? 'Close' : 'Reopen'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Blockers */}
        <div className="mb-8">
          <h2 className="font-heading text-[18px] text-[#1C1C1A] font-semibold mb-4 pb-2 border-b border-[#DEDEDA]">Blockers</h2>
          <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-4 mb-4 flex gap-2">
            <input
              value={blockerForm.title ?? ''}
              onChange={(e) => setBlockerForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Blocker title *"
              className="flex-1 px-3 py-2 font-body-md text-[13px] bg-[#EEEEEC] border border-[#DEDEDA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C77D25]/40"
            />
            <button
              type="button"
              onClick={submitBlocker}
              disabled={createBlocker.isPending}
              className="bg-[#1C1C1A] text-[#F7F7F6] rounded-lg px-4 py-2 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-40"
            >
              + Add blocker
            </button>
          </div>
          {blockers.length === 0 ? (
            <p className="font-body-md text-[13px] text-[#8C8C84] italic">No blockers.</p>
          ) : (
            <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg overflow-hidden">
              {blockers.map((blocker) => (
                <div key={blocker.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#DEDEDA] last:border-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${blocker.status === 'open' ? 'bg-[#C77D25]' : 'bg-[#8C8C84]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-[13px] text-[#1C1C1A]">{blocker.title}</p>
                    {blocker.details && <p className="font-mono text-[11px] text-[#8C8C84]">{blocker.details}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleBlocker(blocker)}
                    className="font-heading text-[10px] uppercase tracking-[0.05em] font-semibold border border-[#DEDEDA] px-2.5 py-1 rounded-lg hover:bg-[#EEEEEC] transition-colors"
                  >
                    {blocker.status === 'open' ? 'Close' : 'Reopen'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Observations */}
        <div>
          <h2 className="font-heading text-[18px] text-[#1C1C1A] font-semibold mb-4 pb-2 border-b border-[#DEDEDA]">Observations</h2>
          <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-4 mb-4 flex gap-2">
            <input
              value={observationForm.content ?? ''}
              onChange={(e) => setObservationForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="New observation\u2026"
              className="flex-1 px-3 py-2 font-body-md text-[13px] bg-[#EEEEEC] border border-[#DEDEDA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C77D25]/40"
            />
            <button
              type="button"
              onClick={submitObservation}
              disabled={createObservation.isPending}
              className="bg-[#1C1C1A] text-[#F7F7F6] rounded-lg px-4 py-2 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-40"
            >
              + Add observation
            </button>
          </div>
          {observations.length === 0 ? (
            <p className="font-body-md text-[13px] text-[#8C8C84] italic">No observations.</p>
          ) : (
            <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg overflow-hidden">
              {observations.map((obs) => (
                <div key={obs.id} className="px-4 py-3 border-b border-[#DEDEDA] last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-body-md text-[13px] text-[#1C1C1A] flex-1">{obs.content}</p>
                    <span className={`font-mono text-[10px] uppercase tracking-[0.05em] px-2 py-0.5 rounded shrink-0 ${obs.status === 'open' ? 'bg-[#F3E4D0] text-[#C77D25]' : 'bg-[#EEEEEC] text-[#5C5C56]'}`}>
                      {obs.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    <input
                      defaultValue={obs.developer_comment ?? ''}
                      placeholder="Developer comment\u2026"
                      onBlur={(e) => { if (e.target.value !== (obs.developer_comment ?? '')) updateObservation.mutate({ id: obs.id, developer_comment: e.target.value }, { onSuccess: () => toast('Saved', 'success') }) }}
                      className="px-2 py-1.5 font-mono text-[11px] bg-[#EEEEEC] border border-[#DEDEDA] rounded focus:outline-none focus:ring-2 focus:ring-[#C77D25]/40"
                    />
                    <input
                      defaultValue={obs.pm_comment ?? ''}
                      placeholder="PM/PO comment\u2026"
                      onBlur={(e) => { if (e.target.value !== (obs.pm_comment ?? '')) updateObservation.mutate({ id: obs.id, pm_comment: e.target.value }, { onSuccess: () => toast('Saved', 'success') }) }}
                      className="px-2 py-1.5 font-mono text-[11px] bg-[#EEEEEC] border border-[#DEDEDA] rounded focus:outline-none focus:ring-2 focus:ring-[#C77D25]/40"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}