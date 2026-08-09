import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useProjects, useUpdateProject } from '@/hooks/useProjects'
import { useRole } from '@/hooks/useRole'
import { useToast } from '@/components/Toast'
import { ProjectsTable } from '@/components/ProjectsTable'
import { DataErrorState } from '@/components/DataErrorState'
import { Icon } from '@/components/Icon'
import { apiGet } from '@/lib/api'
import type { ProjectWithProfiles } from '@/types/database'

interface Member {
  user_id: string
  role: string
  profiles: { full_name: string | null; email: string | null } | null
}

export function AssignProjects() {
  useDocumentTitle('Assign Projects')
  const navigate = useNavigate()
  const role = useRole()
  const { toast } = useToast()
  const { data, isLoading, error, refetch } = useProjects({})
  const updateProject = useUpdateProject(undefined)
  const [assigning, setAssigning] = useState<ProjectWithProfiles | null>(null)
  const [selectedTester, setSelectedTester] = useState('')
  const [busy, setBusy] = useState(false)

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['workspace-members'],
    queryFn: () => apiGet<{ members: Member[]; workspace_id: string }>('/api/workspace/members'),
  })

  const assignable = (membersData?.members ?? []).filter((m) => m.role === 'tester' || m.role === 'developer')

  const openAssign = (p: ProjectWithProfiles) => {
    setAssigning(p)
    setSelectedTester(p.assigned_tester ?? '')
  }

  const confirmAssign = () => {
    if (!assigning || !selectedTester) return
    setBusy(true)
    updateProject.mutate(
      { assign_tester: selectedTester },
      {
        onSuccess: () => {
          toast(`${assigning.name} assigned`, 'success')
          setAssigning(null)
          setBusy(false)
        },
        onError: (err: unknown) => {
          setBusy(false)
          toast(err instanceof Error ? err.message : 'Could not assign the project.', 'error')
        },
      },
    )
  }

  if (!role.isManager) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="max-w-md w-full text-center bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-8 shadow-rest">
          <Icon name="block" size={28} className="mx-auto text-warning mb-4" />
          <h1 className="font-heading text-[18px] text-primary font-semibold mb-2">Manager access required</h1>
          <p className="font-body-md text-[13px] text-on-surface-variant mb-6">
            Project assignment is restricted to workspace owners, admins, and managers.
          </p>
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold hover:opacity-90 transition-all"
          >
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 bg-background">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-[24px] md:text-[28px] font-semibold text-primary mb-1">Assign Projects</h1>
            <p className="font-body-md text-[14px] text-on-surface-variant">
              Assign testers to open project requests. Testers will be notified in their Inbox.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="px-4 py-2 font-heading text-[10px] uppercase tracking-[0.05em] font-semibold rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all flex items-center gap-1.5"
          >
            <Icon name="chevron-left" size={14} />
            Back
          </button>
        </div>

        {error && !isLoading && (
          <div className="mb-6">
            <DataErrorState message="Could not load projects for assignment." onRetry={() => { refetch() }} />
          </div>
        )}

        <ProjectsTable
          projects={data?.projects ?? []}
          loading={isLoading}
          onView={(p) => navigate(`/projects/${p.id}`)}
          onAssign={openAssign}
        />

        {/* Assign modal */}
        {assigning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAssigning(null)}>
            <div
              className="w-full max-w-md bg-surface-container-lowest rounded-lg shadow-float border border-outline-variant/30 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-1">
                <h2 className="font-heading text-[16px] font-semibold text-primary">Assign Tester</h2>
                <button type="button" onClick={() => setAssigning(null)} className="text-on-surface-variant hover:text-primary transition-colors">
                  <Icon name="close" size={18} />
                </button>
              </div>
              <p className="font-body-md text-[13px] text-on-surface-variant mb-5">
                Select a tester for <span className="text-primary font-medium">{assigning.name}</span>. Their test type preference is shown if set.
              </p>
              {membersLoading ? (
                <div className="font-mono text-[11px] text-on-surface-variant/50 py-6 text-center">Loading members…</div>
              ) : assignable.length === 0 ? (
                <div className="font-mono text-[11px] text-warning py-6 text-center">No testers or developers in this workspace.</div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto mb-5">
                  {assignable.map((m) => (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => setSelectedTester(m.user_id)}
                      className={`text-left px-3.5 py-2.5 rounded-lg border transition-all ${
                        selectedTester === m.user_id
                          ? 'border-primary bg-primary/5'
                          : 'border-outline-variant/30 hover:border-outline/50'
                      }`}
                    >
                      <div className="font-body-md text-[13px] text-primary">
                        {m.profiles?.full_name || m.profiles?.email || 'Unnamed user'}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.05em] text-on-surface-variant">{m.role}</div>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssigning(null)}
                  className="px-4 py-2.5 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold text-on-surface-variant hover:bg-surface-container transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmAssign}
                  disabled={!selectedTester || busy}
                  className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {busy ? <Icon name="sync" size={15} className="animate-spin" /> : <Icon name="person-add" size={15} />}
                  {busy ? 'Assigning…' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}