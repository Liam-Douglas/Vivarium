import { useState, useEffect, useMemo, useRef } from 'react'
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
import { useFeederInventory } from '@/hooks/useFeederInventory'
import { restockList, deriveFeederDemand, lastMealPerAnimal } from '@/lib/feederDemand'
import { useMedicationSchedules } from '@/hooks/useMedicationSchedules'
import { useMedicationLogs } from '@/hooks/useMedicationLogs'
import { useSheddingLogs } from '@/hooks/useSheddingLogs'
import { useWeightLogs } from '@/hooks/useWeightLogs'
import { collectWorthALook, WORTH_A_LOOK_COLOR } from '@/lib/worthALook'
import { AnimalForm } from '@/components/animals/AnimalForm'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { FeedingLogForm } from '@/components/feeding/FeedingLogForm'
import { BatchFeedForm } from '@/components/feeding/BatchFeedForm'
import { loadState } from '@/lib/loadState'
import { useCareTasks } from '@/hooks/useCareTasks'
import { getCareStatus, describeNextCare, CARE_URGENCY } from '@/lib/careStatus'
import { LoadError } from '@/components/ui/LoadError'
import { UpgradeModal } from '@/components/upgrade/UpgradeModal'
import { FirstRun } from '@/components/dashboard/FirstRun'
import { LargeTitle } from '@/components/ui/LargeTitle'
import { ListSection, ListRow } from '@/components/ui/List'
import { Icon, IconTile } from '@/components/ui/icons'
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
  { key: 'animal',  label: 'Add animal',  icon: 'animal' },
  { key: 'feeding', label: 'Log feeding', icon: 'feed' },
  { key: 'shed',    label: 'Log shed',    icon: 'shed' },
  { key: 'weight',  label: 'Log weight',  icon: 'weight' },
  { key: 'expense', label: 'Add expense', icon: 'expense' },
] as const

const ACTIVITY_ICON = {
  feeding: { icon: 'feed', color: 'var(--color-green)' },
  shedding: { icon: 'shed', color: 'var(--color-orange)' },
  weight: { icon: 'weight', color: 'var(--color-blue)' },
} as const

/** A row's leading circle: the animal's initial, ringed in its status colour. */
function Avatar({ name, tone }: { name: string; tone: string }) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? '?'
  return (
    <span
      aria-hidden="true"
      className="shrink-0 w-10 h-10 rounded-full bg-fill text-label-2 flex items-center justify-center text-[17px] font-semibold"
      style={{ boxShadow: `inset 0 0 0 2px ${tone}` }}
    >
      {initial}
    </span>
  )
}

