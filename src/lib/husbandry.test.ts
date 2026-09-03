import { describe, it, expect } from 'vitest'
import { buildAttentionItems, predictNextShed, type HusbandryAnimal } from './husbandry'

const NOW = new Date('2026-09-01T09:00:00')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

const animal = (over: Partial<HusbandryAnimal> & { id: string; name: string }): HusbandryAnimal => ({
  feeding_frequency_days: 14,
  last_fed_at: daysAgo(2),
  quarantine_started_at: null,
  quarantine_ended_at: null,
  ...over,
})

const healthy = [animal({ id: 'a1', name: 'Kaa' }), animal({ id: 'a2', name: 'Monty' })]

describe('predictNextShed', () => {
  it('averages the recent intervals', () => {
    const dates = [new Date('2026-08-01'), new Date('2026-06-02'), new Date('2026-04-03')]
    // Two 60-day gaps, so the next lands 60 days after the latest.
    expect(predictNextShed(dates)).toEqual(new Date('2026-09-30'))
  })

  it('needs three sheds before it will guess', () => {
    expect(predictNextShed([new Date('2026-08-01'), new Date('2026-06-02')])).toBeNull()
    expect(predictNextShed([new Date('2026-08-01')])).toBeNull()
    expect(predictNextShed([])).toBeNull()
  })

  it('does not care what order the sheds arrive in', () => {
    const asc = [new Date('2026-04-03'), new Date('2026-06-02'), new Date('2026-08-01')]
    expect(predictNextShed(asc)).toEqual(new Date('2026-09-30'))
  })
})

describe('buildAttentionItems', () => {
  it('says nothing about a collection with nothing to say', () => {
    expect(buildAttentionItems({ animals: healthy, weights: [], sheds: [], now: NOW })).toEqual([])
  })

  it('leads with animals no queue can reach', () => {
    const items = buildAttentionItems({
      animals: [...healthy, animal({ id: 'a3', name: 'Ivy', feeding_frequency_days: null })],
      weights: [], sheds: [], now: NOW,
    })
    expect(items[0].id).toBe('unscheduled')
    expect(items[0].title).toBe('1 animal has no feeding schedule')
    expect(items[0].detail).toContain('Ivy')
  })

  it('separates never-fed from unscheduled', () => {
    const items = buildAttentionItems({
      animals: [animal({ id: 'a3', name: 'Root', last_fed_at: null })],
      weights: [], sheds: [], now: NOW,
    })
    expect(items.map((i) => i.id)).toEqual(['never-fed'])
  })

  it('reports the longest-unweighed animal and counts the rest', () => {
    const items = buildAttentionItems({
      animals: healthy,
      weights: [
        { animal_id: 'a1', at: daysAgo(120) },
        { animal_id: 'a2', at: daysAgo(95) },
      ],
      sheds: [], now: NOW,
    })
    expect(items[0].title).toBe('Kaa has not been weighed in 120 days')
    expect(items[0].detail).toBe('1 other also over 90 days')
  })

  it('uses the most recent weight, not the oldest', () => {
    const items = buildAttentionItems({
      animals: [animal({ id: 'a1', name: 'Kaa' })],
      weights: [{ animal_id: 'a1', at: daysAgo(200) }, { animal_id: 'a1', at: daysAgo(3) }],
      sheds: [], now: NOW,
    })
    expect(items).toEqual([])
  })

  it('flags a shed predicted for today', () => {
    // Two 4-day intervals from 28 Aug puts the next shed on 1 Sep, which is now.
    const sheds = [
      { animal_id: 'a1', at: '2026-08-28' },
      { animal_id: 'a1', at: '2026-08-24' },
      { animal_id: 'a1', at: '2026-08-20' },
    ]
    const items = buildAttentionItems({ animals: healthy, weights: [], sheds, now: NOW })
    expect(items[0].id).toBe('shed-due')
    expect(items[0].title).toBe('Kaa is due to shed today')
  })

  it('flags a shed that is already late', () => {
    const sheds = [
      { animal_id: 'a1', at: '2026-08-20' },
      { animal_id: 'a1', at: '2026-08-16' },
      { animal_id: 'a1', at: '2026-08-12' },
    ]
    const items = buildAttentionItems({ animals: healthy, weights: [], sheds, now: NOW })
    expect(items[0].title).toBe('Kaa was due to shed 8 days ago')
  })

  it('stays quiet about a shed far outside the horizon', () => {
    const sheds = [
      { animal_id: 'a1', at: '2026-08-28' },
      { animal_id: 'a1', at: '2026-06-28' },
      { animal_id: 'a1', at: '2026-04-28' },
    ]
    expect(buildAttentionItems({ animals: healthy, weights: [], sheds, now: NOW })).toEqual([])
  })

  it('counts quarantine from the day it started', () => {
    const items = buildAttentionItems({
      animals: [animal({ id: 'a1', name: 'Pascal', quarantine_started_at: daysAgo(34) })],
      weights: [], sheds: [], now: NOW,
    })
    expect(items[0].title).toBe('Pascal is on day 34 of quarantine')
  })

  it('ignores a quarantine that has ended', () => {
    const items = buildAttentionItems({
      animals: [animal({ id: 'a1', name: 'Pascal', quarantine_started_at: daysAgo(34), quarantine_ended_at: daysAgo(2) })],
      weights: [], sheds: [], now: NOW,
    })
    expect(items).toEqual([])
  })

  it('caps the list so it can never crowd a busy day', () => {
    const items = buildAttentionItems({
      animals: [
        animal({ id: 'a1', name: 'Ivy', feeding_frequency_days: null }),
        animal({ id: 'a2', name: 'Root', last_fed_at: null }),
        animal({ id: 'a3', name: 'Kaa', quarantine_started_at: daysAgo(10) }),
        animal({ id: 'a4', name: 'Monty' }),
      ],
      weights: [{ animal_id: 'a4', at: daysAgo(120) }],
      sheds: [
        { animal_id: 'a4', at: '2026-08-28' },
        { animal_id: 'a4', at: '2026-08-24' },
        { animal_id: 'a4', at: '2026-08-20' },
      ],
      now: NOW,
    })
    expect(items).toHaveLength(4)
    expect(items[0].id).toBe('unscheduled')
  })
})
