interface BadgeProps {
  status: 'green' | 'amber' | 'red' | 'blue' | 'muted'
  children: React.ReactNode
  size?: 'sm' | 'md'
}

const colors = {
  green: { bg: 'rgba(90,158,106,0.15)', text: '#5a9e6a', border: 'rgba(90,158,106,0.3)' },
  amber: { bg: 'rgba(212,146,74,0.15)', text: '#d4924a', border: 'rgba(212,146,74,0.3)' },
  red: { bg: 'rgba(196,90,90,0.15)', text: '#c45a5a', border: 'rgba(196,90,90,0.3)' },
  blue: { bg: 'rgba(90,143,190,0.15)', text: '#5a8fbe', border: 'rgba(90,143,190,0.3)' },
  muted: { bg: 'rgba(255,255,255,0.05)', text: '#a8a090', border: 'rgba(255,255,255,0.08)' },
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
