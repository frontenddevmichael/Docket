const NETWORK_ERROR_PATTERN =
  /Failed to fetch|NetworkError|load failed|name could not be resolved|ERR_NAME_NOT_RESOLVED|fetch failed|TypeError/i

export function authErrorText(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : ''
  if (!msg) return fallback
  if (NETWORK_ERROR_PATTERN.test(msg)) {
    return "Can\u2019t reach Docket servers — check your connection and confirm your Supabase project is running."
  }
  return msg
}