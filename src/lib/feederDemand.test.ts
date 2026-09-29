import { describe, it, expect } from 'vitest'
import { lastMealPerAnimal, deriveFeederDemand, restockList } from './feederDemand'

const meal = (over = {}) => ({
  prey_type: 'Rat', prey_size: 'Medium', quantity: 1, refused: false, ...over,
})

const item = (id: string, name: string, currentStock: number, low_stock_threshold = 4) =>
  ({ id, name, currentStock, low_stock_threshold })

describe('lastMealPerAnimal', () => {
  it('keeps the most recent meal per animal whatever order they arrive in', () => {
    const logs = [
      { animal_id: 'a', fed_at: '2026-01-01T00:00:00Z', id: 'old' },
      { animal_id: 'a', fed_at: '2026-03-01T00:00:00Z', id: 'new' },
      { animal_id: 'b', fed_at: '2026-02-01T00:00:00Z', id: 'b1' },
    ]
    expect(lastMealPerAnimal(logs).get('a')?.id).toBe('new')
    expect(lastMealPerAnimal([...logs].reverse()).get('a')?.id).toBe('new')
    expect(lastMealPerAnimal(logs).get('b')?.id).toBe('b1')
  })
})

describe('deriveFeederDemand', () => {
  const feeders = [item('rats', 'Rats (Medium)', 10), item('mice', 'Mice (Pinkie)', 10)]

  it('attributes an animal to the item matching what it last ate', () => {
    const demand = deriveFeederDemand(
      [{ id: 'a', feeding_frequency_days: 14 }],
      new Map([['a', meal()]]),
      feeders
    )
    expect(demand).toEqual([{ itemId: 'rats', everyDays: 14, quantity: 1 }])
  })

  it('skips an animal whose last meal was refused', () => {
    // A refusal records what was offered, not what came out of the freezer.
    const demand = deriveFeederDemand(
      [{ id: 'a', feeding_frequency_days: 14 }],
      new Map([['a', meal({ refused: true })]]),
      feeders
    )
    expect(demand).toEqual([])
  })

  it('skips an animal with no schedule, and one with no meal on record', () => {
    expect(deriveFeederDemand(
      [{ id: 'a', feeding_frequency_days: null }], new Map([['a', meal()]]), feeders
    )).toEqual([])
    expect(deriveFeederDemand(
      [{ id: 'a', feeding_frequency_days: 14 }], new Map(), feeders
    )).toEqual([])
  })

  it('skips a meal nothing in the inventory matches', () => {
    expect(deriveFeederDemand(
      [{ id: 'a', feeding_frequency_days: 14 }],
      new Map([['a', meal({ prey_type: 'Quail', prey_size: null })]]),
      feeders
    )).toEqual([])
  })

  it('adds up several animals drawing on one item', () => {
    const demand = deriveFeederDemand(
      [{ id: 'a', feeding_frequency_days: 14 }, { id: 'b', feeding_frequency_days: 7 }],
      new Map([['a', meal()], ['b', meal({ quantity: 2 })]]),
      feeders
    )
    expect(demand).toEqual([
      { itemId: 'rats', everyDays: 14, quantity: 1 },
      { itemId: 'rats', everyDays: 7, quantity: 2 },
    ])
  })
})

describe('restockList', () => {
  it('flags an item running out inside the horizon', () => {
    const list = restockList(
      [item('rats', 'Rats (Medium)', 1)],
      [{ itemId: 'rats', everyDays: 14, quantity: 1 }]
    )
    expect(list).toHaveLength(1)
    expect(list[0].item.id).toBe('rats')
    expect(list[0].projection.daysRemaining).toBe(14)
  })

  it('falls back to the threshold for an item nothing is scheduled against', () => {
    const list = restockList([item('mice', 'Mice (Pinkie)', 1, 4)], [])
    expect(list).toHaveLength(1)
    expect(list[0].projection.daysRemaining).toBeNull()
    expect(list[0].projection.belowThreshold).toBe(true)
  })

  it('leaves alone an item with plenty and nothing scheduled against it', () => {
    expect(restockList([item('crickets', 'Crickets (Large)', 500, 50)], [])).toEqual([])
  })

  it('judges every item by the same horizon, not by its position', () => {
    // The regression this exists for: `.filter(needsRestocking)` hands the
    // array index to the function's `horizonDays` parameter, so the first item
    // is checked against nought days, the second against one, and so on. Each
    // of these has a fortnight left and every one of them should be flagged;
    // under that bug only the item at index 14 or beyond would be.
    const items = Array.from({ length: 5 }, (_, i) => item(`i${i}`, `Item ${i}`, 1, 0))
    const demand = items.map((it) => ({ itemId: it.id, everyDays: 14, quantity: 1 }))
    const list = restockList(items, demand)
    expect(list.map((entry) => entry.item.id)).toEqual(['i0', 'i1', 'i2', 'i3', 'i4'])
  })
})
