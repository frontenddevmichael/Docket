import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { optimizeImage } from '@/lib/optimize-image'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Icon } from '@/components/Icon'
import { fetchWithAuth } from '@/lib/api'

interface InputTypeConfig {
  id: string
  label: string
  icon: string
  desc: string
}

const INPUT_TYPES: InputTypeConfig[] = [
  { id: 'screenshot', label: 'Screenshot', icon: 'web', desc: 'Upload a screenshot or enter a URL to capture' },
  { id: 'requirements', label: 'Requirements', icon: 'list-alt', desc: 'Paste or upload PRD text, user stories, constraints' },
  { id: 'figma', label: 'Figma', icon: 'auto-awesome', desc: 'Figma share link — renders the frame and extracts text layers' },
  { id: 'github_pr', label: 'GitHub PR', icon: 'code', desc: 'Pull request URL — fetches description, diff, changed files' },
  { id: 'api_spec', label: 'API Spec', icon: 'analytics', desc: 'OpenAPI or Swagger spec — URL or file upload' },
  { id: 'source_code', label: 'Source Code', icon: 'folder', desc: 'Upload a .zip of source code for context' },
]

type ExtractionStatus = 'idle' | 'loading' | 'done' | 'error'

export function NewSession() {
  useDocumentTitle('New Session')
  const navigate = useNavigate()
  const { user } = useAuth()

  // Wizard state
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [configs, setConfigs] = useState<Record<string, any>>({})

  // Extraction state
  const [extracting, setExtracting] = useState(false)
  const [extractionStatus, setExtractionStatus] = useState<Record<string, ExtractionStatus>>({})
  const [extractionError, setExtractionError] = useState<string | null>(null)

  // Temporary local state
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [requirementsFile, setRequirementsFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function toggleType(id: string) {
    setSelectedTypes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function updateConfig(id: string, data: any) {
    setConfigs(prev => ({ ...prev, [id]: { ...prev[id], ...data } }))
  }

  async function handleGenerate() {
    if (!user) return
    setExtracting(true)
    setExtractionError(null)

    const results: Record<string, any> = {}
    const statuses: Record<string, ExtractionStatus> = {}

    for (const type of selectedTypes) {
      statuses[type] = 'loading'
    }
    setExtractionStatus({ ...statuses })

    try {
      // Process each type
      for (const type of selectedTypes) {
        const cfg = configs[type] ?? {}
        try {
          let data: any = {}

          if (type === 'screenshot') {
            if (screenshotFile) {
              const ext = screenshotFile.name.split('.').pop() ?? 'png'
              const filePath = `${crypto.randomUUID()}.${ext}`
              const optimized = await optimizeImage(screenshotFile)
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('screenshots').upload(filePath, optimized)
              if (uploadError) throw uploadError
              const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(uploadData.path)
              data = { screenshotUrl: publicUrl, screenshotPath: uploadData.path }
            } else if (cfg.url) {
              const res = await fetchWithAuth('/api/screenshot', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: cfg.url }),
              })
              if (!res.ok) throw new Error('Screenshot capture failed')
              data = await res.json()
            }
          } else if (type === 'requirements') {
            data = { text: cfg.text ?? '' }
          } else if (type === 'figma') {
            const res = await fetchWithAuth('/api/figma', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: cfg.url }),
            })
            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: 'Figma extraction failed' }))
              throw new Error(err.error)
            }
            data = await res.json()
          } else if (type === 'github_pr') {
            const res = await fetchWithAuth('/api/github/pr', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: cfg.url }),
            })
            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: 'GitHub PR extraction failed' }))
              throw new Error(err.error)
            }
            data = await res.json()
          } else if (type === 'api_spec') {
            if (cfg.file) {
              const formData = new FormData()
              formData.append('file', cfg.file)
              const res = await fetchWithAuth('/api/api-spec', { method: 'POST', body: formData })
              if (!res.ok) throw new Error('API spec parsing failed')
              data = await res.json()
            } else if (cfg.url) {
              const res = await fetchWithAuth('/api/api-spec', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: cfg.url }),
              })
              if (!res.ok) throw new Error('API spec parsing failed')
              data = await res.json()
            }
          } else if (type === 'source_code') {
            if (cfg.file) {
              const formData = new FormData()
              formData.append('file', cfg.file)
              const res = await fetchWithAuth('/api/source-code', { method: 'POST', body: formData })
              if (!res.ok) throw new Error('Source code extraction failed')
              data = await res.json()
            }
          }

          results[type] = data
          statuses[type] = 'done'
        } catch (err: any) {
          statuses[type] = 'error'
          results[type] = { error: err.message }
        }
        setExtractionStatus({ ...statuses })
      }

      // Check for failures (use local statuses, not stale closure state)
      const failed = Object.entries(statuses).filter(([_, s]) => s === 'error')
      if (failed.length > 0) return

      // Build session data
      const screenshotResult = results['screenshot'] ?? results['figma']
      const screenshotUrl = screenshotResult?.screenshotUrl ?? null
      const screenshotPath = screenshotResult?.screenshotPath ?? null
      const requirementsText = results['requirements']?.text ?? ''

      // Get workspace
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single()

      if (!membership) throw new Error('No workspace found')

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          title: title || 'Untitled Session',
          workspace_id: membership.workspace_id,
          screenshot_url: screenshotUrl,
          screenshot_path: screenshotPath,
          requirements_text: requirementsText,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // Insert session_inputs
      for (const [type, data] of Object.entries(results)) {
        if (data.error) continue
        await supabase.from('session_inputs').insert({
          session_id: session.id,
          type,
          data,
          sort_order: Array.from(selectedTypes).indexOf(type),
        })
      }

      navigate(`/sessions/${session.id}`)
    } catch (err: any) {
      setExtractionError(err.message || 'Failed to create session')
    } finally {
      setExtracting(false)
    }
  }

  const handleScreenshotFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return
    setScreenshotFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setScreenshotPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleRequirementsFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setRequirementsFile(file)
    const text = await file.text()
    updateConfig('requirements', { text })
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
      <header className="px-4 md:px-10 py-6 border-b border-outline-variant bg-surface flex-shrink-0 flex items-center justify-between">
        <div>
          <h2 className="font-heading text-[24px] text-primary mb-1 font-semibold">New Session</h2>
          <p className="font-body-md text-[14px] text-on-surface-variant">
            {step === 1 && 'Choose what to test with'}
            {step === 2 && 'Configure your inputs'}
            {step === 3 && 'Review and launch'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-2 h-2 rounded-full transition-colors ${s === step ? 'bg-primary' : s < step ? 'bg-primary/40' : 'bg-outline-variant/40'}`} />
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-10 max-w-3xl mx-auto w-full">
        {/* ═══ STEP 1: What are you testing? ═══ */}
        {step === 1 && (
          <div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Session title (optional)"
              className="w-full px-4 py-3 text-[16px] font-heading text-primary bg-surface-container border border-outline-variant/30 rounded-lg mb-8 placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-colors"
              autoFocus
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INPUT_TYPES.map(t => {
                const selected = selectedTypes.has(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleType(t.id)}
                    className={`text-left p-4 rounded-lg border transition-all duration-150 ${
                      selected
                        ? 'bg-primary/5 border-primary/40 shadow-sm'
                        : 'bg-surface border-outline-variant/30 hover:border-outline/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        selected ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/20'
                      }`}>
                        <Icon name={t.icon as any} size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-heading text-[14px] font-semibold text-primary mb-0.5">{t.label}</div>
                        <div className="font-body-md text-[11px] text-on-surface-variant leading-relaxed">{t.desc}</div>
                      </div>
                      <div className={`w-4 h-4 rounded border-2 mt-1 shrink-0 flex items-center justify-center transition-colors ${
                        selected ? 'bg-primary border-primary' : 'border-outline-variant/40'
                      }`}>
                        {selected && <svg className="w-3 h-3 text-on-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end mt-8">
              <button
                type="button"
                disabled={selectedTypes.size === 0}
                onClick={() => setStep(2)}
                className="bg-primary text-on-primary font-heading text-[12px] uppercase tracking-[0.05em] font-semibold py-2.5 px-6 rounded-lg hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Configure inputs ═══ */}
        {step === 2 && (
          <div className="space-y-4">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Session title (optional)"
              className="w-full px-4 py-3 text-[16px] font-heading text-primary bg-surface-container border border-outline-variant/30 rounded-lg mb-8 placeholder:text-on-surface-variant/50 outline-none focus:border-primary transition-colors"
            />
            {Array.from(selectedTypes).map(type => {
              const cfg = INPUT_TYPES.find(t => t.id === type)
              return (
                <div key={type} className="bg-surface border border-outline-variant/30 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon name={(cfg?.icon ?? 'web') as any} size={16} className="text-primary" />
                    <h3 className="font-heading text-[13px] font-semibold text-primary">{cfg?.label ?? type}</h3>
                  </div>

                  {/* Screenshot config */}
                  {type === 'screenshot' && (
                    <div className="space-y-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleScreenshotFileSelect}
                        className="hidden"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 px-4 py-2.5 rounded-lg border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container transition-colors text-[13px] text-on-surface-variant"
                        >
                          {screenshotFile ? screenshotFile.name : 'Upload screenshot'}
                        </button>
                        <span className="text-on-surface-variant/40 flex items-center text-[12px]">or</span>
                        <input
                          type="url"
                          value={configs[type]?.url ?? ''}
                          onChange={e => updateConfig(type, { url: e.target.value })}
                          placeholder="https://example.com"
                          className="flex-1 px-3 py-2.5 text-[13px] bg-surface-container border border-outline-variant/30 rounded-lg text-primary placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors"
                        />
                      </div>
                      {screenshotPreview && (
                        <img src={screenshotPreview} alt="Preview" className="max-h-48 rounded border border-outline-variant/20 object-contain bg-surface-container-high" />
                      )}
                    </div>
                  )}

                  {/* Requirements config */}
                  {type === 'requirements' && (
                    <div className="space-y-3">
                      <textarea
                        value={configs[type]?.text ?? ''}
                        onChange={e => updateConfig(type, { text: e.target.value })}
                        placeholder="Paste PRD text, user stories, or constraints here..."
                        rows={4}
                        className="w-full px-3 py-2.5 text-[13px] bg-surface-container border border-outline-variant/30 rounded-lg text-primary placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".txt,.md,.csv"
                          onChange={handleRequirementsFileSelect}
                          className="text-[12px] text-on-surface-variant file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-surface-container-low file:text-on-surface-variant hover:file:bg-surface-container"
                        />
                        {requirementsFile && <span className="text-[11px] text-on-surface-variant">{requirementsFile.name}</span>}
                      </div>
                    </div>
                  )}

                  {/* Figma config */}
                  {type === 'figma' && (
                    <input
                      type="url"
                      value={configs[type]?.url ?? ''}
                      onChange={e => updateConfig(type, { url: e.target.value })}
                      placeholder="https://www.figma.com/file/abc123/..."
                      className="w-full px-3 py-2.5 text-[13px] bg-surface-container border border-outline-variant/30 rounded-lg text-primary placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors"
                    />
                  )}

                  {/* GitHub PR config */}
                  {type === 'github_pr' && (
                    <input
                      type="url"
                      value={configs[type]?.url ?? ''}
                      onChange={e => updateConfig(type, { url: e.target.value })}
                      placeholder="https://github.com/owner/repo/pull/123"
                      className="w-full px-3 py-2.5 text-[13px] bg-surface-container border border-outline-variant/30 rounded-lg text-primary placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors"
                    />
                  )}

                  {/* API Spec config */}
                  {type === 'api_spec' && (
                    <div className="space-y-3">
                      <input
                        type="url"
                        value={configs[type]?.url ?? ''}
                        onChange={e => updateConfig(type, { url: e.target.value })}
                        placeholder="https://example.com/openapi.json"
                        className="w-full px-3 py-2.5 text-[13px] bg-surface-container border border-outline-variant/30 rounded-lg text-primary placeholder:text-on-surface-variant/40 outline-none focus:border-primary transition-colors"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-on-surface-variant">Or upload:</span>
                        <input
                          type="file"
                          accept=".json,.yaml,.yml"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) updateConfig(type, { file })
                          }}
                          className="text-[12px] text-on-surface-variant file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-surface-container-low file:text-on-surface-variant hover:file:bg-surface-container"
                        />
                      </div>
                    </div>
                  )}

                  {/* Source Code config */}
                  {type === 'source_code' && (
                    <input
                      type="file"
                      accept=".zip"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) updateConfig(type, { file })
                      }}
                      className="text-[13px] text-on-surface-variant file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-outline-variant/30 file:bg-surface-container-low file:text-[12px] file:font-semibold file:text-on-surface-variant hover:file:bg-surface-container transition-colors"
                    />
                  )}

                  {extractionStatus[type] === 'loading' && (
                    <div className="mt-2 flex items-center gap-2 text-[12px] text-on-surface-variant">
                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </div>
                  )}
                  {extractionStatus[type] === 'error' && (
                    <p className="mt-2 text-[12px] text-error">Failed. Please check your input and try again.</p>
                  )}
                </div>
              )
            })}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="font-body-md text-[13px] text-on-surface-variant hover:text-primary transition-colors"
              >
                &larr; Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="bg-primary text-on-primary font-heading text-[12px] uppercase tracking-[0.05em] font-semibold py-2.5 px-6 rounded-lg hover:opacity-90 active:scale-[0.97] transition-all"
              >
                Review
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Review & Launch ═══ */}
        {step === 3 && (
          <div>
            <div className="bg-surface border border-outline-variant/30 rounded-lg p-5 mb-6">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Session title (optional)"
                className="w-full font-heading text-[16px] font-semibold text-primary bg-transparent border-none outline-none p-0 mb-3 placeholder:text-on-surface-variant/50 focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
              />
              <div className="space-y-2">
                {Array.from(selectedTypes).map(type => {
                  const cfg = INPUT_TYPES.find(t => t.id === type)
                  const status = extractionStatus[type] ?? 'idle'
                  return (
                    <div key={type} className="flex items-center gap-3 text-[13px]">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        status === 'done' ? 'bg-success/15 text-success' : status === 'error' ? 'bg-error/15 text-error' : 'bg-surface-container-low text-on-surface-variant'
                      }`}>
                        {status === 'done' ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          : status === 'error' ? <span>!</span>
                          : <div className="w-2 h-2 rounded-full bg-on-surface-variant/40" />}
                      </div>
                      <Icon name={(cfg?.icon ?? 'web') as any} size={14} className="text-on-surface-variant" />
                      <span className="text-primary">{cfg?.label ?? type}</span>
                      <span className="text-on-surface-variant/60 text-[11px]">
                        {status === 'idle' && 'Ready'}
                        {status === 'loading' && 'Processing...'}
                        {status === 'done' && 'Extracted'}
                        {status === 'error' && 'Failed'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {extractionError && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-error/10 border border-error/20 text-[13px] text-on-error-container">{extractionError}</div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="font-body-md text-[13px] text-on-surface-variant hover:text-primary transition-colors"
              >
                &larr; Back
              </button>
              <button
                type="button"
                disabled={extracting || selectedTypes.size === 0}
                onClick={handleGenerate}
                className="bg-primary text-on-primary font-heading text-[12px] uppercase tracking-[0.05em] font-semibold py-3 px-8 rounded-lg hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {extracting ? (
                  <><div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> Generating...</>
                ) : (
                  <><Icon name="auto-awesome" size={16} /> Generate Test Cases</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
