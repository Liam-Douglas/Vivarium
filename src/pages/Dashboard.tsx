import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import { useAnimals } from '@/hooks/useAnimals'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import {
  getRecentActivity, approveHouseholdRequest, denyHouseholdRequest,
  createSheddingLog, createWeightLog, createExpense,
} from '@/lib/queries'
import { AnimalCard } from '@/components/animals/AnimalCard'
import { AnimalForm } from '@/components/animals/AnimalForm'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { FeedingLogForm } from '@/components/feeding/FeedingLogForm'
import { AnimalCardSkeleton } from '@/components/ui/LoadingSkeleton'
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

function getStatusForAnimal(animal: { last_fed_at: string | null; feeding_frequency_days: number | null }) {
  if (!animal.last_fed_at || !animal.feeding_frequency_days) return 'muted'
  const days = differenceInDays(new Date(), new Date(animal.last_fed_at))
  if (days > animal.feeding_frequency_days) return 'red'
  if (days >= animal.feeding_frequency_days - 1) return 'amber'
  return 'green'
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
  const { data: animals, loading: animalsLoading, refresh: refreshAnimals } = useAnimals()
  const { showToast } = useToast()
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
      await createSheddingLog({ household_id: householdId, animal_id: shedAnimalId, user_id: user.id, shed_at: new Date(shedDate).toISOString(), complete: shedComplete, notes: shedNotes || undefined })
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
      await createWeightLog({ household_id: householdId, animal_id: weightAnimalId, user_id: user.id, weight_grams: Number(weightGrams), logged_at: new Date(weightDate).toISOString(), notes: weightNotes || undefined })
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
      await createExpense({ household_id: householdId, user_id: user.id, category: expCategory, amount_cents: Math.round(Number(expAmount) * 100), currency: 'AUD', description: expDescription, expense_date: new Date(expDate).toISOString() })
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
            {animals.length} animal{animals.length !== 1 ? 's' : ''} in your collection
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
          <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#242420', border: '1px dashed rgba(255,255,255,0.08)' }}>
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

      {/* FAB speed dial (mobile only) */}
      <div className="md:hidden fixed bottom-20 right-4 z-30 flex flex-col items-end gap-3">
        {/* Backdrop */}
        {fabOpen && (
          <div className="fixed inset-0 z-0" onClick={() => setFabOpen(false)} />
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
        <FeedingLogForm onSuccess={() => { closeModal(); refreshAnimals() }} onCancel={closeModal} />
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
