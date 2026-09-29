import { describe, it, expect } from 'vitest'
import {
  predictNextShed, isShedOverdue, describeNextShed, shedIntervals, summariseSheds,
} from './shedStatus'

const day = (y: number, m: number, d: number) => ({ shed_at: new Date(y, m - 1, d, 12).toISOString() })

describe('predictNextShed', () => {
  it('needs three logs, because two give one interval and one interval is not a cycle', () => {
    expect(predictNextShed([])).toBeNull()
    expect(predictNextShed([day(2026, 1, 1)])).toBeNull()
    expect(predictNextShed([day(2026, 1, 1), day(2026, 2, 1)])).toBeNull()
  })

  it('averages the intervals and projects from the most recent shed', () => {
    // 30 and 30 days → next 30 days after 1 March.
    const p = predictNextShed([day(2026, 1, 1), day(2026, 1, 31), day(2026, 3, 2)])
    expect(p?.intervalDays).toBe(30)
    expect(p?.samples).toBe(2)
    expect(p?.due.getMonth()).toBe(3)
    expect(p?.due.getDate()).toBe(1)
  })

  it('gives the same answer whichever order the logs arrive in', () => {
    // The query returns newest-first; nothing in the signature says so, and a
    // caller that reversed them should not get a different prediction.
    const logs = [day(2026, 1, 1), day(2026, 1, 31), day(2026, 3, 2)]
    expect(predictNextShed(logs)).toEqual(predictNextShed([...logs].reverse()))
  })

  it('considers only the five most recent intervals', () => {
    // Six 10-day intervals then... only the last five count, so a long-ago
    // hatchling cadence cannot drag an adult's prediction.
    const logs = [
      day(2026, 1, 1), day(2026, 1, 2), day(2026, 1, 3), // 1-day intervals, old
      day(2026, 2, 2), day(2026, 3, 4), day(2026, 4, 3),
      day(2026, 5, 3), day(2026, 6, 2),
    ]
    const p = predictNextShed(logs)
    expect(p!.samples).toBe(5)
    expect(p!.intervalDays).toBeGreaterThan(20)
  })

  it('ignores a gap too long to be a cycle', () => {
    // Two years between records is missing history, and averaging it in would
    // push every prediction absurdly far out.
    const p = predictNextShed([day(2023, 1, 1), day(2026, 1, 1), day(2026, 1, 31), day(2026, 3, 2)])
    expect(p?.intervalDays).toBe(30)
  })

  it('ignores an unparseable timestamp', () => {
    const p = predictNextShed([
      { shed_at: 'not a date' },
      day(2026, 1, 1), day(2026, 1, 31), day(2026, 3, 2),
    ])
    expect(p?.intervalDays).toBe(30)
  })

  it('returns null when two logs share a day, leaving one usable interval', () => {
    const p = predictNextShed([day(2026, 1, 1), day(2026, 1, 1), day(2026, 1, 31)])
    expect(p).toBeNull()
  })
})

describe('isShedOverdue', () => {
  const p = predictNextShed([day(2026, 1, 1), day(2026, 1, 31), day(2026, 3, 2)])!

  it('is not overdue before the due date', () => {
    expect(isShedOverdue(p, new Date(2026, 3, 1))).toBe(false)
  })

  it('allows a margin proportional to the interval', () => {
    // 30-day interval → 6 days of grace, so day 5 is fine and day 7 is late.
    expect(isShedOverdue(p, new Date(2026, 3, 6))).toBe(false)
    expect(isShedOverdue(p, new Date(2026, 3, 8))).toBe(true)
  })

  it('keeps a floor under the margin for a short interval', () => {
    // A 5-day cycle would otherwise be "late" one day after it was due.
    const quick = predictNextShed([day(2026, 1, 1), day(2026, 1, 6), day(2026, 1, 11)])!
    expect(quick.intervalDays).toBe(5)
    expect(isShedOverdue(quick, new Date(2026, 0, 18))).toBe(false)
    expect(isShedOverdue(quick, new Date(2026, 0, 20))).toBe(true)
  })

  it('says nothing when there is no prediction', () => {
    expect(isShedOverdue(null)).toBe(false)
  })
})

