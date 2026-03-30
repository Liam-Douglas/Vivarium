interface SkeletonProps {
  className?: string
  height?: string | number
  width?: string | number
  rounded?: string
}

export function Skeleton({ className = '', height, width, rounded = 'rounded-lg' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${rounded} ${className}`}
      style={{ height, width }}
    />
  )
}

export function AnimalCardSkeleton() {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
      <Skeleton height={160} rounded="rounded-lg" className="mb-3 w-full" />
      <Skeleton height={18} width="60%" className="mb-2" />
      <Skeleton height={14} width="40%" className="mb-3" />
      <Skeleton height={12} width="80%" />
    </div>
  )
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <Skeleton height={40} width={40} rounded="rounded-full" />
      <div className="flex-1">
        <Skeleton height={14} width="50%" className="mb-2" />
        <Skeleton height={12} width="30%" />
      </div>
    </div>
  )
}
