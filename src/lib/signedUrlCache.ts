// Signed URLs expire. A public URL never did, so nothing in this app has ever
// had to think about an <img src> going stale while it is still on screen.
//
// The cache holds the expiry alongside the URL and treats a URL as gone before
// it actually is, because the alternative is handing out a signature with two
// seconds left on it and watching the image break after it renders.

export interface SignedUrl {
  url: string
  /** Epoch milliseconds. */
  expiresAt: number
}

export type SignedUrlCache = Map<string, SignedUrl>

/**
 * How long before true expiry a URL stops being handed out. Covers the time
 * between reading the cache and the browser finishing the request.
 */
export const EXPIRY_MARGIN_MS = 60_000

export function createCache(): SignedUrlCache {
  return new Map()
}

/** A usable URL for this path, or null when it is absent or too close to expiry. */
export function readCached(
  cache: SignedUrlCache,
  path: string,
  now: number = Date.now()
): string | null {
  const hit = cache.get(path)
  if (!hit) return null
  if (hit.expiresAt - EXPIRY_MARGIN_MS <= now) return null
  return hit.url
}

export function writeCached(
  cache: SignedUrlCache,
  path: string,
  url: string,
  expiresInSeconds: number,
  now: number = Date.now()
): void {
  cache.set(path, { url, expiresAt: now + expiresInSeconds * 1000 })
}

/**
 * The paths that still need signing — absent, or too close to expiry to use.
 *
 * Deduplicated, because the same photo can appear more than once on a screen
 * and signing it twice is a wasted round trip.
 */
export function pathsNeedingSignature(
  cache: SignedUrlCache,
  paths: readonly string[],
  now: number = Date.now()
): string[] {
  const needed = new Set<string>()
  for (const path of paths) {
    if (readCached(cache, path, now) === null) needed.add(path)
  }
  return [...needed]
}

/** Drop entries that are past use, so a long session does not grow without bound. */
export function pruneExpired(cache: SignedUrlCache, now: number = Date.now()): number {
  let dropped = 0
  for (const [path, entry] of cache) {
    if (entry.expiresAt - EXPIRY_MARGIN_MS <= now) {
      cache.delete(path)
      dropped++
    }
  }
  return dropped
}
