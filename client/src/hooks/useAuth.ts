import { useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
    }).catch(() => {}).finally(() => {
      setLoading(false)
    })

    return () => listener?.subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { data, error }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({ password })
    return { data, error }
  }, [])

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    const redirectTo = `${window.location.origin}/sessions`

    // GoTrue rejects a disabled/misconfigured provider with a 400, but the
    // supabase-js browser flow never inspects the response — it navigates
    // unconditionally and the failure is swallowed. Pre-flight the exact URL
    // it would navigate to, so a misconfigured provider shows a clear error
    // instead of a dead end. (redirect: 'manual' → 302 when enabled, 4xx when not.)
    if (typeof fetch === 'function') {
      const authorizeUrl = `${supabaseUrl}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(redirectTo)}`
      const probe = await fetch(authorizeUrl, {
        headers: { apikey: supabaseAnonKey },
        redirect: 'manual',
      }).catch(() => null)
      if (probe && probe.status >= 400 && probe.status < 500) {
        let message = `Could not start ${provider} sign-in`
        try {
          const body = await probe.json()
          if (body?.msg) message = body.msg
        } catch { /* non-JSON body */ }
        return { data: { provider, url: null }, error: new Error(message) }
      }
    }

    const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
    return { data, error }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { user, loading, signIn, signUp, signInWithOAuth, resetPassword, updatePassword, signOut }
}
