import { describe, it, expect } from 'vitest'
import { filterFeedings, preyTypesIn } from './feedingFilters'

const log = (over: Partial<{ animal_id: string; refused: boolean; prey_type: string; fed_at: string }> = {}) => ({
  animal_id: 'a1',
  refused: false,
  prey_type: 'Rat',
  fed_at: new Date(2026, 8, 14, 12).toISOString(),
  ...over,
})

describe('filterFeedings', () => {
  it('returns everything when nothing is set', () => {
    const logs = [log(), log({ refused: true })]
    expect(filterFeedings(logs, {})).toHaveLength(2)
  })

  it('filters by animal', () => {
    const logs = [log({ animal_id: 'a1' }), log({ animal_id: 'a2' })]
    expect(filterFeedings(logs, { animalId: 'a2' })).toEqual([logs[1]])
  })

  it('separates refusals from feedings', () => {
    const logs = [log({ refused: false }), log({ refused: true })]
    expect(filterFeedings(logs, { outcome: 'refused' })).toEqual([logs[1]])
    expect(filterFeedings(logs, { outcome: 'fed' })).toEqual([logs[0]])
    expect(filterFeedings(logs, { outcome: 'all' })).toHaveLength(2)
  })

  it('matches prey type regardless of how it was typed', () => {
    const logs = [log({ prey_type: 'Rat' }), log({ prey_type: 'rat' }), log({ prey_type: 'Mouse' })]
    expect(filterFeedings(logs, { preyType: 'RAT' })).toHaveLength(2)
  })

  it('keeps entries on the since boundary itself', () => {
    const boundary = new Date(2026, 8, 14, 12)
    const logs = [log({ fed_at: boundary.toISOString() })]
    expect(filterFeedings(logs, { since: boundary })).toHaveLength(1)
  })

  it('drops entries before the window and entries with no usable date', () => {
    const logs = [
      log({ fed_at: new Date(2026, 8, 14).toISOString() }),
      log({ fed_at: new Date(2026, 0, 1).toISOString() }),
      log({ fed_at: 'not a date' }),
    ]
    expect(filterFeedings(logs, { since: new Date(2026, 8, 1) })).toEqual([logs[0]])
  })

  it('applies every active filter together', () => {
    const logs = [
      log({ animal_id: 'a1', refused: true, prey_type: 'Rat' }),
      log({ animal_id: 'a1', refused: true, prey_type: 'Mouse' }),
      log({ animal_id: 'a2', refused: true, prey_type: 'Rat' }),
    ]
    expect(filterFeedings(logs, { animalId: 'a1', outcome: 'refused', preyType: 'Rat' })).toEqual([logs[0]])
  })
})

describe('preyTypesIn', () => {
  it('lists each prey type once, alphabetically', () => {
    const logs = [log({ prey_type: 'Rat' }), log({ prey_type: 'Mouse' }), log({ prey_type: 'Rat' })]
    expect(preyTypesIn(logs)).toEqual(['Mouse', 'Rat'])
  })

  it('folds spellings together, keeping the first one seen', () => {
    const logs = [log({ prey_type: 'Rat' }), log({ prey_type: 'RAT' }), log({ prey_type: 'rat' })]
    expect(preyTypesIn(logs)).toEqual(['Rat'])
  })

  it('returns nothing for an empty log', () => {
    expect(preyTypesIn([])).toEqual([])
  })
})
