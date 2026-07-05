import { useState, useEffect } from 'react'
import { getSignedPhotoUrl } from '@/lib/storage'

// Resolve a stored photo value (public URL, bucket path, or blob:/data: preview)
// to a currently-displayable URL. Signed URLs are time-limited, so we resolve on
// mount and whenever the stored value changes. Local previews resolve
// synchronously during render; only storage objects need the async signing pass.
function useSignedPhotoUrl(stored: string | null | undefined): string | undefined {
  // Keyed by the value it was resolved for, so a stale async result for a
  // previous `stored` is never shown after the prop changes.
  const [resolved, setResolved] = useState<{ for: string; url: string | undefined }>()

  const isLocalPreview = !!stored && (stored.startsWith('blob:') || stored.startsWith('data:'))

  useEffect(() => {
    if (!stored || isLocalPreview) return
    let active = true
    getSignedPhotoUrl(stored).then((url) => { if (active) setResolved({ for: stored, url: url ?? undefined }) })
    return () => { active = false }
  }, [stored, isLocalPreview])

  if (!stored) return undefined
  if (isLocalPreview) return stored
  return resolved?.for === stored ? resolved.url : undefined
}

interface StoragePhotoProps {
  stored: string | null | undefined
  alt: string
  className?: string
  style?: React.CSSProperties
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'sync' | 'auto'
  onClick?: () => void
}

// Drop-in <img> for photos in the animal-photos bucket. Renders nothing until a
// displayable URL resolves, so the caller keeps ownership of any placeholder.
export function StoragePhoto({ stored, alt, className, style, loading, decoding, onClick }: StoragePhotoProps) {
  const src = useSignedPhotoUrl(stored)
  if (!src) return null
  return <img src={src} alt={alt} className={className} style={style} loading={loading} decoding={decoding} onClick={onClick} />
}
