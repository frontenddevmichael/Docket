/**
 * Fallback loading messages for the AI generation screen.
 *
 * Kept client-local (instead of a ../shared module) so the client build stays
 * self-contained — it's uploaded to static hosts (Vercel) without anything
 * outside the client/ root. The server keeps its own copy in
 * server/src/routes/loading-messages.ts; keep the two in sync.
 */
export const FALLBACK_LOADING_MESSAGES = [
  'Parsing your requirements\u2026',
  'Mapping test scenarios\u2026',
  'Checking for edge cases\u2026',
  'Drafting test cases\u2026',
  'Validating coverage\u2026',
  'Finalizing test suite\u2026',
] as const
