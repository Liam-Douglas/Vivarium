import { describe, it, expect } from 'vitest'
import { animalColor, ANIMAL_COLORS } from './animalColors'

const UUIDS = [
  'bea6afee-1f3c-4a21-9a55-2c6f0d5e7b10',
  '0f9c1d22-77ab-4c3e-8f01-91d2a4b6c8e3',
  'c3a7e5b1-2d48-4f90-b6ac-5e10f8d37429',
  '7b21f804-9e6d-42c5-a318-0cb4d95e6f72',
  'd4e80a36-5c19-4b72-9fd0-63a1e7c2b845',
  '19f6c7d3-0a84-4e15-8b2c-7d9f3a61e504',
  'a80d5f61-3b92-47ce-95a4-2f8c1e0b6d37',
  '5e3b9c04-6f1a-4d28-83b7-c0a5d29e4f16',
  'f20c8a75-4d63-49b1-a7e5-8b31c6f0d294',
  '62d1e4f8-8a07-4c36-b9d2-1e5a7f3c08b6',
  '3c7a0b95-1e42-4f8d-96ba-4d80e2c1f573',
  'e91f6d28-7c05-4a3b-8e14-9f2b5d70a6c8',
]

describe('animalColor', () => {
  it('returns the same colour for the same id, every time', () => {
    for (const id of UUIDS) {
      expect(animalColor(id)).toBe(animalColor(id))
    }
  })

  it('only ever returns a colour from the palette', () => {
    for (const id of UUIDS) {
      expect(ANIMAL_COLORS).toContain(animalColor(id))
    }
  })

  it('does not depend on the order ids are seen in', () => {
    const forwards = UUIDS.map(animalColor)
    const backwards = [...UUIDS].reverse().map(animalColor).reverse()
    expect(backwards).toEqual(forwards)
  })

  it('spreads a collection across the palette rather than clustering', () => {
    // The palette has ten entries and collections are usually larger, so
    // collisions are expected; clustering onto one or two colours is not.
    const distinct = new Set(UUIDS.map(animalColor))
    expect(distinct.size).toBeGreaterThanOrEqual(5)
  })

  it('distinguishes ids differing only in their last character', () => {
    // uuids from the same insert batch often share a long prefix.
    const a = animalColor('bea6afee-1f3c-4a21-9a55-2c6f0d5e7b10')
    const b = animalColor('bea6afee-1f3c-4a21-9a55-2c6f0d5e7b11')
    expect(a).not.toBe(b)
  })
})
