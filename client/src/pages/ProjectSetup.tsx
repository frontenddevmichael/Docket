import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useCreateProject } from '@/hooks/useProjects'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { Icon } from '@/components/Icon'

const DELIVERY_CATEGORIES = ['Agile', 'Waterfall', 'Hybrid']
const PROJECT_TYPES = ['New implementation', 'Enhancement', 'Change request', 'Data migration']
const TEST_TYPES = ['UAT', 'Regression', 'Integration', 'Smoke', 'Functional', 'API']

interface FormState {
  name: string
  overview: string
  business_impact: string
  delivery_category: string
  test_type: string
  project_type: string
  business_segment: string
  start_date: string
  target_end_date: string
  stakeholders: string
}

const INITIAL: FormState = {
  name: '',
  overview: '',
  business_impact: '',
  delivery_category: 'UAT',
  test_type: 'UAT',
  project_type: 'Enhancement',
  business_segment: '',
  start_date: '',
  target_end_date: '',
  stakeholders: '',
}

export function ProjectSetup() {
  useDocumentTitle('New Project')
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const createProject = useCreateProject()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async () => {
    setError(null)
    if (!form.name.trim()) return setError('Project name is required.')
    if (form.start_date && form.target_end_date && form.target_end_date < form.start_date)
      return setError('Target end date cannot be before the start date.')

    const stakeholders = form.stakeholders
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name, email: '' }))

    setSaving(true)
    createProject.mutate(
      {
        name: form.name.trim(),
        overview: form.overview.trim() || null,
        business_impact: form.business_impact.trim() || null,
        delivery_category: form.delivery_category || null,
        test_type: form.test_type || null,
        project_type: form.project_type || null,
        business_segment: form.business_segment.trim() || null,
        start_date: form.start_date || null,
        target_end_date: form.target_end_date || null,
        requested_by: user?.id ?? null,
        stakeholders,
      },
      {
        onSuccess: ({ project }) => {
          toast('Project created', 'success')
          navigate(`/projects/${project.id}`)
        },
        onError: (err: unknown) => {
          setSaving(false)
          const msg = err instanceof Error && err.message.includes('name') ? err.message : 'Could not create the project.'
          setError(msg)
        },
      },
    )
  }

  const inputCls =
    'w-full px-3 py-2 text-[13px] bg-surface-container border border-outline-variant/30 rounded-lg text-primary placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors'
  const labelCls = 'block font-heading text-[10px] uppercase tracking-[0.06em] font-semibold text-on-surface-variant mb-1.5'

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 bg-background">
      <div className="max-w-[860px] mx-auto">
        <div className="mb-6">
          <h1 className="font-heading text-[24px] md:text-[28px] font-semibold text-primary mb-1">Create Project</h1>
          <p className="font-body-md text-[14px] text-on-surface-variant">
            Register a new project request. Fields marked * are required.
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-rest p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className={labelCls}>Project Name *</label>
            <input type="text" value={form.name} onChange={set('name')} placeholder="e.g. Retail Banking Portal Refresh" className={inputCls} />
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>Project Overview</label>
            <textarea value={form.overview} onChange={set('overview')} rows={3} placeholder="Short description of what is being tested…" className={`${inputCls} resize-y`} />
          </div>

          <div>
            <label className={labelCls}>Project Type</label>
            <select value={form.project_type} onChange={set('project_type')} className={inputCls}>
              {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Business Segment</label>
            <input type="text" value={form.business_segment} onChange={set('business_segment')} placeholder="e.g. Corporate Banking" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Delivery Category</label>
            <select value={form.delivery_category} onChange={set('delivery_category')} className={inputCls}>
              {DELIVERY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Test Type</label>
            <select value={form.test_type} onChange={set('test_type')} className={inputCls}>
              {TEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>Business Impact</label>
            <input type="text" value={form.business_impact} onChange={set('business_impact')} placeholder="e.g. High value treasury liabilities" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Start Date</label>
            <input type="date" value={form.start_date} onChange={set('start_date')} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Target End Date</label>
            <input type="date" value={form.target_end_date} onChange={set('target_end_date')} className={inputCls} />
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>Stakeholders (comma separated names)</label>
            <input type="text" value={form.stakeholders} onChange={set('stakeholders')} placeholder="e.g. Alex Adams, Priya Nair" className={inputCls} />
          </div>

          {error && (
            <div className="md:col-span-2">
              <span className="inline-block font-mono text-[11px] px-2.5 py-1 rounded bg-warning/15 text-warning">{error}</span>
            </div>
          )}

          <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold text-on-surface-variant hover:bg-surface-container transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold flex items-center gap-2 hover:opacity-90 active:scale-[0.97] disabled:opacity-50 transition-all duration-150"
            >
              {saving ? <Icon name="sync" size={16} className="animate-spin" /> : <Icon name="add" size={16} />}
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}