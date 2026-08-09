import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDeleteSession } from '@/hooks/useDeleteSession'
import { useReorderTestCases } from '@/hooks/useTestCases'
import { useRecordResult } from '@/hooks/useExecutionEvidence'
import { fetchWithAuth } from '@/lib/api'

const mockAuth = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  getSession: vi.fn(() => Promise.resolve({ data: { session: null as any }, error: null })),
  getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1', email: 'test@test.com' } }, error: null })),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
}))

const mockFrom = vi.hoisted(() => vi.fn())
const mockRpc = vi.hoisted(() => vi.fn())
const mockStorageFrom = vi.hoisted(() => vi.fn(() => ({
  upload: vi.fn(),
  getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/test.png' } })),
})))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: mockAuth,
    from: mockFrom,
    rpc: mockRpc,
    storage: { from: mockStorageFrom },
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAuth', () => {
  it('returns user from getSession on mount', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@test.com' } }, error: null })
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user?.id).toBe('user-1')
  })

  it('returns null user when not authenticated', async () => {
    mockAuth.getUser.mockResolvedValueOnce({ data: { user: null as any }, error: null })
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it('signIn calls supabase.auth.signInWithPassword', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })
    await act(async () => {
      const res = await result.current.signIn('test@test.com', 'password')
      expect(res.data?.user?.id).toBe('user-1')
    })
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'test@test.com', password: 'password' })
  })

  it('signUp calls supabase.auth.signUp', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })
    await act(async () => {
      const res = await result.current.signUp('new@test.com', 'password')
      expect(res.data?.user?.id).toBe('user-1')
    })
    expect(mockAuth.signUp).toHaveBeenCalledWith({ email: 'new@test.com', password: 'password' })
  })

  it('resetPassword calls resetPasswordForEmail with redirectTo', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })
    await act(async () => {
      await result.current.resetPassword('test@test.com')
    })
    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('test@test.com', {
      redirectTo: expect.stringContaining('/reset-password'),
    })
  })

  it('updatePassword calls supabase.auth.updateUser', async () => {
    mockAuth.updateUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })
    await act(async () => {
      await result.current.updatePassword('new-password')
    })
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'new-password' })
  })

  it('signOut calls supabase.auth.signOut', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })
    await act(async () => {
      await result.current.signOut()
    })
    expect(mockAuth.signOut).toHaveBeenCalled()
  })
})

describe('useDeleteSession', () => {
  it('calls apiDelete with the session id', async () => {
    const origFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    const { result } = renderHook(() => useDeleteSession(), { wrapper: createWrapper() })
    await act(async () => {
      await result.current.mutateAsync('session-1')
    })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/sessions/session-1',
      expect.objectContaining({ method: 'DELETE' }),
    )
    globalThis.fetch = origFetch
  })
})

describe('useReorderTestCases', () => {
  it('calls supabase.rpc with batch_reorder_test_cases', async () => {
    mockRpc.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useReorderTestCases('session-1'), { wrapper: createWrapper() })
    const reordered = [
      { id: 'tc-1', sort_order: 0 },
      { id: 'tc-2', sort_order: 1 },
    ]
    await act(async () => {
      await result.current.mutateAsync(reordered)
    })
    expect(mockRpc).toHaveBeenCalledWith('batch_reorder_test_cases', { p_updates: reordered })
  })
})

describe('useRecordResult', () => {
  it('uploads evidence screenshot and records execution', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ error: null })
    mockStorageFrom.mockImplementation(() => ({ upload: mockUpload, getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/evidence.png' } })) }))
    mockFrom.mockImplementation((table: string) => {
      if (table === 'test_cases') return { update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) }
      if (table === 'execution_evidence') return { insert: vi.fn().mockResolvedValue({ error: null }) }
      return {}
    })

    const { result } = renderHook(() => useRecordResult('session-1'), { wrapper: createWrapper() })
    const file = new File(['fake-image'], 'screenshot.png', { type: 'image/png' })
    await act(async () => {
      await result.current.mutateAsync({
        testCaseId: 'tc-1',
        status: 'pass',
        notes: 'Works correctly',
        screenshotFile: file,
        executedBy: 'user-1',
      })
    })
    expect(mockUpload).toHaveBeenCalled()
    expect(mockFrom).toHaveBeenCalledWith('test_cases')
    expect(mockFrom).toHaveBeenCalledWith('execution_evidence')
  })
})

describe('fetchWithAuth', () => {
  it('sets Authorization header from session', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' as any } }, error: null })
    const origFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: 'ok' }) })

    const res = await fetchWithAuth('/api/workspace/members')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/workspace/members',
      expect.objectContaining({ headers: expect.any(Headers) }),
    )
    const callHeaders = vi.mocked(globalThis.fetch).mock.calls[0][1]?.headers as Headers
    expect(callHeaders.get('Authorization')).toBe('Bearer test-token')
    expect(res.ok).toBe(true)
    globalThis.fetch = origFetch
  })

  it('passes through body when provided', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' as any } }, error: null })
    const origFetch = globalThis.fetch
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    globalThis.fetch = fetchMock

    await fetchWithAuth('/api/workspace/invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', role: 'tester' }),
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/workspace/invite',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@test.com', role: 'tester' }),
      }),
    )
    const callHeaders = fetchMock.mock.calls[0][1]?.headers as Headers
    expect(callHeaders.get('Authorization')).toBe('Bearer test-token')
    globalThis.fetch = origFetch
  })
})
