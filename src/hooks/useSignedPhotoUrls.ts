import { useEffect, useMemo, useReducer } from 'react'
import { storagePathFrom } from '@/lib/photoPaths'
import {
  createCache, readCached, writeCached, pathsNeedingSignature, pruneExpired,
} from '@/lib/signedUrlCache'
import { createSignedPhotoUrls } from '@/lib/queries'

/** An hour is long enough that a browsing session rarely re-signs. */
const EXPIRES_IN_SECONDS = 3600

/**
 * Shared across components on purpose: the animals grid and an animal's own
 * page show the same photos, and signing them twice would be a round trip for
 * something already in hand. It lives for the tab's lifetime, pruned as it goes.
 */
const cache = createCache()

/**
 * Signed URLs for stored photo values, keyed by the value that was passed in.
 *
 * Callers hold whatever the database gave them — a storage path now, an
 * absolute public URL for every row written before this change — and get back
 * something they can put in an `<img src>`, or nothing while it is being
 * signed.
 */
export function useSignedPhotoUrls(
  stored: readonly (string | null | undefined)[]
): Map<string, string> {
  // A stable key: the array itself is a new object every render.
  const key = stored.filter(Boolean).join('|')
  const [signedVersion, signaturesArrived] = useReducer((n: number) => n + 1, 0)

  const urls = useMemo(() => {
    const resolved = new Map<string, string>()
    for (const value of stored) {
      if (!value) continue
      const path = storagePathFrom(value)
      if (!path) continue
      const url = readCached(cache, path)
      if (url) resolved.set(value, url)
    }
    return resolved
    // signedVersion is the point: it recomputes once signatures land.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, signedVersion])

  useEffect(() => {
    let cancelled = false
    pruneExpired(cache)

    const paths = stored
      .map(storagePathFrom)
      .filter((p): p is string => p !== null)
    const needed = pathsNeedingSignature(cache, paths)
    if (needed.length === 0) return

    createSignedPhotoUrls(needed, EXPIRES_IN_SECONDS)
      .then((signed) => {
        if (cancelled) return
        for (const [path, url] of signed) writeCached(cache, path, url, EXPIRES_IN_SECONDS)
        signaturesArrived()
      })
      .catch(() => {
        // A photo that will not sign renders as the placeholder, which is what
        // a missing photo has always looked like. Failing the whole screen over
        // one image would be worse than the image being absent.
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return urls
}

/** The single-photo case, which is most of the call sites. */
export function useSignedPhotoUrl(stored: string | null | undefined): string | null {
  const urls = useSignedPhotoUrls(useMemo(() => [stored], [stored]))
  return stored ? urls.get(stored) ?? null : null
}