export function Dashboard() {
  const { user, canAddAnimal } = useAuth()
  const { householdId, pendingRequests, currentUserRole, refresh: refreshHousehold } = useHousehold()
  const { data: animals, loading: animalsLoading, error: animalsError, refresh: refreshAnimals } = useAnimals()
  const { data: allLogs, error: logsError, refresh: refreshLogs } = useFeedingLogs()
  const { data: enclosures } = useEnclosures()
  const { data: feeders } = useFeederInventory()
  const { data: medSchedules, error: medSchedulesError } = useMedicationSchedules()
  const { data: medLogs, error: medLogsError, refresh: refreshMedLogs } = useMedicationLogs()
  const { data: careTasks } = useCareTasks()
  const { data: shedLogs, error: shedLogsError } = useSheddingLogs()
  const { data: weightLogs, error: weightLogsError } = useWeightLogs()
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
  // Rows just fed, folding away while the refresh that removes them is in
  // flight, so the queue closes up rather than jumping. If the animal is
  // somehow still due when the data lands, the row simply comes back.
  const [leavingIds, setLeavingIds] = useState<ReadonlySet<string>>(new Set())
  function markLeaving(id: string) {
    setLeavingIds((prev) => new Set(prev).add(id))
    window.setTimeout(() => setLeavingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    }), 1500)
  }

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
  const lastMealByAnimal = useMemo(() => lastMealPerAnimal(allLogs), [allLogs])

  // One queue ordered by when things fall due, replacing the old "Needs
  // feeding" and "Due soon" cards — identical row anatomy split by an
  // arbitrary threshold. Medication doses join it: a course of antibiotics is
  // more time-critical than a feed, and both tables have always existed
  // without ever reaching a screen.
  const queue = useMemo<QueueItem[]>(() => {
    const now = new Date()
    const animalById = new Map(animals.map((a) => [a.id, a]))

    const candidates = animals.map((animal) => ({
      kind: 'feeding' as const,
      key: `feed-${animal.id}`,
      animal,
      status: getFeedingStatus(animal, now),
      due: getNextFeedingDue(animal),
    }))

    // "Coming up": on a well-run collection this queue is blank most days,
    // which is the one state the dashboard had nothing to say about. It widens
    // to a week only when nothing is actually due — a seven-day queue every day
    // would bury today's work under next week's on the days that matter.
    const hasUrgent = candidates.some((i) => i.status === 'overdue' || i.status === 'due-soon')
    const horizonDays = hasUrgent ? 3 : 7

    const feedings: QueueItem[] = candidates
      .filter((item): item is Extract<QueueItem, { kind: 'feeding' }> =>
        item.due !== null && (
          item.status === 'overdue' || item.status === 'due-soon' ||
          (item.status === 'on-schedule' && differenceInDays(item.due, now) <= horizonDays)))

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

  // Care tasks get their own card rather than joining the queue above. That
  // queue is animal-shaped — a name column, an enclosure column and a Feed
  // button — and a task on the whole collection has no animal to put in it.
  const careDue = useMemo(
    () => careTasks
      .filter((t) => {
        const status = getCareStatus(t)
        return status === 'overdue' || status === 'due-soon'
      })
      .sort((a, b) => CARE_URGENCY[getCareStatus(a)] - CARE_URGENCY[getCareStatus(b)]),
    [careTasks]
  )

  /**
   * Feeder items worth restocking, from the rate the collection actually eats
   * rather than from whether the number looks small. Twelve rats is plenty for
   * one snake and a fortnight's notice for eight.
   *
   * The Expenses shopping list asks the same question of the same code, so the
   * two cannot drift into flagging different items.
   */
  const lowStock = useMemo(
    () => restockList(feeders, deriveFeederDemand(animals, lastMealByAnimal, feeders)),
    [animals, feeders, lastMealByAnimal]
  )

  /**
   * Conditions no schedule produces: a late shed, a running quarantine, a
   * weight nobody has taken in a season. Grouped here and ranked in
   * lib/worthALook, which is where the rules and their tests live.
   */
  const worthALook = useMemo(() => {
    const group = <T extends { animal_id: string }>(logs: readonly T[]) => {
      const byAnimal = new Map<string, T[]>()
      for (const log of logs) {
        const held = byAnimal.get(log.animal_id)
        if (held) held.push(log)
        else byAnimal.set(log.animal_id, [log])
      }
      return byAnimal
    }
    return collectWorthALook({
      animals,
      shedLogsByAnimal: group(shedLogs),
      weightLogsByAnimal: group(weightLogs),
    })
  }, [animals, shedLogs, weightLogs])

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

  // The Dashboard derives everything from animals: with none held it reports
  // "Nothing due today", which on a failed load is an all-clear the app has no
  // basis for. One error region rather than six, because six hooks failing at
  // once is one failure — the network.
  const animalsState = loadState({ loading: animalsLoading, error: animalsError, count: animals.length })
  // A loaded, empty collection: first run. Every logging control needs an
  // animal to log against, so they wait until there is one.
  const firstRun = animalsState === 'empty'
  // Shedding and weight feed the "Worth a look" section below. A failure there
  // shows up as an empty section, which reads as nothing to look at — the same
  // false all-clear the queue's error region exists to prevent — so it is
  // reported rather than swallowed.
  const secondaryError = logsError ?? medSchedulesError ?? medLogsError
    ?? shedLogsError ?? weightLogsError
  function retryAll() {
    refreshAnimals()
    refreshLogs()
    refreshMedLogs()
  }

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


  // Nothing on this page means anything without animals, so a failed first
  // load replaces it rather than rendering a dashboard of zeroes.
  if (animalsState === 'error') {
    return (
      <div className="flex-1 px-4 lg:px-8 py-6 pb-nav-fab md:pb-8 max-w-[1240px] mx-auto w-full">
        <LoadError subject="your collection" message={animalsError} onRetry={retryAll} />
      </div>
    )
  }

  const tiles = [
    { key: 'overdue', label: 'Overdue', count: feedingSummary.overdue, color: 'var(--color-red)' },
    { key: 'due', label: 'Due soon', count: feedingSummary.dueSoon, color: 'var(--color-orange)' },
  ]
  const nothingDue = feedingSummary.overdue === 0 && feedingSummary.dueSoon === 0

  return (
    <div className="flex-1 px-4 lg:px-8 pt-2 md:pt-6 pb-nav-fab md:pb-8 max-w-[1040px] mx-auto w-full">
      {/* A refresh failed over rows already on screen, or something other than
          the animals themselves did — say so without discarding the page. */}
      {(animalsState === 'stale' || secondaryError) && (
        <LoadError
          inline
          subject="the latest records"
          message={animalsError ?? secondaryError}
          onRetry={retryAll}
        />
      )}

      <LargeTitle
        title="Today"
        subtitle={firstRun ? 'No animals yet' : (
          <>
            {format(new Date(), 'EEEE d MMMM')}
            {nothingDue && ' · Nothing due today'}
            {/* Never imply all-clear while animals are untracked. */}
            {feedingSummary.untracked > 0 && ` · ${feedingSummary.untracked} not tracked`}
          </>
        )}
        trailing={!firstRun && (
          /* Desktop counterpart of the FAB: every logging action, not only
             feeding, without opening an animal first. */
          <div className="hidden md:block relative" ref={logMenuRef}>
            <div className="flex items-stretch">
              <button
                onClick={() => openModal('feeding')}
                className="inline-flex items-center gap-1.5 h-9 pl-3.5 pr-3 text-[15px] font-semibold rounded-l-[10px] bg-tint text-on-tint active:opacity-70 transition-opacity"
              >
                <Icon name="plus" size={16} strokeWidth={2.4} />
                Log feeding
              </button>
              <button
                onClick={() => setLogMenuOpen((open) => !open)}
                aria-label="More logging actions"
                aria-expanded={logMenuOpen}
                className="inline-flex items-center justify-center w-8 h-9 rounded-r-[10px] bg-tint text-on-tint border-l border-black/15 active:opacity-70 transition-opacity"
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                  style={{ transform: logMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms var(--ease-out)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {logMenuOpen && (
              <div className="popover-in origin-top-right absolute right-0 mt-2 w-56 rounded-xl py-1 z-30 bg-surface-2 shadow-[var(--shadow-popover)] border-[0.5px] border-separator">
                {FAB_ACTIONS.filter((a) => a.key !== 'feeding').map((action) => (
                  <button
                    key={action.key}
                    onClick={() => { setLogMenuOpen(false); openModal(action.key as ActiveModal) }}
                    className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 text-[15px] text-left text-label hover:bg-fill"
                  >
                    {action.label}
                    <Icon name={action.icon} size={18} className="text-label-2" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      />

      {/* Smart-list tiles, as in Reminders: what is late and what is next,
          counted. Hidden on a quiet day, when the subtitle says so instead. */}
      {!firstRun && !nothingDue && (
        <div className="grid grid-cols-2 gap-2.5 mb-6 lg:mr-[384px]">
          {tiles.map((t) => (
            <a key={t.key} href="#feed-now" className="block rounded-xl bg-surface px-3.5 pt-2.5 pb-2 active:opacity-70 transition-opacity">
              <p className="text-[15px] font-semibold" style={{ color: t.color }}>{t.label}</p>
              <p className="text-[28px] leading-[34px] font-bold text-label tabular-nums">{t.count}</p>
            </a>
          ))}
        </div>
      )}

      {/* Pending join requests (owner only) */}
      {currentUserRole === 'owner' && pendingRequests.length > 0 && (
        <ListSection prominent header="Join requests" className="mb-6">
          {pendingRequests.map((req) => {
            const p = req.profiles as { full_name: string | null } | null
            return (
              <ListRow
                key={req.id}
                leading={<IconTile name="person" color="var(--color-blue)" />}
              >
                <p className="text-[17px] text-label break-words">{p?.full_name ?? 'Someone'}</p>
                <p className="text-[13px] text-label-2">Wants to join your collection</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => handleApprove(req.id)} loading={approvingId === req.id}>Approve</Button>
                  <Button size="sm" variant="secondary" onClick={() => handleDeny(req.id)}>Deny</Button>
                </div>
              </ListRow>
            )
          })}
        </ListSection>
      )}

      {/* Feeding strike warning */}
      {strikeAnimals.length > 0 && (
        <ListSection className="mb-6">
          <ListRow leading={<IconTile name="alert" color="var(--color-red)" />}>
            <p className="text-[17px] font-semibold text-red">Feeding strike detected</p>
            <p className="text-[13px] text-label-2 mt-0.5">
              {strikeAnimals.map((a) => a.name).join(', ')} {strikeAnimals.length === 1 ? 'has' : 'have'} refused 3+ consecutive meals. Consider checking for health issues or environment problems.
            </p>
          </ListRow>
        </ListSection>
      )}

      {firstRun && (
        <div className="mb-6">
          <FirstRun onAddAnimal={() => openModal('animal')} />
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:items-start">
        <div className="min-w-0">
      {/* Feed now: feedings and doses, ordered by when they fall due */}
      {queue.length > 0 && (
        <ListSection
          prominent
          className="mb-6 scroll-mt-16"
          header={<span id="feed-now">Feed now</span>}
          action={selectableIds.length > 1 && (
            <button
              onClick={() => { setSelectMode((on) => !on); setSelected(new Set()) }}
              className="tap-target text-[15px] text-tint"
            >
              {selectMode ? 'Done' : 'Select'}
            </button>
          )}
        >
            {queue.map((item) => {
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
                  : daysUntil === 0 ? 'Due today'
                  : daysUntil === 1 ? 'Due tomorrow'
                  : `Due in ${daysUntil} days`

              const tone = item.kind === 'dose' ? 'var(--color-blue)' : FEEDING_STATUS_META[item.status].color
              const selectable = item.kind === 'feeding'
              const isSelected = selected.has(animal.id)
              const leaving = item.kind === 'feeding' && leavingIds.has(animal.id)

              return (
                <div
                  key={item.key}
                  // Fed: the button becomes a check (Things' check-off), then
                  // the row folds away while the refresh removes it.
                  className={`list-row list-row-leading grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-opacity ${leaving ? 'delay-[450ms]' : ''}`}
                  style={{ gridTemplateRows: leaving ? '0fr' : '1fr', opacity: leaving ? 0 : 1 }}
                  aria-hidden={leaving || undefined}
                >
                <div className="min-h-0 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2.5 min-h-[60px]">
                  {selectMode ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!selectable}
                      onChange={() => toggleSelected(animal.id)}
                      className="w-[22px] h-[22px] shrink-0 accent-tint rounded-full"
                      style={{ opacity: selectable ? 1 : 0.25 }}
                      aria-label={`Select ${animal.name}`}
                    />
                  ) : (
                    <Avatar name={animal.name} tone={tone} />
                  )}
                  <div className="flex-1 min-w-0">
                    {/* The name gives way, never the lateness. */}
                    <p className="text-[17px] text-label truncate">{animal.name}</p>
                    <p className="text-[13px] flex min-w-0 mt-0.5">
                      <span className="font-semibold shrink-0 whitespace-nowrap" style={{ color: tone }}>{when}</span>
                      <span className="text-label-2 truncate">&nbsp;· {detail}{where ? ` · ${where}` : ''}</span>
                    </p>
                  </div>
                  {!selectMode && (
                    item.kind === 'dose' ? (
                      <button
                        onClick={() => handleLogDose(item)}
                        disabled={loggingDoseId === item.schedule.id}
                        className="tap-target shrink-0 h-[30px] min-w-[60px] px-4 rounded-full text-[15px] font-semibold active:opacity-60 transition-opacity disabled:opacity-40"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-blue) 14%, transparent)', color: 'var(--color-blue)' }}
                      >
                        Log
                      </button>
                    ) : leaving ? (
                      <span className="check-pop shrink-0 w-[30px] h-[30px] rounded-full bg-tint text-on-tint flex items-center justify-center mr-[15px]" aria-hidden="true">
                        <Icon name="check" size={16} strokeWidth={3} />
                      </span>
                    ) : (
                      <button
                        onClick={() => { setQuickFeedAnimalId(animal.id); setActiveModal('feeding') }}
                        className="tap-target shrink-0 h-[30px] min-w-[60px] px-4 rounded-full text-[15px] font-semibold active:opacity-60 transition-opacity"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-tint) 14%, transparent)', color: 'var(--color-tint)' }}
                      >
                        Feed
                      </button>
                    )
                  )}
                </div>
                </div>
                </div>
              )
            })}

            {selectMode ? (
              <button
                onClick={() => setActiveModal('batch')}
                disabled={selected.size === 0}
                className="list-row relative w-full flex items-center justify-center min-h-11 text-[17px] font-semibold text-tint disabled:text-label-3"
              >
                Log {selected.size} feeding{selected.size !== 1 ? 's' : ''}
              </button>
            ) : (
              <ListRow to="/animals">
                <span className="text-[17px] text-tint">All {animals.length} animal{animals.length !== 1 ? 's' : ''}</span>
              </ListRow>
            )}
        </ListSection>
      )}

      {/* Animals no feeding queue can reach: they would otherwise read as on schedule */}
      {(unscheduledAnimals.length > 0 || neverFedAnimals.length > 0) && (
        <ListSection prominent header="Not tracked" className="mb-6">
          <ListRow to="/animals" leading={<IconTile name="question" color="var(--color-orange)" />}>
            <p className="text-[17px] text-label">
              {feedingSummary.untracked} animal{feedingSummary.untracked !== 1 ? 's' : ''} not tracked
            </p>
            {unscheduledAnimals.length > 0 && (
              <p className="text-[13px] text-label-2 mt-0.5">
                {nameList(unscheduledAnimals)} {unscheduledAnimals.length === 1 ? 'has' : 'have'} no
                feeding schedule, so {unscheduledAnimals.length === 1 ? 'it' : 'they'} will never appear as due. Set a
                feeding frequency to include {unscheduledAnimals.length === 1 ? 'it' : 'them'}.
              </p>
            )}
            {neverFedAnimals.length > 0 && (
              <p className="text-[13px] text-label-2 mt-0.5">
                {nameList(neverFedAnimals)} {neverFedAnimals.length === 1 ? 'has' : 'have'} a schedule
                but no feeding logged yet, so there is nothing to count from.
              </p>
            )}
          </ListRow>
        </ListSection>
      )}

      {/* Worth a look: only when the queue is empty, because these are things
          to notice rather than things to do. */}
      {queue.length === 0 && worthALook.length > 0 && (
        <ListSection prominent header="Worth a look" className="mb-6">
          {worthALook.map((item) => (
            <ListRow
              key={item.key}
              to={`/animals/${item.animalId}`}
              leading={<span className="flex w-[30px] justify-center"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: WORTH_A_LOOK_COLOR[item.kind] }} /></span>}
            >
              <p className="text-[17px] text-label truncate">{item.animalName}</p>
              <p className="text-[13px] text-label-2">{item.detail}</p>
            </ListRow>
          ))}
        </ListSection>
      )}
        </div>
        <div className="min-w-0">
      {/* Care due: cleaning, weighing and the rest */}
      {careDue.length > 0 && (
        <ListSection prominent header={`${careDue.length} care task${careDue.length !== 1 ? 's' : ''} due`} className="mb-6">
          {careDue.slice(0, 4).map((t) => (
            <ListRow key={t.id} to="/reminders" leading={<IconTile name="bell" color="var(--color-blue)" />}>
              <p className="text-[17px] text-label truncate">{t.name}</p>
              <p className="text-[13px] text-label-2">{describeNextCare(t)}</p>
            </ListRow>
          ))}
          {careDue.length > 4 && (
            <ListRow to="/reminders"><span className="text-[17px] text-tint">{careDue.length - 4} more</span></ListRow>
          )}
        </ListSection>
      )}

      {/* Feeder stock: needed before you start feeding, not after */}
      {lowStock.length > 0 && (
        <ListSection prominent header="Feeder stock is running low" className="mb-6">
          {lowStock.slice(0, 4).map(({ item, projection }) => (
            <ListRow key={item.id} to="/feeders" leading={<IconTile name="box" color="var(--color-orange)" />}>
              <p className="text-[17px] text-label truncate">
                {projection.daysRemaining === null
                  ? `${item.name} — ${item.currentStock} left`
                  : `${item.name} — ${projection.daysRemaining}d left`}
              </p>
            </ListRow>
          ))}
          {lowStock.length > 4 && (
            <ListRow to="/feeders"><span className="text-[17px] text-tint">{lowStock.length - 4} more</span></ListRow>
          )}
        </ListSection>
      )}

      {/* Recent activity */}
      {!firstRun && (
        <ListSection prominent header="Recent activity" className="mb-6">
          {activityLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-label-3)', borderTopColor: 'transparent' }} />
            </div>
          ) : activity.length === 0 ? (
            <ListRow><p className="text-[15px] text-label-2 py-1">No activity yet. Feedings, weights and sheds logged by anyone in your household appear here.</p></ListRow>
          ) : (
            activity.map((item) => (
              <ListRow key={item.id} leading={<IconTile name={ACTIVITY_ICON[item.type].icon} color={ACTIVITY_ICON[item.type].color} />}>
                <p className="text-[15px] text-label">
                  <span className="font-semibold">{item.animalName}</span> · {item.detail}
                </p>
                <p className="text-[13px] text-label-2 mt-0.5">
                  {item.loggedBy} · {format(new Date(item.timestamp), 'd MMM, h:mm a')}
                </p>
              </ListRow>
            ))
          )}
        </ListSection>
      )}
        </div>
      </div>

      {/* FAB speed dial (mobile only) */}
      {!firstRun && <div className="md:hidden fixed bottom-above-nav right-4 z-30 flex flex-col items-end gap-3 pointer-events-none">
        {/* Backdrop. Mounted throughout and faded, like the items, so closing
            reverses the opening instead of everything vanishing at once. */}
        <div
          data-open={fabOpen || undefined}
          className={`fade-away fixed inset-0 z-0 transition-opacity duration-200 ease-out ${fabOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
          style={{ backgroundColor: 'rgba(10,10,8,0.72)', backdropFilter: 'blur(2px)' }}
          onClick={() => setFabOpen(false)}
        />

        {/* Action items rise from the button, nearest first, 30ms apart; they
            leave together. Inert while closed. */}
        {FAB_ACTIONS.map((action, i) => (
          <div
            key={action.key}
            inert={!fabOpen}
            data-open={fabOpen || undefined}
            className={`fade-away relative z-10 flex items-center gap-3 transition-[opacity,transform] duration-150 ease-out ${fabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 motion-reduce:translate-y-0'}`}
            style={{ transitionDelay: fabOpen ? `${(FAB_ACTIONS.length - 1 - i) * 30}ms` : '0ms' }}
          >
            <span
              aria-hidden="true"
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg"
              style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-label)', border: '1px solid var(--color-separator)' }}
            >
              {action.label}
            </span>
            <button
              type="button"
              aria-label={action.label}
              onClick={() => openModal(action.key as ActiveModal)}
              className="w-11 h-11 rounded-full flex items-center justify-center text-tint shadow-lg transition-transform duration-150 ease-out active:scale-95 motion-reduce:active:scale-100"
              style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-separator)' }}
            >
              <Icon name={action.icon} size={20} />
            </button>
          </div>
        ))}

        {/* Main FAB */}
        <button
          type="button"
          aria-label="Quick log"
          aria-expanded={fabOpen}
          onClick={() => setFabOpen((o) => !o)}
          className="relative z-10 pointer-events-auto w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform duration-150 ease-out active:scale-95 motion-reduce:active:scale-100"
          style={{ backgroundColor: 'var(--color-tint)', color: 'var(--color-on-tint)' }}
        >
          <svg
            width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            style={{ transform: fabOpen ? 'rotate(45deg)' : 'none', transition: 'transform 200ms var(--ease-out)' }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>}

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
          onSuccess={() => { if (quickFeedAnimalId) markLeaving(quickFeedAnimalId); closeModal(); refreshAnimals(); refreshLogs() }}
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
          <label className="flex items-center justify-between gap-3 min-h-11 px-4 py-1.5 rounded-[10px] bg-fill cursor-pointer">
            <span className="text-[17px] text-label">Complete shed</span>
            <input type="checkbox" checked={shedComplete} onChange={(e) => setShedComplete(e.target.checked)} className="switch" />
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
