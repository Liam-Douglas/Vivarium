import { Link } from 'react-router-dom'
import type { Animal } from '@/hooks/useAnimals'
import { getFeedingStatus, describeNextFeeding, FEEDING_STATUS_META } from '@/lib/feedingStatus'

interface AnimalCardProps {
  animal: Animal
  /** Resolved by the parent, which already holds the enclosure list. */
  enclosureName?: string | null
  /**
   * Signed by the parent, for the same reason: a grid of twenty cards each
   * signing its own photo is twenty round trips for one screen.
   */
  photoUrl?: string | null
}

const pressable = 'block rounded-xl overflow-hidden transition-transform duration-150 ease-out hover:scale-[1.01] active:scale-[0.98] motion-reduce:transform-none'
const surface = { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-separator)' }

/**
 * A photo-led card with the one thing a keeper scans the grid for, when the
 * animal is next due, written on the photo itself. The photo used to be 160px
 * tall with the status twice (a corner dot and a line below), so a phone
 * showed little more than one row of animals.
 */
export function AnimalCard({ animal, enclosureName, photoUrl }: AnimalCardProps) {
  const feedingStatus = getFeedingStatus(animal)
  const status = FEEDING_STATUS_META[feedingStatus]

  // When the animal is next due, not when it last ate — the same number of days
  // is fine for one animal and overdue for another; only the schedule knows.
  const dueLabel = describeNextFeeding(animal)
  const quarantined = !!animal.quarantine_started_at && !animal.quarantine_ended_at
  const subtitle = `${animal.species}${animal.morph ? ` · ${animal.morph}` : ''}`

  return (
    <Link to={`/animals/${animal.id}`} className={pressable} style={surface}>
      <div className="w-full aspect-[4/3] relative" style={{ backgroundColor: 'var(--color-bg)' }}>
        <Portrait animal={animal} photoUrl={photoUrl} className="w-full h-full text-5xl" />
        <div className="absolute top-2 left-2"><Flags quarantined={quarantined} forSale={!!animal.is_for_sale} /></div>
        {/* The one thing a keeper scans the grid for, on the photo itself,
            over a scrim so it reads on any picture. */}
        <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-6" style={{ background: 'linear-gradient(to top, rgba(26,26,24,0.92), rgba(26,26,24,0))' }}>
          <p className="text-xs font-semibold truncate" style={{ color: status.color }}>{dueLabel}</p>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--color-label)' }}>
          {animal.name}
        </h3>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-label-2)' }}>{subtitle}</p>
        {enclosureName && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-label-2)' }}>{enclosureName}</p>}
      </div>
    </Link>
  )
}

/**
 * The photo, or the animal's initial set in the display serif when there is
 * none. The placeholder used to be a lizard emoji for every animal, snakes
 * included.
 */
function Portrait({ animal, photoUrl, className = '' }: { animal: Animal; photoUrl?: string | null; className?: string }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={animal.name} loading="lazy" decoding="async" className={`object-cover ${className}`} />
  }
  // The first character as the reader sees it, so an emoji-led name shows the
  // whole emoji rather than half of it.
  const initial = Array.from(animal.name.trim())[0]?.toUpperCase() ?? '?'
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center ${className}`}
      style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-label-2)' }}
    >
      {initial}
    </div>
  )
}

function Flags({ quarantined, forSale }: { quarantined: boolean; forSale: boolean }) {
  if (!quarantined && !forSale) return null
  return (
    <div className="flex gap-1">
      {quarantined && (
        <span className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--color-orange) 90%, transparent)', color: 'var(--color-bg)' }}>
          Quarantine
        </span>
      )}
      {forSale && (
        <span className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--color-tint) 90%, transparent)', color: 'var(--color-bg)' }}>
          For sale
        </span>
      )}
    </div>
  )
}
