/**
 * Shared fallback loading messages for the AI generation screen.
 *
 * Used by both the client (GenerateLoading component) and the server
 * (POST /api/loading-messages) when personalised messages aren't available.
 * Kept in one place so the three previous fallback sets don't drift apart.
 */
export const FALLBACK_LOADING_MESSAGES = [
  'Parsing your requirements\u2026',
  'Mapping test scenarios\u2026',
  'Checking for edge cases\u2026',
  'Drafting test cases\u2026',
  'Validating coverage\u2026',
  'Finalizing test suite\u2026',
] as const
