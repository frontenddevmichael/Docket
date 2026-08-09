import { Icon } from '@/components/Icon'
import { StatusBadge } from '@/components/StatusBadge'
import { formatProjectDate } from '@/lib/format'
import type { ProjectWithProfiles } from '@/types/database'

interface ProjectsTableProps {
  projects: ProjectWithProfiles[]
  loading?: boolean
  onView: (project: ProjectWithProfiles) => void
  onAssign?: (project: ProjectWithProfiles) => void
}

export function ProjectsTable({ projects, loading, onView, onAssign }: ProjectsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant/30 bg-surface-container-lowest shadow-rest">
      <table className="w-full text-left min-w-[900px]">
        <thead>
          <tr className="border-b border-outline-variant/30">
            {['Name', 'Overview', 'Segment', 'Delivery', 'Test Type', 'Tester', 'Status', 'Start', 'End', ''].map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 font-heading text-[10px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={10} className="px-4 py-10 text-center font-mono text-[11px] text-on-surface-variant/50">
                Loading projects…
              </td>
            </tr>
          ) : projects.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-4 py-10 text-center font-mono text-[11px] text-on-surface-variant/50">
                No projects match.
              </td>
            </tr>
          ) : (
            projects.map((p) => (
              <tr key={p.id} className="border-b border-outline-variant/20 hover:bg-surface-container/40 transition-colors">
                <td className="px-4 py-3 font-body-md text-[13px] text-primary font-medium">{p.name}</td>
                <td className="px-4 py-3 font-body-md text-[12px] text-on-surface-variant max-w-[240px] truncate">{p.overview || '—'}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-on-surface-variant">{p.business_segment || '—'}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-on-surface-variant">{p.delivery_category || '—'}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-on-surface-variant">{p.test_type || '—'}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-on-surface-variant">
                  {p.assigned_tester_profile?.full_name || p.assigned_tester_profile?.email || 'Unassigned'}
                </td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 font-mono text-[11px] text-on-surface-variant">{formatProjectDate(p.start_date)}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-on-surface-variant">{formatProjectDate(p.target_end_date)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => onView(p)}
                      className="px-2.5 py-1 font-heading text-[10px] uppercase tracking-[0.05em] font-semibold rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all"
                    >
                      View
                    </button>
                    {onAssign && (
                      <button
                        type="button"
                        onClick={() => onAssign(p)}
                        className="px-2.5 py-1 font-heading text-[10px] uppercase tracking-[0.05em] font-semibold rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all flex items-center gap-1"
                      >
                        <Icon name="person-add" size={12} />
                        Assign
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}