import { Link } from 'react-router-dom'
import { differenceInCalendarDays } from 'date-fns'
import type { Animal } from '@/hooks/useAnimals'
import { getFeedingStatus, getNextFeedingDue, FEEDING_STATUS_META } from '@/lib/feedingStatus'

interface AnimalCardProps {
  animal: Animal
  /** Resolved by the parent, which already holds the enclosure list. */
  enclosureName?: string | null
}

export function AnimalCard({ animal, enclosureName }: AnimalCardProps) {
  const feedingStatus = getFeedingStatus(animal)
  const status = FEEDING_STATUS_META[feedingStatus]

  // When the animal is next due, not when it last ate — the same number of days
  // is fine for one animal and overdue for another; only the schedule knows.
  const nextDue = getNextFeedingDue(animal)
  const dueLabel = (() => {
    if (!nextDue) return status.label
    const days = differenceInCalendarDays(nextDue, new Date())
    if (days < 0) return `${Math.abs(days)} day${days !== -1 ? 's' : ''} overdue`
    if (days === 0) return 'Due today'
    if (days === 1) return 'Due tomorrow'
    return `Due in ${days} days`
  })()

  return (
    <Link
      to={`/animals/${animal.id}`}
      className="block rounded-xl overflow-hidden transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]"
      style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Photo */}
      <div className="w-full h-40 relative" style={{ backgroundColor: '#1a1a18' }}>
        {animal.photo_url ? (
          <img src={animal.photo_url} alt={animal.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">🦎</div>
        )}
        {/* Status dot */}
        <div
          className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: status.color, boxShadow: `0 0 0 3px rgba(0,0,0,0.4)` }}
          title={status.label}
        />
        {/* Quarantine badge */}
        {animal.quarantine_started_at && !animal.quarantine_ended_at && (
          <div className="absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded-md text-xs font-semibold" style={{ backgroundColor: 'rgba(212,146,74,0.85)', color: '#1a1a18' }}>
            🔬 Q
          </div>
        )}
        {/* For sale badge */}
        {animal.is_for_sale && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-xs font-semibold" style={{ backgroundColor: 'rgba(143,190,90,0.85)', color: '#1a1a18' }}>
            For Sale
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm leading-tight truncate" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
          {animal.name}
        </h3>
        <p className="text-xs mt-0.5 truncate" style={{ color: '#a8a090' }}>
          {animal.species}{animal.morph ? ` · ${animal.morph}` : ''}
        </p>
        <p className="text-xs mt-2 font-medium" style={{ color: status.color }}>
          {dueLabel}
        </p>
        {enclosureName && (
          <p className="text-xs mt-0.5 truncate" style={{ color: '#6a6458' }}>{enclosureName}</p>
        )}
      </div>
    </Link>
  )
}
