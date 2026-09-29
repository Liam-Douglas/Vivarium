import { describe, it, expect } from 'vitest'
import { totalCostCents, costByType } from './healthStats'

const event = (event_type: string, cost_cents: number | null) => ({ event_type, cost_cents })

describe('totalCostCents', () => {
  it('adds up what was spent', () => {
    expect(totalCostCents([event('vet_visit', 12000), event('medication', 3500)])).toBe(15500)
  })

  it('treats an event with no cost as costing nothing', () => {
    expect(totalCostCents([event('observation', null), event('vet_visit', 5000)])).toBe(5000)
  })

  it('is zero for an animal with no events', () => {
    expect(totalCostCents([])).toBe(0)
  })
})

describe('costByType', () => {
  it('groups by type and converts to dollars', () => {
    expect(costByType([
      event('vet_visit', 12000), event('vet_visit', 3000), event('medication', 2500),
    ])).toEqual([
      { type: 'vet visit', cost: 150 },
      { type: 'medication', cost: 25 },
    ])
  })

  it('leaves out a type nobody recorded a cost for', () => {
    // A zero-length bar reads as "this was free" rather than "nobody entered
    // a number", which is the thing that actually happened.
    expect(costByType([event('observation', null), event('shed_assist', 0)])).toEqual([])
  })

  it('is empty for an animal with no events', () => {
    expect(costByType([])).toEqual([])
  })
})
