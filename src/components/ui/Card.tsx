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
        backgroundColor: elevated ? '#2e2e2a' : '#242420',
        borderColor: 'rgba(255,255,255,0.06)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
