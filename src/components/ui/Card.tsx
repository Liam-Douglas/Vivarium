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
        backgroundColor: elevated ? 'var(--color-moss-stone)' : 'var(--color-bark)',
        borderColor: 'var(--color-hairline)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
