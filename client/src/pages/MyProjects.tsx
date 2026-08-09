import { useNavigate } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMyProjects } from '@/hooks/useProjects'
import { ProjectsTable } from '@/components/ProjectsTable'
import { DataErrorState } from '@/components/DataErrorState'
import { Icon } from '@/components/Icon'

export function MyProjects() {
  useDocumentTitle('My Projects')
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useMyProjects()

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 bg-background">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-[24px] md:text-[28px] font-semibold text-primary mb-1">My Projects</h1>
            <p className="font-body-md text-[14px] text-on-surface-variant">
              Projects assigned to you across business units.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="px-4 py-2 font-heading text-[10px] uppercase tracking-[0.05em] font-semibold rounded-lg border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all flex items-center gap-1.5"
          >
            <Icon name="chevron-left" size={14} />
            All Projects
          </button>
        </div>

        {error && !isLoading && (
          <div className="mb-6">
            <DataErrorState message="Could not load your projects." onRetry={() => { refetch() }} />
          </div>
        )}

        <ProjectsTable
          projects={data?.projects ?? []}
          loading={isLoading}
          onView={(p) => navigate(`/projects/${p.id}`)}
        />
      </div>
    </div>
  )
}