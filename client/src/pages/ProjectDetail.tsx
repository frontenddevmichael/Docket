import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useProject, useAcceptProject, useRejectProject } from '@/hooks/useProjects'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { useRole } from '@/hooks/useRole'
import { StatusBadge } from '@/components/StatusBadge'
import { DataErrorState } from '@/components/DataErrorState'
import { Icon } from '@/components/Icon'
import { formatProjectDate } from '@/lib/format'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-heading text-[10px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-1">{label}</div>
      <div className={`font-body-md text-[13px] ${value ? 'text-primary' : 'text-on-surface-variant/40'} break-words`}>
        {value || '—'}
      </div>
    </div>
  )
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const role = useRole()
  const { data, isLoading, error, refetch } = useProject(id)
  const acceptProject = useAcceptProject(id)
  const rejectProject = useRejectProject(id)

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [busyAction, setBusyAction] = useState<'accept' | 'reject' | null>(null)

  const project = data?.project
  const isAssignedToMe = !!project && user?.id != null && project.assigned_tester === user.id
  const canRespond =
    isAssignedToMe && (project?.status === 'assigned' || project?.status === 'accepted')
  const title = project ? project.name : 'Project'

  useDocumentTitle(`Project · ${title.slice(0, 40)}`)

  const finish = (msg: string) => {
    setBusyAction(null)
    toast(msg, 'success')
    refetch()
  }

  const handleAccept = () => {
    if (!project) return
    setBusyAction('accept')
    acceptProject.mutate(undefined, {
      onSuccess: () => finish('Project accepted'),
      onError: (err: unknown) => {
        setBusyAction(null)
        toast(err instanceof Error ? err.message : 'Could not accept the project.', 'error')
      },
    })
  }

  const handleReject = () => {
    if (!project || !rejectReason.trim()) return
    setBusyAction('reject')
    rejectProject.mutate(rejectReason.trim(), {
      onSuccess: () => {
        setRejectOpen(false)
        finish('Project rejected')
      },
      onError: (err: unknown) => {
        setBusyAction(null)
        toast(err instanceof Error ? err.message : 'Could not reject the project.', 'error')
      },
    })
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 bg-background">
      <div className="max-w-[1080px] mx-auto">
        {error && !isLoading ? (
          <div className="max-w-md mx-auto mt-16">
            <DataErrorState message="Could not load this project." onRetry={() => { refetch() }} />
          </div>
        ) : !project ? (
          <div className="font-mono text-[12px] text-on-surface-variant/50 text-center mt-32">Loading project…</div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <button
                    type="button"
                    onClick={() => navigate('/projects')}
                    className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1.5 font-heading text-[10px] uppercase tracking-[0.05em] font-semibold"
                  >
                    <Icon name="chevron-left" size={14} />
                    Projects
                  </button>
                  <StatusBadge status={project.status} />
                </div>
                <h1 className="font-heading text-[22px] md:text-[28px] font-semibold text-primary">{project.name}</h1>
              </div>
              {role.isManager && (
                <button
                  type="button"
                  onClick={() => navigate('/projects/assign')}
                  className="px-4 py-2 font-heading text-[10px] uppercase tracking-[0.05em] font-semibold rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Icon name="person-add" size={14} />
                  Manage Assignment
                </button>
              )}
            </div>

            {/* Actions */}
            {canRespond && (
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-rest p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-body-md text-[14px] text-primary font-medium">
                    {project.status === 'assigned' ? 'You have been assigned to this project.' : 'This project has been accepted by you.'}
                  </div>
                  <div className="font-body-md text-[12px] text-on-surface-variant">
                    {project.status === 'assigned'
                      ? 'Accept to take ownership and generate the test suite, or reject with a reason.'
                      : 'Proceed to the test suite to start generating test cases.'}
                  </div>
                </div>
                <div className="flex gap-2.5">
                  {project.status === 'assigned' && (
                    <>
                      <button
                        type="button"
                        onClick={handleAccept}
                        disabled={busyAction !== null}
                        className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold flex items-center gap-2 hover:opacity-90 active:scale-[0.97] disabled:opacity-50 transition-all"
                      >
                        {busyAction === 'accept' ? <Icon name="sync" size={15} className="animate-spin" /> : <Icon name="check-circle" size={15} />}
                        Accept Project
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRejectReason(''); setRejectOpen(true) }}
                        disabled={busyAction !== null}
                        className="px-5 py-2.5 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold text-warning border border-warning/30 hover:bg-warning/10 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <Icon name="close" size={15} />
                        Reject
                      </button>
                    </>
                  )}
                  {data?.sessions?.[0] && (
                    <button
                      type="button"
                      onClick={() => navigate(`/sessions/${data.sessions![0].id}`)}
                      className="bg-surface-container text-primary px-5 py-2.5 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold flex items-center gap-2 hover:bg-surface-container-high transition-all border border-outline-variant/30"
                    >
                      <Icon name="play-arrow" size={15} />
                      Open Test Suite
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Details */}
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-rest p-6">
                  <h2 className="font-heading text-[12px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-4">Project Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2"><Field label="Overview" value={project.overview ?? ''} /></div>
                    <Field label="Project Type" value={project.project_type ?? ''} />
                    <Field label="Business Segment" value={project.business_segment ?? ''} />
                    <Field label="Delivery Category" value={project.delivery_category ?? ''} />
                    <Field label="Test Type" value={project.test_type ?? ''} />
                    <div className="md:col-span-2"><Field label="Business Impact" value={project.business_impact ?? ''} /></div>
                    <Field label="Start Date" value={formatProjectDate(project.start_date)} />
                    <Field label="Target End Date" value={formatProjectDate(project.target_end_date)} />
                    <Field label="Requested By" value={project.requested_by_profile?.full_name || project.requested_by_profile?.email || '—'} />
                    <Field label="Assigned Tester" value={project.assigned_tester_profile?.full_name || project.assigned_tester_profile?.email || 'Unassigned'} />
                    <div className="md:col-span-2">
                      <Field
                        label="Stakeholders"
                        value={(project.stakeholders as Array<{ name?: string; email?: string } | string> ?? [])
                          .map((s) => (typeof s === 'string' ? s : s.name))
                          .filter(Boolean)
                          .join(', ')}
                      />
                    </div>
                  </div>
                </div>

                {/* Requirement sessions */}
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-rest p-6">
                  <h2 className="font-heading text-[12px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-4">Requirement Sessions</h2>
                  {!data?.sessions?.length ? (
                    <p className="font-mono text-[11px] text-on-surface-variant/50">
                      No test requirement sessions yet{project.status === 'assigned' && ' — accept the project to create the first session.'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.sessions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => navigate(`/sessions/${s.id}`)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon name="assignment" size={16} className="text-primary shrink-0" />
                            <span className="font-body-md text-[13px] text-primary truncate">{s.title}</span>
                            <span className="font-mono text-[10px] text-on-surface-variant/50 shrink-0">{s.status}</span>
                          </div>
                          <span className="font-heading text-[10px] uppercase tracking-[0.05em] font-semibold text-on-surface-variant flex items-center gap-1 shrink-0">
                            Open <Icon name="chevron-right" size={12} />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Meta sidebar */}
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-rest p-6 h-fit">
                <h2 className="font-heading text-[12px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-4">Meta</h2>
                <div className="space-y-4">
                  <div>
                    <div className="font-heading text-[10px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-1">Project ID</div>
                    <div className="font-mono text-[11px] text-primary select-all">{project.id}</div>
                  </div>
                  <div>
                    <div className="font-heading text-[10px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-1">Status</div>
                    <StatusBadge status={project.status} />
                  </div>
                  <div>
                    <div className="font-heading text-[10px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-1">Created</div>
                    <div className="font-mono text-[11px] text-primary">{formatProjectDate(project.created_at)}</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Reject modal */}
      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setRejectOpen(false)}>
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-lg shadow-float border border-outline-variant/30 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <h2 className="font-heading text-[16px] font-semibold text-primary">Reject Project</h2>
              <button type="button" onClick={() => setRejectOpen(false)} className="text-on-surface-variant hover:text-primary transition-colors">
                <Icon name="close" size={18} />
              </button>
            </div>
            <p className="font-body-md text-[13px] text-on-surface-variant mb-4">
              Rejecting moves the project back to Unassigned. A reason helps the requester understand.
            </p>
            <label className="block font-heading text-[10px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-1.5">
              Reason *
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              autoFocus
              placeholder="e.g. Requirements are incomplete, please clarify scope…"
              className="w-full px-3 py-2 text-[13px] bg-surface-container border border-outline-variant/30 rounded-lg text-primary placeholder:text-on-surface-variant/40 outline-none focus:border-warning transition-colors resize-y"
            />
            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setRejectOpen(false)}
                className="px-4 py-2.5 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold text-on-surface-variant hover:bg-surface-container transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={!rejectReason.trim() || busyAction !== null}
                className="bg-warning text-surface px-5 py-2.5 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {busyAction === 'reject' ? <Icon name="sync" size={15} className="animate-spin" /> : <Icon name="close" size={15} />}
                {busyAction === 'reject' ? 'Rejecting…' : 'Reject Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}