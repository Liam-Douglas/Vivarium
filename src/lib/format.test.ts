import { describe, expect, it } from 'vitest'
import { formatAUD, formatWeight, formatWeightRange, formatDay, formatDate } from './format'

describe('formatAUD', () => {
  it('formats cents as dollars', () => {
    expect(formatAUD(9500)).toBe('$95.00')
    expect(formatAUD(5)).toBe('$0.05')
    expect(formatAUD(123456789)).toBe('$1,234,567.89')
  })

  it('puts the minus before the dollar sign, as a true minus', () => {
    expect(formatAUD(-9500)).toBe('−$95.00')
  })

  it('signs positive amounts only when asked', () => {
    expect(formatAUD(12000, { signed: true })).toBe('+$120.00')
    expect(formatAUD(-12000, { signed: true })).toBe('−$120.00')
    expect(formatAUD(0, { signed: true })).toBe('$0.00')
  })
})

describe('formatWeight', () => {
  it('keeps one decimal for the very small', () => {
    expect(formatWeight(0.4)).toBe('0.4g')
    expect(formatWeight(6)).toBe('6g')
  })

  it('stays in whole grams up to 10 kg, as keepers write it', () => {
    expect(formatWeight(62)).toBe('62g')
    expect(formatWeight(1610)).toBe('1610g')
    expect(formatWeight(9999)).toBe('9999g')
  })

  it('switches to kilograms from 10 kg', () => {
    expect(formatWeight(10000)).toBe('10kg')
    expect(formatWeight(98500)).toBe('98.5kg')
    expect(formatWeight(85250)).toBe('85.25kg')
  })

  it('signs changes', () => {
    expect(formatWeight(150, { signed: true })).toBe('+150g')
    expect(formatWeight(-1200, { signed: true })).toBe('−1200g')
    expect(formatWeight(0, { signed: true })).toBe('0g')
    expect(formatWeight(-13500)).toBe('−13.5kg')
  })
})

describe('formatWeightRange', () => {
  it('names the unit once', () => {
    expect(formatWeightRange(120, 180)).toBe('120–180g')
    expect(formatWeightRange(10000, 12500)).toBe('10–12.5kg')
  })

  it('keeps both units when the range crosses 10 kg', () => {
    expect(formatWeightRange(9000, 11000)).toBe('9000g–11kg')
  })
})

describe('dates', () => {
  it('puts the day first', () => {
    expect(formatDay(new Date(2026, 8, 27))).toBe('27 Sep')
    expect(formatDate(new Date(2026, 8, 27))).toBe('27 Sep 2026')
  })
})
