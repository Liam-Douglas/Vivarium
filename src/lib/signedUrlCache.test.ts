import { describe, it, expect } from 'vitest'
import {
  createCache, readCached, writeCached, pathsNeedingSignature, pruneExpired,
  EXPIRY_MARGIN_MS,
} from './signedUrlCache'

const NOW = 1_800_000_000_000
const HOUR = 3600

describe('readCached', () => {
  it('returns a URL that is comfortably live', () => {
    const cache = createCache()
    writeCached(cache, 'a.jpg', 'https://signed/a', HOUR, NOW)
    expect(readCached(cache, 'a.jpg', NOW)).toBe('https://signed/a')
  })

  it('returns null for a path it has never seen', () => {
    expect(readCached(createCache(), 'a.jpg', NOW)).toBeNull()
  })

  it('treats a URL as gone before it actually expires', () => {
    // The margin is the point: handing out a signature with seconds left means
    // the image breaks after it renders, which is worse than signing again.
    const cache = createCache()
    writeCached(cache, 'a.jpg', 'https://signed/a', HOUR, NOW)
    const justInsideMargin = NOW + HOUR * 1000 - EXPIRY_MARGIN_MS + 1
    expect(readCached(cache, 'a.jpg', justInsideMargin)).toBeNull()
  })

  it('still serves a URL just outside the margin', () => {
    const cache = createCache()
    writeCached(cache, 'a.jpg', 'https://signed/a', HOUR, NOW)
    expect(readCached(cache, 'a.jpg', NOW + HOUR * 1000 - EXPIRY_MARGIN_MS - 1)).toBe('https://signed/a')
  })
})

describe('pathsNeedingSignature', () => {
  it('asks only for what is missing', () => {
    const cache = createCache()
    writeCached(cache, 'have.jpg', 'https://signed/have', HOUR, NOW)
    expect(pathsNeedingSignature(cache, ['have.jpg', 'need.jpg'], NOW)).toEqual(['need.jpg'])
  })

  it('deduplicates a photo that appears more than once on a screen', () => {
    const cache = createCache()
    expect(pathsNeedingSignature(cache, ['a.jpg', 'a.jpg', 'b.jpg'], NOW)).toEqual(['a.jpg', 'b.jpg'])
  })

  it('asks again for anything inside the expiry margin', () => {
    const cache = createCache()
    writeCached(cache, 'a.jpg', 'https://signed/a', HOUR, NOW)
    expect(pathsNeedingSignature(cache, ['a.jpg'], NOW + HOUR * 1000)).toEqual(['a.jpg'])
  })

  it('asks for nothing when everything is live', () => {
    const cache = createCache()
    writeCached(cache, 'a.jpg', 'https://signed/a', HOUR, NOW)
    expect(pathsNeedingSignature(cache, ['a.jpg'], NOW)).toEqual([])
  })
})

describe('pruneExpired', () => {
  it('drops what is past use and keeps what is not', () => {
    const cache = createCache()
    writeCached(cache, 'old.jpg', 'https://signed/old', 10, NOW)
    writeCached(cache, 'fresh.jpg', 'https://signed/fresh', HOUR, NOW)
    expect(pruneExpired(cache, NOW + 60_000)).toBe(1)
    expect(cache.has('old.jpg')).toBe(false)
    expect(cache.has('fresh.jpg')).toBe(true)
  })
})
