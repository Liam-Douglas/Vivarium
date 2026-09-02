import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format, differenceInDays, addDays } from 'date-fns'
import { useAnimals } from '@/hooks/useAnimals'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import {
  getRecentActivity, approveHouseholdRequest, denyHouseholdRequest,
  createSheddingLog, createWeightLog, createExpense,
} from '@/lib/queries'
import { dateInputToISO } from '@/lib/dates'
import {
  getFeedingStatus, summariseFeeding, FEEDING_STATUS_META, FEEDING_URGENCY,
} from '@/lib/feedingStatus'
import { useFeedingLogs } from '@/hooks/useFeedingLogs'
import { AnimalForm } from '@/components/animals/AnimalForm'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { FeedingLogForm } from '@/components/feeding/FeedingLogForm'
import { UpgradeModal } from '@/components/upgrade/UpgradeModal'
import { useToast } from '@/components/ui/Toast'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from '@/hooks/useExpenses'

type ActiveModal = 'animal' | 'feeding' | 'shed' | 'weight' | 'expense' | null

interface ActivityEntry {
  id: string
  type: 'feeding' | 'shedding' | 'weight'
  timestamp: string
  animalName: string
  userId: string
  loggedBy: string
  detail: string
}

/** "Ivy, Pascal, Root and 4 more" — untracked animals often arrive by the dozen. */
function nameList(animals: { name: string }[], max = 3): string {
  const shown = animals.slice(0, max).map((a) => a.name)
  const rest = animals.length - shown.length
  return rest > 0 ? `${shown.join(', ')} and ${rest} more` : shown.join(', ')
}

const FAB_ACTIONS = [
  { key: 'animal',  label: 'Add animal',   icon: '🦎' },
  { key: 'feeding', label: 'Log feeding',   icon: '🍖' },
  { key: 'shed',    label: 'Log shed',      icon: '🐍' },
  { key: 'weight',  label: 'Log weight',    icon: '⚖️' },
  { key: 'expense', label: 'Add expense',   icon: '💸' },
] as const

