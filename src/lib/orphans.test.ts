import { describe, it, expect } from 'vitest'
import { classifyFeedingLogs, type AnimalRef, type LogRef } from './orphans'

const active = (id: string, name: string): AnimalRef => ({ id, name, is_active: true })
const archived = (id: string, name: string): AnimalRef => ({ id, name, is_active: false })
const log = (id: string, animal_id: string | null): LogRef => ({ id, animal_id })

describe('classifyFeedingLogs', () => {
  it('leaves records on a living animal alone', () => {
    const r = classifyFeedingLogs([active('a1', 'Monty')], [log('l1', 'a1')])
    expect(r.orphaned).toEqual([])
    expect(r.onArchived).toEqual([])
  })

  it('does not call an archived animal\'s history orphaned', () => {
    const r = classifyFeedingLogs([archived('a1', 'Monty')], [log('l1', 'a1')])
    expect(r.orphaned).toEqual([])
    expect(r.onArchived.map((l) => l.id)).toEqual(['l1'])
  })

  it('reports a record whose animal row is genuinely gone', () => {
    const r = classifyFeedingLogs([active('a1', 'Ivy')], [log('l1', 'deleted-id')])
    expect(r.orphaned.map((l) => l.id)).toEqual(['l1'])
    expect(r.onArchived).toEqual([])
  })

  it('ignores a record that was never attached to an animal', () => {
    const r = classifyFeedingLogs([active('a1', 'Ivy')], [log('l1', null)])
    expect(r.orphaned).toEqual([])
    expect(r.onArchived).toEqual([])
  })

  // The regression that matters: this exact shape used to classify the archived
  // animal's history as orphaned-and-fixable, and the repair moved it onto the
  // new animal of the same name.
  it('keeps an archived animal\'s history away from a new animal sharing its name', () => {
    const animals = [archived('old-monty', 'Monty'), active('new-monty', 'Monty')]
    const logs = [log('l1', 'old-monty'), log('l2', 'old-monty'), log('l3', 'new-monty')]

    const r = classifyFeedingLogs(animals, logs)

    expect(r.orphaned).toEqual([])                                  // nothing to "repair"
    expect(r.onArchived.map((l) => l.id)).toEqual(['l1', 'l2'])     // reported, not moved
  })

  it('handles a mixed collection', () => {
    const animals = [active('a1', 'Ivy'), archived('a2', 'Pascal'), active('a3', 'Root')]
    const logs = [
      log('l1', 'a1'), log('l2', 'a2'), log('l3', 'a3'),
      log('l4', 'gone'), log('l5', null), log('l6', 'a2'),
    ]
    const r = classifyFeedingLogs(animals, logs)
    expect(r.orphaned.map((l) => l.id)).toEqual(['l4'])
    expect(r.onArchived.map((l) => l.id)).toEqual(['l2', 'l6'])
  })
})
