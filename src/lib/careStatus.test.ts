import { describe, it, expect } from 'vitest'
import {
  getCareStatus, getNextCareDue, describeNextCare, summariseCare, CARE_URGENCY,
} from './careStatus'

const NOW = new Date(2026, 8, 20, 10, 0)
const daysAgo = (n: number) => new Date(2026, 8, 20 - n, 9, 0).toISOString()

const task = (over: Partial<{ last_done_at: string | null; frequency_days: number; is_active: boolean }> = {}) => ({
  last_done_at: daysAgo(1),
  frequency_days: 7,
  is_active: true,
  ...over,
})

describe('getCareStatus', () => {
  it('is overdue past the interval', () => {
    expect(getCareStatus(task({ last_done_at: daysAgo(8) }), NOW)).toBe('overdue')
  })

  it('is due-soon on the day before and the day it falls due', () => {
    expect(getCareStatus(task({ last_done_at: daysAgo(6) }), NOW)).toBe('due-soon')
    expect(getCareStatus(task({ last_done_at: daysAgo(7) }), NOW)).toBe('due-soon')
  })

  it('is on schedule inside the interval', () => {
    expect(getCareStatus(task({ last_done_at: daysAgo(2) }), NOW)).toBe('on-schedule')
  })

  it('separates never-done from on-schedule', () => {
    // Collapsing these is what let a collection with no data report "0 overdue"
    // in green on the feeding side.
    expect(getCareStatus(task({ last_done_at: null }), NOW)).toBe('never-done')
  })

  it('reports a paused task as paused, however long ago it was done', () => {
    expect(getCareStatus(task({ is_active: false, last_done_at: daysAgo(400) }), NOW)).toBe('paused')
  })

  it('counts calendar days, not elapsed hours', () => {
    // Done at 9am yesterday, checked at 10am today: one day, not 25 hours.
    expect(getCareStatus(task({ last_done_at: daysAgo(1), frequency_days: 2 }), NOW)).toBe('due-soon')
  })
})

describe('getNextCareDue', () => {
  it('is the last completion plus the interval', () => {
    const due = getNextCareDue(task({ last_done_at: daysAgo(2), frequency_days: 7 }))
    expect(due && due.getDate()).toBe(25)
  })

  it('is null when the task has never been done or is paused', () => {
    expect(getNextCareDue(task({ last_done_at: null }))).toBeNull()
    expect(getNextCareDue(task({ is_active: false }))).toBeNull()
  })
})

describe('describeNextCare', () => {
  it('counts overdue days, singular and plural', () => {
    expect(describeNextCare(task({ last_done_at: daysAgo(8) }), NOW)).toBe('1 day overdue')
    expect(describeNextCare(task({ last_done_at: daysAgo(10) }), NOW)).toBe('3 days overdue')
  })

  it('names today and tomorrow', () => {
    expect(describeNextCare(task({ last_done_at: daysAgo(7) }), NOW)).toBe('Due today')
    expect(describeNextCare(task({ last_done_at: daysAgo(6) }), NOW)).toBe('Due tomorrow')
  })

  it('falls back to the status label with no date to work from', () => {
    expect(describeNextCare(task({ last_done_at: null }), NOW)).toBe('Never done')
    expect(describeNextCare(task({ is_active: false }), NOW)).toBe('Paused')
  })
})

describe('summariseCare', () => {
  it('counts each status and reports what a queue can surface', () => {
    const summary = summariseCare([
      task({ last_done_at: daysAgo(30) }),
      task({ last_done_at: daysAgo(7) }),
      task({ last_done_at: daysAgo(1) }),
      task({ last_done_at: null }),
      task({ is_active: false }),
    ], NOW)
    expect(summary).toEqual({
      overdue: 1, dueSoon: 1, onSchedule: 1, neverDone: 1, paused: 1, tracked: 3,
    })
  })

  it('is all zeroes for no tasks', () => {
    expect(summariseCare([], NOW).tracked).toBe(0)
  })
})

describe('CARE_URGENCY', () => {
  it('sorts overdue first and paused last', () => {
    const order = (['paused', 'on-schedule', 'overdue', 'never-done', 'due-soon'] as const)
      .slice()
      .sort((a, b) => CARE_URGENCY[a] - CARE_URGENCY[b])
    expect(order).toEqual(['overdue', 'due-soon', 'on-schedule', 'never-done', 'paused'])
  })
})
