import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import { useAnimals, type Animal } from '@/hooks/useAnimals'
import type { MedicationSchedule } from '@/hooks/useMedicationSchedules'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import {
  getRecentActivity, approveHouseholdRequest, denyHouseholdRequest,
  createSheddingLog, createWeightLog, createExpense, createMedicationLog,
} from '@/lib/queries'
import { dateInputToISO } from '@/lib/dates'
import {
  getFeedingStatus, getNextFeedingDue, summariseFeeding, FEEDING_STATUS_META,
} from '@/lib/feedingStatus'
import { getNextDose, describeDose } from '@/lib/medicationSchedule'
import { useFeedingLogs } from '@/hooks/useFeedingLogs'
import { useEnclosures } from '@/hooks/useEnclosures'
import { useFeederInventory, isLowStock } from '@/hooks/useFeederInventory'
import { useMedicationSchedules } from '@/hooks/useMedicationSchedules'
import { useMedicationLogs } from '@/hooks/useMedicationLogs'
import { AnimalForm } from '@/components/animals/AnimalForm'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { FeedingLogForm } from '@/components/feeding/FeedingLogForm'
import { BatchFeedForm } from '@/components/feeding/BatchFeedForm'
import { UpgradeModal } from '@/components/upgrade/UpgradeModal'
import { useToast } from '@/components/ui/Toast'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from '@/hooks/useExpenses'

type ActiveModal = 'animal' | 'feeding' | 'shed' | 'weight' | 'expense' | 'batch' | null

