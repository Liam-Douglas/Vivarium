import { Icon } from './icons'

/**
 * Edit and delete, as a pair, on a record row.
 *
 * Shared by every list on the animal detail screen — weights, sheds, health
 * events, acquisitions — which is why it left AnimalDetail when those sections
 * were extracted into their own files.
 */
export function RecordActions({ onEdit, onDelete, what = 'record' }: {
  onEdit: () => void
  onDelete: () => void
  /** Names the record for screen readers: "Edit weight", "Delete shed". */
  what?: string
}) {
  // 32px with a mouse, 44px on touch, with a wider gap so a thumb aimed at
  // edit does not land on delete. Both used to be 28px with 4px between.
  const box = 'w-8 h-8 pointer-coarse:w-11 pointer-coarse:h-11 rounded-full flex items-center justify-center transition-[transform,background-color] duration-150 ease-out hover:bg-fill active:bg-fill active:scale-[0.94] motion-reduce:active:scale-100'
  return (
    <div className="flex gap-1 pointer-coarse:gap-2 shrink-0">
      <button type="button" onClick={onEdit} aria-label={`Edit ${what}`} className={`${box} text-tint`}>
        <Icon name="pencil" size={18} />
      </button>
      <button type="button" onClick={onDelete} aria-label={`Delete ${what}`} className={`${box} text-red`}>
        <Icon name="trash" size={18} />
      </button>
    </div>
  )
}
