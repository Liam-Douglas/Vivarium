import type { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  elevated?: boolean
}

export function Card({ children, elevated = false, className = '', style, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`rounded-xl border ${className}`}
      style={{
        backgroundColor: elevated ? 'var(--color-surface-2)' : 'var(--color-surface)',
        borderColor: 'var(--color-separator)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
