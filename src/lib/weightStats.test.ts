import { describe, it, expect } from 'vitest'
import { currentWeight, weightTrend, growthSummary, weightSeries } from './weightStats'

const at = (day: number, grams: number) => ({
  logged_at: new Date(2026, 0, day, 12).toISOString(),
  weight_grams: grams,
})

// The query returns newest-first, which is the order these arrive in.
const history = [at(20, 1250), at(10, 1100), at(1, 900)]

describe('currentWeight', () => {
  it('is the most recent weigh-in', () => {
    expect(currentWeight(history)).toBe(1250)
  })

  it('gives the same answer whichever order the logs arrive in', () => {
    expect(currentWeight([...history].reverse())).toBe(1250)
  })

  it('falls back to the stored column only when there are no logs', () => {
    // An imported animal can carry a weight without any weigh-in behind it.
    expect(currentWeight([], 800)).toBe(800)
    // With logs, the column is ignored: it is not written by anything in the
    // app, so it is older than anything in the list by definition.
    expect(currentWeight(history, 800)).toBe(1250)
  })

  it('is null for an animal with neither', () => {
    expect(currentWeight([])).toBeNull()
    expect(currentWeight([], null)).toBeNull()
  })
})

describe('weightTrend', () => {
  it('compares the last two weigh-ins', () => {
    expect(weightTrend(history)).toBe(150)
  })

  it('is negative for an animal that has lost weight', () => {
    expect(weightTrend([at(20, 1000), at(10, 1100)])).toBe(-100)
  })

  it('needs two, because one weight is not a change', () => {
    expect(weightTrend([])).toBeNull()
    expect(weightTrend([at(1, 900)])).toBeNull()
  })

  it('never compares a log against the stored column', () => {
    // The column has no date, so a difference against it would be a figure
    // with no period attached.
    expect(weightTrend([at(1, 900)])).toBeNull()
  })
})

describe('growthSummary', () => {
  it('spans the whole history, not the charted window', () => {
    expect(growthSummary(history)).toEqual({ start: 900, latest: 1250, gain: 350 })
  })

  it('reports a loss as a negative gain', () => {
    expect(growthSummary([at(10, 800), at(1, 1000)])).toEqual({
      start: 1000, latest: 800, gain: -200,
    })
  })

  it('handles a single weigh-in without inventing a change', () => {
    expect(growthSummary([at(1, 900)])).toEqual({ start: 900, latest: 900, gain: 0 })
  })

  it('is null with nothing on record', () => {
    expect(growthSummary([])).toBeNull()
  })
})

describe('weightSeries', () => {
  it('comes out oldest first, whatever order it went in', () => {
    expect(weightSeries(history).map((p) => p.weight)).toEqual([900, 1100, 1250])
    expect(weightSeries([...history].reverse()).map((p) => p.weight)).toEqual([900, 1100, 1250])
  })

  it('trims from the old end, so the chart still ends at today', () => {
    expect(weightSeries(history, 2).map((p) => p.weight)).toEqual([1100, 1250])
  })

  it('ignores a limit that cannot narrow anything', () => {
    expect(weightSeries(history, 10)).toHaveLength(3)
    expect(weightSeries(history, 0)).toHaveLength(3)
  })
})

describe('a log with an unreadable timestamp', () => {
  it('is dropped rather than poisoning the sort', () => {
    // Date parsing failures sort unpredictably and would otherwise make
    // "latest" mean whatever the engine's sort happened to do.
    const withJunk = [{ logged_at: 'not a date', weight_grams: 9999 }, ...history]
    expect(currentWeight(withJunk)).toBe(1250)
    expect(growthSummary(withJunk)).toEqual({ start: 900, latest: 1250, gain: 350 })
    expect(weightSeries(withJunk)).toHaveLength(3)
  })
})
