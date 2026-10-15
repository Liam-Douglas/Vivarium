/**
 * The Vivarium mark: a serif V on leaf green, the same letterform as the
 * home-screen icon. It was hand-copied into eight places in a sans weight,
 * so the app and its icon showed two different marks.
 */

const sizes = {
  sm: 'w-8 h-8 rounded-lg text-[17px]',
  md: 'w-10 h-10 rounded-xl text-[22px]',
  lg: 'w-12 h-12 rounded-2xl text-[28px]',
  /** The app icon at the size iOS draws it on a sign-in screen. */
  xl: 'w-16 h-16 rounded-[15px] text-[34px] shadow-[0_4px_12px_rgba(0,0,0,0.12)]',
}

interface BrandMarkProps {
  size?: keyof typeof sizes
  /** For the splash while a session loads. */
  pulse?: boolean
  className?: string
}

export function BrandMark({ size = 'md', pulse = false, className = '' }: BrandMarkProps) {
  return (
    <div
      aria-hidden="true"
      className={`${sizes[size]} shrink-0 flex items-center justify-center font-bold leading-none ${pulse ? 'animate-pulse' : ''} ${className}`}
      style={{ backgroundColor: 'var(--color-tint)', color: 'var(--color-on-tint)', fontFamily: 'Georgia, "Times New Roman", serif' }}
    >
      V
    </div>
  )
}
