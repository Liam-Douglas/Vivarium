import { describe, it, expect } from 'vitest'
import { loadState, isBlocking } from './loadState'

describe('loadState', () => {
  it('is loading on a first load with nothing held', () => {
    expect(loadState({ loading: true, error: null, count: 0 })).toBe('loading')
  })

  it('is an error when a load fails with nothing to fall back on', () => {
    expect(loadState({ loading: false, error: 'Network error', count: 0 })).toBe('error')
  })

  it('is stale, not error, when a refresh fails over rows already held', () => {
    // The distinction is the point: throwing away good rows because a refresh
    // failed is worse than showing them with a warning.
    expect(loadState({ loading: false, error: 'Network error', count: 12 })).toBe('stale')
  })

  it('is empty only once a load has succeeded and returned nothing', () => {
    expect(loadState({ loading: false, error: null, count: 0 })).toBe('empty')
  })

  it('is ready with rows and no error', () => {
    expect(loadState({ loading: false, error: null, count: 12 })).toBe('ready')
  })

  it('stays ready while refreshing over rows already on screen', () => {
    expect(loadState({ loading: true, error: null, count: 12 })).toBe('ready')
  })

  it('never reports empty while a load is in flight', () => {
    // The bug this module exists to prevent: an in-flight or failed load
    // rendering as "you have no records".
    const states = [
      loadState({ loading: true, error: null, count: 0 }),
      loadState({ loading: false, error: 'boom', count: 0 }),
      loadState({ loading: true, error: 'boom', count: 0 }),
    ]
    expect(states).not.toContain('empty')
  })
})

describe('isBlocking', () => {
  it('is true for the states that replace the page content', () => {
    expect(isBlocking('loading')).toBe(true)
    expect(isBlocking('error')).toBe(true)
    expect(isBlocking('empty')).toBe(true)
  })

  it('is false where rows are rendered alongside', () => {
    expect(isBlocking('ready')).toBe(false)
    expect(isBlocking('stale')).toBe(false)
  })
})
