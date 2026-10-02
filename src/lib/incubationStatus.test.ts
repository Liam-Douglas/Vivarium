import { describe, it, expect } from 'vitest'
import {
  incubationState, daysIncubating, incubationDuration, daysUntilHatch, hatchRate,
  HATCH_SOON_DAYS,
} from './incubationStatus'
import type { IncubationRow } from './incubationStatus'

const NOW = new Date(2026, 9, 2, 12)
const iso = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString()

/** A running incubation started 30 days ago, no expected date. */
const row = (over: Partial<IncubationRow> = {}): IncubationRow => ({
  start_date: iso(2026, 9, 2),
  expected_hatch_date: null,
  actual_hatch_date: null,
  clutch_size: null,
  eggs_fertile: null,
  hatchlings: null,
  ...over,
})

describe('incubationState', () => {
  it('is incubating with no expected date, however long it has run', () => {
    expect(incubationState(row({ start_date: iso(2025, 1, 1) }), NOW)).toBe('incubating')
  })

  it('is incubating while the expected date is further off than the window', () => {
    expect(incubationState(row({ expected_hatch_date: iso(2026, 10, 20) }), NOW)).toBe('incubating')
  })

  it('is due inside the window, and on its last day', () => {
    expect(incubationState(row({ expected_hatch_date: iso(2026, 10, 5) }), NOW)).toBe('due')
    const edge = new Date(2026, 9, 2 + HATCH_SOON_DAYS, 12).toISOString()
    expect(incubationState(row({ expected_hatch_date: edge }), NOW)).toBe('due')
  })

  it('is due on the expected day itself', () => {
    expect(incubationState(row({ expected_hatch_date: iso(2026, 10, 2) }), NOW)).toBe('due')
  })

  it('is overdue the day after the expected date', () => {
    expect(incubationState(row({ expected_hatch_date: iso(2026, 10, 1) }), NOW)).toBe('overdue')
  })

  it('is hatched once there is an actual date, overruling an expected one', () => {
    expect(incubationState(
      row({ expected_hatch_date: iso(2026, 11, 1), actual_hatch_date: iso(2026, 9, 28) }),
      NOW
    )).toBe('hatched')
  })

  it('is hatched even when the expected date is long past', () => {
    expect(incubationState(
      row({ expected_hatch_date: iso(2026, 8, 1), actual_hatch_date: iso(2026, 9, 28) }),
      NOW
    )).toBe('hatched')
  })

  it('ignores outcome entirely — the dates decide', () => {
    // outcome is not in IncubationRow on purpose; this pins that a caller
    // passing one cannot change the verdict.
    const withOutcome = { ...row({ expected_hatch_date: iso(2026, 10, 1) }), outcome: 'failed' }
    expect(incubationState(withOutcome, NOW)).toBe('overdue')
  })

  it('treats an unparseable expected date as no expected date', () => {
    expect(incubationState(row({ expected_hatch_date: 'not a date' }), NOW)).toBe('incubating')
  })
})

describe('daysIncubating', () => {
  it('counts to now while it is running', () => {
    expect(daysIncubating(row({ start_date: iso(2026, 9, 2) }), NOW)).toBe(30)
  })

  it('stops at the hatch once there is one', () => {
    expect(daysIncubating(
      row({ start_date: iso(2026, 9, 2), actual_hatch_date: iso(2026, 9, 28) }),
      NOW
    )).toBe(26)
  })

  it('is zero on the day it started', () => {
    expect(daysIncubating(row({ start_date: iso(2026, 10, 2) }), NOW)).toBe(0)
  })

  it('is zero, not negative, for a start date in the future', () => {
    expect(daysIncubating(row({ start_date: iso(2026, 11, 1) }), NOW)).toBe(0)
  })

  it('is null for an unparseable start date', () => {
    expect(daysIncubating(row({ start_date: 'nonsense' }), NOW)).toBeNull()
  })
})

describe('incubationDuration', () => {
  it('is start to hatch', () => {
    expect(incubationDuration(
      row({ start_date: iso(2026, 9, 2), actual_hatch_date: iso(2026, 10, 1) })
    )).toBe(29)
  })

  it('is null while it is still running', () => {
    expect(incubationDuration(row({ start_date: iso(2026, 9, 2) }))).toBeNull()
  })
})

describe('daysUntilHatch', () => {
  it('counts down to the expected date', () => {
    expect(daysUntilHatch(row({ expected_hatch_date: iso(2026, 10, 12) }), NOW)).toBe(10)
  })

  it('goes negative once the date has passed', () => {
    expect(daysUntilHatch(row({ expected_hatch_date: iso(2026, 9, 25) }), NOW)).toBe(-7)
  })

  it('is null with no expected date', () => {
    expect(daysUntilHatch(row(), NOW)).toBeNull()
  })

  it('is null once it has hatched, rather than counting to a date overtaken by the event', () => {
    expect(daysUntilHatch(
      row({ expected_hatch_date: iso(2026, 10, 12), actual_hatch_date: iso(2026, 10, 1) }),
      NOW
    )).toBeNull()
  })
})

describe('hatchRate', () => {
  it('measures against fertile eggs when they are recorded', () => {
    expect(hatchRate(row({ clutch_size: 10, eggs_fertile: 8, hatchlings: 6 })))
      .toEqual({ rate: 0.75, basis: 'fertile' })
  })

  it('falls back to the clutch when fertility was never counted, and says so', () => {
    expect(hatchRate(row({ clutch_size: 10, eggs_fertile: null, hatchlings: 5 })))
      .toEqual({ rate: 0.5, basis: 'clutch' })
  })

  it('is null when no hatchlings are recorded — not zero', () => {
    // Zero would read as "nothing hatched", which is a result. This is silence.
    expect(hatchRate(row({ clutch_size: 10, eggs_fertile: 8 }))).toBeNull()
  })

  it('reports none hatched as zero when that is what was recorded', () => {
    expect(hatchRate(row({ clutch_size: 10, eggs_fertile: 8, hatchlings: 0 })))
      .toEqual({ rate: 0, basis: 'fertile' })
  })

  it('is null with no denominator, and with a denominator of zero', () => {
    expect(hatchRate(row({ hatchlings: 3 }))).toBeNull()
    expect(hatchRate(row({ clutch_size: 0, eggs_fertile: 0, hatchlings: 3 }))).toBeNull()
  })

  it('falls through to the clutch when fertile is zero but a clutch was counted', () => {
    expect(hatchRate(row({ clutch_size: 6, eggs_fertile: 0, hatchlings: 2 })))
      .toEqual({ rate: 2 / 6, basis: 'clutch' })
  })

  it('does not clamp an impossible rate — a data error should be visible', () => {
    expect(hatchRate(row({ clutch_size: 4, eggs_fertile: 4, hatchlings: 6 })))
      .toEqual({ rate: 1.5, basis: 'fertile' })
  })
})
