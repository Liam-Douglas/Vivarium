import { describe, it, expect } from 'vitest'
import { collectWorthALook, MAX_ITEMS, type WorthALookAnimal } from './worthALook'

const NOW = new Date(2026, 5, 1, 12) // 1 June 2026

/** `daysAgo(30)` → an ISO timestamp thirty days before NOW. */
function daysAgo(n: number): string {
  const d = new Date(NOW)
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function animal(id: string, name: string, over: Partial<WorthALookAnimal> = {}): WorthALookAnimal {
  return { id, name, quarantine_started_at: null, quarantine_ended_at: null, ...over }
}

/** Three sheds at a fixed interval, the most recent `lastShedDaysAgo` back. */
function sheds(intervalDays: number, lastShedDaysAgo: number) {
  return [0, 1, 2].map((i) => ({ shed_at: daysAgo(lastShedDaysAgo + i * intervalDays) }))
}

const noSheds = new Map<string, { shed_at: string }[]>()
const noWeights = new Map<string, { logged_at: string }[]>()

describe('collectWorthALook', () => {
  it('says nothing about a collection with nothing to say', () => {
    const items = collectWorthALook({
      animals: [animal('a', 'Suki'), animal('b', 'Benji')],
      shedLogsByAnimal: noSheds,
      weightLogsByAnimal: noWeights,
    }, NOW)
    expect(items).toEqual([])
  })

  it('reports a shed that is late by more than its own margin', () => {
    // 30-day interval, last shed 45 days ago → due 15 days ago, margin 6.
    const items = collectWorthALook({
      animals: [animal('a', 'Suki')],
      shedLogsByAnimal: new Map([['a', sheds(30, 45)]]),
      weightLogsByAnimal: noWeights,
    }, NOW)
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('shed-overdue')
    expect(items[0].detail).toContain('every 30 days')
    expect(items[0].detail).toContain('15 days late')
  })

  it('reports a shed coming up, but not one further out than the horizon', () => {
    // Due in 4 days: last shed 26 days ago on a 30-day interval.
    const soon = collectWorthALook({
      animals: [animal('a', 'Suki')],
      shedLogsByAnimal: new Map([['a', sheds(30, 26)]]),
      weightLogsByAnimal: noWeights,
    }, NOW)
    expect(soon[0].kind).toBe('shed-soon')

    // Due in 10 days — a calendar entry, not something to go and look at.
    const later = collectWorthALook({
      animals: [animal('a', 'Suki')],
      shedLogsByAnimal: new Map([['a', sheds(30, 20)]]),
      weightLogsByAnimal: noWeights,
    }, NOW)
    expect(later).toEqual([])
  })

  it('counts a running quarantine in days', () => {
    const items = collectWorthALook({
      animals: [animal('a', 'Suki', { quarantine_started_at: daysAgo(12) })],
      shedLogsByAnimal: noSheds,
      weightLogsByAnimal: noWeights,
    }, NOW)
    expect(items[0].kind).toBe('quarantine')
    expect(items[0].detail).toBe('In quarantine 12 days')
  })

  it('ignores a quarantine that has ended', () => {
    const items = collectWorthALook({
      animals: [animal('a', 'Suki', {
        quarantine_started_at: daysAgo(40), quarantine_ended_at: daysAgo(5),
      })],
      shedLogsByAnimal: noSheds,
      weightLogsByAnimal: noWeights,
    }, NOW)
    expect(items).toEqual([])
  })

  it('reports a weight nobody has taken in a season', () => {
    const items = collectWorthALook({
      animals: [animal('a', 'Suki')],
      shedLogsByAnimal: noSheds,
      weightLogsByAnimal: new Map([['a', [{ logged_at: daysAgo(200) }]]]),
    }, NOW)
    expect(items[0].kind).toBe('stale-weight')
    expect(items[0].detail).toBe('Not weighed in 200 days')
  })

  it('says nothing about an animal that has never been weighed', () => {
    // Otherwise every animal in the collection appears on the day this ships,
    // which teaches the keeper to stop reading the section.
    const items = collectWorthALook({
      animals: [animal('a', 'Suki')],
      shedLogsByAnimal: noSheds,
      weightLogsByAnimal: noWeights,
    }, NOW)
    expect(items).toEqual([])
  })

  it('gives one animal one row, its most pressing condition', () => {
    // Quarantined, overdue to shed and unweighed is still one animal to go and
    // look at — three rows would push out two other animals that also need it.
    const items = collectWorthALook({
      animals: [animal('a', 'Suki', { quarantine_started_at: daysAgo(9) })],
      shedLogsByAnimal: new Map([['a', sheds(30, 45)]]),
      weightLogsByAnimal: new Map([['a', [{ logged_at: daysAgo(200) }]]]),
    }, NOW)
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('shed-overdue')
  })

  it('orders by kind: late sheds, then quarantines, then coming sheds, then weights', () => {
    const items = collectWorthALook({
      animals: [
        animal('w', 'Weighed'),
        animal('s', 'Soon'),
        animal('q', 'Quarantined', { quarantine_started_at: daysAgo(3) }),
        animal('o', 'Overdue'),
      ],
      shedLogsByAnimal: new Map([['o', sheds(30, 45)], ['s', sheds(30, 28)]]),
      weightLogsByAnimal: new Map([['w', [{ logged_at: daysAgo(200) }]]]),
    }, NOW)
    expect(items.map((i) => i.kind)).toEqual([
      'shed-overdue', 'quarantine', 'shed-soon', 'stale-weight',
    ])
  })

  it('puts the worse case first within one kind', () => {
    const items = collectWorthALook({
      animals: [animal('a', 'Mild'), animal('b', 'Bad')],
      shedLogsByAnimal: noSheds,
      weightLogsByAnimal: new Map([
        ['a', [{ logged_at: daysAgo(150) }]],
        ['b', [{ logged_at: daysAgo(300) }]],
      ]),
    }, NOW)
    expect(items.map((i) => i.animalName)).toEqual(['Bad', 'Mild'])
  })

  it('breaks an exact tie by name, so the order does not shuffle between renders', () => {
    const items = collectWorthALook({
      animals: [animal('a', 'Zara'), animal('b', 'Aldo')],
      shedLogsByAnimal: noSheds,
      weightLogsByAnimal: new Map([
        ['a', [{ logged_at: daysAgo(200) }]],
        ['b', [{ logged_at: daysAgo(200) }]],
      ]),
    }, NOW)
    expect(items.map((i) => i.animalName)).toEqual(['Aldo', 'Zara'])
  })

  it('caps the list, because past four rows it is another queue to triage', () => {
    const animals = [1, 2, 3, 4, 5, 6].map((n) => animal(`a${n}`, `Animal ${n}`, {
      quarantine_started_at: daysAgo(n),
    }))
    const items = collectWorthALook({
      animals, shedLogsByAnimal: noSheds, weightLogsByAnimal: noWeights,
    }, NOW)
    expect(items).toHaveLength(MAX_ITEMS)
  })

  it('never renders a hole in a detail string', () => {
    // Every branch builds its detail by interpolation, so a null slipping into
    // one shows up as the literal text "undefined" on the dashboard rather than
    // as an error anywhere. Cheap to assert across all four kinds at once.
    const items = collectWorthALook({
      animals: [
        animal('o', 'Overdue'),
        animal('s', 'Soon'),
        animal('q', 'Quarantined', { quarantine_started_at: daysAgo(3) }),
        animal('w', 'Weighed'),
      ],
      shedLogsByAnimal: new Map([['o', sheds(30, 45)], ['s', sheds(30, 28)]]),
      weightLogsByAnimal: new Map([['w', [{ logged_at: daysAgo(200) }]]]),
    }, NOW)
    expect(items).toHaveLength(4)
    for (const item of items) {
      expect(item.detail).not.toContain('undefined')
      expect(item.detail).not.toContain('null')
      expect(item.detail).not.toContain('NaN')
    }
  })

  it('ignores logs belonging to an animal that is not in the list', () => {
    const items = collectWorthALook({
      animals: [animal('a', 'Suki')],
      shedLogsByAnimal: new Map([['ghost', sheds(30, 45)]]),
      weightLogsByAnimal: new Map([['ghost', [{ logged_at: daysAgo(300) }]]]),
    }, NOW)
    expect(items).toEqual([])
  })
})
