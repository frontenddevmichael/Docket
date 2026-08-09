import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useProjects } from '@/hooks/useProjects'
import { useRole } from '@/hooks/useRole'
import { ProjectsTable } from '@/components/ProjectsTable'
import { DataErrorState } from '@/components/DataErrorState'
import { Icon } from '@/components/Icon'
import { csvFromRows, downloadCsv, type CsvColumn } from '@/lib/export'
import type { ProjectWithProfiles } from '@/types/database'

const STATUS_CARDS: { key: string; label: string }[] = [
  { key: 'requested', label: 'Requested' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'uat', label: 'UAT' },
  { key: 'completed', label: 'Completed' },
]

const EXPORT_COLUMNS: CsvColumn<ProjectWithProfiles>[] = [
  { key: 'name', header: 'Project Name' },
  { key: 'overview', header: 'Project Overview' },
  { key: 'business_segment', header: 'Business Segment' },
  { key: 'business_impact', header: 'Business Impact' },
  { key: 'delivery_category', header: 'Delivery Category' },
  { key: 'test_type', header: 'Test Type' },
  {
    key: 'tester',
    header: 'Tester',
    render: (p) => p.assigned_tester_profile?.full_name ?? p.assigned_tester_profile?.email ?? 'Unassigned',
  },
  { key: 'status', header: 'Status' },
  { key: 'start_date', header: 'Start Date' },
  { key: 'target_end_date', header: 'Target End Date' },
]

export function ProjectOverview() {
  useDocumentTitle('Projects')
  const navigate = useNavigate()
  const role = useRole()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error, refetch } = useProjects({ status: status || undefined, search: search || undefined, page })

  const counts = useMemo(() => {
    const base: Record<string, number> = {}
    for (const c of STATUS_CARDS) base[c.key] = 0
    return { ...base, ...(data?.counts ?? {}) }
  }, [data?.counts])

  const handleExport = () => {
    if (!data?.projects.length) return
    const csv = csvFromRows(data.projects, EXPORT_COLUMNS)
    downloadCsv(`projects-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 bg-background">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-[24px] md:text-[28px] text-primary mb-1 font-semibold">Projects</h1>
            <p className="font-body-md text-[14px] text-on-surface-variant">Track project requests, assignments, and status.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/projects/new')}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold flex items-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all duration-150 whitespace-nowrap"
          >
            <Icon name="add" size={18} />
            New Project
          </button>
        </div>

        {error && !isLoading && (
          <div className="mb-6">
            <DataErrorState message="Could not load projects." onRetry={() => { refetch() }} />
          </div>
        )}

        {/* Status count grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {STATUS_CARDS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                setStatus(c.key === status ? '' : c.key)
                setPage(1)
              }}
              className={`text-left bg-surface-container-lowest p-5 border rounded-lg shadow-rest transition-all duration-150 ${
                status === c.key ? 'border-amber-500/50 ring-2 ring-amber-500/20' : 'border-outline-variant/50 hover:border-outline/50'
              }`}
            >
              <div className="font-heading text-[10px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold mb-2">{c.label}</div>
              <div className="font-heading text-[24px] text-primary font-semibold">{counts[c.key] ?? 0}</div>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search by project name…"
                className="w-full pl-9 pr-3 py-2 text-[13px] bg-surface-container border border-outline-variant/30 rounded-lg text-primary placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="filter-list" size={16} className="text-on-surface-variant/60" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              className="px-3 py-2 text-[13px] bg-surface-container border border-outline-variant/30 rounded-lg text-primary outline-none focus:border-primary transition-colors"
            >
              <option value="">All statuses</option>
              {STATUS_CARDS.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
            <button
              type="button"
              onClick={handleExport}
              disabled={!data?.projects.length}
              className="px-3 py-2 font-heading text-[10px] uppercase tracking-[0.05em] font-semibold rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              <Icon name="download" size={14} />
              CSV
            </button>
          </div>
        </div>

        <ProjectsTable
          projects={data?.projects ?? []}
          loading={isLoading}
          onView={(p) => navigate(`/projects/${p.id}`)}
          onAssign={role.isManager ? () => navigate('/projects/assign') : undefined}
        />

        {(data?.total ?? 0) > 20 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <span className="font-mono text-[10px] text-on-surface-variant/50">Page {data?.page ?? 1} · {data?.total} project{(data?.total ?? 0) !== 1 ? 's' : ''}</span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={(data?.page ?? 1) <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-7 h-7 rounded-lg border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Icon name="chevron-left" size={14} />
              </button>
              <button
                type="button"
                disabled={(data?.page ?? 1) >= Math.ceil((data?.total ?? 0) / 20)}
                onClick={() => setPage((p) => p + 1)}
                className="w-7 h-7 rounded-lg border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Icon name="chevron-right" size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}