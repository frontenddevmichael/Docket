import { useEffect, useState } from 'react'
import { supabaseUrl, supabaseAnonKey } from '@/lib/supabase'

interface SsoProviders {
  google: boolean
  github: boolean
}

/**
 * Which OAuth providers are actually enabled, read from GoTrue's /settings
 * endpoint. The auth screens render a provider's button only when it's on,
 * so a disabled provider (e.g. GitHub before it's configured) stops showing
 * a dead button. On failure we default to Google-only — the current state.
 */
export function useSsoProviders(): SsoProviders | null {
  const [providers, setProviders] = useState<SsoProviders | null>(null)

  useEffect(() => {
    let mounted = true
    fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseAnonKey } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted) return
        setProviders({
          google: !!data?.external?.google,
          github: !!data?.external?.github,
        })
      })
      .catch(() => {
        if (mounted) setProviders({ google: true, github: false })
      })
    return () => {
      mounted = false
    }
  }, [])

  return providers
}
