import { supabase } from './supabase'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Absolute base URL for the API when the client is hosted separately from it
 * (e.g. SPA on Vercel + API on a container). Empty in the default topology,
 * where Express serves the built SPA and the API from the same origin, so
 * relative /api paths keep working untouched.
 */
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export async function fetchWithAuth(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const { data: { user } } = await supabase.auth.getUser()
  let token: string | undefined

  if (user) {
    const { data: { session } } = await supabase.auth.getSession()
    token = session?.access_token
  }

  const url =
    API_BASE && typeof input === 'string' && input.startsWith('/')
      ? `${API_BASE}${input}`
      : input

  const headers = new Headers(init?.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(url, { ...init, headers })
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetchWithAuth(path)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body?.error || body?.message || res.statusText || 'Request failed', res.status)
  }
  return res.json()
}

export async function apiPost<T = any>(path: string, body?: unknown): Promise<T> {
  const res = await fetchWithAuth(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body?.error || body?.message || res.statusText || 'Request failed', res.status)
  }
  return res.json()
}

export async function apiPatch<T = any>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithAuth(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body?.error || body?.message || res.statusText || 'Request failed', res.status)
  }
  return res.json()
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const res = await fetchWithAuth(path, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body?.error || body?.message || res.statusText || 'Request failed', res.status)
  }
  return res.json()
}
