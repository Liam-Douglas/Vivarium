// Photos were stored as absolute public URLs, because the bucket was public and
// uploadAnimalPhoto returned getPublicUrl(). Making the bucket private breaks
// every one of those URLs, including the ones already in the database.
//
// No data migration is needed: the storage path is recoverable from the URL —
// it is whatever follows /object/public/<bucket>/. So the app now stores paths
// and this reads either shape, which is the whole compatibility story.

export const PHOTO_BUCKET = 'animal-photos'

const PUBLIC_MARKER = `/object/public/${PHOTO_BUCKET}/`
const SIGN_MARKER = `/object/sign/${PHOTO_BUCKET}/`

/**
 * The storage path for a stored photo value, or null when there is none to
 * recover.
 *
 * Accepts a bare path (what the app stores now), a legacy public URL, and a
 * signed URL — the last because a signed URL could be stored by mistake, and
 * silently treating it as a path would produce a 404 rather than a fixable
 * error.
 *
 * Paths are not URL-decoded. Every path this app writes is
 * `<household>/<animal>/<timestamp>.<ext>`, which needs no encoding, and
 * decoding would corrupt a path that legitimately contained a percent sign.
 */
export function storagePathFrom(stored: string | null | undefined): string | null {
  if (!stored) return null
  const value = stored.trim()
  if (!value) return null

  for (const marker of [PUBLIC_MARKER, SIGN_MARKER]) {
    const at = value.indexOf(marker)
    if (at !== -1) {
      const path = stripQuery(value.slice(at + marker.length))
      return path || null
    }
  }

  // Anything else that looks like a URL is not ours — a photo hosted
  // elsewhere, or a mangled value. Returning it as a path would ask storage
  // for something absurd.
  if (/^https?:\/\//i.test(value)) return null

  return stripQuery(value) || null
}

function stripQuery(path: string): string {
  const cut = path.search(/[?#]/)
  return (cut === -1 ? path : path.slice(0, cut)).replace(/^\/+/, '')
}