/** A thing due today: a feeding, or a dose from a running medication course. */
type QueueItem =
  | {
      kind: 'feeding'
      key: string
      animal: Animal
      status: ReturnType<typeof getFeedingStatus>
      due: Date
    }
  | {
      kind: 'dose'
      key: string
      animal: Animal
      schedule: MedicationSchedule
      dose: NonNullable<ReturnType<typeof getNextDose>>
      due: Date
    }

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
  const { data: allLogs, refresh: refreshLogs } = useFeedingLogs()
  const { data: enclosures } = useEnclosures()
  const { data: feeders } = useFeederInventory()
  const { data: medSchedules } = useMedicationSchedules()
  const { data: medLogs, refresh: refreshMedLogs } = useMedicationLogs()
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

  // Quick-feed from the queue
  const [quickFeedAnimalId, setQuickFeedAnimalId] = useState<string | null>(null)

  // Batch logging straight from the queue — feeding by readiness rather than
  // by enclosure, which is the only batch the app offered before.
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loggingDoseId, setLoggingDoseId] = useState<string | null>(null)

  // Desktop split-button menu
  const [logMenuOpen, setLogMenuOpen] = useState(false)
  const logMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!householdId) return
    getRecentActivity(householdId)
      .then(setActivity)
      .finally(() => setActivityLoading(false))
  }, [householdId])

  const feedingSummary = useMemo(() => summariseFeeding(animals), [animals])

  const enclosureName = useMemo(() => {
    const byId = new Map(enclosures.map((e) => [e.id, e.name]))
    return (animalId: string | null) => (animalId ? byId.get(animalId) ?? null : null)
  }, [enclosures])

  /** Most recent feeding per animal, for the "last meal" line and to prefill. */
  const lastMealByAnimal = useMemo(() => {
    const byAnimal = new Map<string, (typeof allLogs)[number]>()
    for (const log of allLogs) {
      const held = byAnimal.get(log.animal_id)
      if (!held || new Date(log.fed_at) > new Date(held.fed_at)) byAnimal.set(log.animal_id, log)
    }
    return byAnimal
  }, [allLogs])

  // One queue ordered by when things fall due, replacing the old "Needs
  // feeding" and "Due soon" cards — identical row anatomy split by an
  // arbitrary threshold. Medication doses join it: a course of antibiotics is
  // more time-critical than a feed, and both tables have always existed
  // without ever reaching a screen.
  const queue = useMemo<QueueItem[]>(() => {
    const now = new Date()
    const animalById = new Map(animals.map((a) => [a.id, a]))

    const feedings: QueueItem[] = animals
      .map((animal) => ({
        kind: 'feeding' as const,
        key: `feed-${animal.id}`,
        animal,
        status: getFeedingStatus(animal, now),
        due: getNextFeedingDue(animal),
      }))
      .filter((item): item is Extract<QueueItem, { kind: 'feeding' }> =>
        item.due !== null && (
          item.status === 'overdue' || item.status === 'due-soon' ||
          (item.status === 'on-schedule' && differenceInDays(item.due, now) <= 3)))

    const doses: QueueItem[] = medSchedules.flatMap((schedule) => {
      const animal = animalById.get(schedule.animal_id)
      if (!animal) return []
      const dose = getNextDose(schedule, medLogs, now)
      // Only surface a dose once it is actually due; a course running next week
      // is not today's work.
      if (!dose || differenceInDays(dose.due, now) > 0) return []
      return [{ kind: 'dose' as const, key: `dose-${schedule.id}`, animal, schedule, dose, due: dose.due }]
    })

    return [...feedings, ...doses].sort((a, b) => a.due.getTime() - b.due.getTime())
  }, [animals, medSchedules, medLogs])

  /** Feeder items at or below their configured low-stock threshold. */
  const lowStock = useMemo(() => feeders.filter(isLowStock), [feeders])


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

  useEffect(() => {
    if (!logMenuOpen) return
    const onPointer = (e: MouseEvent) => {
      if (!logMenuRef.current?.contains(e.target as Node)) setLogMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLogMenuOpen(false) }
    document.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [logMenuOpen])

  const selectableIds = useMemo(
    () => queue.filter((i) => i.kind === 'feeding').map((i) => i.animal.id),
    [queue]
  )
  const selectedAnimals = useMemo(
    () => animals.filter((a) => selected.has(a.id)),
    [animals, selected]
  )

  function toggleSelected(animalId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(animalId)) next.delete(animalId)
      else next.add(animalId)
      return next
    })
  }

  async function handleLogDose(item: Extract<QueueItem, { kind: 'dose' }>) {
    if (!user || !householdId) return
    setLoggingDoseId(item.schedule.id)
    try {
      await createMedicationLog({
        household_id: householdId,
        schedule_id: item.schedule.id,
        animal_id: item.animal.id,
        user_id: user.id,
        given_at: new Date().toISOString(),
      })
      showToast(`${item.schedule.name} logged for ${item.animal.name}`, 'success')
      refreshMedLogs()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to log dose', 'error')
    } finally {
      setLoggingDoseId(null)
    }
  }

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
        {/* Desktop counterpart of the FAB. It used to offer only "Log feeding",
            so logging a shed, weight or expense meant opening an animal first —
            four of the five actions vanished above 768px. */}
        <div className="hidden md:block relative" ref={logMenuRef}>
          <div className="flex items-stretch">
            <button
              onClick={() => openModal('feeding')}
              className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium rounded-l-xl transition-opacity active:opacity-80"
              style={{ backgroundColor: '#8fbe5a', color: '#1a1a18' }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Log feeding
            </button>
            <button
              onClick={() => setLogMenuOpen((open) => !open)}
              aria-label="More logging actions"
              aria-expanded={logMenuOpen}
              className="inline-flex items-center justify-center w-9 h-10 rounded-r-xl transition-opacity active:opacity-80"
              style={{ backgroundColor: '#7fae4c', color: '#1a1a18', borderLeft: '1px solid rgba(26,26,24,0.18)' }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                style={{ transform: logMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {logMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-xl p-1.5 z-30"
              style={{ backgroundColor: '#2a2a26', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 28px rgba(0,0,0,0.45)' }}
            >
              {FAB_ACTIONS.filter((a) => a.key !== 'feeding').map((action) => (
                <button
                  key={action.key}
                  onClick={() => { setLogMenuOpen(false); openModal(action.key as ActiveModal) }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition-colors hover:bg-white/5"
                  style={{ color: '#f0ece0' }}
                >
                  <span className="text-[15px]">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          )}
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

      {/* Feeder stock — needed before you start feeding, not after */}
      {lowStock.length > 0 && (
        <Link
          to="/expenses"
          className="block mb-6 rounded-xl p-4"
          style={{ backgroundColor: 'rgba(212,146,74,0.08)', border: '1px solid rgba(212,146,74,0.25)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium" style={{ color: '#d4924a' }}>Feeder stock is running low</p>
            <span className="text-xs shrink-0" style={{ color: '#d4924a' }}>Stock &rarr;</span>
          </div>
          <p className="text-xs mt-1.5" style={{ color: '#a8a090' }}>
            {lowStock.slice(0, 3).map((f) => `${f.name} — ${f.currentStock} left`).join(' · ')}
            {lowStock.length > 3 && ` · and ${lowStock.length - 3} more`}
          </p>
        </Link>
      )}

      {/* Today — feedings and doses, ordered by when they fall due */}
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
            {selectableIds.length > 1 && (
              <button
                onClick={() => { setSelectMode((on) => !on); setSelected(new Set()) }}
                className="ml-auto text-xs font-medium"
                style={{ color: selectMode ? '#a8a090' : '#8fbe5a' }}
              >
                {selectMode ? 'Cancel' : 'Select'}
              </button>
            )}
          </div>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
            {queue.map((item, i) => {
              const { animal, due } = item
              const daysLate = differenceInDays(new Date(), due)
              const daysUntil = differenceInDays(due, new Date())
              const where = enclosureName(animal.enclosure_id)

              const detail = item.kind === 'dose'
                ? [describeDose(item.schedule, item.dose), item.schedule.dosage].filter(Boolean).join(' · ')
                : (() => {
                    const meal = lastMealByAnimal.get(animal.id)
                    if (!meal) return 'No feeding logged yet'
                    const size = meal.prey_size ? `, ${meal.prey_size}` : ''
                    const refused = meal.refused ? ' · refused' : ''
                    return `Last: ${meal.prey_type}${size} ×${meal.quantity} · ${format(new Date(meal.fed_at), 'd MMM')}${refused}`
                  })()

              const when = item.kind === 'dose'
                ? (daysLate > 0 ? `${daysLate} day${daysLate !== 1 ? 's' : ''} late` : 'due today')
                : item.status === 'overdue'
                  ? `${daysLate} day${daysLate !== 1 ? 's' : ''} overdue`
                  : daysUntil === 0 ? 'due today'
                  : daysUntil === 1 ? 'due tomorrow'
                  : `due in ${daysUntil} days`

              const tone = item.kind === 'dose' ? '#5a8fbe' : FEEDING_STATUS_META[item.status].color
              const selectable = item.kind === 'feeding'
              const isSelected = selected.has(animal.id)

              return (
                <div
                  key={item.key}
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={{ borderBottom: i < queue.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                >
                  {selectMode ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!selectable}
                      onChange={() => toggleSelected(animal.id)}
                      className="w-4 h-4 shrink-0 accent-[#8fbe5a]"
                      style={{ opacity: selectable ? 1 : 0.25 }}
                      aria-label={`Select ${animal.name}`}
                    />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tone }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#f0ece0' }}>
                      {animal.name} <span className="font-normal" style={{ color: tone }}>· {when}</span>
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#6a6458' }}>
                      {detail}{where ? ` · ${where}` : ''}
                    </p>
                  </div>
                  {!selectMode && (
                    item.kind === 'dose' ? (
                      <button
                        onClick={() => handleLogDose(item)}
                        disabled={loggingDoseId === item.schedule.id}
                        className="text-sm font-medium px-3 rounded-lg shrink-0 transition-opacity active:opacity-70 disabled:opacity-50"
                        style={{ height: 44, minWidth: 62, backgroundColor: 'rgba(90,143,190,0.15)', color: '#5a8fbe', border: '1px solid rgba(90,143,190,0.25)' }}
                      >
                        Log
                      </button>
                    ) : (
                      <button
                        onClick={() => { setQuickFeedAnimalId(animal.id); setActiveModal('feeding') }}
                        className="text-sm font-medium px-3 rounded-lg shrink-0 transition-opacity active:opacity-70"
                        style={{ height: 44, minWidth: 62, backgroundColor: 'rgba(143,190,90,0.15)', color: '#8fbe5a', border: '1px solid rgba(143,190,90,0.25)' }}
                      >
                        Feed
                      </button>
                    )
                  )}
                </div>
              )
            })}

            {selectMode ? (
              <button
                onClick={() => setActiveModal('batch')}
                disabled={selected.size === 0}
                className="w-full flex items-center justify-center h-12 text-sm font-medium disabled:opacity-40"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)', backgroundColor: 'rgba(143,190,90,0.1)', color: '#8fbe5a' }}
              >
                Log {selected.size} feeding{selected.size !== 1 ? 's' : ''}
              </button>
            ) : (
              /* The collection count lives here now rather than in the header —
                 a link to act on, not a figure to admire. */
              <Link
                to="/animals"
                className="flex items-center justify-center h-11 text-sm"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)', color: '#a8a090' }}
              >
                View all {animals.length} animal{animals.length !== 1 ? 's' : ''} &rarr;
              </Link>
            )}
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
        <FeedingLogForm
          preselectedAnimalId={quickFeedAnimalId ?? undefined}
          prefill={(() => {
            const meal = quickFeedAnimalId ? lastMealByAnimal.get(quickFeedAnimalId) : undefined
            return meal
              ? { preyType: meal.prey_type, preySize: meal.prey_size, quantity: meal.quantity }
              : undefined
          })()}
          onSuccess={() => { closeModal(); refreshAnimals(); refreshLogs() }}
          onCancel={closeModal}
        />
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

      <Modal open={activeModal === 'batch'} onClose={closeModal} title={`Feed ${selected.size} animal${selected.size !== 1 ? 's' : ''}`}>
        <BatchFeedForm
          animals={selectedAnimals}
          onSuccess={() => {
            closeModal()
            setSelectMode(false)
            setSelected(new Set())
            refreshAnimals()
            refreshLogs()
          }}
          onCancel={closeModal}
        />
      </Modal>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  )
}