describe('describeNextShed', () => {
  const p = predictNextShed([day(2026, 1, 1), day(2026, 1, 31), day(2026, 3, 2)])!

  it('names today and tomorrow, counts days either side', () => {
    expect(describeNextShed(p, new Date(2026, 3, 1))).toBe('Due today')
    expect(describeNextShed(p, new Date(2026, 2, 31))).toBe('Due tomorrow')
    expect(describeNextShed(p, new Date(2026, 2, 27))).toBe('Due in 5 days')
    expect(describeNextShed(p, new Date(2026, 3, 2))).toBe('1 day late')
    expect(describeNextShed(p, new Date(2026, 3, 4))).toBe('3 days late')
  })

  it('has nothing to say without a prediction', () => {
    expect(describeNextShed(null)).toBeNull()
  })
})

const shed = (y: number, m: number, d: number, complete = true) => ({
  shed_at: new Date(y, m - 1, d, 12).toISOString(),
  complete,
})

describe('shedIntervals', () => {
  it('gives the gap before each shed, oldest first', () => {
    const intervals = shedIntervals([shed(2026, 3, 2), shed(2026, 1, 31), shed(2026, 1, 1)])
    expect(intervals.map((i) => i.days)).toEqual([30, 30])
  })

  it('carries the completeness of the shed that closed each gap', () => {
    const intervals = shedIntervals([
      shed(2026, 1, 1, true), shed(2026, 1, 31, false), shed(2026, 3, 2, true),
    ])
    expect(intervals.map((i) => i.complete)).toEqual([false, true])
  })

  it('drops a gap too long to be a cycle, exactly as the prediction does', () => {
    // Otherwise the chart would draw a bar the prediction refuses to average,
    // and the two would be telling the keeper different things.
    const intervals = shedIntervals([shed(2024, 1, 1), shed(2026, 1, 1), shed(2026, 1, 31)])
    expect(intervals.map((i) => i.days)).toEqual([30])
  })

  it('does not care what order the logs arrive in', () => {
    const logs = [shed(2026, 1, 1), shed(2026, 1, 31), shed(2026, 3, 2)]
    expect(shedIntervals(logs)).toEqual(shedIntervals([...logs].reverse()))
  })

  it('has nothing to say about a single shed', () => {
    expect(shedIntervals([shed(2026, 1, 1)])).toEqual([])
    expect(shedIntervals([])).toEqual([])
  })
})

describe('summariseSheds', () => {
  it('counts the sheds and averages the recent intervals', () => {
    const summary = summariseSheds([
      shed(2026, 1, 1), shed(2026, 1, 31), shed(2026, 3, 2, false),
    ])
    expect(summary).toEqual({ total: 3, complete: 2, averageIntervalDays: 30 })
  })

  it('counts a lone shed without inventing an interval', () => {
    expect(summariseSheds([shed(2026, 1, 1)])).toEqual({
      total: 1, complete: 1, averageIntervalDays: null,
    })
  })

  it('averages the same window the prediction uses', () => {
    // Six 10-day intervals then one of 40: the prediction considers five, so
    // the displayed average must not be computed over all six.
    const logs = [0, 10, 20, 30, 40, 50, 90].map((offset) => ({
      shed_at: new Date(2026, 0, 1 + offset, 12).toISOString(),
      complete: true,
    }))
    const summary = summariseSheds(logs)
    const prediction = predictNextShed(logs)
    expect(summary.averageIntervalDays).toBe(prediction?.intervalDays)
  })

  it('is empty-safe', () => {
    expect(summariseSheds([])).toEqual({ total: 0, complete: 0, averageIntervalDays: null })
  })
})
