import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readJson, writeJson, readPositiveNumber, remove } from './localStore'

// A minimal localStorage, so the tests can make it misbehave on purpose.
function installStorage(impl?: Partial<Storage>) {
  const data = new Map<string, string>()
  const store: Storage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, String(v)) },
    removeItem: (k) => { data.delete(k) },
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    get length() { return data.size },
    ...impl,
  } as Storage
  vi.stubGlobal('localStorage', store)
  return data
}

beforeEach(() => installStorage())
afterEach(() => vi.unstubAllGlobals())

describe('readJson', () => {
  it('round-trips a value', () => {
    writeJson('k', { feeder_stock: 40 })
    expect(readJson('k', {})).toEqual({ feeder_stock: 40 })
  })

  it('falls back when the key is absent', () => {
    expect(readJson('missing', { a: 1 })).toEqual({ a: 1 })
  })

  it('falls back on corrupt JSON instead of throwing', () => {
    // This is the case that used to take the Expenses page down on render.
    installStorage().set('k', '{not json')
    expect(() => readJson('k', {})).not.toThrow()
    expect(readJson('k', { safe: true })).toEqual({ safe: true })
  })

  it('falls back when stored JSON is literally null', () => {
    installStorage().set('k', 'null')
    expect(readJson('k', { safe: true })).toEqual({ safe: true })
  })

  it('falls back when storage itself throws', () => {
    installStorage({ getItem: () => { throw new DOMException('denied') } })
    expect(readJson('k', 'fallback')).toBe('fallback')
  })
})

describe('writeJson', () => {
  it('reports success', () => {
    expect(writeJson('k', [1, 2])).toBe(true)
  })

  it('reports failure rather than throwing when the quota is full', () => {
    installStorage({ setItem: () => { throw new DOMException('QuotaExceededError') } })
    expect(() => writeJson('k', [1])).not.toThrow()
    expect(writeJson('k', [1])).toBe(false)
  })
})

describe('readPositiveNumber', () => {
  it('reads a number', () => {
    installStorage().set('k', '850')
    expect(readPositiveNumber('k')).toBe(850)
  })

  it.each(['', '   ', 'abc', 'NaN', '0', '-5', 'Infinity'])('rejects %o', (raw) => {
    installStorage().set('k', raw)
    expect(readPositiveNumber('k')).toBeNull()
  })

  it('returns null when absent', () => {
    expect(readPositiveNumber('missing')).toBeNull()
  })
})

describe('remove', () => {
  it('deletes the key', () => {
    writeJson('k', 1)
    remove('k')
    expect(readJson('k', 'gone')).toBe('gone')
  })

  it('does not throw when storage is unavailable', () => {
    installStorage({ removeItem: () => { throw new DOMException('denied') } })
    expect(() => remove('k')).not.toThrow()
  })
})
