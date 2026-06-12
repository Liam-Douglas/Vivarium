// Image validation and pre-upload processing.
//
// Re-encoding the image through a canvas intentionally strips ALL metadata —
// most importantly EXIF GPS coordinates, which for animal/collection photos are
// a privacy and wildlife-trafficking risk. It also resizes oversized photos so
// we don't store and re-serve multi-megabyte originals.

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_EDGE = 1600 // px — long edge after resize
const OUTPUT_QUALITY = 0.85

export class ImageValidationError extends Error {}

export function validateImageFile(file: File): void {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new ImageValidationError('Please choose a JPEG, PNG, or WebP image.')
  }
  if (file.size > MAX_BYTES) {
    throw new ImageValidationError('Image is too large — please use one under 10 MB.')
  }
}

// Validate, strip metadata (incl. GPS), and resize. Returns a JPEG File ready to upload.
// Falls back to the original file if the browser can't decode it for canvas processing
// (still validated). HEIC often can't be drawn to a canvas — in that case we surface an error.
export async function processImage(file: File): Promise<File> {
  validateImageFile(file)

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new ImageValidationError(
      'Could not process this image. Try a JPEG, PNG, or WebP photo.'
    )
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new ImageValidationError('Could not process this image.')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', OUTPUT_QUALITY)
  )
  if (!blob) throw new ImageValidationError('Could not process this image.')

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
}
