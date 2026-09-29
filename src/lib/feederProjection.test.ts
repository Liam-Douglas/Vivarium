import { describe, it, expect } from 'vitest'
import { projectFeederStock, needsRestocking, type Projection } from './feederProjection'

const NOW = new Date(2026, 8, 21, 12)
const item = (over: Partial<{ id: string; currentStock: number; low_stock_threshold: number }> = {}) => ({
  id: 'rats', currentStock: 20, low_stock_threshold: 5, ...over,
})

describe('projectFeederStock', () => {
  it('divides stock by the rate the collection actually eats', () => {
    // Two snakes, one rat each, every 10 days → 0.2 rats a day → 100 days.
    const [p] = projectFeederStock([item()], [
      { itemId: 'rats', everyDays: 10, quantity: 1 },
      { itemId: 'rats', everyDays: 10, quantity: 1 },
    ], NOW)
    expect(p.perDay).toBeCloseTo(0.2)
    expect(p.daysRemaining).toBe(100)
  })

  it('gives no date for an item nothing is scheduled against', () => {
    // The question "when does this run out" has no answer, and inventing one
    // would be worse than the threshold it replaces.
    const [p] = projectFeederStock([item()], [], NOW)
    expect(p.daysRemaining).toBeNull()
    expect(p.runsOutOn).toBeNull()
    expect(p.perDay).toBe(0)
  })

  it('sums demand across animals on different intervals', () => {
    const [p] = projectFeederStock([item({ currentStock: 30 })], [
      { itemId: 'rats', everyDays: 7, quantity: 1 },
      { itemId: 'rats', everyDays: 14, quantity: 2 },
    ], NOW)
    expect(p.perDay).toBeCloseTo(1 / 7 + 2 / 14)
    expect(p.daysRemaining).toBe(105)
  })

  it('ignores demand with a nonsensical interval or quantity', () => {
    // Dividing by zero would make perDay Infinity and every projection zero.
    const [p] = projectFeederStock([item()], [
      { itemId: 'rats', everyDays: 0, quantity: 1 },
      { itemId: 'rats', everyDays: -7, quantity: 1 },
      { itemId: 'rats', everyDays: 10, quantity: 0 },
    ], NOW)
    expect(p.perDay).toBe(0)
    expect(p.daysRemaining).toBeNull()
  })

  it('reports nothing left rather than a negative number', () => {
    const [p] = projectFeederStock([item({ currentStock: 0 })], [
      { itemId: 'rats', everyDays: 7, quantity: 1 },
    ], NOW)
    expect(p.daysRemaining).toBe(0)
    expect(p.runsOutOn?.getDate()).toBe(21)
  })

  it('rounds down, because a part-used feeding is not a feeding', () => {
    // 10 units at 1 every 3 days = 30 days exactly; 11 units gives 33.
    const [p] = projectFeederStock([item({ currentStock: 11 })], [
      { itemId: 'rats', everyDays: 3, quantity: 1 },
    ], NOW)
    expect(p.daysRemaining).toBe(33)
  })

  it('keeps the threshold verdict alongside the projection', () => {
    const [p] = projectFeederStock([item({ currentStock: 3, low_stock_threshold: 5 })], [], NOW)
    expect(p.belowThreshold).toBe(true)
  })

  it('projects every item, including ones with no demand', () => {
    const projections = projectFeederStock(
      [item({ id: 'rats' }), item({ id: 'mice' })],
      [{ itemId: 'rats', everyDays: 7, quantity: 1 }],
      NOW
    )
    expect(projections.map((p) => p.itemId)).toEqual(['rats', 'mice'])
    expect(projections[1].daysRemaining).toBeNull()
  })
})

describe('needsRestocking', () => {
  const projected = (daysRemaining: number | null, belowThreshold = false): Projection => ({
    itemId: 'rats', perDay: 1, daysRemaining, runsOutOn: null, belowThreshold,
  })

  it('flags an item running out inside the horizon', () => {
    expect(needsRestocking(projected(14))).toBe(true)
    expect(needsRestocking(projected(15))).toBe(false)
  })

  it('falls back to the threshold when there is no projection', () => {
    // An item nothing is scheduled against still has a number someone set.
    expect(needsRestocking(projected(null, true))).toBe(true)
    expect(needsRestocking(projected(null, false))).toBe(false)
  })

  it('prefers the projection over the threshold when both are available', () => {
    // Plenty of stock by the old measure, but three days at the current rate.
    expect(needsRestocking(projected(3, false))).toBe(true)
    // Below the threshold, but four months of stock at the current rate.
    expect(needsRestocking(projected(120, true))).toBe(false)
  })
})
