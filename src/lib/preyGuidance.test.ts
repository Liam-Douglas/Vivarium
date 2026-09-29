import { describe, it, expect } from 'vitest'
import { recommendedPreyWeight } from './preyGuidance'

describe('recommendedPreyWeight', () => {
  it('is a tenth to about a seventh of body weight', () => {
    expect(recommendedPreyWeight(1200)).toEqual({ minGrams: 120, maxGrams: 180 })
  })

  it('rounds to whole grams, because nobody weighs a rat to a decimal', () => {
    expect(recommendedPreyWeight(155)).toEqual({ minGrams: 16, maxGrams: 23 })
  })

  it('says nothing about an animal with no weight on record', () => {
    expect(recommendedPreyWeight(null)).toBeNull()
  })

  it('says nothing when the range would round away to nothing', () => {
    // "Recommended prey: 0–0g" is worse than silence, and an animal this small
    // is fed by judgement rather than by arithmetic.
    expect(recommendedPreyWeight(4)).toBeNull()
  })

  it('collapses to a single gram for a very small animal rather than refusing', () => {
    // A 1g pinkie for a 5g hatchling is roughly right, so the advice still
    // holds; it is the phrasing that has to cope, not the arithmetic. The
    // caller renders a range whose ends match as one figure.
    expect(recommendedPreyWeight(5)).toEqual({ minGrams: 1, maxGrams: 1 })
    expect(recommendedPreyWeight(10)).toEqual({ minGrams: 1, maxGrams: 2 })
  })

  it('refuses a weight that is not a weight', () => {
    expect(recommendedPreyWeight(0)).toBeNull()
    expect(recommendedPreyWeight(-500)).toBeNull()
    expect(recommendedPreyWeight(Number.NaN)).toBeNull()
    expect(recommendedPreyWeight(Number.POSITIVE_INFINITY)).toBeNull()
  })
})
