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
  // iOS buttons: filled (the one main action), gray, plain and destructive.
  // They answer on the press itself by dimming, as UIKit's do, with a slight
  // give; focus rings are for keyboard focus only.
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl select-none transition-[transform,opacity,background-color] duration-150 ease-out active:opacity-70 active:scale-[0.98] motion-reduce:active:scale-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tint focus-visible:ring-offset-2 focus-visible:ring-offset-bg'

  const variants = {
    primary: 'bg-tint text-on-tint',
    secondary: 'bg-fill text-label',
    ghost: 'text-tint hover:bg-fill',
    danger: 'bg-destructive text-white',
  }

  const sizes = {
    sm: 'px-3.5 py-1.5 text-[15px] min-h-8 pointer-coarse:min-h-11',
    md: 'px-4 py-2 text-[15px] min-h-10 pointer-coarse:min-h-11',
    lg: 'px-6 py-3 text-[17px] min-h-[50px] rounded-[14px]',
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={props.style}
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
