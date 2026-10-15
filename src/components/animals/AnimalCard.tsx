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

/**
 * A photo-led tile in the manner of an album in Music: the picture alone,
 * rounded, with the name and species set below it on the page rather than on
 * a card. When the animal is next due, the one thing a keeper scans the grid
 * for, sits on the photo over a scrim so it reads on any picture.
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
    <Link
      to={`/animals/${animal.id}`}
      className="group block min-w-0 transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:transform-none"
    >
      <div className="w-full aspect-[4/3] relative rounded-xl overflow-hidden bg-fill">
        <Portrait animal={animal} photoUrl={photoUrl} className="w-full h-full text-[48px] transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transform-none" />
        <div className="absolute top-2 left-2"><Flags quarantined={quarantined} forSale={!!animal.is_for_sale} /></div>
        {/* Over a photo it needs the scrim; on the plain placeholder it does not. */}
        <div
          className={`absolute inset-x-0 bottom-0 px-2.5 pb-2 pt-7 flex items-center gap-1.5 ${photoUrl ? 'text-white' : 'text-label'}`}
          style={photoUrl ? { background: 'linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0))' } : undefined}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${photoUrl ? 'ring-1 ring-white/70' : ''}`} style={{ backgroundColor: status.color }} aria-hidden="true" />
          <p className="text-[13px] font-semibold truncate">{dueLabel}</p>
        </div>
      </div>
      <h3 className="mt-2 px-0.5 text-[15px] font-semibold leading-tight text-label truncate">{animal.name}</h3>
      <p className="px-0.5 text-[13px] text-label-2 truncate">{subtitle}</p>
      {enclosureName && <p className="px-0.5 text-[13px] text-label-2 truncate">{enclosureName}</p>}
    </Link>
  )
}

/**
 * The photo, or the animal's initial on gray when there is none. The placeholder used to be a lizard emoji for every animal, snakes
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
    <div aria-hidden="true" className={`flex items-center justify-center font-semibold bg-fill text-label-3 ${className}`}>
      {initial}
    </div>
  )
}

function Flags({ quarantined, forSale }: { quarantined: boolean; forSale: boolean }) {
  if (!quarantined && !forSale) return null
  return (
    <div className="flex gap-1">
      {quarantined && (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-on-tint bg-orange">
          Quarantine
        </span>
      )}
      {forSale && (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-on-tint bg-tint">
          For sale
        </span>
      )}
    </div>
  )
}
