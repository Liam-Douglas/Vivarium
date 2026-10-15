import { Link } from 'react-router-dom'
import type { Animal } from '@/hooks/useAnimals'
import { getFeedingStatus, describeNextFeeding, FEEDING_STATUS_META } from '@/lib/feedingStatus'

export type AnimalCardVariant = 'a' | 'b' | 'c'

interface AnimalCardProps {
  animal: Animal
  /** Resolved by the parent, which already holds the enclosure list. */
  enclosureName?: string | null
  /**
   * Signed by the parent, for the same reason: a grid of twenty cards each
   * signing its own photo is twenty round trips for one screen.
   */
  photoUrl?: string | null
  /**
   * Prototype switch while a card style is chosen (?card=b or ?card=c).
   * a: photo tile. b: status on the photo. c: name first, small portrait.
   */
  variant?: AnimalCardVariant
}

const pressable = 'block rounded-xl overflow-hidden transition-transform duration-150 ease-out hover:scale-[1.01] active:scale-[0.98] motion-reduce:transform-none'
const surface = { backgroundColor: 'var(--color-bark)', border: '1px solid var(--color-hairline)' }

export function AnimalCard({ animal, enclosureName, photoUrl, variant = 'a' }: AnimalCardProps) {
  const feedingStatus = getFeedingStatus(animal)
  const status = FEEDING_STATUS_META[feedingStatus]

  // When the animal is next due, not when it last ate — the same number of days
  // is fine for one animal and overdue for another; only the schedule knows.
  const dueLabel = describeNextFeeding(animal)
  const quarantined = !!animal.quarantine_started_at && !animal.quarantine_ended_at
  const subtitle = `${animal.species}${animal.morph ? ` · ${animal.morph}` : ''}`

  if (variant === 'c') {
    return (
      <Link to={`/animals/${animal.id}`} className={`${pressable} p-3`} style={surface}>
        <div className="flex items-start justify-between gap-2">
          <Portrait animal={animal} photoUrl={photoUrl} className="w-14 h-14 rounded-lg text-2xl" />
          <Flags quarantined={quarantined} forSale={!!animal.is_for_sale} stacked />
        </div>
        <h3 className="mt-3 font-semibold text-base leading-tight truncate" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-parchment)' }}>
          {animal.name}
        </h3>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-dry-grass)' }}>{subtitle}</p>
        <p className="text-xs mt-2 font-medium" style={{ color: status.color }}>{dueLabel}</p>
        {enclosureName && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-sand)' }}>{enclosureName}</p>}
      </Link>
    )
  }

  if (variant === 'b') {
    return (
      <Link to={`/animals/${animal.id}`} className={pressable} style={surface}>
        <div className="w-full aspect-[4/3] relative" style={{ backgroundColor: 'var(--color-night-soil)' }}>
          <Portrait animal={animal} photoUrl={photoUrl} className="w-full h-full text-5xl" />
          <div className="absolute top-2 left-2"><Flags quarantined={quarantined} forSale={!!animal.is_for_sale} /></div>
          {/* The one thing a keeper scans the grid for, on the photo itself,
              over a scrim so it reads on any picture. */}
          <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-6" style={{ background: 'linear-gradient(to top, rgba(26,26,24,0.92), rgba(26,26,24,0))' }}>
            <p className="text-xs font-semibold truncate" style={{ color: status.color }}>{dueLabel}</p>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm leading-tight truncate" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-parchment)' }}>
            {animal.name}
          </h3>
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-dry-grass)' }}>{subtitle}</p>
          {enclosureName && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-sand)' }}>{enclosureName}</p>}
        </div>
      </Link>
    )
  }

  return (
    <Link to={`/animals/${animal.id}`} className={pressable} style={surface}>
      {/* Photo */}
      <div className="w-full h-40 relative" style={{ backgroundColor: 'var(--color-night-soil)' }}>
        <Portrait animal={animal} photoUrl={photoUrl} className="w-full h-full text-5xl" />
        {/* Status dot */}
        <div
          className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: status.color, boxShadow: `0 0 0 3px rgba(0,0,0,0.4)` }}
          title={status.label}
        />
        <div className="absolute top-2 left-2"><Flags quarantined={quarantined} forSale={!!animal.is_for_sale} /></div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm leading-tight truncate" style={{ fontFamily: 'Playfair Display, serif', color: 'var(--color-parchment)' }}>
          {animal.name}
        </h3>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-dry-grass)' }}>{subtitle}</p>
        <p className="text-xs mt-2 font-medium" style={{ color: status.color }}>{dueLabel}</p>
        {enclosureName && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-sand)' }}>{enclosureName}</p>
        )}
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
      style={{ backgroundColor: 'var(--color-moss-stone)', color: 'var(--color-sand)', fontFamily: 'Playfair Display, serif' }}
    >
      {initial}
    </div>
  )
}

function Flags({ quarantined, forSale, stacked = false }: { quarantined: boolean; forSale: boolean; stacked?: boolean }) {
  if (!quarantined && !forSale) return null
  return (
    <div className={`flex gap-1 ${stacked ? 'flex-col items-end' : ''}`}>
      {quarantined && (
        <span className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: 'rgba(212,146,74,0.9)', color: 'var(--color-night-soil)' }}>
          Quarantine
        </span>
      )}
      {forSale && (
        <span className="px-1.5 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: 'rgba(143,190,90,0.9)', color: 'var(--color-night-soil)' }}>
          For sale
        </span>
      )}
    </div>
  )
}
