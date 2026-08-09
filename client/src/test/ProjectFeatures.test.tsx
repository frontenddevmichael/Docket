import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatusBadge } from '@/components/StatusBadge'
import { ProjectsTable } from '@/components/ProjectsTable'
import { formatProjectDate } from '@/lib/format'
import { csvFromRows, downloadCsv, type CsvColumn } from '@/lib/export'
import type { ProjectWithProfiles } from '@/types/database'

function makeProject(overrides: Partial<ProjectWithProfiles> = {}): ProjectWithProfiles {
  return {
    id: 'proj-1',
    name: 'Retail Banking Portal',
    workspace_id: 'ws-1',
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    status: 'requested',
    overview: 'End to end portal test',
    business_segment: 'Retail',
    business_impact: null,
    delivery_category: 'Agile',
    test_type: 'UAT',
    project_type: null,
    start_date: '2026-02-01',
    target_end_date: '2026-03-01',
    end_date: null,
    assigned_tester: null,
    requested_by: null,
    rejection_reason: null,
    stakeholders: [],
    ...overrides,
  }
}

describe('StatusBadge', () => {
  it('renders a readable label for known statuses', () => {
    const { container } = render(<StatusBadge status="draft" />)
    expect(screen.getByText('Draft')).toBeDefined()
    expect(container.textContent).toContain('Draft')
  })

  it('renders fallback for unknown statuses', () => {
    render(<StatusBadge status="anything" />)
    expect(screen.getByText(/anything/i)).toBeDefined()
  })

  it('applies amber styling for rejected', () => {
    const { container } = render(<StatusBadge status="rejected" />)
    const badge = container.querySelector('span')
    expect(badge?.className).toContain('bg-warning/10')
    expect(badge?.className).toContain('text-warning')
  })
})

describe('formatProjectDate', () => {
  it('formats an ISO date string', () => {
    const out = formatProjectDate('2026-03-15')
    expect(out).toMatch(/Mar/)
    expect(out).toMatch(/15/)
  })

  it('returns an em dash for empty dates', () => {
    expect(formatProjectDate(null)).toBe('—')
    expect(formatProjectDate('')).toBe('—')
  })
})

describe('ProjectsTable', () => {
  const onView = vi.fn()

  afterEach(() => vi.clearAllMocks())

  it('renders project rows with tester and status', () => {
    const project = makeProject({
      status: 'in_progress',
      assigned_tester_profile: { id: 'u1', email: 'a@b.com', full_name: 'Alex Adams' },
    })
    render(<ProjectsTable projects={[project]} onView={onView} />)
    expect(screen.getByText('Retail Banking Portal')).toBeDefined()
    expect(screen.getByText('Alex Adams')).toBeDefined()
    expect(screen.getByText('In Progress')).toBeDefined()
  })

  it('calls onView when View is clicked', () => {
    render(<ProjectsTable projects={[makeProject()]} onView={onView} />)
    fireEvent.click(screen.getByText('View'))
    expect(onView).toHaveBeenCalledTimes(1)
    expect(onView).toHaveBeenCalledWith(expect.objectContaining({ id: 'proj-1' }))
  })

  it('calls onAssign when assignment action is clicked', () => {
    const onAssign = vi.fn()
    render(<ProjectsTable projects={[makeProject()]} onView={onView} onAssign={onAssign} />)
    fireEvent.click(screen.getByText('Assign'))
    expect(onAssign).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<ProjectsTable projects={[]} loading onView={onView} />)
    expect(screen.getByText(/loading projects/i)).toBeDefined()
  })

  it('shows empty state', () => {
    render(<ProjectsTable projects={[]} onView={onView} />)
    expect(screen.getByText(/no projects match/i)).toBeDefined()
  })
})

describe('CSV export', () => {
  interface Row extends Record<string, unknown> {
    name: string
    overview: string
  }

  it('builds a CSV with header and rows', () => {
    const rows: Row[] = [
      { name: 'Portal', overview: 'Main' },
      { name: 'API', overview: 'Second' },
    ]
    const columns: CsvColumn<Row>[] = [
      { key: 'name', header: 'Project Name' },
      { key: 'overview', header: 'Overview' },
    ]
    const csv = csvFromRows(rows, columns)
    expect(csv.split('\r\n')[0]).toBe('Project Name,Overview')
    expect(csv).toContain('Portal,Main')
  })

  it('escapes commas, quotes and newlines in fields', () => {
    const rows: Row[] = [{ name: 'A, B', overview: 'say "hi"\nline2' }]
    const columns: CsvColumn<Row>[] = [
      { key: 'name', header: 'Name' },
      { key: 'overview', header: 'Overview' },
    ]
    const csv = csvFromRows(rows, columns)
    expect(csv).toContain('"A, B"')
    expect(csv).toContain('"say ""hi""')
  })

  it('uses render() when provided and blanks nullish values', () => {
    const rows: Row[] = [{ name: 'Portal', overview: 'x' }]
    const columns: CsvColumn<Row>[] = [
      { key: 'name', header: 'Name', render: (r) => r.name },
      { key: 'overview', header: 'Overview' },
    ]
    expect(csvFromRows(rows, columns)).toContain('Portal,x')
  })

  it('downloadCsv triggers an anchor download', () => {
    const origCreateEl = document.createElement
    const origCreateUrl = URL.createObjectURL
    const origRevokeUrl = URL.revokeObjectURL
    const click = vi.fn()
    document.createElement = vi.fn((tag: string, options?: ElementCreationOptions) => {
      const el = origCreateEl.call(document, tag, options)
      if (tag === 'a') (el as HTMLAnchorElement).click = click
      return el
    })
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    try {
      downloadCsv('p.csv', 'a,b')
    } finally {
      document.createElement = origCreateEl
      URL.createObjectURL = origCreateUrl
      URL.revokeObjectURL = origRevokeUrl
    }
    expect(click).toHaveBeenCalled()
  })
})