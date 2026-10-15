import type { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  elevated?: boolean
}

export function Card({ children, elevated = false, className = '', style, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={`rounded-xl ${elevated ? 'bg-surface-2' : 'bg-surface'} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}
