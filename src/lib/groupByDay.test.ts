import { describe, it, expect } from 'vitest'
import { groupByDay, dayHeading, describeElapsed } from './groupByDay'

/** Local-time ISO string, so tests describe the day a keeper would name. */
function at(y: number, m: number, d: number, h = 12, min = 0) {
  return new Date(y, m - 1, d, h, min).toISOString()
}

const NOW = new Date(2026, 8, 20, 10, 0) // 20 September 2026, local

describe('groupByDay', () => {
  it('returns nothing for an empty set', () => {
    expect(groupByDay([], NOW)).toEqual([])
  })

  it('puts feedings from the same day in one group', () => {
    const groups = groupByDay([
      { fed_at: at(2026, 9, 14, 9) },
      { fed_at: at(2026, 9, 14, 17) },
    ], NOW)
    expect(groups).toHaveLength(1)
    expect(groups[0].entries).toHaveLength(2)
  })

  it('splits across local midnight, not UTC midnight', () => {
    // 23:59 and 00:01 local on adjacent days. Grouping on the UTC date would
    // merge or mis-split these for any timezone with a non-zero offset.
    const groups = groupByDay([
      { fed_at: at(2026, 9, 15, 0, 1) },
      { fed_at: at(2026, 9, 14, 23, 59) },
    ], NOW)
    expect(groups.map((g) => g.key)).toEqual(['2026-09-15', '2026-09-14'])
  })

  it('orders groups newest day first', () => {
    const groups = groupByDay([
      { fed_at: at(2026, 9, 5) },
      { fed_at: at(2026, 9, 20) },
      { fed_at: at(2026, 9, 14) },
    ], NOW)
    expect(groups.map((g) => g.key)).toEqual(['2026-09-20', '2026-09-14', '2026-09-05'])
  })

  it('keeps the order entries arrived in within a day', () => {
    const groups = groupByDay([
      { fed_at: at(2026, 9, 14, 17), id: 'later' },
      { fed_at: at(2026, 9, 14, 9), id: 'earlier' },
    ], NOW)
    expect(groups[0].entries.map((e) => e.id)).toEqual(['later', 'earlier'])
  })

  it('groups a day that holds only refusals like any other', () => {
    const groups = groupByDay([
      { fed_at: at(2026, 9, 14), refused: true },
      { fed_at: at(2026, 9, 14), refused: true },
    ], NOW)
    expect(groups).toHaveLength(1)
    expect(groups[0].entries.every((e) => e.refused)).toBe(true)
  })

  it('drops entries with an unparseable timestamp', () => {
    const groups = groupByDay([
      { fed_at: 'not a date' },
      { fed_at: at(2026, 9, 14) },
    ], NOW)
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('2026-09-14')
  })
})

describe('dayHeading', () => {
  it('names today and yesterday instead of dating them', () => {
    expect(dayHeading(new Date(2026, 8, 20, 8), NOW)).toEqual({ label: 'Today', relative: '' })
    expect(dayHeading(new Date(2026, 8, 19, 8), NOW)).toEqual({ label: 'Yesterday', relative: '' })
  })

  it('gives the weekday and date, plus elapsed time, for older days', () => {
    expect(dayHeading(new Date(2026, 8, 14), NOW)).toEqual({
      label: 'Monday 14 September',
      relative: '6 days ago',
    })
  })

  it('includes the year once the day falls outside it', () => {
    expect(dayHeading(new Date(2025, 10, 3), NOW).label).toBe('3 November 2025')
  })
})

describe('describeElapsed', () => {
  it('counts in days, then weeks, then months', () => {
    expect(describeElapsed(new Date(2026, 8, 14), NOW)).toBe('6 days ago')
    expect(describeElapsed(new Date(2026, 7, 20), NOW)).toBe('4 weeks ago')
    expect(describeElapsed(new Date(2026, 5, 20), NOW)).toBe('3 months ago')
  })

  it('reads forwards for a feeding dated ahead of today', () => {
    expect(describeElapsed(new Date(2026, 8, 21), NOW)).toBe('tomorrow')
    expect(describeElapsed(new Date(2026, 8, 24), NOW)).toBe('in 4 days')
  })
})
