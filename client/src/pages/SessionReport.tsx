import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { isExecuted, isFailed, statusLabel } from '@/lib/status'
import { useTestCases } from '@/hooks/useTestCases'
import { useReports, useGenerateReport, useUpdateReportCommentary } from '@/hooks/useReport'
import type { SectionCommentary, ReportObservation, ReportSignOff } from '@/hooks/useReport'
import { useToast } from '@/components/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Icon } from '@/components/Icon'
import type { Session, ExecutionEvidence } from '@/types/database'

async function fetchSession(id: string): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

function Donut({ values, colors, size = 100, strokeWidth = 8 }: { values: number[]; colors: string[]; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = values.reduce((a, b) => a + b, 0)
  let offset = 0
  const segments = values.map((v) => {
    const len = total > 0 ? (v / total) * circumference : 0
    const start = offset
    offset += len
    return { len, start, color: colors[values.indexOf(v)] }
  })

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#DEDEDA" strokeWidth={strokeWidth} opacity="0.15" />
      {segments.map((seg, i) =>
        seg.len > 0 ? (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${seg.len} ${circumference - seg.len}`}
            strokeDashoffset={-seg.start}
            className="transition-all duration-700 ease-out"
          />
        ) : null
      )}
    </svg>
  )
}

function StampVerdict({ passRate, fail, blocked }: { passRate: number; fail: number; blocked: number }) {
  const isPass = passRate >= 90
  const isConditional = passRate >= 50
  const isFail = !isPass && !isConditional || (fail + blocked > 5 && passRate < 50)

  let label: string
  let stampClass: string
  let glyph: string

  if (isFail || (fail + blocked > 0 && passRate < 50)) {
    label = 'FAIL'
    stampClass = 'bg-[#C77D25] text-[#F7F7F6] border-[#C77D25]'
    glyph = '✗'
  } else if (isConditional) {
    label = 'CONDITIONAL PASS'
    stampClass = 'border-[#C77D25] text-[#C77D25] bg-[#F3E4D0]'
    glyph = '⚑'
  } else {
    label = 'PASS'
    stampClass = 'border-[#1C1C1A] text-[#1C1C1A] bg-transparent'
    glyph = '✓'
  }

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15, mass: 0.8 }}
      className={`inline-flex items-center gap-3 px-5 py-3 rounded-lg border-2 ${stampClass} font-heading`}
      style={{ transformOrigin: 'center' }}
    >
      <span className="text-[28px] font-bold leading-none">{glyph}</span>
      <div>
        <span className="text-[14px] uppercase tracking-[0.08em] font-bold block">{label}</span>
        <span className="text-[11px] opacity-70 font-medium">{passRate}% pass rate · {fail + blocked} issue{(fail + blocked) !== 1 ? 's' : ''}</span>
      </div>
    </motion.div>
  )
}

function EditableCommentary({
  text,
  onSave,
  placeholder = 'Click to add commentary...',
}: {
  text: string
  onSave: (val: string) => void
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(text)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(text)
  }, [text])

  const handleSave = async () => {
    setSaving(true)
    await onSave(value)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 font-body-md bg-[#EEEEEC] border border-[#DEDEDA] rounded-lg text-[#1C1C1A] placeholder:text-[#8C8C84]/60 resize-y text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#C77D25]/40"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-[#1C1C1A] text-[#F7F7F6] rounded-lg px-3 py-1 font-heading text-[10px] uppercase tracking-[0.05em] font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => { setValue(text); setEditing(false) }}
            className="font-body-md text-[12px] text-[#5C5C56] hover:text-[#1C1C1A] transition-colors px-2"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="bg-[#F7F7F6] border border-[#DEDEDA] rounded-lg p-3 cursor-pointer transition-all hover:border-[#C6C6C0] group"
      onClick={() => setEditing(true)}
      onKeyDown={(e) => { if (e.key === 'Enter') setEditing(true) }}
      role="button"
      tabIndex={0}
    >
      {value ? (
        <p className="font-body-md text-[13px] text-[#5C5C56] leading-relaxed whitespace-pre-wrap">{value}</p>
      ) : (
        <p className="font-body-md text-[13px] text-[#8C8C84] italic">{placeholder}</p>
      )}
      <span className="text-[10px] text-[#8C8C84] mt-1 block opacity-0 group-hover:opacity-100 transition-opacity font-mono">Click to edit</span>
    </div>
  )
}

export function SessionReport() {
  const { id: sessionId } = useParams<{ id: string }>()
  const { data: session } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => fetchSession(sessionId!),
    enabled: !!sessionId,
  })
  const { data: testCases, isLoading: casesLoading } = useTestCases(sessionId ?? '')
  const { data: reports, isLoading: reportsLoading } = useReports(sessionId ?? '')
  const { data: evidenceList } = useQuery<ExecutionEvidence[]>({
    queryKey: ['evidence', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('execution_evidence')
        .select('*')
        .eq('session_id', sessionId!)
      if (error) throw error
      return data as ExecutionEvidence[]
    },
    enabled: !!sessionId,
  })
  // Resolve executor ids to names/emails for the timeline
  const { data: executors } = useQuery({
    queryKey: ['evidence-executors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
      if (error) throw error
      return data as { id: string; email: string; full_name: string | null }[]
    },
    enabled: !!evidenceList && evidenceList.length > 0,
  })
  const executorName = (id?: string | null): string => {
    if (!id) return ''
    const p = executors?.find((x) => x.id === id)
    return p?.full_name || p?.email || id.slice(0, 8)
  }
  const generateReport = useGenerateReport(sessionId ?? '')
  const updateCommentary = useUpdateReportCommentary(sessionId ?? '')
  const { toast } = useToast()
  useDocumentTitle(session ? `Report: ${session.title}` : 'Report')
  const latestReport = reports?.[0]
  const [editingCommentary, setEditingCommentary] = useState(false)
  const [commentary, setCommentary] = useState('')
  const commentaryLoaded = useRef(false)
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null)
  const [observations, setObservations] = useState<ReportObservation[]>([])
  const [signOffs, setSignOffs] = useState<ReportSignOff[]>([])
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
    summary: true,
    quality: true,
    coverage: true,
    failed: true,
    notRun: true,
    timeline: true,
    commentary: true,
    distribution: true,
    blockers: true,
    observations: false,
    signOff: true,
    allCases: true,
  })

  const reportRef = useRef<HTMLDivElement>(null)
  const [exportingPdf, setExportingPdf] = useState(false)

  const handleExportPdf = async () => {
    if (!reportRef.current) return
    setExportingPdf(true)
    try {
      // Loaded on demand so jspdf + html2canvas (~300 KB) stay out of the main bundle
      // html2canvas-pro is a maintained fork of html2canvas that parses Tailwind v4's
      // oklch()/lab() colors (the original 1.4.1 throws "unsupported color function lab").
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ])
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F7F7F6',
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const imgWidth = pageWidth - 20
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 10

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= pdf.internal.pageSize.getHeight() - 20

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= pdf.internal.pageSize.getHeight() - 20
      }

      pdf.save(`${session?.title ?? 'report'}.pdf`)
    } catch {
      // fallback to print if PDF generation fails
      window.print()
    } finally {
      setExportingPdf(false)
    }
  }

  const content = latestReport?.content as Record<string, unknown> | undefined
  const sectionCommentary = content?.sectionCommentary as SectionCommentary | undefined

  useEffect(() => {
    if (reports && reports.length > 0 && !commentaryLoaded.current) {
      commentaryLoaded.current = true
      const saved = (reports[0].content as Record<string, unknown>)?.commentary as string ?? ''
      setCommentary(saved)
      setObservations(((reports[0].content as Record<string, unknown>)?.observations as ReportObservation[]) ?? [])
      setSignOffs(((reports[0].content as Record<string, unknown>)?.signOff as ReportSignOff[]) ?? [])
    }
  }, [reports])

  const toggleSection = (key: string) => {
    setVisibleSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const isLoading = casesLoading || reportsLoading

  const handleGenerate = () => {
    if (!testCases || !session) return
    generateReport.mutate({
      testCases,
      sessionTitle: session.title,
      evidenceList,
      existingCommentary: commentary || undefined,
    }, {
      onSuccess: () => toast('Report generated', 'success'),
      onError: (err: any) => toast(err?.message || 'Failed to generate report', 'error'),
    })
  }

  const pass = testCases?.filter((tc) => tc.status === 'pass').length ?? 0
  const fail = testCases?.filter((tc) => isFailed(tc.status)).length ?? 0
  const blocked = testCases?.filter((tc) => tc.status === 'blocked').length ?? 0
  const notRun = testCases?.filter((tc) => !isExecuted(tc.status)).length ?? 0
  const total = testCases?.length ?? 0
  const passRate = total > 0 ? Math.round((pass / total) * 100) : 0
  const failedCases = testCases?.filter((tc) => isFailed(tc.status)) ?? []

  const handleSaveSectionCommentary = (section: keyof SectionCommentary) => async (val: string) => {
    if (!sectionCommentary) return
    updateCommentary.mutate({
      sectionCommentary: { ...sectionCommentary, [section]: val },
    }, {
      onSuccess: () => toast('Commentary updated', 'success'),
      onError: () => toast('Failed to save', 'error'),
    })
  }

  const commitObservations = (next: ReportObservation[]) => {
    setObservations(next)
    updateCommentary.mutate({ observations: next }, {
      onSuccess: () => toast('Observation saved', 'success'),
      onError: () => toast('Failed to save', 'error'),
    })
  }

  const commitSignOffs = (next: ReportSignOff[]) => {
    setSignOffs(next)
    updateCommentary.mutate({ signOff: next }, {
      onSuccess: () => toast('Sign-off saved', 'success'),
      onError: () => toast('Failed to save', 'error'),
    })
  }

  const handleAddObservation = () => {
    commitObservations([...observations, {
      id: crypto.randomUUID(),
      content: '',
      developer: '',
      pm: '',
      status: 'open',
    }])
  }

  const handleObservationChange = (id: string, field: keyof ReportObservation, value: string) => {
    const next = observations.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    setObservations(next)
  }

  const handleAddSignOff = () => {
    commitSignOffs([...signOffs, {
      id: crypto.randomUUID(),
      unit: '',
      name: '',
      signature: '',
      date: new Date().toISOString().slice(0, 10),
      concurrence: 'Concur',
      reason: '',
    }])
  }

  const handleSignOffChange = (id: string, field: keyof ReportSignOff, value: string) => {
    const next = signOffs.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    setSignOffs(next)
  }

  const handleShare = async () => {
    const url = window.location.href
    const shareData = {
      title: session?.title ?? 'Docket Test Report',
      text: `${total} test case${total === 1 ? '' : 's'} · ${passRate}% pass rate — ${session?.title ?? 'Test Report'}`,
      url,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(url)
        toast('Report link copied', 'success')
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url)
        toast('Report link copied', 'success')
      } catch {
        toast('Could not share report', 'error')
      }
    }
  }

  const distribution = (() => {
    const sev: Record<string, number> = {}
    const pri: Record<string, number> = {}
    for (const fc of failedCases) {
      const s = fc.severity ?? 'medium'
      sev[s] = (sev[s] ?? 0) + 1
      const p = fc.priority ?? 'medium'
      pri[p] = (pri[p] ?? 0) + 1
    }
    return {
      severity: (['critical', 'high', 'medium', 'low'] as const).map((k) => ({ label: k, value: sev[k] ?? 0 })),
      priority: (['high', 'medium', 'low'] as const).map((k) => ({ label: k, value: pri[k] ?? 0 })),
    }
  })()

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 skeleton-shimmer">
          <div className="mb-12">
            <div className="h-4 w-24 bg-surface-container-highest rounded mb-4 skeleton-shimmer" />
            <div className="h-8 w-64 bg-surface-container-highest rounded mb-2 skeleton-shimmer" />
            <div className="h-4 w-48 bg-surface-container-highest rounded skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 skeleton-shimmer">
                <div className="h-8 w-12 bg-surface-container-highest rounded mb-2" />
                <div className="h-3 w-16 bg-surface-container-highest rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F7F6]">
      <div ref={reportRef} className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-full">
        {/* ══════════════════════════════════════════════════
            INSPECTION STAMP — hero verdict
            ══════════════════════════════════════════════════ */}
        {total > 0 && (
          <div className="mb-8 flex justify-center md:justify-start">
            <StampVerdict passRate={passRate} fail={fail} blocked={blocked} />
          </div>
        )}

        {/* Report Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8 md:mb-12 pb-6 border-b border-[#DEDEDA] relative group">
          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={async () => {
                const title = prompt('Edit session title:', session?.title ?? '')
                if (title && title !== session?.title) {
                  if (sessionId) await supabase.from('sessions').update({ title }).eq('id', sessionId)
                }
              }}
              className="p-2 text-[#5C5C56] hover:text-[#1C1C1A] rounded-sm hover:bg-[#EEEEEC] transition-colors"
              title="Edit Header"
            >
              <Icon name="edit" size={18} className="text-[#5C5C56]" />
            </button>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-[#EEEEEC] px-2 py-1 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] text-[#5C5C56] font-semibold border border-[#DEDEDA]">
                {session?.status === 'complete' ? 'Automated Run' : session?.status === 'executing' ? 'In Progress' : 'Draft'}
              </span>
              {session && (
                <span className="font-mono text-[13px] text-[#5C5C56]">ID: {session.id.slice(0, 8)}</span>
              )}
            </div>
            <h1 className="font-heading text-[24px] md:text-[32px] text-[#1C1C1A] mb-2">{session?.title ?? 'Test Report'}</h1>
            <p className="font-body-lg text-body-lg text-[#5C5C56] max-w-2xl">
              {total > 0
                ? `${total} test case${total > 1 ? 's' : ''} · ${passRate}% pass rate`
                : 'No test cases yet'}
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleShare}
              className="bg-[#FFFFFF] border border-[#DEDEDA] text-[#1C1C1A] py-2 px-3 md:px-4 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold hover:bg-[#EEEEEC] transition-colors flex items-center gap-2 shadow-rest active:scale-[0.97]"
            >
              <Icon name="share" size={16} className="text-[#5C5C56]" />
              <span className="hidden sm:inline">Share</span>
              <span className="sm:hidden">Share</span>
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="bg-[#FFFFFF] border border-[#DEDEDA] text-[#1C1C1A] py-2 px-3 md:px-4 rounded-lg font-heading text-[11px] uppercase tracking-[0.05em] font-semibold hover:bg-[#EEEEEC] transition-colors flex items-center gap-2 shadow-rest active:scale-[0.97] disabled:opacity-40"
            >
              {exportingPdf ? (
                <svg className="animate-[spinner_600ms_linear_infinite]" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <Icon name="download" size={16} className="text-[#5C5C56]" />
              )}
              <span className="hidden sm:inline">{exportingPdf ? 'Exporting\u2026' : 'Export PDF'}</span>
              <span className="sm:hidden">{exportingPdf ? '\u2026' : 'PDF'}</span>
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generateReport.isPending || !testCases || testCases.length === 0}
              className="bg-[#C77D25] text-white rounded-lg px-3 md:px-5 py-2 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold
                         transition-all duration-150 ease-out
                         hover:opacity-90 active:scale-[0.97]
                         disabled:opacity-40 disabled:cursor-not-allowed
                         flex items-center gap-2"
            >
              {generateReport.isPending ? (
                <svg className="animate-[spinner_600ms_linear_infinite]" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <Icon name="auto-awesome" size={16} className="text-white" />
              )}
              <span className="hidden sm:inline">{generateReport.isPending ? 'Generating\u2026' : latestReport ? 'Regenerate' : 'Generate report'}</span>
              <span className="sm:hidden">{generateReport.isPending ? 'Generating\u2026' : 'Generate'}</span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            EXECUTION SUMMARY GRAPH — donut chart at top
            ══════════════════════════════════════════════════ */}
        {total > 0 && (
          <div className="mb-8 md:mb-12 bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-5 md:p-6 shadow-rest">
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-[#DEDEDA]">
              <h2 className="font-heading text-[18px] text-[#1C1C1A] font-semibold">Execution Summary</h2>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
              <div className="shrink-0 w-[120px] h-[120px] relative">
                <Donut
                  values={[pass, fail, blocked, notRun]}
                  colors={['#1C1C1A', '#C77D25', '#8C8C84', '#DEDEDA']}
                  size={120}
                  strokeWidth={10}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-heading text-[22px] text-[#1C1C1A] font-bold">{passRate}%</span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                {[
                  { label: 'Passed', value: pass, color: 'text-[#1C1C1A]', dot: 'bg-[#1C1C1A]' },
                  { label: 'Failed', value: fail, color: 'text-[#C77D25]', dot: 'bg-[#C77D25]' },
                  { label: 'Blocked', value: blocked, color: 'text-[#8C8C84]', dot: 'bg-[#8C8C84]' },
                  { label: 'Not Run', value: notRun, color: 'text-[#8C8C84]', dot: 'bg-[#DEDEDA]' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                      <span className="font-mono text-[11px] text-[#5C5C56]">{item.label}</span>
                    </div>
                    <span className={`font-heading text-[20px] font-semibold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary stats - Bento Style */}
        {visibleSections.summary && (
          <div className="mb-8 md:mb-12">
            <div className="flex items-center gap-3 mb-4 md:mb-6 pb-2 border-b border-[#DEDEDA]">
              <h2 className="font-heading text-[24px] text-[#1C1C1A] font-semibold">Summary</h2>
              <button
                type="button"
                onClick={() => toggleSection('summary')}
                className="font-body-md text-[12px] text-[#5C5C56] hover:text-[#1C1C1A] underline underline-offset-2 transition-colors print:hidden"
              >
                Hide
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-5 md:p-6 shadow-rest md:col-span-1 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-[#5C5C56] mb-4">
                  <Icon name="fact-check" size={18} className="text-[#5C5C56]" />
                  <span className="font-heading text-[11px] uppercase tracking-[0.05em] font-semibold">Total Tests</span>
                </div>
                <div>
                  <div className="font-heading text-[32px] text-[#1C1C1A] font-semibold">{total}</div>
                  <div className="font-mono text-[13px] text-[#5C5C56] mt-1">{notRun > 0 ? `${notRun} not yet executed` : 'All executed'}</div>
                </div>
              </div>
              <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-5 md:p-6 shadow-rest md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 relative group">
                <div className="sm:border-r sm:border-[#DEDEDA] sm:pr-6">
                  <div className="flex items-center gap-2 text-[#5C5C56] mb-4">
                    <Icon name="check-circle" size={18} className="text-[#1C1C1A]" />
                    <span className="font-heading text-[11px] uppercase tracking-[0.05em] font-semibold">Passed</span>
                  </div>
                  <div className="font-heading text-[32px] text-[#1C1C1A] font-semibold">{pass}</div>
                  {total > 0 && (
                    <div className="w-full bg-[#EEEEEC] h-1 mt-3 rounded-full overflow-hidden">
                      <div className="bg-[#1C1C1A] h-full" style={{ width: `${(pass / total) * 100}%` }} />
                    </div>
                  )}
                </div>
                <div className="sm:border-r sm:border-[#DEDEDA] sm:px-6">
                  <div className="flex items-center gap-2 text-[#5C5C56] mb-4">
                    <Icon name="error" size={18} className="text-[#C77D25]" />
                    <span className="font-heading text-[11px] uppercase tracking-[0.05em] font-semibold">Failed</span>
                  </div>
                  <div className="font-heading text-[32px] text-[#1C1C1A] font-semibold">{fail}</div>
                  {total > 0 && (
                    <div className="w-full bg-[#EEEEEC] h-1 mt-3 rounded-full overflow-hidden">
                      <div className="bg-[#C77D25] h-full" style={{ width: `${(fail / total) * 100}%` }} />
                    </div>
                  )}
                </div>
                <div className="sm:pl-6">
                  <div className="flex items-center gap-2 text-[#5C5C56] mb-4">
                    <Icon name="block" size={18} className="text-[#5C5C56]" />
                    <span className="font-heading text-[11px] uppercase tracking-[0.05em] font-semibold">Blocked</span>
                  </div>
                  <div className="font-heading text-[32px] text-[#1C1C1A] font-semibold">{blocked}</div>
                  {total > 0 && (
                    <div className="w-full bg-[#EEEEEC] h-1 mt-3 rounded-full overflow-hidden">
                      <div className="bg-[#5C5C56] h-full" style={{ width: `${(blocked / total) * 100}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
            {total > 0 && (
              <p className="font-mono text-[12px] text-[#5C5C56] mt-3">
                {notRun > 0
                  ? `${notRun} test case${notRun > 1 ? 's' : ''} not yet executed.`
                  : 'All test cases have been executed.'}
              </p>
            )}
          </div>
        )}

        {/* Generation Quality */}
        {testCases && testCases.length > 0 && visibleSections.quality && (
          <div className="mb-8 md:mb-12">
            <div className="flex items-center gap-3 mb-4 md:mb-6 pb-2 border-b border-[#DEDEDA]">
              <h2 className="font-heading text-[24px] text-[#1C1C1A] font-semibold">Generation Quality</h2>
              <button
                type="button"
                onClick={() => toggleSection('quality')}
                className="font-body-md text-[12px] text-[#5C5C56] hover:text-[#1C1C1A] underline underline-offset-2 transition-colors print:hidden"
              >
                Hide
              </button>
            </div>
            <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-5 md:p-6 shadow-rest">
              {(() => {
                const kept = testCases.filter((tc) => tc.feedback === 'kept').length
                const edited = testCases.filter((tc) => tc.feedback === 'edited').length
                const deleted = testCases.filter((tc) => tc.feedback === 'deleted').length
                const totalFeedback = kept + edited + deleted
                const keptPct = totalFeedback > 0 ? Math.round((kept / totalFeedback) * 100) : 0
                const editedPct = totalFeedback > 0 ? Math.round((edited / totalFeedback) * 100) : 0
                const deletedPct = totalFeedback > 0 ? Math.round((deleted / totalFeedback) * 100) : 0

                const radius = 38
                const circumference = 2 * Math.PI * radius
                const keptLen = totalFeedback > 0 ? (kept / totalFeedback) * circumference : 0
                const editedLen = totalFeedback > 0 ? (edited / totalFeedback) * circumference : 0
                const deletedLen = totalFeedback > 0 ? (deleted / totalFeedback) * circumference : 0

                let verdict = ''
                let verdictColor = 'text-[#5C5C56]'
                if (totalFeedback === 0) {
                  verdict = 'No feedback signals recorded yet. Mark test cases as pass/fail to begin tracking.'
                } else if (keptPct >= 80) {
                  verdict = `Strong generation quality — ${keptPct}% of test cases were kept as-is.`
                  verdictColor = 'text-[#1C1C1A]'
                } else if (keptPct >= 50) {
                  verdict = `Moderate generation quality — ${keptPct}% kept, but ${editedPct}% needed edits.`
                  verdictColor = 'text-[#C77D25]'
                } else {
                  verdict = `Low generation quality — only ${keptPct}% kept; ${editedPct}% edited and ${deletedPct}% deleted.`
                  verdictColor = 'text-[#C77D25]'
                }

                return (
                  <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
                    <div className="shrink-0 relative w-[100px] h-[100px]">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r={radius} fill="none" stroke="#DEDEDA" strokeWidth="10" opacity="0.15" />
                        {keptLen > 0 && (
                          <circle cx="50" cy="50" r={radius} fill="none" stroke="#1C1C1A" strokeWidth="10" strokeDasharray={`${keptLen} ${circumference - keptLen}`} strokeDashoffset="0" className="transition-all duration-700 ease-out" />
                        )}
                        {editedLen > 0 && (
                          <circle cx="50" cy="50" r={radius} fill="none" stroke="#C77D25" strokeWidth="10" strokeDasharray={`${editedLen} ${circumference - editedLen}`} strokeDashoffset={-keptLen} className="transition-all duration-700 ease-out" />
                        )}
                        {deletedLen > 0 && (
                          <circle cx="50" cy="50" r={radius} fill="none" stroke="#8C8C84" strokeWidth="10" strokeDasharray={`${deletedLen} ${circumference - deletedLen}`} strokeDashoffset={-(keptLen + editedLen)} className="transition-all duration-700 ease-out" />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-heading text-[18px] text-[#1C1C1A] font-semibold">{totalFeedback > 0 ? keptPct : '\u2014'}</span>
                      </div>
                    </div>
                    <div className="flex-1 w-full md:w-auto">
                      <div className="space-y-2 mb-4 w-full">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-[#1C1C1A] font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#1C1C1A]" />
                            Kept
                          </span>
                          <span className="font-mono text-[11px] text-[#5C5C56]">{kept} ({keptPct}%)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-[#C77D25] font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#C77D25]" />
                            Edited
                          </span>
                          <span className="font-mono text-[11px] text-[#5C5C56]">{edited} ({editedPct}%)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-[#5C5C56] font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#5C5C56]" />
                            Deleted
                          </span>
                          <span className="font-mono text-[11px] text-[#5C5C56]">{deleted} ({deletedPct}%)</span>
                        </div>
                      </div>
                      <p className={`font-body-md text-[13px] ${verdictColor} leading-relaxed`}>
                        {verdict}
                      </p>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Requirements Coverage with AI commentary */}
        {testCases && testCases.some((tc) => tc.source_ref) && visibleSections.coverage && (
          <div className="mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-4 md:mb-6 pb-2 border-b border-[#DEDEDA]">
              <h2 className="font-heading text-[24px] text-[#1C1C1A] font-semibold">Requirements Coverage</h2>
              <button
                type="button"
                onClick={() => toggleSection('coverage')}
                className="font-body-md text-[12px] text-[#5C5C56] hover:text-[#1C1C1A] underline underline-offset-2 transition-colors print:hidden"
              >
                Hide
              </button>
            </div>
            {sectionCommentary?.coverage && latestReport && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-heading text-[10px] uppercase tracking-[0.05em] text-[#8C8C84] font-semibold">AI Analysis</span>
                </div>
                <EditableCommentary
                  text={sectionCommentary.coverage}
                  onSave={handleSaveSectionCommentary('coverage')}
                />
              </div>
            )}
            {(() => {
              const coverage = testCases
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
              return Object.keys(coverage).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {Object.entries(coverage).map(([ref, c]) => {
                    const pct = c.total > 0 ? Math.round((c.executed / c.total) * 100) : 0
                    const isComplete = pct >= 100
                    const isAtRisk = pct < 60
                    return (
                      <div key={ref} className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-5 md:p-6 shadow-rest relative group transition-all duration-200 hover:border-[#C6C6C0] hover:shadow-lifted">
                        <h3 className="font-body-lg text-body-lg font-semibold text-[#1C1C1A] mb-1">{ref}</h3>
                        <p className="font-mono text-[11px] text-[#5C5C56] mb-4">{c.total} test case{c.total > 1 ? 's' : ''}</p>
                        <div className="flex justify-between items-end mb-2">
                          <span className="font-heading text-[24px] text-[#1C1C1A] font-semibold">{pct}%</span>
                          <span className={`font-heading text-[11px] uppercase tracking-[0.05em] font-semibold flex items-center gap-1
                            ${isComplete ? 'text-[#1C1C1A]' : isAtRisk ? 'text-[#C77D25]' : 'text-[#C77D25]'}`}>
                            <Icon name={isComplete ? 'keep' : isAtRisk ? 'flag' : 'warning'} size={14} />
                            {isComplete ? 'Complete' : isAtRisk ? 'At Risk' : 'Partial'}
                          </span>
                        </div>
                        <div className="w-full bg-[#EEEEEC] h-1 rounded-full overflow-hidden border border-[#DEDEDA] box-border">
                          <div className="bg-[#1C1C1A] h-full" style={{ width: `${pct}%` }} />
                        </div>
                        {c.passed > 0 && (
                          <p className="font-mono text-[10px] text-[#1C1C1A] mt-2">{c.passed} of {c.executed} passed</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="font-body-md text-[#5C5C56]">No requirement references found in test cases.</p>
              )
            })()}
          </div>
        )}

        {/* Critical Failures with AI commentary */}
        {testCases && testCases.filter((tc) => isFailed(tc.status)).length > 0 && visibleSections.failed && (
          <div className="mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-4 md:mb-6 pb-2 border-b border-[#DEDEDA]">
              <h2 className="font-heading text-[24px] text-[#1C1C1A] font-semibold flex items-center gap-2 flex-wrap">
                Critical Failures
                <span className="bg-[#F3E4D0] text-[#C77D25] px-2 py-0.5 rounded-lg font-heading text-[10px] uppercase tracking-[0.05em] font-semibold">Action Required</span>
              </h2>
              <button
                type="button"
                onClick={() => toggleSection('failed')}
                className="font-body-md text-[12px] text-[#5C5C56] hover:text-[#1C1C1A] underline underline-offset-2 transition-colors print:hidden"
              >
                Hide
              </button>
            </div>
            {sectionCommentary?.failed && latestReport && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-heading text-[10px] uppercase tracking-[0.05em] text-[#8C8C84] font-semibold">AI Analysis</span>
                </div>
                <EditableCommentary
                  text={sectionCommentary.failed}
                  onSave={handleSaveSectionCommentary('failed')}
                />
              </div>
            )}
            <div className="space-y-4 md:space-y-6">
              {testCases
                .filter((tc) => isFailed(tc.status))
                .map((tc) => {
                  const evidence = evidenceList?.filter((e) => e.test_case_id === tc.id)
                  const steps = Array.isArray(tc.steps) ? tc.steps : []
                  return (
                    <div key={tc.id} className="bg-[#FFFFFF] border border-[#DEDEDA] border-l-4 rounded-lg p-4 md:p-6 shadow-rest relative group" style={{ borderLeftColor: '#C77D25' }}>
                      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                            <span className="font-mono text-[13px] text-[#1C1C1A] font-medium">TC-{tc.id.slice(0, 4)}</span>
                            <span className="bg-[#EEEEEC] px-2 py-1 rounded-md font-heading text-[10px] uppercase tracking-[0.05em] text-[#5C5C56] font-semibold">{tc.status === 'fail' ? 'Failed' : tc.status === 'reopened' ? 'Reopened' : 'Blocked'}</span>
                            {tc.source_ref && (
                              <span className="bg-[#EEEEEC] px-2 py-1 rounded-md font-heading text-[10px] uppercase tracking-[0.05em] text-[#5C5C56] font-semibold">{tc.source_ref}</span>
                            )}
                          </div>
                          <h3 className="font-body-lg text-body-lg font-semibold text-[#1C1C1A] mb-4 md:pr-20">{tc.title}</h3>
                          <div className="bg-[#EEEEEC] border border-[#DEDEDA] p-3 md:p-4 rounded-lg font-mono text-[11px] text-[#5C5C56] mb-4 overflow-x-auto">
                            <p className="text-[#C77D25] mb-1">Expected: {tc.expected_result}</p>
                            <p>Status: {tc.status === 'fail' ? 'Failed to meet expected result' : tc.status === 'reopened' ? 'Reopened after being fixed' : 'Execution blocked'}</p>
                          </div>
                          <p className="font-body-md text-body-md text-[#5C5C56]">
                            {steps.length > 0 && `Steps: ${steps.join(' \u2192 ')}`}
                          </p>
                        </div>
                        {evidence && evidence.length > 0 && (
                          <div className="md:w-1/3 flex flex-col gap-4">
                            <h4 className="font-heading text-[11px] uppercase tracking-[0.05em] text-[#5C5C56] font-semibold border-b border-[#DEDEDA] pb-1">Visual Evidence</h4>
                            {evidence.map((ev) => (
                              <div key={ev.id}>
                                {ev.screenshot_url && (
                                  <div className="bg-[#EEEEEC] border border-[#DEDEDA] rounded-lg overflow-hidden cursor-pointer group/img">
                                    <img
                                      src={ev.screenshot_url}
                                      alt="Evidence screenshot"
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-32 object-cover grayscale opacity-80 group-hover/img:opacity-100 transition-opacity"
                                    />
                                  </div>
                                )}
                                {ev.notes && (
                                  <p className="font-mono text-[11px] text-[#5C5C56] mt-2 italic">Note: {ev.notes}</p>
                                )}
                                <p className="font-mono text-[11px] text-[#5C5C56] mt-1">{new Date(ev.executed_at).toLocaleString()}</p>
                                <button
                                  type="button"
                                  onClick={() => setExpandedEvidence(ev.id === expandedEvidence ? null : ev.id)}
                                  className="font-heading text-[11px] uppercase tracking-[0.05em] font-semibold text-[#1C1C1A] border border-[#DEDEDA] py-1.5 px-3 rounded-lg hover:bg-[#EEEEEC] transition-colors w-full text-center"
                                >
                                  {expandedEvidence === ev.id ? 'Hide logs' : 'View Notes'}
                                </button>
                                {expandedEvidence === ev.id && ev.notes && (
                                  <div className="mt-2 p-3 bg-[#EEEEEC] rounded-lg font-mono text-[11px] text-[#5C5C56] whitespace-pre-wrap">
                                    {ev.notes}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Not Run with AI commentary */}
        {testCases && testCases.filter((tc) => !isExecuted(tc.status)).length > 0 && visibleSections.notRun && (
          <div className="mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-4 md:mb-6 pb-2 border-b border-[#DEDEDA]">
              <h2 className="font-heading text-[24px] text-[#1C1C1A] font-semibold flex items-center gap-2 flex-wrap">
                Not Executed
                <span className="bg-[#EEEEEC] px-2 py-0.5 rounded-lg font-heading text-[10px] uppercase tracking-[0.05em] text-[#5C5C56] font-semibold">
                  {testCases.filter((tc) => !isExecuted(tc.status)).length} case{testCases.filter((tc) => !isExecuted(tc.status)).length > 1 ? 's' : ''}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => toggleSection('notRun')}
                className="font-body-md text-[12px] text-[#5C5C56] hover:text-[#1C1C1A] underline underline-offset-2 transition-colors print:hidden"
              >
                Hide
              </button>
            </div>
            {sectionCommentary?.notRun && latestReport && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-heading text-[10px] uppercase tracking-[0.05em] text-[#8C8C84] font-semibold">AI Analysis</span>
                </div>
                <EditableCommentary
                  text={sectionCommentary.notRun}
                  onSave={handleSaveSectionCommentary('notRun')}
                />
              </div>
            )}
            <div className="space-y-2">
              {testCases
                .filter((tc) => !isExecuted(tc.status))
                .map((tc) => (
                  <div key={tc.id} className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-4 md:p-5 shadow-rest">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center font-mono text-[10px] rounded-full border-2 border-[#DEDEDA] text-[#5C5C56] shrink-0">
                        {'\u25CB'}
                      </span>
                      <h3 className="font-body-md text-[14px] text-[#1C1C1A] font-medium">{tc.title}</h3>
                    </div>
                    {tc.source_ref && (
                      <p className="font-mono text-[12px] text-[#C77D25] ml-7 mt-1">{tc.source_ref}</p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Execution Timeline with AI commentary */}
        {evidenceList && evidenceList.length > 0 && visibleSections.timeline && (
          <div className="mb-8 md:mb-12">
            <div className="flex items-center gap-3 mb-4 md:mb-6 pb-2 border-b border-[#DEDEDA]">
              <h2 className="font-heading text-[24px] text-[#1C1C1A] font-semibold">Execution Timeline</h2>
              <button
                type="button"
                onClick={() => toggleSection('timeline')}
                className="font-body-md text-[12px] text-[#5C5C56] hover:text-[#1C1C1A] underline underline-offset-2 transition-colors print:hidden"
              >
                Hide
              </button>
            </div>
            {sectionCommentary?.timeline && latestReport && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-heading text-[10px] uppercase tracking-[0.05em] text-[#8C8C84] font-semibold">AI Analysis</span>
                </div>
                <EditableCommentary
                  text={sectionCommentary.timeline}
                  onSave={handleSaveSectionCommentary('timeline')}
                />
              </div>
            )}
            <div className="relative pl-8 space-y-4">
              <div className="absolute left-3.5 top-2 bottom-2 w-px bg-[#DEDEDA]" />
              {testCases
                ?.filter((tc) => isExecuted(tc.status))
                .sort((a, b) => {
                  const aEv = evidenceList?.find((e) => e.test_case_id === a.id)
                  const bEv = evidenceList?.find((e) => e.test_case_id === b.id)
                  return new Date(aEv?.executed_at ?? 0).getTime() - new Date(bEv?.executed_at ?? 0).getTime()
                })
                .map((tc) => {
                  const evidence = evidenceList?.find((e) => e.test_case_id === tc.id)
                  const dotColor = isFailed(tc.status) ? 'bg-[#C77D25]' : tc.status === 'pass' ? 'bg-[#1C1C1A]' : 'bg-[#5C5C56]'
                  return (
                    <div key={tc.id} className="relative">
                      <div className={`absolute -left-[22px] top-1 w-[10px] h-[10px] rounded-full ${dotColor} ring-2 ring-[#F7F7F6]`} />
                      <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-4 shadow-rest">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-body-md text-[13px] text-[#1C1C1A] font-medium">{tc.title}</h3>
                          <span className={`font-mono text-[9px] uppercase tracking-[0.06em] px-1.5 py-0.5 rounded shrink-0 font-semibold
                            ${tc.status === 'pass' ? 'bg-[#1C1C1A]/10 text-[#1C1C1A]' : isFailed(tc.status) ? 'bg-[#F3E4D0] text-[#C77D25]' : 'bg-[#EEEEEC] text-[#5C5C56]'}`}>
                            {statusLabel(tc.status)}
                          </span>
                        </div>
                        {evidence && (
                          <div className="flex items-center gap-3 mt-2">
                            {evidence.executed_at && (
                              <span className="font-mono text-[10px] text-[#5C5C56]">
                                {new Date(evidence.executed_at).toLocaleString()}
                              </span>
                            )}
                            {evidence.executed_by && (
                              <span className="font-mono text-[10px] text-[#5C5C56]">
                                by {executorName(evidence.executed_by)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Editable Commentary */}
        {visibleSections.commentary && (
          <div className="mb-8 md:mb-12">
            <div className="flex items-center gap-3 mb-4 md:mb-6 pb-2 border-b border-[#DEDEDA]">
              <h2 className="font-heading text-[24px] text-[#1C1C1A] font-semibold">Commentary</h2>
              <button
                type="button"
                onClick={() => toggleSection('commentary')}
                className="font-body-md text-[12px] text-[#5C5C56] hover:text-[#1C1C1A] underline underline-offset-2 transition-colors print:hidden"
              >
                Hide
              </button>
            </div>
            {editingCommentary ? (
              <div className="space-y-3">
                <textarea
                  value={commentary}
                  onChange={(e) => setCommentary(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 font-body-md bg-[#EEEEEC] border border-[#DEDEDA] rounded-lg text-[#1C1C1A] placeholder:text-[#8C8C84]/60 resize-y text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#C77D25]/40"
                  placeholder="Add your observations, notes, or context for stakeholders\u2026"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateCommentary.mutate({ commentary }, {
                        onSuccess: () => toast('Commentary saved', 'success'),
                        onError: () => toast('Failed to save commentary', 'error'),
                      })
                      setEditingCommentary(false)
                    }}
                    disabled={updateCommentary.isPending}
                    className="bg-[#1C1C1A] text-[#F7F7F6] rounded-lg px-4 py-1.5 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold hover:opacity-90 active:scale-[0.97] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {updateCommentary.isPending ? 'Saving\u2026' : 'Save notes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCommentary(false)
                      setCommentary(
                        (latestReport?.content as Record<string, unknown>)?.commentary as string ?? ''
                      )
                    }}
                    className="font-body-md text-[14px] text-[#5C5C56] hover:text-[#1C1C1A] transition-colors px-3"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-5 md:p-6 cursor-pointer shadow-rest transition-all duration-200 ease-out hover:bg-[#EEEEEC] hover:shadow-elevated"
                onClick={() => setEditingCommentary(true)}
                onKeyDown={(e) => { if (e.key === 'Enter') setEditingCommentary(true) }}
                role="button"
                tabIndex={0}
              >
                {commentary ? (
                  <p className="font-body-md text-[14px] text-[#5C5C56] whitespace-pre-wrap">{commentary}</p>
                ) : (
                  <p className="font-body-md text-[14px] text-[#8C8C84]">
                    Click to add commentary or context for stakeholders\u2026
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Failure Distribution */}
        {failedCases.length > 0 && visibleSections.distribution && (
          <div className="mb-8 md:mb-12">
            <div className="flex items-center gap-3 mb-4 md:mb-6 pb-2 border-b border-[#DEDEDA]">
              <h2 className="font-heading text-[24px] text-[#1C1C1A] font-semibold">Failure Distribution</h2>
              <button
                type="button"
                onClick={() => toggleSection('distribution')}
                className="font-body-md text-[12px] text-[#5C5C56] hover:text-[#1C1C1A] underline underline-offset-2 transition-colors print:hidden"
              >
                Hide
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-5 md:p-6 shadow-rest">
                <h3 className="font-heading text-[13px] uppercase tracking-[0.05em] text-[#5C5C56] font-semibold mb-4">By Severity</h3>
                <div className="space-y-2">
                  {distribution.severity.map((seg) => (
                    <div key={seg.label} className="flex items-center gap-3">
                      <span className="w-20 font-mono text-[11px] text-[#5C5C56]">{seg.label}</span>
                      <div className="flex-1 h-2 bg-[#EEEEEC] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${failedCases.length > 0 ? (seg.value / failedCases.length) * 100 : 0}%`,
                            backgroundColor: seg.label === 'critical' || seg.label === 'high' ? '#C77D25' : '#8C8C84',
                          }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-[11px] text-[#5C5C56]">{seg.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-5 md:p-6 shadow-rest">
                <h3 className="font-heading text-[13px] uppercase tracking-[0.05em] text-[#5C5C56] font-semibold mb-4">By Priority</h3>
                <div className="space-y-2">
                  {distribution.priority.map((seg) => (
                    <div key={seg.label} className="flex items-center gap-3">
                      <span className="w-20 font-mono text-[11px] text-[#5C5C56]">{seg.label}</span>
                      <div className="flex-1 h-2 bg-[#EEEEEC] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${failedCases.length > 0 ? (seg.value / failedCases.length) * 100 : 0}%`,
                            backgroundColor: seg.label === 'high' ? '#C77D25' : '#8C8C84',
                          }}
                        />
                      </div>
                      <span className="w-8 text-right font-mono text-[11px] text-[#5C5C56]">{seg.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blockers & Open Items */}
        {failedCases.length > 0 && visibleSections.blockers && (
          <div className="mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-4 md:mb-6 pb-2 border-b border-[#DEDEDA]">
              <h2 className="font-heading text-[24px] text-[#1C1C1A] font-semibold flex items-center gap-2 flex-wrap">
                Blockers &amp; Open Items
                <span className="bg-[#EEEEEC] px-2 py-0.5 rounded-lg font-heading text-[10px] uppercase tracking-[0.05em] text-[#5C5C56] font-semibold">
                  {failedCases.length} item{failedCases.length > 1 ? 's' : ''}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => toggleSection('blockers')}
                className="font-body-md text-[12px] text-[#5C5C56] hover:text-[#1C1C1A] underline underline-offset-2 transition-colors print:hidden"
              >
                Hide
              </button>
            </div>
            <div className="space-y-2">
              {failedCases.map((fc) => (
                <div key={fc.id} className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-4 shadow-rest flex items-center gap-3">
                  <span className={`font-mono text-[10px] uppercase tracking-[0.05em] px-2 py-0.5 rounded font-semibold ${fc.status === 'fail' ? 'bg-[#F3E4D0] text-[#C77D25]' : 'bg-[#EEEEEC] text-[#5C5C56]'}`}>
                    {fc.status}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-[14px] text-[#1C1C1A] font-medium">{fc.title}</p>
                    {fc.source_ref && <p className="font-mono text-[11px] text-[#C77D25]">{fc.source_ref}</p>}
                  </div>
                  <div className="font-mono text-[11px] text-[#5C5C56] shrink-0 text-right">
                    <div>sev {fc.severity ?? 'medium'}</div>
                    <div>pri {fc.priority ?? 'medium'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observations with developer + PM comments */}
        {visibleSections.observations && (
          <div className="mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-4 md:mb-6 pb-2 border-b border-[#DEDEDA]">
              <h2 className="font-heading text-[24px] text-[#1C1C1A] font-semibold flex items-center gap-2 flex-wrap">
                Observations
                {observations.length > 0 && (
                  <span className="bg-[#EEEEEC] px-2 py-0.5 rounded-lg font-heading text-[10px] uppercase tracking-[0.05em] text-[#5C5C56] font-semibold">
                    {observations.length}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddObservation}
                  className="font-heading text-[11px] uppercase tracking-[0.05em] font-semibold bg-[#1C1C1A] text-[#F7F7F6] px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  + Add
                </button>
                <button
                  type="button"
                  onClick={() => toggleSection('observations')}
                  className="font-body-md text-[12px] text-[#5C5C56] hover:text-[#1C1C1A] underline underline-offset-2 transition-colors print:hidden"
                >
                  Hide
                </button>
              </div>
            </div>
            <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg overflow-hidden">
              {observations.length === 0 ? (
                <p className="font-body-md text-[13px] text-[#8C8C84] italic px-4 py-4">No observations recorded.</p>
              ) : (
                observations.map((obs) => (
                  <div key={obs.id} className="px-4 py-3 border-b border-[#DEDEDA] last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <textarea
                        value={obs.content}
                        onChange={(e) => handleObservationChange(obs.id, 'content', e.target.value)}
                        onBlur={() => commitObservations(observations)}
                        placeholder="Observation\u2026"
                        rows={1}
                        className="flex-1 font-body-md text-[13px] text-[#1C1C1A] bg-[#EEEEEC] border border-[#DEDEDA] rounded px-2 py-1 resize-none focus:outline-none focus:ring-2 focus:ring-[#C77D25]/40"
                      />
                      <button
                        type="button"
                        onClick={() => setObservations(observations.filter((o) => o.id !== obs.id))}
                        onBlur={() => commitObservations(observations.filter((o) => o.id !== obs.id))}
                        className="text-[#8C8C84] hover:text-[#1C1C1A] p-1"
                        aria-label="Remove observation"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      <input
                        value={obs.developer}
                        onChange={(e) => handleObservationChange(obs.id, 'developer', e.target.value)}
                        onBlur={() => commitObservations(observations)}
                        placeholder="Developer comment\u2026"
                        className="px-2 py-1.5 font-mono text-[11px] bg-[#EEEEEC] border border-[#DEDEDA] rounded focus:outline-none focus:ring-2 focus:ring-[#C77D25]/40"
                      />
                      <input
                        value={obs.pm}
                        onChange={(e) => handleObservationChange(obs.id, 'pm', e.target.value)}
                        onBlur={() => commitObservations(observations)}
                        placeholder="PM/PO comment\u2026"
                        className="px-2 py-1.5 font-mono text-[11px] bg-[#EEEEEC] border border-[#DEDEDA] rounded focus:outline-none focus:ring-2 focus:ring-[#C77D25]/40"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Sign-off table */}
        {visibleSections.signOff && (
          <div className="mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-4 md:mb-6 pb-2 border-b border-[#DEDEDA]">
              <h2 className="font-heading text-[24px] text-[#1C1C1A] font-semibold flex items-center gap-2 flex-wrap">
                Sign-off
                <span className="bg-[#EEEEEC] px-2 py-0.5 rounded-lg font-heading text-[10px] uppercase tracking-[0.05em] text-[#5C5C56] font-semibold">
                  {signOffs.length} unit{signOffs.length === 1 ? '' : 's'}
                </span>
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddSignOff}
                  className="font-heading text-[11px] uppercase tracking-[0.05em] font-semibold bg-[#1C1C1A] text-[#F7F7F6] px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  + Add sign-off
                </button>
                <button
                  type="button"
                  onClick={() => toggleSection('signOff')}
                  className="font-body-md text-[12px] text-[#5C5C56] hover:text-[#1C1C1A] underline underline-offset-2 transition-colors print:hidden"
                >
                  Hide
                </button>
              </div>
            </div>
            <div className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg overflow-x-auto shadow-rest">
              <table className="w-full text-[12px] font-mono">
                <thead>
                  <tr className="bg-[#EEEEEC] text-[#5C5C56] uppercase tracking-wider text-[10px]">
                    <th className="text-left px-3 py-2 font-semibold">Unit</th>
                    <th className="text-left px-3 py-2 font-semibold">Name</th>
                    <th className="text-left px-3 py-2 font-semibold">Signature</th>
                    <th className="text-left px-3 py-2 font-semibold">Date</th>
                    <th className="text-left px-3 py-2 font-semibold">Concurrence</th>
                    <th className="text-left px-3 py-2 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {signOffs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-[#8C8C84] italic">No sign-offs recorded.</td>
                    </tr>
                  ) : (
                    signOffs.map((row) => (
                      <tr key={row.id} className="border-t border-[#DEDEDA]">
                        <td className="px-1.5 py-1">
                          <input value={row.unit} onChange={(e) => handleSignOffChange(row.id, 'unit', e.target.value)} onBlur={() => commitSignOffs(signOffs)} placeholder="Unit" className="w-full px-2 py-1 bg-[#EEEEEC] border border-[#DEDEDA] rounded focus:outline-none" />
                        </td>
                        <td className="px-1.5 py-1">
                          <input value={row.name} onChange={(e) => handleSignOffChange(row.id, 'name', e.target.value)} onBlur={() => commitSignOffs(signOffs)} placeholder="Name" className="w-full px-2 py-1 bg-[#EEEEEC] border border-[#DEDEDA] rounded focus:outline-none" />
                        </td>
                        <td className="px-1.5 py-1">
                          <input value={row.signature} onChange={(e) => handleSignOffChange(row.id, 'signature', e.target.value)} onBlur={() => commitSignOffs(signOffs)} placeholder="Signature" className="w-full px-2 py-1 bg-[#EEEEEC] border border-[#DEDEDA] rounded focus:outline-none" />
                        </td>
                        <td className="px-1.5 py-1">
                          <input type="date" value={row.date} onChange={(e) => handleSignOffChange(row.id, 'date', e.target.value)} onBlur={() => commitSignOffs(signOffs)} className="w-full px-2 py-1 bg-[#EEEEEC] border border-[#DEDEDA] rounded focus:outline-none" />
                        </td>
                        <td className="px-1.5 py-1">
                          <select value={row.concurrence} onChange={(e) => handleSignOffChange(row.id, 'concurrence', e.target.value)} onBlur={() => commitSignOffs(signOffs)} className="w-full px-2 py-1 bg-[#EEEEEC] border border-[#DEDEDA] rounded focus:outline-none text-[#1C1C1A]">
                            <option>Concur</option>
                            <option>Concur with reservation</option>
                            <option>Non-concur</option>
                          </select>
                        </td>
                        <td className="px-1.5 py-1">
                          <input value={row.reason} onChange={(e) => handleSignOffChange(row.id, 'reason', e.target.value)} onBlur={() => commitSignOffs(signOffs)} placeholder="Reason" className="w-full px-2 py-1 bg-[#EEEEEC] border border-[#DEDEDA] rounded focus:outline-none" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All test cases */}
        {testCases && visibleSections.allCases && (
          <div>
            <div className="flex items-center justify-between mb-4 md:mb-6 pb-2 border-b border-[#DEDEDA]">
              <h2 className="font-heading text-[24px] text-[#1C1C1A] font-semibold">All test cases</h2>
              <button
                type="button"
                onClick={() => toggleSection('allCases')}
                className="font-body-md text-[12px] text-[#5C5C56] hover:text-[#1C1C1A] underline underline-offset-2 transition-colors print:hidden"
              >
                Hide
              </button>
            </div>
            <div className="space-y-3">
              {testCases.map((tc) => (
                <div key={tc.id} className="bg-[#FFFFFF] border border-[#DEDEDA] rounded-lg p-4 md:p-5 shadow-rest card-interactive">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-5 h-5 flex items-center justify-center font-mono text-[10px] rounded-full border-2 shrink-0
                        ${tc.status === 'pass' ? 'border-[#1C1C1A] text-[#1C1C1A]' : ''}
                        ${tc.status === 'fail' || tc.status === 'blocked' ? 'border-[#C77D25] bg-[#C77D25] text-white' : ''}
                        ${tc.status === 'not_run' ? 'border-[#DEDEDA] text-[#5C5C56]' : ''}`}
                    >
                      {tc.status === 'pass' ? '\u2713' : tc.status === 'fail' ? '\u2691' : tc.status === 'blocked' ? '\u2298' : '\u25CB'}
                    </span>
                    <h3 className="font-body-md text-[14px] text-[#1C1C1A] font-medium">{tc.title}</h3>
                  </div>
                  {tc.source_ref && (
                    <p className="font-mono text-[12px] text-[#C77D25] ml-7 mb-1">{tc.source_ref}</p>
                  )}
                  <p className="font-mono text-[12px] text-[#5C5C56] ml-7">
                    Expected: {tc.expected_result}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
