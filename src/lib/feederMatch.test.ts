import { describe, it, expect } from 'vitest'
import { findMatchingFeeder } from './feederMatch'

// The names the app actually ships: prey types from lib/preyTypes.ts, feeder
// names from the presets in Expenses.tsx. Stock deduction depends on these
// two independently-authored lists lining up.
const feeders = [
  { id: 'mice-pinkie', name: 'Mice (Pinkie)' },
  { id: 'mice-adult', name: 'Mice (Adult)' },
  { id: 'rats-pinkie', name: 'Rats (Pinkie)' },
  { id: 'rats-medium', name: 'Rats (Medium)' },
  { id: 'rats-large', name: 'Rats (Large)' },
  { id: 'rats-fuzzie', name: 'Rats (Fuzzie)' },
  { id: 'dubia-medium', name: 'Dubia Roaches (Medium)' },
  { id: 'crickets-small', name: 'Crickets (Small)' },
  { id: 'rabbits-small', name: 'Rabbits (Small)' },
  { id: 'mealworms', name: 'Mealworms' },
  { id: 'bsfl', name: 'BSFL' },
  { id: 'chicks', name: 'Day-old Chicks' },
]
const match = (type: string, size?: string) => findMatchingFeeder(feeders, type, size)?.id ?? null

describe('findMatchingFeeder', () => {
  it('picks the item matching both type and size', () => {
    expect(match('Rat', 'Large')).toBe('rats-large')
    expect(match('Rat', 'Medium')).toBe('rats-medium')
    expect(match('Rat', 'Fuzzie')).toBe('rats-fuzzie')
  })

  // "Mouse" against "Mice (Pinkie)" matched nothing, so no mouse feeding ever
  // deducted stock — and mice are the standard feeder for juvenile snakes.
  it('resolves irregular plurals between the two name lists', () => {
    expect(match('Mouse', 'Pinkie')).toBe('mice-pinkie')
    expect(match('Mouse', 'Adult')).toBe('mice-adult')
  })

  it('resolves abbreviated preset names', () => {
    expect(match('Black soldier fly larvae')).toBe('bsfl')
  })

  it('handles regular plurals and multi-word names', () => {
    expect(match('Dubia roach', 'Medium')).toBe('dubia-medium')
    expect(match('Cricket', 'Small')).toBe('crickets-small')
    expect(match('Rabbit', 'Small')).toBe('rabbits-small')
    expect(match('Chick', 'Day-old')).toBe('chicks')
  })

  it('falls back to a type match when the size does not resolve', () => {
    expect(match('Rat')).toBe('rats-pinkie')
    expect(match('Rat', 'Colossal')).toBe('rats-pinkie')
    expect(match('Mealworm', 'Medium')).toBe('mealworms')
  })

  it('returns null rather than guessing', () => {
    expect(match('Quail', 'Large')).toBeNull()
    expect(match('')).toBeNull()
  })

  it('never crosses between prey types', () => {
    expect(match('Mouse', 'Large')).not.toBe('rats-large')
    expect(match('Rat', 'Pinkie')).toBe('rats-pinkie')
  })
})
