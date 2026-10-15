import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  // Press feedback on the press itself (scale on :active), not on release;
  // focus rings for keyboard focus only, so a tap never leaves one behind.
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-[transform,background-color,border-color,color,opacity] duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

  const variants = {
    primary: 'text-night-soil focus-visible:ring-offset-night-soil focus-visible:ring-leaf',
    secondary: 'border border-white/10 text-parchment hover:bg-white/5 active:bg-white/5 focus-visible:ring-offset-night-soil focus-visible:ring-leaf',
    ghost: 'text-dry-grass hover:text-parchment hover:bg-white/5 active:bg-white/5 focus-visible:ring-offset-night-soil focus-visible:ring-leaf',
    danger: 'text-parchment focus-visible:ring-offset-night-soil focus-visible:ring-clay-red',
  }

  const sizes = {
    // 44px tall on touch screens (the iOS minimum); unchanged with a mouse.
    sm: 'px-3 py-1.5 text-sm pointer-coarse:min-h-11',
    md: 'px-4 py-2 text-sm pointer-coarse:min-h-11',
    lg: 'px-6 py-3 text-base',
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: 'var(--color-leaf)' },
    secondary: { backgroundColor: 'transparent' },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: 'var(--color-clay-red-deep)' },
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{ ...variantStyles[variant], ...props.style }}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
