import { describe, it, expect } from 'vitest'
import { latestWeightByAnimal } from './latestWeights'

const at = (animal_id: string, day: number, grams: number) => ({
  animal_id,
  logged_at: new Date(2026, 0, day, 12).toISOString(),
  weight_grams: grams,
})

describe('latestWeightByAnimal', () => {
  it('gives each animal its most recent weigh-in', () => {
    const map = latestWeightByAnimal(
      [{ id: 'a' }, { id: 'b' }],
      [at('a', 1, 900), at('b', 5, 400), at('a', 20, 1250), at('b', 1, 380)]
    )
    expect(map.get('a')).toBe(1250)
    expect(map.get('b')).toBe(400)
  })

  it('does not let one animal read another animal weights', () => {
    // The bug this shape invites: a lookup that forgets to filter by animal
    // and hands everybody the heaviest snake in the collection.
    const map = latestWeightByAnimal([{ id: 'a' }, { id: 'b' }], [at('a', 1, 5000)])
    expect(map.get('a')).toBe(5000)
    expect(map.get('b')).toBeNull()
  })

  it('falls back to the stored column only for an animal with no logs', () => {
    const map = latestWeightByAnimal(
      [{ id: 'a', weight_grams: 800 }, { id: 'b', weight_grams: 800 }],
      [at('a', 1, 1250)]
    )
    expect(map.get('a')).toBe(1250)
    expect(map.get('b')).toBe(800)
  })

  it('is null for an animal with neither, so the export writes a blank', () => {
    expect(latestWeightByAnimal([{ id: 'a' }], []).get('a')).toBeNull()
    expect(latestWeightByAnimal([{ id: 'a', weight_grams: null }], []).get('a')).toBeNull()
  })

  it('has an entry for every animal, present or not', () => {
    // The export reads this per row; a missing key and a null mean the same
    // thing there, but only one of them is deliberate.
    const map = latestWeightByAnimal([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [])
    expect([...map.keys()].sort()).toEqual(['a', 'b', 'c'])
  })

  it('ignores logs for an animal that is not in the list', () => {
    const map = latestWeightByAnimal([{ id: 'a' }], [at('ghost', 1, 9999)])
    expect(map.size).toBe(1)
    expect(map.get('a')).toBeNull()
  })
})
