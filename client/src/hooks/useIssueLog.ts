import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import type { Issue, Blocker, Observation } from '@/types/database'

export interface FailedCase {
  id: string
  title: string
  source_ref: string | null
  status: string
  severity: string | null
  priority: string | null
  module: string | null
  executed_at: string | null
}

export interface IssueLogResponse {
  project: { id: string; name: string }
  issues: Issue[]
  blockers: Blocker[]
  observations: Observation[]
  failedCases: FailedCase[]
}

export function useProjectIssueLog(projectId: string | undefined) {
  return useQuery({
    queryKey: ['issue-log', projectId],
    queryFn: () => apiGet<IssueLogResponse>(`/api/projects/${projectId}/issue-log`),
    enabled: !!projectId,
  })
}

export function useCreateIssue(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost(`/api/projects/${projectId}/issue-log/issues`, payload),
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: ['issue-log', projectId] })
    },
  })
}

export function useCreateBlocker(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost(`/api/projects/${projectId}/issue-log/blockers`, payload),
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: ['issue-log', projectId] })
    },
  })
}

export function useCreateObservation(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost(`/api/projects/${projectId}/issue-log/observations`, payload),
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: ['issue-log', projectId] })
    },
  })
}

export function useUpdateIssue(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Record<string, unknown>) =>
      apiPatch(`/api/projects/${projectId}/issue-log/issues/${id}`, payload),
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: ['issue-log', projectId] })
    },
  })
}

export function useUpdateObservation(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Record<string, unknown>) =>
      apiPatch(`/api/projects/${projectId}/issue-log/observations/${id}`, payload),
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: ['issue-log', projectId] })
    },
  })
}

export function useUpdateBlocker(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Record<string, unknown>) =>
      apiPatch(`/api/projects/${projectId}/issue-log/blockers/${id}`, payload),
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: ['issue-log', projectId] })
    },
  })
}

export function useSendIssueDraft(projectId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (noteType: 'developer' | 'tester') =>
      apiPost(`/api/projects/${projectId}/issue-log/send-draft`, { noteType }),
    onSuccess: () => {
      if (projectId) qc.invalidateQueries({ queryKey: ['issue-log', projectId] })
    },
  })
}