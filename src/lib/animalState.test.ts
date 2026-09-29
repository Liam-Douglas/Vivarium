import { describe, it, expect } from 'vitest'
import {
  inQuarantine, quarantineDays, lastWeighedAt, hasStaleWeight, STALE_WEIGHT_DAYS,
} from './animalState'

const NOW = new Date(2026, 8, 21, 12)
const iso = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString()

describe('inQuarantine', () => {
  it('is true once started and not ended', () => {
    expect(inQuarantine({ quarantine_started_at: iso(2026, 9, 1), quarantine_ended_at: null })).toBe(true)
  })

  it('is false once ended, and false when never started', () => {
    expect(inQuarantine({ quarantine_started_at: iso(2026, 9, 1), quarantine_ended_at: iso(2026, 9, 15) })).toBe(false)
    expect(inQuarantine({ quarantine_started_at: null, quarantine_ended_at: null })).toBe(false)
  })

  it('is false for an end date with no start, rather than throwing', () => {
    expect(inQuarantine({ quarantine_started_at: null, quarantine_ended_at: iso(2026, 9, 15) })).toBe(false)
  })
})

describe('quarantineDays', () => {
  it('counts calendar days since it started', () => {
    expect(quarantineDays({ quarantine_started_at: iso(2026, 9, 1), quarantine_ended_at: null }, NOW)).toBe(20)
  })

  it('is null when not in quarantine', () => {
    expect(quarantineDays({ quarantine_started_at: null, quarantine_ended_at: null }, NOW)).toBeNull()
  })
})

describe('lastWeighedAt', () => {
  it('finds the most recent whichever order the logs arrive in', () => {
    const logs = [{ logged_at: iso(2026, 3, 1) }, { logged_at: iso(2026, 7, 1) }, { logged_at: iso(2026, 5, 1) }]
    expect(lastWeighedAt(logs)?.getMonth()).toBe(6)
    expect(lastWeighedAt([...logs].reverse())?.getMonth()).toBe(6)
  })

  it('is null with no logs, and ignores an unparseable one', () => {
    expect(lastWeighedAt([])).toBeNull()
    expect(lastWeighedAt([{ logged_at: 'not a date' }])).toBeNull()
    expect(lastWeighedAt([{ logged_at: 'not a date' }, { logged_at: iso(2026, 5, 1) }])?.getMonth()).toBe(4)
  })
})

describe('hasStaleWeight', () => {
  it('is true past the threshold and false inside it', () => {
    expect(hasStaleWeight([{ logged_at: iso(2026, 1, 1) }], NOW)).toBe(true)
    expect(hasStaleWeight([{ logged_at: iso(2026, 8, 1) }], NOW)).toBe(false)
  })

  it('is false exactly on the threshold', () => {
    const onIt = new Date(NOW)
    onIt.setDate(onIt.getDate() - STALE_WEIGHT_DAYS)
    expect(hasStaleWeight([{ logged_at: onIt.toISOString() }], NOW)).toBe(false)
  })

  it('does not call an animal that was never weighed stale', () => {
    // Nobody started is a different thing from somebody stopped, and calling
    // it stale would list every animal on the day this ships.
    expect(hasStaleWeight([], NOW)).toBe(false)
  })
})
