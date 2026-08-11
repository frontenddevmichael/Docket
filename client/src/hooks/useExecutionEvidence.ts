import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface RecordResultArgs {
  testCaseId: string
  status: 'pass' | 'fail' | 'blocked' | 'not_applicable' | 'fixed' | 'reopened' | 'controlled_live' | 'uat'
  notes?: string
  actualResult?: string
  environment?: string
  severity?: string
  priority?: string
  assignedDeveloper?: string
  screenshotFile?: File
  executedBy: string
}

export function useRecordResult(sessionId: string) {
  return useMutation({
    mutationFn: async ({
      testCaseId,
      status,
      notes,
      actualResult,
      environment,
      severity,
      priority,
      assignedDeveloper,
      screenshotFile,
      executedBy,
    }: RecordResultArgs) => {
      let screenshotUrl: string | null = null

      if (screenshotFile) {
        const allowed = ['image/png', 'image/jpeg', 'image/webp']
        if (!allowed.includes(screenshotFile.type)) {
          throw new Error('Screenshot must be PNG, JPEG, or WebP')
        }
        if (screenshotFile.size > 10 * 1024 * 1024) {
          throw new Error('Screenshot must be under 10 MB')
        }
        const ext = screenshotFile.name.split('.').pop() ?? 'png'
        const filePath = `${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(filePath, screenshotFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('evidence')
          .getPublicUrl(filePath)

        screenshotUrl = publicUrl
      }

      const executedAt = new Date().toISOString()

      // Update the test case status + matrix fields
      const { error: updateError } = await supabase
        .from('test_cases')
        .update({
          status,
          executed_at: executedAt,
          test_environment: environment || null,
          ...(severity ? { severity } : {}),
          ...(priority ? { priority } : {}),
          ...(assignedDeveloper ? { assigned_developer: assignedDeveloper } : {}),
          updated_at: executedAt,
        })
        .eq('id', testCaseId)

      if (updateError) throw updateError

      // Record execution evidence
      const { error: evidenceError } = await supabase
        .from('execution_evidence')
        .insert({
          test_case_id: testCaseId,
          session_id: sessionId,
          screenshot_url: screenshotUrl,
          notes: notes ?? null,
          actual_result: actualResult ?? null,
          environment: environment ?? null,
          executed_at: executedAt,
          executed_by: executedBy,
        })

      if (evidenceError) throw evidenceError
    },
  })
}