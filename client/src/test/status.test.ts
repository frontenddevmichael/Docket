import { describe, it, expect } from 'vitest'
import { isExecuted, isFailed, isPassed, statusLabel } from '@/lib/status'

describe('isExecuted', () => {
  it('treats not_run and untested as not executed', () => {
    expect(isExecuted('not_run')).toBe(false)
    expect(isExecuted('untested')).toBe(false)
    expect(isExecuted(null)).toBe(false)
    expect(isExecuted(undefined)).toBe(false)
    expect(isExecuted('')).toBe(false)
  })

  it('treats every verdict status as executed', () => {
    for (const s of ['pass', 'fail', 'blocked', 'not_applicable', 'fixed', 'reopened', 'controlled_live', 'uat']) {
      expect(isExecuted(s)).toBe(true)
    }
  })
})

describe('isFailed', () => {
  it('flags fail, blocked and reopened as needs-attention', () => {
    expect(isFailed('fail')).toBe(true)
    expect(isFailed('blocked')).toBe(true)
    expect(isFailed('reopened')).toBe(true)
  })

  it('does not flag pass or neutral statuses', () => {
    expect(isFailed('pass')).toBe(false)
    expect(isFailed('not_applicable')).toBe(false)
    expect(isFailed('fixed')).toBe(false)
    expect(isFailed('controlled_live')).toBe(false)
    expect(isFailed('uat')).toBe(false)
    expect(isFailed('not_run')).toBe(false)
    expect(isFailed(null)).toBe(false)
  })
})

describe('isPassed', () => {
  it('only accepts pass', () => {
    expect(isPassed('pass')).toBe(true)
    expect(isPassed('fail')).toBe(false)
    expect(isPassed('not_run')).toBe(false)
  })
})

describe('statusLabel', () => {
  it('maps statuses to human labels', () => {
    expect(statusLabel('pass')).toBe('Pass')
    expect(statusLabel('fail')).toBe('Fail')
    expect(statusLabel('blocked')).toBe('Blocked')
    expect(statusLabel('reopened')).toBe('Reopened')
    expect(statusLabel('controlled_live')).toBe('Controlled Live')
    expect(statusLabel('uat')).toBe('UAT')
    expect(statusLabel('not_applicable')).toBe('N/A')
  })

  it('shows Untested for unexecuted and unknown statuses', () => {
    expect(statusLabel('not_run')).toBe('Untested')
    expect(statusLabel('untested')).toBe('Untested')
    expect(statusLabel(null)).toBe('Untested')
    expect(statusLabel('bogus')).toBe('bogus')
  })
})