export function Dashboard() {
  const { profile, user, canAddAnimal } = useAuth()
  const { householdId, pendingRequests, currentUserRole, refresh: refreshHousehold } = useHousehold()
  const { data: animals, refresh: refreshAnimals } = useAnimals()
  const { data: allLogs } = useFeedingLogs()
  const { showToast } = useToast()

  const strikeAnimals = useMemo(() => {
    const byAnimal = new Map<string, typeof allLogs>()
    allLogs.forEach((log) => {
      const list = byAnimal.get(log.animal_id) ?? []
      list.push(log)
      byAnimal.set(log.animal_id, list)
    })
    const strikes: typeof animals = []
    byAnimal.forEach((logs, animalId) => {
      const sorted = [...logs].sort((a, b) => new Date(b.fed_at).getTime() - new Date(a.fed_at).getTime())
      let count = 0
      for (const log of sorted) {
        if (!log.refused) break
        count++
      }
      if (count >= 3) {
        const animal = animals.find((a) => a.id === animalId)
        if (animal) strikes.push(animal)
      }
    })
    return strikes
  }, [allLogs, animals])

  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  // FAB speed dial
  const [fabOpen, setFabOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  // Shed form state
  const [shedAnimalId, setShedAnimalId] = useState('')
  const [shedDate, setShedDate] = useState(new Date().toISOString().split('T')[0])
  const [shedComplete, setShedComplete] = useState(true)
  const [shedNotes, setShedNotes] = useState('')
  const [savingShed, setSavingShed] = useState(false)

  // Weight form state
  const [weightAnimalId, setWeightAnimalId] = useState('')
  const [weightGrams, setWeightGrams] = useState('')
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0])
  const [weightNotes, setWeightNotes] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)

  // Expense form state
  const [expCategory, setExpCategory] = useState('misc')
  const [expAmount, setExpAmount] = useState('')
  const [expDescription, setExpDescription] = useState('')
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0])
  const [savingExpense, setSavingExpense] = useState(false)

  // Quick-feed from urgency section
  const [quickFeedAnimalId, setQuickFeedAnimalId] = useState<string | null>(null)

  useEffect(() => {
    if (!householdId) return
    getRecentActivity(householdId)
      .then(setActivity)
      .finally(() => setActivityLoading(false))
  }, [householdId])

  const feedingSummary = useMemo(() => summariseFeeding(animals), [animals])

  // One queue ordered by lateness, replacing the old "Needs feeding" and
  // "Due soon" cards — they had identical row anatomy and were split by an
  // arbitrary threshold. Includes anything overdue, due soon, or falling due
  // within three days.
  const queue = useMemo(() => {
    const now = new Date()
    return animals
      .map((animal) => {
        const status = getFeedingStatus(animal, now)
        const nextDue = animal.last_fed_at && animal.feeding_frequency_days
          ? addDays(new Date(animal.last_fed_at), animal.feeding_frequency_days)
          : null
        return { animal, status, nextDue }
      })
      .filter(({ status, nextDue }) =>
        status === 'overdue' || status === 'due-soon' ||
        (status === 'on-schedule' && nextDue !== null && differenceInDays(nextDue, now) <= 3))
      .sort((a, b) => {
        const byUrgency = FEEDING_URGENCY[a.status] - FEEDING_URGENCY[b.status]
        if (byUrgency !== 0) return byUrgency
        // Within a status, soonest due first — which for overdue animals is
        // also most-overdue first.
        return (a.nextDue?.getTime() ?? 0) - (b.nextDue?.getTime() ?? 0)
      })
  }, [animals])

  // Animals with no schedule, or a schedule but no feeding logged, can never
  // reach a queue — surface them rather than letting them read as on schedule.
  const unscheduledAnimals = useMemo(
    () => animals.filter((a) => getFeedingStatus(a) === 'no-schedule'),
    [animals]
  )
  const neverFedAnimals = useMemo(
    () => animals.filter((a) => getFeedingStatus(a) === 'never-fed'),
    [animals]
  )

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  function openModal(key: ActiveModal) {
    setFabOpen(false)
    if (key === 'animal' && !canAddAnimal(animals.length)) {
      setUpgradeOpen(true)
      return
    }
    setActiveModal(key)
  }

  function closeModal() {
    setActiveModal(null)
  }

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

  async function handleSaveShed() {
    if (!user || !householdId || !shedAnimalId) return
    setSavingShed(true)
    try {
      await createSheddingLog({ household_id: householdId, animal_id: shedAnimalId, user_id: user.id, shed_at: dateInputToISO(shedDate), complete: shedComplete, notes: shedNotes || undefined })
      showToast('Shed logged', 'success')
      closeModal()
      setShedAnimalId(''); setShedNotes('')
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error', 'error')
    } finally { setSavingShed(false) }
  }

  async function handleSaveWeight() {
    if (!user || !householdId || !weightAnimalId || !weightGrams) return
    setSavingWeight(true)
    try {
      await createWeightLog({ household_id: householdId, animal_id: weightAnimalId, user_id: user.id, weight_grams: Number(weightGrams), logged_at: dateInputToISO(weightDate), notes: weightNotes || undefined })
      showToast('Weight logged', 'success')
      closeModal()
      setWeightAnimalId(''); setWeightGrams(''); setWeightNotes('')
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error', 'error')
    } finally { setSavingWeight(false) }
  }

  async function handleSaveExpense() {
    if (!user || !householdId || !expAmount || !expDescription) return
    setSavingExpense(true)
    try {
      await createExpense({ household_id: householdId, user_id: user.id, category: expCategory, amount_cents: Math.round(Number(expAmount) * 100), currency: 'AUD', description: expDescription, expense_date: dateInputToISO(expDate) })
      showToast('Expense added', 'success')
      closeModal()
      setExpAmount(''); setExpDescription('')
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error', 'error')
    } finally { setSavingExpense(false) }
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
            {feedingSummary.overdue > 0 && (
              <span style={{ color: '#c45a5a', fontWeight: 500 }}>{feedingSummary.overdue} overdue</span>
            )}
            {feedingSummary.overdue > 0 && feedingSummary.dueSoon > 0 && ' · '}
            {feedingSummary.dueSoon > 0 && `${feedingSummary.dueSoon} due soon`}
            {feedingSummary.overdue === 0 && feedingSummary.dueSoon === 0 && 'Nothing due today'}
            {/* Never imply all-clear while animals are untracked. */}
            {feedingSummary.untracked > 0 && ` · ${feedingSummary.untracked} not tracked`}
          </p>
        </div>
        {/* Desktop only — mobile uses FAB */}
        <div className="hidden md:block">
          <Button size="sm" onClick={() => openModal('feeding')}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Log feeding
          </Button>
        </div>
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
                  <Button size="sm" onClick={() => handleApprove(req.id)} loading={approvingId === req.id}>Approve</Button>
                  <Button size="sm" variant="secondary" onClick={() => handleDeny(req.id)}>Deny</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Feeding strike warning */}
      {strikeAnimals.length > 0 && (
        <div className="mb-6 rounded-xl p-4" style={{ backgroundColor: 'rgba(196,90,90,0.08)', border: '1px solid rgba(196,90,90,0.2)' }}>
          <p className="text-sm font-medium mb-1" style={{ color: '#c45a5a' }}>
            Feeding strike detected
          </p>
          <p className="text-xs" style={{ color: '#a8a090' }}>
            {strikeAnimals.map((a) => a.name).join(', ')} {strikeAnimals.length === 1 ? 'has' : 'have'} refused 3+ consecutive meals. Consider checking for health issues or environment problems.
          </p>
        </div>
      )}

      {/* Animals no feeding queue can reach — they would otherwise read as on schedule */}
      {(unscheduledAnimals.length > 0 || neverFedAnimals.length > 0) && (
        <div className="mb-6 rounded-xl p-4" style={{ backgroundColor: 'rgba(212,146,74,0.08)', border: '1px solid rgba(212,146,74,0.2)' }}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium" style={{ color: '#d4924a' }}>
              {feedingSummary.untracked} animal{feedingSummary.untracked !== 1 ? 's' : ''} not tracked
            </p>
            <Link to="/animals" className="text-xs font-medium shrink-0 mt-0.5" style={{ color: '#d4924a' }}>
              Review
            </Link>
          </div>
          {unscheduledAnimals.length > 0 && (
            <p className="text-xs mt-1.5" style={{ color: '#a8a090' }}>
              {nameList(unscheduledAnimals)} {unscheduledAnimals.length === 1 ? 'has' : 'have'} no
              feeding schedule, so {unscheduledAnimals.length === 1 ? 'it' : 'they'} will never appear as due. Set a
              feeding frequency to include {unscheduledAnimals.length === 1 ? 'it' : 'them'}.
            </p>
          )}
          {neverFedAnimals.length > 0 && (
            <p className="text-xs mt-1.5" style={{ color: '#a8a090' }}>
              {nameList(neverFedAnimals)} {neverFedAnimals.length === 1 ? 'has' : 'have'} a schedule
              but no feeding logged yet, so there is nothing to count from.
            </p>
          )}
        </div>
      )}

      {/* Today — one queue, ordered by lateness */}
      {queue.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-semibold" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>Today</h2>
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded-full"
              style={feedingSummary.overdue > 0
                ? { backgroundColor: 'rgba(196,90,90,0.18)', color: '#c45a5a' }
                : { backgroundColor: 'rgba(212,146,74,0.18)', color: '#d4924a' }}
            >
              {queue.length}
            </span>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
            {queue.map(({ animal, status, nextDue }, i) => {
              const daysLate = nextDue ? differenceInDays(new Date(), nextDue) : null
              const daysUntil = nextDue ? differenceInDays(nextDue, new Date()) : null
              const subtitle = status === 'overdue'
                ? `${daysLate} day${daysLate !== 1 ? 's' : ''} overdue · was due ${format(nextDue!, 'MMM d')}`
                : daysUntil === 0 ? `Due today · ${format(nextDue!, 'MMM d')}`
                : daysUntil === 1 ? `Due tomorrow · ${format(nextDue!, 'MMM d')}`
                : `Due in ${daysUntil} days · ${format(nextDue!, 'MMM d')}`
              return (
                <div
                  key={animal.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={{ borderBottom: i < queue.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: FEEDING_STATUS_META[status].color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#f0ece0' }}>{animal.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#6a6458' }}>{subtitle}</p>
                  </div>
                  <button
                    onClick={() => { setQuickFeedAnimalId(animal.id); setActiveModal('feeding') }}
                    className="text-sm font-medium px-3 rounded-lg shrink-0 transition-opacity active:opacity-70"
                    style={{ height: 44, minWidth: 62, backgroundColor: 'rgba(143,190,90,0.15)', color: '#8fbe5a', border: '1px solid rgba(143,190,90,0.25)' }}
                  >
                    Feed
                  </button>
                </div>
              )
            })}
            {/* The collection count lives here now rather than in the header —
                a link to act on, not a figure to admire. */}
            <Link
              to="/animals"
              className="flex items-center justify-center h-11 text-sm"
              style={{ borderTop: '1px solid rgba(255,255,255,0.04)', color: '#a8a090' }}
            >
              View all {animals.length} animal{animals.length !== 1 ? 's' : ''} &rarr;
            </Link>
          </div>
        </div>
      )}

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

      {/* FAB speed dial (mobile only) */}
      <div className="md:hidden fixed bottom-20 right-4 z-30 flex flex-col items-end gap-3">
        {/* Backdrop */}
        {fabOpen && (
          <div
            className="fixed inset-0 z-0"
            style={{ backgroundColor: 'rgba(10,10,8,0.72)', backdropFilter: 'blur(2px)' }}
            onClick={() => setFabOpen(false)}
          />
        )}

        {/* Action items */}
        {fabOpen && FAB_ACTIONS.map((action) => (
          <div key={action.key} className="relative z-10 flex items-center gap-3">
            <span
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg"
              style={{ backgroundColor: '#2a2a26', color: '#f0ece0', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {action.label}
            </span>
            <button
              onClick={() => openModal(action.key as ActiveModal)}
              className="w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-lg transition-transform active:scale-95"
              style={{ backgroundColor: '#2a2a26', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {action.icon}
            </button>
          </div>
        ))}

        {/* Main FAB */}
        <button
          onClick={() => setFabOpen((o) => !o)}
          className="relative z-10 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95"
          style={{ backgroundColor: '#8fbe5a', color: '#1a1a18' }}
        >
          <svg
            width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            style={{ transform: fabOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Modals */}
      <Modal open={activeModal === 'feeding'} onClose={closeModal} title="Log feeding">
        <FeedingLogForm preselectedAnimalId={quickFeedAnimalId ?? undefined} onSuccess={() => { closeModal(); refreshAnimals() }} onCancel={closeModal} />
      </Modal>

      <Modal open={activeModal === 'animal'} onClose={closeModal} title="Add animal">
        <AnimalForm onSuccess={() => { closeModal(); refreshAnimals() }} onCancel={closeModal} />
      </Modal>

      <Modal open={activeModal === 'shed'} onClose={closeModal} title="Log shed">
        <div className="flex flex-col gap-4">
          <Select label="Animal" value={shedAnimalId} onChange={(e) => setShedAnimalId(e.target.value)}>
            <option value="">Select animal…</option>
            {animals.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Input label="Date" type="date" value={shedDate} onChange={(e) => setShedDate(e.target.value)} />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={shedComplete} onChange={(e) => setShedComplete(e.target.checked)} className="w-4 h-4 accent-[#8fbe5a]" />
            <span className="text-sm" style={{ color: '#f0ece0' }}>Complete shed</span>
          </label>
          <Textarea label="Notes" value={shedNotes} onChange={(e) => setShedNotes(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={closeModal}>Cancel</Button>
            <Button fullWidth onClick={handleSaveShed} loading={savingShed} disabled={!shedAnimalId}>Save</Button>
          </div>
        </div>
      </Modal>

      <Modal open={activeModal === 'weight'} onClose={closeModal} title="Log weight">
        <div className="flex flex-col gap-4">
          <Select label="Animal" value={weightAnimalId} onChange={(e) => setWeightAnimalId(e.target.value)}>
            <option value="">Select animal…</option>
            {animals.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Input label="Weight (grams)" type="number" min={0} value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} placeholder="e.g. 450" />
          <Input label="Date" type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} />
          <Textarea label="Notes" value={weightNotes} onChange={(e) => setWeightNotes(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={closeModal}>Cancel</Button>
            <Button fullWidth onClick={handleSaveWeight} loading={savingWeight} disabled={!weightAnimalId || !weightGrams}>Save</Button>
          </div>
        </div>
      </Modal>

      <Modal open={activeModal === 'expense'} onClose={closeModal} title="Add expense">
        <div className="flex flex-col gap-4">
          <Select label="Category" value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}
          </Select>
          <Input label="Amount (AUD)" type="number" min={0} step={0.01} value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="0.00" />
          <Input label="Description" value={expDescription} onChange={(e) => setExpDescription(e.target.value)} placeholder="What did you buy?" />
          <Input label="Date" type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={closeModal}>Cancel</Button>
            <Button fullWidth onClick={handleSaveExpense} loading={savingExpense} disabled={!expAmount || !expDescription}>Save</Button>
          </div>
        </div>
      </Modal>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  )
}
