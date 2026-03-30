import { Link } from 'react-router-dom'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import type { Animal } from '@/hooks/useAnimals'

function getFeedingStatus(animal: Animal): { color: string; label: string } {
  if (!animal.last_fed_at || !animal.feeding_frequency_days) {
    return { color: '#6a6458', label: 'No schedule' }
  }
  const daysSince = differenceInDays(new Date(), new Date(animal.last_fed_at))
  const freq = animal.feeding_frequency_days
  if (daysSince > freq) return { color: '#c45a5a', label: 'Overdue' }
  if (daysSince >= freq - 1) return { color: '#d4924a', label: 'Due soon' }
  return { color: '#5a9e6a', label: 'Fed recently' }
}

interface AnimalCardProps {
  animal: Animal
}

export function AnimalCard({ animal }: AnimalCardProps) {
  const status = getFeedingStatus(animal)

  return (
    <Link
      to={`/animals/${animal.id}`}
      className="block rounded-xl overflow-hidden transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]"
      style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Photo */}
      <div className="w-full h-40 relative" style={{ backgroundColor: '#1a1a18' }}>
        {animal.photo_url ? (
          <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">🦎</div>
        )}
        {/* Status dot */}
        <div
          className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: status.color, boxShadow: `0 0 0 3px rgba(0,0,0,0.4)` }}
          title={status.label}
        />
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm leading-tight truncate" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
          {animal.name}
        </h3>
        <p className="text-xs mt-0.5 truncate" style={{ color: '#a8a090' }}>
          {animal.species}{animal.morph ? ` · ${animal.morph}` : ''}
        </p>
        <p className="text-xs mt-2" style={{ color: '#6a6458' }}>
          {animal.last_fed_at
            ? `Fed ${formatDistanceToNow(new Date(animal.last_fed_at), { addSuffix: true })}`
            : 'Never fed'}
        </p>
      </div>
    </Link>
  )
}
