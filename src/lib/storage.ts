// Storage URL helpers for the `animal-photos` bucket.
//
// Photos are stored with public URLs today, but 0002_storage_policies.sql makes
// the bucket private. createSignedUrl works on both public and private buckets,
// so signing at read time is safe to ship BEFORE the bucket is flipped: until
// then the stored public URL keeps working as the fallback, and afterwards the
// signed URL is what grants access. No data migration of existing rows needed.

import { supabase } from './supabase'

export const ANIMAL_PHOTOS_BUCKET = 'animal-photos'
const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1 hour

// Extract the object path within the bucket from either a stored public URL
// (…/object/public/animal-photos/<path>) or a bare path. Returns null for
// values that aren't storage objects (blob:/data: previews, empty).
export function getStoragePath(stored: string | null | undefined): string | null {
  if (!stored) return null
  if (stored.startsWith('blob:') || stored.startsWith('data:')) return null
  const marker = `/${ANIMAL_PHOTOS_BUCKET}/`
  const idx = stored.indexOf(marker)
  const raw = idx === -1 ? stored : stored.slice(idx + marker.length)
  const withoutQuery = raw.split('?')[0]
  try {
    return decodeURIComponent(withoutQuery)
  } catch {
    return withoutQuery
  }
}

// Resolve a stored value to a displayable URL. Signs storage objects; passes
// local previews (blob:/data:) through unchanged; falls back to the original
// value if signing fails (e.g. bucket still public, or migration not applied).
export async function getSignedPhotoUrl(
  stored: string | null | undefined,
  expiresIn: number = SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  if (!stored) return null
  const path = getStoragePath(stored)
  if (!path) return stored // blob:/data: preview — use as-is
  const { data, error } = await supabase.storage
    .from(ANIMAL_PHOTOS_BUCKET)
    .createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) return stored
  return data.signedUrl
}
