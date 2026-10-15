interface BadgeProps {
  status: 'green' | 'amber' | 'red' | 'blue' | 'muted'
  children: React.ReactNode
  size?: 'sm' | 'md'
}

const colors = {
  green: { bg: 'color-mix(in srgb, var(--color-green) 15%, transparent)', text: 'var(--color-green)', border: 'color-mix(in srgb, var(--color-green) 30%, transparent)' },
  amber: { bg: 'color-mix(in srgb, var(--color-orange) 15%, transparent)', text: 'var(--color-orange)', border: 'color-mix(in srgb, var(--color-orange) 30%, transparent)' },
  red: { bg: 'color-mix(in srgb, var(--color-red) 15%, transparent)', text: 'var(--color-red)', border: 'color-mix(in srgb, var(--color-red) 30%, transparent)' },
  blue: { bg: 'color-mix(in srgb, var(--color-blue) 15%, transparent)', text: 'var(--color-blue)', border: 'color-mix(in srgb, var(--color-blue) 30%, transparent)' },
  muted: { bg: 'var(--color-fill)', text: 'var(--color-label-2)', border: 'var(--color-separator)' },
}

export function Badge({ status, children, size = 'sm' }: BadgeProps) {
  const c = colors[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium border ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}
      style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
    >
      {children}
    </span>
  )
}
