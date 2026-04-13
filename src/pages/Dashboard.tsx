import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import { useAnimals } from '@/hooks/useAnimals'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { getRecentActivity, approveHouseholdRequest, denyHouseholdRequest } from '@/lib/queries'
import { AnimalCard } from '@/components/animals/AnimalCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FeedingLogForm } from '@/components/feeding/FeedingLogForm'
import { AnimalCardSkeleton } from '@/components/ui/LoadingSkeleton'
import { useToast } from '@/components/ui/Toast'

interface ActivityEntry {
  id: string
  type: 'feeding' | 'shedding' | 'weight'
  timestamp: string
  animalName: string
  userId: string
  loggedBy: string
  detail: string
}

function getStatusForAnimal(animal: { last_fed_at: string | null; feeding_frequency_days: number | null }) {
  if (!animal.last_fed_at || !animal.feeding_frequency_days) return 'muted'
  const days = differenceInDays(new Date(), new Date(animal.last_fed_at))
  if (days > animal.feeding_frequency_days) return 'red'
  if (days >= animal.feeding_frequency_days - 1) return 'amber'
  return 'green'
}

export function Dashboard() {
  const { profile } = useAuth()
  const { householdId, pendingRequests, currentUserRole, refresh: refreshHousehold } = useHousehold()
  const { data: animals, loading: animalsLoading, refresh: refreshAnimals } = useAnimals()
  const { showToast } = useToast()
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [feedOpen, setFeedOpen] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  useEffect(() => {
    if (!householdId) return
    getRecentActivity(householdId)
      .then(setActivity)
      .finally(() => setActivityLoading(false))
  }, [householdId])

  const overdueCount = animals.filter((a) => getStatusForAnimal(a) === 'red').length
  const fedThisWeek = animals.filter(
    (a) => a.last_fed_at && differenceInDays(new Date(), new Date(a.last_fed_at)) <= 7
  ).length

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  async function handleApprove(memberId: string) {
    setApprovingId(memberId)
    try {
      await approveHouseholdRequest(memberId)
      refreshHousehold()
      showToast('Member approved', 'success')
    } catch {
      showToast('Failed to approve', 'error')
    } finally {
      setApprovingId(null)
    }
  }

  async function handleDeny(memberId: string) {
    try {
      await denyHouseholdRequest(memberId)
      refreshHousehold()
      showToast('Request denied', 'info')
    } catch {
      showToast('Failed to deny', 'error')
    }
  }

  const activityIcon = { feeding: '🍽️', shedding: '🐍', weight: '⚖️' }

  return (
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
            {greeting}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#a8a090' }}>
            {animals.length} animal{animals.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        <Button size="sm" onClick={() => setFeedOpen(true)}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Log feeding
        </Button>
      </div>

      {/* Pending join requests (owner only) */}
      {currentUserRole === 'owner' && pendingRequests.length > 0 && (
        <div className="mb-6 rounded-xl p-4" style={{ backgroundColor: 'rgba(143,190,90,0.08)', border: '1px solid rgba(143,190,90,0.2)' }}>
          {pendingRequests.map((req) => {
            const p = req.profiles as { full_name: string | null } | null
            return (
              <div key={req.id} className="flex items-center justify-between gap-3">
                <p className="text-sm" style={{ color: '#f0ece0' }}>
                  <strong>{p?.full_name ?? 'Someone'}</strong> wants to join your collection
                </p>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => handleApprove(req.id)} loading={approvingId === req.id}>
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => handleDeny(req.id)}>
                    Deny
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs mb-1" style={{ color: '#6a6458' }}>Fed this week</p>
          <p className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#8fbe5a' }}>{fedThisWeek}</p>
          <p className="text-xs mt-0.5" style={{ color: '#6a6458' }}>of {animals.length}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs mb-1" style={{ color: '#6a6458' }}>Overdue</p>
          <p className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: overdueCount > 0 ? '#c45a5a' : '#5a9e6a' }}>{overdueCount}</p>
          <p className="text-xs mt-0.5" style={{ color: '#6a6458' }}>need feeding</p>
        </div>
      </div>

      {/* Animals */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>Your animals</h2>
          <Link to="/animals" className="text-xs font-medium" style={{ color: '#8fbe5a' }}>View all</Link>
        </div>
        {animalsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 3 }).map((_, i) => <AnimalCardSkeleton key={i} />)}
          </div>
        ) : animals.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ backgroundColor: '#242420', border: '1px dashed rgba(255,255,255,0.08)' }}
          >
            <p className="text-sm mb-3" style={{ color: '#a8a090' }}>Add your first animal to get started</p>
            <Link to="/animals"><Button size="sm">Add animal</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {animals.map((a) => <AnimalCard key={a.id} animal={a} />)}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="text-base font-semibold mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>Recent activity</h2>
        {activityLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: '#8fbe5a', borderTopColor: 'transparent' }} />
          </div>
        ) : activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="text-4xl mb-3 opacity-60">📋</div>
            <p className="text-sm" style={{ color: '#a8a090' }}>No activity yet</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {activity.map((item, i) => (
              <div
                key={item.id}
                className="flex items-start gap-3 py-3"
                style={{ borderBottom: i < activity.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                <span className="text-lg leading-none mt-0.5">{activityIcon[item.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: '#f0ece0' }}>
                    <strong>{item.animalName}</strong> — {item.detail}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#6a6458' }}>
                    by {item.loggedBy} · {format(new Date(item.timestamp), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB on mobile */}
      <button
        onClick={() => setFeedOpen(true)}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-30 transition-transform active:scale-95"
        style={{ backgroundColor: '#8fbe5a', color: '#1a1a18' }}
      >
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <Modal open={feedOpen} onClose={() => setFeedOpen(false)} title="Log feeding">
        <FeedingLogForm
          onSuccess={() => { setFeedOpen(false); refreshAnimals() }}
          onCancel={() => setFeedOpen(false)}
        />
      </Modal>
    </div>
  )
}
