import { describe, it, expect } from 'vitest'
import { getFeedingStatus, summariseFeeding, isUntracked } from './feedingStatus'
import { isOverdue } from './dates'

const NOW = new Date('2026-09-01T09:00:00')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

describe('getFeedingStatus', () => {
  it('grades a tracked animal against its interval', () => {
    const on = (d: number) => getFeedingStatus({ last_fed_at: daysAgo(d), feeding_frequency_days: 14 }, NOW)
    expect(on(5)).toBe('on-schedule')
    expect(on(13)).toBe('due-soon')
    expect(on(14)).toBe('due-soon')
    expect(on(15)).toBe('overdue')
  })

  // The bug this module exists to prevent: an animal the app cannot schedule
  // is not an animal that is doing fine.
  it('keeps untracked animals distinct from on-schedule ones', () => {
    expect(getFeedingStatus({ last_fed_at: null, feeding_frequency_days: null }, NOW)).toBe('no-schedule')
    expect(getFeedingStatus({ last_fed_at: daysAgo(90), feeding_frequency_days: null }, NOW)).toBe('no-schedule')
    expect(getFeedingStatus({ last_fed_at: null, feeding_frequency_days: 14 }, NOW)).toBe('never-fed')
    // A frequency of 0 arrives from imports and cannot yield a due date either.
    expect(getFeedingStatus({ last_fed_at: daysAgo(90), feeding_frequency_days: 0 }, NOW)).toBe('no-schedule')
  })

  // lib/dates.ts documents this rule: "fed yesterday" is 1 whatever the clock says.
  it('counts calendar days, not elapsed 24h periods', () => {
    const fedMonday6pm = new Date('2026-08-24T18:00:00').toISOString()
    const thursday9am = new Date('2026-08-27T09:00:00')
    // Elapsed hours are only 2.6 days; calendar days are 3.
    expect(getFeedingStatus({ last_fed_at: fedMonday6pm, feeding_frequency_days: 2 }, thursday9am)).toBe('overdue')

    const late = new Date('2026-08-24T23:00:00').toISOString()
    expect(getFeedingStatus({ last_fed_at: late, feeding_frequency_days: 1 }, new Date('2026-08-25T01:00:00')))
      .toBe('due-soon')
  })
})

describe('isUntracked', () => {
  it('covers exactly the two statuses with no derivable due date', () => {
    expect(isUntracked('no-schedule')).toBe(true)
    expect(isUntracked('never-fed')).toBe(true)
    expect(isUntracked('overdue')).toBe(false)
    expect(isUntracked('due-soon')).toBe(false)
    expect(isUntracked('on-schedule')).toBe(false)
  })
})

describe('summariseFeeding', () => {
  it('reports nothing overdue and nothing tracked for an untouched import', () => {
    const imported = Array.from({ length: 12 }, () => ({ last_fed_at: null, feeding_frequency_days: null }))
    const s = summariseFeeding(imported, NOW)
    expect(s.overdue).toBe(0)
    expect(s.untracked).toBe(12)
    expect(s.tracked).toBe(0)
  })

  it('accounts for every animal exactly once', () => {
    const mixed = [
      { last_fed_at: daysAgo(20), feeding_frequency_days: 14 },
      { last_fed_at: daysAgo(15), feeding_frequency_days: 14 },
      { last_fed_at: daysAgo(14), feeding_frequency_days: 14 },
      { last_fed_at: daysAgo(6), feeding_frequency_days: 7 },
      ...Array.from({ length: 5 }, () => ({ last_fed_at: daysAgo(2), feeding_frequency_days: 14 })),
      ...Array.from({ length: 3 }, () => ({ last_fed_at: null, feeding_frequency_days: null })),
    ]
    const s = summariseFeeding(mixed, NOW)
    expect(s).toMatchObject({ overdue: 2, dueSoon: 2, onSchedule: 5, untracked: 3, tracked: 9 })
    expect(s.overdue + s.dueSoon + s.onSchedule + s.untracked).toBe(mixed.length)
  })

  it('earns a clean bill only when everything is genuinely tracked', () => {
    const clear = Array.from({ length: 12 }, () => ({ last_fed_at: daysAgo(2), feeding_frequency_days: 14 }))
    const s = summariseFeeding(clear, NOW)
    expect(s.overdue).toBe(0)
    expect(s.untracked).toBe(0)
  })
})

describe('isOverdue', () => {
  // The push notification used `>= freq` while every screen used `> freq`, so an
  // animal at exactly its interval was pushed as overdue and displayed as due soon.
  it('agrees with getFeedingStatus on every day around the interval', () => {
    for (const d of [12, 13, 14, 15, 16]) {
      const animal = { last_fed_at: daysAgo(d), feeding_frequency_days: 14 }
      expect(isOverdue(animal.last_fed_at, animal.feeding_frequency_days, NOW))
        .toBe(getFeedingStatus(animal, NOW) === 'overdue')
    }
  })

  it('never reports an untracked animal as overdue', () => {
    expect(isOverdue(null, null, NOW)).toBe(false)
    expect(isOverdue(daysAgo(400), null, NOW)).toBe(false)
  })
})
