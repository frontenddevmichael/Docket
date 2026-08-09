import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useProjects, useMyProjects, useProject, useCreateProject, useUpdateProject, useAcceptProject, useRejectProject } from '@/hooks/useProjects'
import { useRole } from '@/hooks/useRole'
import { apiGet, apiPost, apiPatch } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
  fetchWithAuth: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'tester@test.com' }, loading: false }),
}))

const mockGet = vi.mocked(apiGet)
const mockPost = vi.mocked(apiPost)
const mockPatch = vi.mocked(apiPatch)

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useProjects', () => {
  it('fetches /api/projects with no query string by default', async () => {
    mockGet.mockResolvedValue({ projects: [], total: 0, page: 1, counts: {} })
    const { result } = renderHook(() => useProjects({}), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(mockGet).toHaveBeenCalledWith('/api/projects')
  })

  it('passes status, search and page filters', async () => {
    mockGet.mockResolvedValue({ projects: [], total: 0, page: 2, counts: {} })
    const { result } = renderHook(() => useProjects({ status: 'requested', search: 'portal', page: 2 }), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(mockGet).toHaveBeenCalledWith('/api/projects?status=requested&search=portal&page=2')
  })
})

describe('useMyProjects', () => {
  it('fetches /api/projects/my', async () => {
    mockGet.mockResolvedValue({ projects: [] })
    const { result } = renderHook(() => useMyProjects(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(mockGet).toHaveBeenCalledWith('/api/projects/my')
  })
})

describe('useProject', () => {
  it('is disabled when no id is provided', () => {
    const { result } = renderHook(() => useProject(undefined), { wrapper: createWrapper() })
    expect(result.current.isFetching).toBe(false)
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('fetches project detail by id', async () => {
    mockGet.mockResolvedValue({ project: { id: 'proj-1' }, sessions: [] })
    const { result } = renderHook(() => useProject('proj-1'), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.data?.project.id).toBe('proj-1'))
    expect(mockGet).toHaveBeenCalledWith('/api/projects/proj-1')
  })
})

describe('useCreateProject', () => {
  it('posts to /api/projects with the payload', async () => {
    mockPost.mockResolvedValue({ project: { id: 'new-1' } })
    const { result } = renderHook(() => useCreateProject(), { wrapper: createWrapper() })
    const payload = { name: 'Portal' }
    await act(async () => {
      await result.current.mutateAsync(payload)
    })
    expect(mockPost).toHaveBeenCalledWith('/api/projects', payload)
  })
})

describe('useUpdateProject', () => {
  it('patches /api/projects/:id with the payload', async () => {
    mockPatch.mockResolvedValue({ project: { id: 'proj-1' } })
    const { result } = renderHook(() => useUpdateProject('proj-1'), { wrapper: createWrapper() })
    await act(async () => {
      await result.current.mutateAsync({ assign_tester: 'user-2' })
    })
    expect(mockPatch).toHaveBeenCalledWith('/api/projects/proj-1', { assign_tester: 'user-2' })
  })
})

describe('useAcceptProject', () => {
  it('posts to /api/projects/:id/accept', async () => {
    mockPost.mockResolvedValue({ project: { id: 'proj-1' }, session: { id: 'session-9' } })
    const { result } = renderHook(() => useAcceptProject('proj-1'), { wrapper: createWrapper() })
    await act(async () => {
      await result.current.mutateAsync(undefined)
    })
    expect(mockPost).toHaveBeenCalledWith('/api/projects/proj-1/accept', {})
  })
})

describe('useRejectProject', () => {
  it('posts the rejection reason to /api/projects/:id/reject', async () => {
    mockPost.mockResolvedValue({ project: { id: 'proj-1' } })
    const { result } = renderHook(() => useRejectProject('proj-1'), { wrapper: createWrapper() })
    await act(async () => {
      await result.current.mutateAsync('Missing requirements')
    })
    expect(mockPost).toHaveBeenCalledWith('/api/projects/proj-1/reject', { rejection_reason: 'Missing requirements' })
  })
})

describe('useRole', () => {
  it('computes role flags from workspace membership', async () => {
    mockGet.mockResolvedValue({ workspace_id: 'ws-1', members: [{ user_id: 'user-1', role: 'manager' }] })
    const { result } = renderHook(() => useRole(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.role).toBe('manager'))
    expect(result.current.isManager).toBe(true)
    expect(result.current.workspaceId).toBe('ws-1')
  })

  it('flags owners and admins as managers', async () => {
    mockGet.mockResolvedValue({ workspace_id: 'ws-1', members: [{ user_id: 'user-1', role: 'admin' }] })
    const { result } = renderHook(() => useRole(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.role).toBe('admin'))
    expect(result.current.isManager).toBe(true)
    expect(result.current.isAdmin).toBe(true)
  })

  it('returns no role for plain members', async () => {
    mockGet.mockResolvedValue({ workspace_id: 'ws-1', members: [{ user_id: 'user-1', role: 'tester' }] })
    const { result } = renderHook(() => useRole(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.role).toBe('tester'))
    expect(result.current.isManager).toBe(false)
  })
})