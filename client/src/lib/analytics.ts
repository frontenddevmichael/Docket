import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY ?? ''
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com'

export function initAnalytics() {
  if (!POSTHOG_KEY) {
    if (import.meta.env.DEV) {
      console.warn('[analytics] VITE_POSTHOG_KEY not set — analytics disabled')
    }
    return false
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // we track manually with router
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.opt_out_capturing()
    },
  })
  return true
}

export function trackPageView(url: string) {
  if (!POSTHOG_KEY) return
  posthog.capture('$pageview', { $current_url: url })
}

export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY) return
  posthog.capture(name, properties)
}

// Specific event helpers for the app
export const Events = {
  sessionCreated: (props: { title?: string }) => trackEvent('session_created', props),
  testCasesGenerated: (props: { count?: number; sessionId?: string }) =>
    trackEvent('test_cases_generated', props),
  testCaseResult: (props: { status: string; title?: string }) =>
    trackEvent('test_case_result', props),
  testCaseKept: (props: { status: string; title?: string }) =>
    trackEvent('test_case_kept', props),
  testCaseDeleted: (props: { count: number }) => trackEvent('test_case_deleted', props),
  testCaseDuplicated: (props: { count: number }) => trackEvent('test_case_duplicated', props),
  reportExported: (props: { format?: string }) => trackEvent('report_exported', props),
  settingsUpdated: (props: { setting?: string }) => trackEvent('settings_updated', props),
  userSignedUp: () => trackEvent('user_signed_up'),
  userSignedIn: () => trackEvent('user_signed_in'),
}
