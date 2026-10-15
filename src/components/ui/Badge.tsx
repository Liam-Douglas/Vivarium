interface BadgeProps {
  status: 'green' | 'amber' | 'red' | 'blue' | 'muted'
  children: React.ReactNode
  size?: 'sm' | 'md'
}

const colors = {
  green: { bg: 'color-mix(in srgb, var(--color-green) 15%, transparent)', text: 'var(--color-green)' },
  amber: { bg: 'color-mix(in srgb, var(--color-orange) 15%, transparent)', text: 'var(--color-orange)' },
  red: { bg: 'color-mix(in srgb, var(--color-red) 15%, transparent)', text: 'var(--color-red)' },
  blue: { bg: 'color-mix(in srgb, var(--color-blue) 15%, transparent)', text: 'var(--color-blue)' },
  muted: { bg: 'var(--color-fill)', text: 'var(--color-label-2)' },
}

export function Badge({ status, children, size = 'sm' }: BadgeProps) {
  const c = colors[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${size === 'sm' ? 'px-2 py-0.5 text-[12px]' : 'px-2.5 py-0.5 text-[13px]'}`}
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {children}
    </span>
  )
}
