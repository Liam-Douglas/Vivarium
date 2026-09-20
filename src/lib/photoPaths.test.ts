import { describe, it, expect } from 'vitest'
import { storagePathFrom } from './photoPaths'

const PATH = 'bea6afee-1f3c-4a21-9a55-2c6f0d5e7b10/0f9c1d22-77ab-4c3e-8f01-91d2a4b6c8e3/1758300000000.jpg'

describe('storagePathFrom', () => {
  it('recovers the path from a legacy public URL', () => {
    // The shape already sitting in animals.photo_url for every existing row.
    expect(storagePathFrom(
      `https://abcdefgh.supabase.co/storage/v1/object/public/animal-photos/${PATH}`
    )).toBe(PATH)
  })

  it('recovers the path from a signed URL, token and all', () => {
    expect(storagePathFrom(
      `https://abcdefgh.supabase.co/storage/v1/object/sign/animal-photos/${PATH}?token=eyJhbGci`
    )).toBe(PATH)
  })

  it('passes a bare path through', () => {
    expect(storagePathFrom(PATH)).toBe(PATH)
  })

  it('drops a query string or fragment from either shape', () => {
    expect(storagePathFrom(`${PATH}?width=200`)).toBe(PATH)
    expect(storagePathFrom(
      `https://x.supabase.co/storage/v1/object/public/animal-photos/${PATH}?t=1`
    )).toBe(PATH)
  })

  it('strips a leading slash so the path is what storage expects', () => {
    expect(storagePathFrom(`/${PATH}`)).toBe(PATH)
  })

  it('has nothing to recover from an empty or missing value', () => {
    expect(storagePathFrom(null)).toBeNull()
    expect(storagePathFrom(undefined)).toBeNull()
    expect(storagePathFrom('')).toBeNull()
    expect(storagePathFrom('   ')).toBeNull()
  })

  it('refuses a URL that is not this bucket', () => {
    // Asking storage for "https://example.com/cat.jpg" as a path would be
    // absurd; a null says plainly that there is no photo to show.
    expect(storagePathFrom('https://example.com/cat.jpg')).toBeNull()
    expect(storagePathFrom('https://x.supabase.co/storage/v1/object/public/other-bucket/a.jpg')).toBeNull()
  })

  it('does not decode percent signs in a path', () => {
    // Every path this app writes is uuid/uuid/timestamp.ext, so decoding buys
    // nothing and would corrupt a path that genuinely contained a percent.
    expect(storagePathFrom('house/animal/100%25.jpg')).toBe('house/animal/100%25.jpg')
  })
})
