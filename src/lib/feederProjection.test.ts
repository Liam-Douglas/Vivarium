import { describe, it, expect } from 'vitest'
import { projectFeederDemand, type UsualMeal } from './feederProjection'

const NOW = new Date('2026-09-01T09:00:00')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

const feeders = [
  { id: 'rats-medium', name: 'Rats (Medium)', currentStock: 4 },
  { id: 'mice-pinkie', name: 'Mice (Pinkie)', currentStock: 20 },
]
const meals = (entries: [string, UsualMeal][]) => new Map(entries)

describe('projectFeederDemand', () => {
  it('counts every feeding the schedules put inside the window', () => {
    // Fed today on a 7-day cycle: due day 7 and day 14, both inside a fortnight.
    const result = projectFeederDemand({
      animals: [{ id: 'a1', last_fed_at: daysAgo(0), feeding_frequency_days: 7 }],
      usualMeals: meals([['a1', { preyType: 'Rat', preySize: 'Medium', quantity: 1 }]]),
      feeders, now: NOW,
    })
    expect(result.feeds).toBe(2)
    expect(result.covered).toBe(true)
  })

  it('reports a feeder the fortnight will exhaust', () => {
    // Five animals on a 7-day cycle eat ten medium rats; there are four.
    const animals = Array.from({ length: 5 }, (_, i) => ({
      id: `a${i}`, last_fed_at: daysAgo(0), feeding_frequency_days: 7,
    }))
    const result = projectFeederDemand({
      animals,
      usualMeals: meals(animals.map((a) => [a.id, { preyType: 'Rat', preySize: 'Medium', quantity: 1 }])),
      feeders, now: NOW,
    })
    expect(result.covered).toBe(false)
    expect(result.short).toHaveLength(1)
    expect(result.short[0]).toMatchObject({ needed: 10, stock: 4 })
    expect(result.short[0].feeder.id).toBe('rats-medium')
  })

  it('multiplies by the quantity actually fed', () => {
    const result = projectFeederDemand({
      animals: [{ id: 'a1', last_fed_at: daysAgo(0), feeding_frequency_days: 14 }],
      usualMeals: meals([['a1', { preyType: 'Mouse', preySize: 'Pinkie', quantity: 25 }]]),
      feeders, now: NOW,
    })
    // One feeding of 25 pinkies against 20 in stock — and "Mouse" has to reach
    // the "Mice (Pinkie)" preset for this to register at all.
    expect(result.short[0].feeder.id).toBe('mice-pinkie')
    expect(result.short[0].needed).toBe(25)
  })

  it('still owes the meals an overdue animal has missed', () => {
    const result = projectFeederDemand({
      animals: [{ id: 'a1', last_fed_at: daysAgo(30), feeding_frequency_days: 7 }],
      usualMeals: meals([['a1', { preyType: 'Rat', preySize: 'Medium', quantity: 1 }]]),
      feeders, now: NOW,
    })
    expect(result.feeds).toBeGreaterThan(0)
  })

  it('ignores animals with no schedule and prey it cannot match', () => {
    const result = projectFeederDemand({
      animals: [
        { id: 'a1', last_fed_at: daysAgo(0), feeding_frequency_days: null },
        { id: 'a2', last_fed_at: daysAgo(0), feeding_frequency_days: 7 },
      ],
      usualMeals: meals([['a2', { preyType: 'Quail', quantity: 1 }]]),
      feeders, now: NOW,
    })
    expect(result.feeds).toBe(2)
    expect(result.covered).toBe(true)
  })
})
