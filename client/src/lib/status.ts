/**
 * Canonical test-case execution statuses (see migration 014_execution_depth.sql).
 *
 * `not_run` is the value written by generation/manual creation; `untested` is
 * accepted as an alias (spreadsheet label) and both mean "not executed yet".
 * The remaining statuses are the execution vocabulary.
 */
export type ExecStatus =
  | 'pass'
  | 'fail'
  | 'blocked'
  | 'not_applicable'
  | 'fixed'
  | 'reopened'
  | 'controlled_live'
  | 'uat'

export const EXEC_STATUSES: { value: ExecStatus; label: string; glyph: string }[] = [
  { value: 'pass', label: 'Pass', glyph: '\u2713' },
  { value: 'fail', label: 'Fail', glyph: '\u2691' },
  { value: 'blocked', label: 'Blocked', glyph: '\u2298' },
  { value: 'not_applicable', label: 'N/A', glyph: '\u2300' },
  { value: 'fixed', label: 'Fixed', glyph: '\u270E' },
  { value: 'reopened', label: 'Reopened', glyph: '\u21BA' },
  { value: 'controlled_live', label: 'Controlled Live', glyph: '\u25C9' },
  { value: 'uat', label: 'UAT', glyph: '\u2302' },
]

export const UNEXECUTED_STATUSES = ['not_run', 'untested'] as const

/** True when the case has been executed (any verdict recorded). */
export function isExecuted(status?: string | null): boolean {
  return !!status && !(UNEXECUTED_STATUSES as readonly string[]).includes(status)
}

/** True when the case is in a needs-attention state (amber treatment). */
export function isFailed(status?: string | null): boolean {
  return status === 'fail' || status === 'blocked' || status === 'reopened'
}

export function isPassed(status?: string | null): boolean {
  return status === 'pass'
}

export function statusLabel(status?: string | null): string {
  if (!status || !isExecuted(status)) return 'Untested'
  return EXEC_STATUSES.find((s) => s.value === status)?.label ?? status
}
