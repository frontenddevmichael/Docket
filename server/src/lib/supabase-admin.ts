import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY

function requireKeys() {
  if (!url || !serviceRoleKey) {
    throw new Error(`SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (url=!!${!!url}, serviceRoleKey=!!${!!serviceRoleKey})`)
  }
}

function requireAnonKey() {
  if (!url || !anonKey) {
    throw new Error(`SUPABASE_URL and SUPABASE_ANON_KEY must be set (url=!!${!!url}, anonKey=!!${!!anonKey})`)
  }
}

function getAdminClient(): SupabaseClient {
  requireKeys()
  console.log(`[supabase-admin] URL=${url}, key=${serviceRoleKey!.slice(0, 20)}...${serviceRoleKey!.slice(-10)}`)
  return createClient(url!, serviceRoleKey!, {
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
  requireAnonKey()
  console.log(`[supabase-auth] URL=${url}, key=${anonKey!.slice(0, 20)}...${anonKey!.slice(-10)}`)
  return createClient(url!, anonKey!, {
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
  requireAnonKey()
  return createClient(url!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  })
}
