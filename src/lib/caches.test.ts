import { describe, it, expect, vi } from 'vitest'
import { clearDataCaches, isDataCache } from './caches'

function fakeStorage(names: string[], onDelete?: (name: string) => boolean) {
  return {
    keys: vi.fn(async () => names),
    delete: vi.fn(async (name: string) => (onDelete ? onDelete(name) : true)),
  }
}

describe('isDataCache', () => {
  it('matches the Supabase response caches', () => {
    expect(isDataCache('supabase-cache')).toBe(true)
  })

  it('leaves the app shell precache alone', () => {
    // Dropping this would force a full re-download and break offline start-up,
    // and it holds no one's records.
    expect(isDataCache('workbox-precache-v2-https://example.com/')).toBe(false)
  })
})

describe('clearDataCaches', () => {
  it('deletes only the data caches', async () => {
    const storage = fakeStorage(['supabase-cache', 'workbox-precache-v2', 'images'])
    const removed = await clearDataCaches(storage)
    expect(removed).toBe(1)
    expect(storage.delete).toHaveBeenCalledWith('supabase-cache')
    expect(storage.delete).toHaveBeenCalledTimes(1)
  })

  it('does nothing when CacheStorage is unavailable', async () => {
    // Non-secure contexts and blocked site data both land here.
    await expect(clearDataCaches(undefined)).resolves.toBe(0)
  })

  it('never throws when the cache store rejects', async () => {
    // Sign-out must not fail because a cache would not open.
    const storage = { keys: vi.fn(async () => { throw new Error('denied') }), delete: vi.fn() }
    await expect(clearDataCaches(storage)).resolves.toBe(0)
  })

  it('counts only the deletions that actually happened', async () => {
    const storage = fakeStorage(['supabase-cache', 'supabase-images'], (n) => n === 'supabase-cache')
    await expect(clearDataCaches(storage)).resolves.toBe(1)
  })
})
