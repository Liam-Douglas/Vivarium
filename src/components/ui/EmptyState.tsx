import { Icon, type IconName } from './icons'

interface EmptyStateProps {
  icon?: IconName
  title: string
  description?: string
  action?: React.ReactNode
}

/** The iOS content-unavailable view: a large glyph, a title, a line of help. */
export function EmptyState({ icon = 'animal', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      <Icon name={icon} size={48} strokeWidth={1.4} className="text-label-3 mb-3" />
      <h3 className="text-[20px] leading-[25px] font-bold text-label mb-1">{title}</h3>
      {description && <p className="text-[15px] text-label-2 mb-5 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}
