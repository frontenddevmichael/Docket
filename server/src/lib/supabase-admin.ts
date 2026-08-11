import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Env vars are read lazily inside the factory functions, NOT at module scope.
 * With ESM, static imports are hoisted and evaluated before index.ts's
 * .env.local loader runs, so module-scope reads would capture undefined and
 * crash on the first authenticated request. Reading at first use guarantees
 * the env loader has already run by the time a client is created.
 */
function getAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error(`SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (url=!!${!!url}, serviceRoleKey=!!${!!serviceRoleKey})`)
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

let _client: SupabaseClient | null = null

export const supabaseAdmin = new Proxy<SupabaseClient>({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!_client) _client = getAdminClient()
    return Reflect.get(_client, prop, receiver)
  },
})

function getAuthClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(`SUPABASE_URL and SUPABASE_ANON_KEY must be set (url=!!${!!url}, anonKey=!!${!!anonKey})`)
  }
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

let _authClient: SupabaseClient | null = null

export const supabaseAuth = new Proxy<SupabaseClient>({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!_authClient) _authClient = getAuthClient()
    return Reflect.get(_authClient, prop, receiver)
  },
})

export function createUserClient(userJwt: string): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(`SUPABASE_URL and SUPABASE_ANON_KEY must be set (url=!!${!!url}, anonKey=!!${!!anonKey})`)
  }
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  })
}

let _serviceRoleOk: boolean | null = null
let _serviceRoleDetail = ''

/**
 * Verifies the service-role key against the live project with a real,
 * minimal request. The service role is required by every admin-backed route
 * (/api/projects, /api/issue-log, /api/generate, /api/account, workspace
 * admin ops); an invalid key makes all of them return 500. Failing loudly at
 * boot (and exposing the result on /api/health) turns that silent breakage
 * into an immediate, visible signal.
 */
export async function verifyServiceRoleKey(): Promise<{ ok: boolean; detail?: string }> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    _serviceRoleOk = false
    _serviceRoleDetail = 'SUPABASE_SERVICE_ROLE_KEY not set'
    return { ok: false, detail: _serviceRoleDetail }
  }
  try {
    const res = await fetch(`${url}/rest/v1/workspaces?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (res.status === 200) {
      _serviceRoleOk = true
      _serviceRoleDetail = 'ok'
      return { ok: true }
    }
    const body = await res.text().catch(() => '')
    _serviceRoleOk = false
    _serviceRoleDetail = `status=${res.status} ${body.slice(0, 140)}`
    return { ok: false, detail: _serviceRoleDetail }
  } catch (e: any) {
    _serviceRoleOk = false
    _serviceRoleDetail = e?.message ?? String(e)
    return { ok: false, detail: _serviceRoleDetail }
  }
}

export function serviceRoleStatus(): { ok: boolean; detail: string } {
  return { ok: _serviceRoleOk ?? false, detail: _serviceRoleDetail || 'not checked' }
}
