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
    <div>
      {/* The same shape as AnimalCard: a 4:3 photo, then name and species. */}
      <Skeleton rounded="rounded-xl" className="mb-2 w-full aspect-[4/3]" />
      <Skeleton height={15} width="60%" className="mb-1.5" />
      <Skeleton height={12} width="80%" />
    </div>
  )
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--color-separator)' }}>
      <Skeleton height={40} width={40} rounded="rounded-full" />
      <div className="flex-1">
        <Skeleton height={14} width="50%" className="mb-2" />
        <Skeleton height={12} width="30%" />
      </div>
    </div>
  )
}
