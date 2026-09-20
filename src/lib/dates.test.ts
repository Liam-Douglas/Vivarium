import { describe, it, expect } from 'vitest'
import { dateInputToISO, isoToDateTimeInput } from './dates'

/**
 * These assertions hold in any timezone on purpose. CI runs in UTC and the
 * keeper is in UTC+10, and a test that only fails in one of those is a test
 * that will mislead somebody.
 */
describe('isoToDateTimeInput', () => {
  it('renders the instant in local time, not the stored UTC clock', () => {
    const iso = new Date(2026, 8, 14, 21, 30).toISOString()
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    expect(isoToDateTimeInput(iso)).toBe(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    )
  })

  it('produces a value the input element accepts', () => {
    const value = isoToDateTimeInput(new Date(2026, 0, 5, 9, 5).toISOString())
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })
})

describe('round trip through the picker', () => {
  it('returns the same instant, to the minute', () => {
    // The property the inline editor broke: what goes into the picker has to
    // come back out as the same feeding.
    for (const original of [
      new Date(2026, 8, 14, 21, 30),
      new Date(2026, 8, 14, 0, 1),
      new Date(2026, 8, 14, 23, 59),
      new Date(2026, 11, 31, 22, 0),
      new Date(2026, 0, 1, 0, 0),
    ]) {
      const iso = original.toISOString()
      const returned = new Date(dateInputToISO(isoToDateTimeInput(iso)))
      expect(returned.getTime()).toBe(Math.floor(original.getTime() / 60000) * 60000)
    }
  })

  it('is what slicing the ISO string is not', () => {
    // iso.split('T')[0] is the bug AnimalDetail shipped: it discards the time,
    // and dateInputToISO then anchors the date-only value to local noon. This
    // fails in every timezone, UTC included — the time is gone regardless.
    const original = new Date(2026, 8, 14, 21, 30)
    const iso = original.toISOString()
    const sliced = new Date(dateInputToISO(iso.split('T')[0]))
    expect(sliced.getTime()).not.toBe(original.getTime())
    expect(sliced.getHours()).toBe(12)
  })
})

describe('dateInputToISO', () => {
  it('anchors a date-only value to local noon', () => {
    // Midnight would fall on the previous day for anyone west of UTC.
    const d = new Date(dateInputToISO('2026-09-14'))
    expect(d.getHours()).toBe(12)
    expect(d.getDate()).toBe(14)
    expect(d.getMonth()).toBe(8)
  })

  it('preserves a datetime-local value as given', () => {
    const d = new Date(dateInputToISO('2026-09-14T21:30'))
    expect(d.getHours()).toBe(21)
    expect(d.getMinutes()).toBe(30)
    expect(d.getDate()).toBe(14)
  })
})
