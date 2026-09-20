// The service worker caches Supabase responses so the app survives a slow
// network. Nothing ever emptied that cache, so a household's records stayed on
// the device indefinitely after sign-out — readable by anyone holding it and by
// any script on the origin.
//
// Only the data caches are cleared. The precache holds the app shell, and
// dropping it on sign-out would force a full re-download and break the offline
// shell for no benefit: it contains no one's records.

export const DATA_CACHE_PREFIX = 'supabase'

/** True for a cache holding a household's data rather than the app shell. */
export function isDataCache(name: string): boolean {
  return name.startsWith(DATA_CACHE_PREFIX)
}

/**
 * Drop every cache holding fetched data. Returns how many were removed.
 *
 * Takes the storage explicitly so it can be exercised without a browser, and
 * tolerates its absence: CacheStorage is undefined in a non-secure context and
 * throws outright when site data is blocked. Sign-out must not fail because a
 * cache would not open.
 */
export async function clearDataCaches(
  storage: Pick<CacheStorage, 'keys' | 'delete'> | undefined
): Promise<number> {
  if (!storage) return 0
  try {
    const names = await storage.keys()
    const targets = names.filter(isDataCache)
    const results = await Promise.all(targets.map((name) => storage.delete(name)))
    return results.filter(Boolean).length
  } catch {
    return 0
  }
}
