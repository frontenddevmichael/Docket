import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import type { ProjectWithProfiles } from '@/types/database'

export interface ProjectsResponse {
  projects: ProjectWithProfiles[]
  total: number
  page: number
  counts: Record<string, number>
}

export interface ProjectDetailResponse {
  project: ProjectWithProfiles
  sessions: { id: string; title: string; status: string; created_at: string }[]
}

export interface ProjectFilters {
  status?: string
  search?: string
  page?: number
}

export function useProjects(filters: ProjectFilters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.search) params.set('search', filters.search)
  if (filters.page && filters.page > 1) params.set('page', String(filters.page))
  const qs = params.toString()
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: () => apiGet<ProjectsResponse>(`/api/projects${qs ? `?${qs}` : ''}`),
  })
}

export function useMyProjects() {
  return useQuery({
    queryKey: ['projects', 'my'],
    queryFn: () => apiGet<{ projects: ProjectWithProfiles[] }>('/api/projects/my'),
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => apiGet<ProjectDetailResponse>(`/api/projects/${id}`),
    enabled: !!id,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPost<{ project: ProjectWithProfiles }>('/api/projects', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject(id: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiPatch<{ project: ProjectWithProfiles }>(`/api/projects/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      if (id) qc.invalidateQueries({ queryKey: ['project', id] })
    },
  })
}

export function useAcceptProject(id: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiPost<{ project: ProjectWithProfiles; session: { id: string } }>(`/api/projects/${id}/accept`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      if (id) qc.invalidateQueries({ queryKey: ['project', id] })
      qc.invalidateQueries({ queryKey: ['session-stats'] })
    },
  })
}

export function useRejectProject(id: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) =>
      apiPost<{ project: ProjectWithProfiles }>(`/api/projects/${id}/reject`, { rejection_reason: reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      if (id) qc.invalidateQueries({ queryKey: ['project', id] })
    },
  })
}