import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, differenceInMonths } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  getAnimal, deactivateAnimal,
  createWeightLog, updateWeightLog, deleteWeightLog,
  createSheddingLog, updateSheddingLog, deleteSheddingLog,
  createHealthEvent, updateHealthEvent, deleteHealthEvent,
  updateFeedingLog, deleteFeedingLog,
} from '@/lib/queries'
import { useFeedingLogs } from '@/hooks/useFeedingLogs'
import { useSheddingLogs } from '@/hooks/useSheddingLogs'
import { useWeightLogs } from '@/hooks/useWeightLogs'
import { useHealthEvents } from '@/hooks/useHealthEvents'
import type { HealthEvent } from '@/hooks/useHealthEvents'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { AnimalForm } from '@/components/animals/AnimalForm'
import type { Animal } from '@/hooks/useAnimals'
import type { FeedingLog } from '@/hooks/useFeedingLogs'
import type { SheddingLog } from '@/hooks/useSheddingLogs'
import type { WeightLog } from '@/hooks/useWeightLogs'
import { FeedingLogForm } from '@/components/feeding/FeedingLogForm'
import { useAcquisitionRecords } from '@/hooks/useAcquisitionRecords'
import type { AcquisitionRecord } from '@/hooks/useAcquisitionRecords'
import { useExitRecords } from '@/hooks/useExitRecords'
import type { ExitRecord } from '@/hooks/useExitRecords'
import { useBreedingRecords } from '@/hooks/useBreedingRecords'
import type { BreedingRecord } from '@/hooks/useBreedingRecords'
import {
  createAcquisitionRecord, updateAcquisitionRecord, deleteAcquisitionRecord,
  createExitRecord, updateExitRecord, deleteExitRecord,
  createBreedingRecord, updateBreedingRecord, deleteBreedingRecord,
} from '@/lib/queries'

type Tab = 'overview' | 'feeding' | 'weight' | 'shedding' | 'health' | 'acquisition' | 'exit' | 'breeding'

function RecordActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-1 shrink-0">
      <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: 'rgba(143,190,90,0.1)', color: '#8fbe5a' }}>
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
      </button>
      <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: 'rgba(196,90,90,0.1)', color: '#c45a5a' }}>
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  )
}

export function AnimalDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()

  const [animal, setAnimal] = useState<Animal | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [feedOpen, setFeedOpen] = useState(false)

  const { data: feedingLogs, refresh: refreshFeeding } = useFeedingLogs(id)
  const { data: sheddingLogs, refresh: refreshShedding } = useSheddingLogs(id)
  const { data: weightLogs, refresh: refreshWeight } = useWeightLogs(id ?? '')
  const { data: healthEvents, refresh: refreshHealth } = useHealthEvents(id)
  const { data: acquisitionRecords, refresh: refreshAcquisition } = useAcquisitionRecords(id)
  const { data: exitRecords, refresh: refreshExit } = useExitRecords(id)
  const { data: breedingRecords, refresh: refreshBreeding } = useBreedingRecords(id)

  // ── Weight state ──────────────────────────────────────────────────────────
  const [weightOpen, setWeightOpen] = useState(false)
  const [editingWeight, setEditingWeight] = useState<WeightLog | null>(null)
  const [weightGrams, setWeightGrams] = useState('')
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0])
  const [weightNotes, setWeightNotes] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)

  // ── Shedding state ────────────────────────────────────────────────────────
  const [shedOpen, setShedOpen] = useState(false)
  const [editingShed, setEditingShed] = useState<SheddingLog | null>(null)
  const [shedDate, setShedDate] = useState(new Date().toISOString().split('T')[0])
  const [shedComplete, setShedComplete] = useState(true)
  const [shedNotes, setShedNotes] = useState('')
  const [savingShed, setSavingShed] = useState(false)

  // ── Health state ──────────────────────────────────────────────────────────
  const [healthOpen, setHealthOpen] = useState(false)
  const [editingHealth, setEditingHealth] = useState<HealthEvent | null>(null)
  const [healthTitle, setHealthTitle] = useState('')
  const [healthType, setHealthType] = useState('observation')
  const [healthDate, setHealthDate] = useState(new Date().toISOString().split('T')[0])
  const [healthNotes, setHealthNotes] = useState('')
  const [healthCost, setHealthCost] = useState('')
  const [savingHealth, setSavingHealth] = useState(false)

  // ── Feeding edit state ────────────────────────────────────────────────────
  const [editingFeed, setEditingFeed] = useState<FeedingLog | null>(null)
  const [feedEditPreyType, setFeedEditPreyType] = useState('')
  const [feedEditPreySize, setFeedEditPreySize] = useState('')
  const [feedEditQty, setFeedEditQty] = useState('1')
  const [feedEditRefused, setFeedEditRefused] = useState(false)
  const [feedEditNotes, setFeedEditNotes] = useState('')
  const [feedEditDate, setFeedEditDate] = useState('')
  const [savingFeedEdit, setSavingFeedEdit] = useState(false)

  // ── Acquisition state ─────────────────────────────────────────────────────
  const [acquisitionOpen, setAcquisitionOpen] = useState(false)
  const [editingAcquisition, setEditingAcquisition] = useState<AcquisitionRecord | null>(null)
  const [acqDate, setAcqDate] = useState(new Date().toISOString().split('T')[0])
  const [acqSource, setAcqSource] = useState('')
  const [acqSourceName, setAcqSourceName] = useState('')
  const [acqPrice, setAcqPrice] = useState('')
  const [acqNotes, setAcqNotes] = useState('')
  const [savingAcq, setSavingAcq] = useState(false)

  // ── Exit state ────────────────────────────────────────────────────────────
  const [exitOpen, setExitOpen] = useState(false)
  const [editingExit, setEditingExit] = useState<ExitRecord | null>(null)
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0])
  const [exitReason, setExitReason] = useState('sold')
  const [exitPrice, setExitPrice] = useState('')
  const [exitNotes, setExitNotes] = useState('')
  const [savingExit, setSavingExit] = useState(false)

  // ── Breeding state ────────────────────────────────────────────────────────
  const [breedingOpen, setBreedingOpen] = useState(false)
  const [editingBreeding, setEditingBreeding] = useState<BreedingRecord | null>(null)
  const [breedPairingDate, setBreedPairingDate] = useState(new Date().toISOString().split('T')[0])
  const [breedPartnerName, setBreedPartnerName] = useState('')
  const [breedOutcome, setBreedOutcome] = useState('unknown')
  const [breedClutchSize, setBreedClutchSize] = useState('')
  const [breedEggsFertile, setBreedEggsFertile] = useState('')
  const [breedHatchDate, setBreedHatchDate] = useState('')
  const [breedNotes, setBreedNotes] = useState('')
  const [savingBreed, setSavingBreed] = useState(false)

  useEffect(() => {
    if (!id) return
    getAnimal(id).then((a) => { setAnimal(a as Animal); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  // ── Weight handlers ───────────────────────────────────────────────────────
  function openAddWeight() {
    setEditingWeight(null)
    setWeightGrams('')
    setWeightDate(new Date().toISOString().split('T')[0])
    setWeightNotes('')
    setWeightOpen(true)
  }
  function openEditWeight(log: WeightLog) {
    setEditingWeight(log)
    setWeightGrams(String(log.weight_grams))
    setWeightDate(log.logged_at.split('T')[0])
    setWeightNotes(log.notes ?? '')
    setWeightOpen(true)
  }
  async function handleSaveWeight() {
    if (!user || !householdId || !id || !weightGrams) return
    setSavingWeight(true)
    try {
      if (editingWeight) {
        await updateWeightLog(editingWeight.id, { weight_grams: Number(weightGrams), logged_at: new Date(weightDate).toISOString(), notes: weightNotes || null })
        showToast('Weight updated', 'success')
      } else {
        await createWeightLog({ household_id: householdId, animal_id: id, user_id: user.id, weight_grams: Number(weightGrams), logged_at: new Date(weightDate).toISOString(), notes: weightNotes || undefined })
        showToast('Weight logged', 'success')
      }
      refreshWeight()
      setWeightOpen(false)
    } catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
    finally { setSavingWeight(false) }
  }
  async function handleDeleteWeight(log: WeightLog) {
    if (!confirm('Delete this weight entry?')) return
    try { await deleteWeightLog(log.id); refreshWeight(); showToast('Deleted', 'success') }
    catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
  }

  // ── Shedding handlers ─────────────────────────────────────────────────────
  function openAddShed() {
    setEditingShed(null)
    setShedDate(new Date().toISOString().split('T')[0])
    setShedComplete(true)
    setShedNotes('')
    setShedOpen(true)
  }
  function openEditShed(log: SheddingLog) {
    setEditingShed(log)
    setShedDate(log.shed_at.split('T')[0])
    setShedComplete(log.complete)
    setShedNotes(log.notes ?? '')
    setShedOpen(true)
  }
  async function handleSaveShed() {
    if (!user || !householdId || !id) return
    setSavingShed(true)
    try {
      if (editingShed) {
        await updateSheddingLog(editingShed.id, { shed_at: new Date(shedDate).toISOString(), complete: shedComplete, notes: shedNotes || null })
        showToast('Shed updated', 'success')
      } else {
        await createSheddingLog({ household_id: householdId, animal_id: id, user_id: user.id, shed_at: new Date(shedDate).toISOString(), complete: shedComplete, notes: shedNotes || undefined })
        showToast('Shed logged', 'success')
      }
      refreshShedding()
      setShedOpen(false)
    } catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
    finally { setSavingShed(false) }
  }
  async function handleDeleteShed(log: SheddingLog) {
    if (!confirm('Delete this shed record?')) return
    try { await deleteSheddingLog(log.id); refreshShedding(); showToast('Deleted', 'success') }
    catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
  }

  // ── Health handlers ───────────────────────────────────────────────────────
  function openAddHealth() {
    setEditingHealth(null)
    setHealthTitle('')
    setHealthType('observation')
    setHealthDate(new Date().toISOString().split('T')[0])
    setHealthNotes('')
    setHealthCost('')
    setHealthOpen(true)
  }
  function openEditHealth(ev: HealthEvent) {
    setEditingHealth(ev)
    setHealthTitle(ev.title)
    setHealthType(ev.event_type)
    setHealthDate(ev.event_date.split('T')[0])
    setHealthNotes(ev.notes ?? '')
    setHealthCost(ev.cost_cents != null ? String(ev.cost_cents / 100) : '')
    setHealthOpen(true)
  }
  async function handleSaveHealth() {
    if (!user || !householdId || !id || !healthTitle) return
    setSavingHealth(true)
    try {
      const cost = healthCost ? Math.round(Number(healthCost) * 100) : null
      if (editingHealth) {
        await updateHealthEvent(editingHealth.id, { event_type: healthType, event_date: new Date(healthDate).toISOString(), title: healthTitle, notes: healthNotes || null, cost_cents: cost })
        showToast('Health event updated', 'success')
      } else {
        await createHealthEvent({ household_id: householdId, animal_id: id, user_id: user.id, event_type: healthType, event_date: new Date(healthDate).toISOString(), title: healthTitle, notes: healthNotes || undefined, cost_cents: cost ?? undefined })
        showToast('Health event added', 'success')
      }
      refreshHealth()
      setHealthOpen(false)
    } catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
    finally { setSavingHealth(false) }
  }
  async function handleDeleteHealth(ev: HealthEvent) {
    if (!confirm('Delete this health event?')) return
    try { await deleteHealthEvent(ev.id); refreshHealth(); showToast('Deleted', 'success') }
    catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
  }

  // ── Feeding edit handlers ─────────────────────────────────────────────────
  function openEditFeed(log: FeedingLog) {
    setEditingFeed(log)
    setFeedEditPreyType(log.prey_type)
    setFeedEditPreySize(log.prey_size ?? '')
    setFeedEditQty(String(log.quantity))
    setFeedEditRefused(log.refused)
    setFeedEditNotes(log.notes ?? '')
    setFeedEditDate(log.fed_at.split('T')[0])
  }
  async function handleSaveFeedEdit() {
    if (!editingFeed) return
    setSavingFeedEdit(true)
    try {
      await updateFeedingLog(editingFeed.id, { prey_type: feedEditPreyType, prey_size: feedEditPreySize || null, quantity: Number(feedEditQty), refused: feedEditRefused, notes: feedEditNotes || null, fed_at: new Date(feedEditDate).toISOString() })
      refreshFeeding()
      setEditingFeed(null)
      showToast('Feeding updated', 'success')
    } catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
    finally { setSavingFeedEdit(false) }
  }
  async function handleDeleteFeed(log: FeedingLog) {
    if (!confirm('Delete this feeding record?')) return
    try { await deleteFeedingLog(log.id); refreshFeeding(); showToast('Deleted', 'success') }
    catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
  }

  // ── Acquisition handlers ──────────────────────────────────────────────────
  function openAddAcquisition() { setEditingAcquisition(null); setAcqDate(new Date().toISOString().split('T')[0]); setAcqSource(''); setAcqSourceName(''); setAcqPrice(''); setAcqNotes(''); setAcquisitionOpen(true) }
  function openEditAcquisition(r: AcquisitionRecord) { setEditingAcquisition(r); setAcqDate(r.acquired_at); setAcqSource(r.source ?? ''); setAcqSourceName(r.source_name ?? ''); setAcqPrice(r.price_cents != null ? String(r.price_cents / 100) : ''); setAcqNotes(r.notes ?? ''); setAcquisitionOpen(true) }
  async function handleSaveAcquisition() {
    if (!user || !householdId || !id) return
    setSavingAcq(true)
    try {
      const price = acqPrice ? Math.round(Number(acqPrice) * 100) : undefined
      if (editingAcquisition) {
        await updateAcquisitionRecord(editingAcquisition.id, { acquired_at: acqDate, source: acqSource || null, source_name: acqSourceName || null, price_cents: price ?? null, notes: acqNotes || null })
        showToast('Record updated', 'success')
      } else {
        await createAcquisitionRecord({ household_id: householdId, animal_id: id, user_id: user.id, acquired_at: acqDate, source: acqSource || undefined, source_name: acqSourceName || undefined, price_cents: price, notes: acqNotes || undefined })
        showToast('Acquisition recorded', 'success')
      }
      refreshAcquisition(); setAcquisitionOpen(false)
    } catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
    finally { setSavingAcq(false) }
  }
  async function handleDeleteAcquisition(r: AcquisitionRecord) {
    if (!confirm('Delete this acquisition record?')) return
    try { await deleteAcquisitionRecord(r.id); refreshAcquisition(); showToast('Deleted', 'success') }
    catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
  }

  // ── Exit handlers ─────────────────────────────────────────────────────────
  function openAddExit() { setEditingExit(null); setExitDate(new Date().toISOString().split('T')[0]); setExitReason('sold'); setExitPrice(''); setExitNotes(''); setExitOpen(true) }
  function openEditExit(r: ExitRecord) { setEditingExit(r); setExitDate(r.exited_at); setExitReason(r.reason); setExitPrice(r.price_cents != null ? String(r.price_cents / 100) : ''); setExitNotes(r.notes ?? ''); setExitOpen(true) }
  async function handleSaveExit() {
    if (!user || !householdId || !id) return
    setSavingExit(true)
    try {
      const price = exitPrice ? Math.round(Number(exitPrice) * 100) : undefined
      if (editingExit) {
        await updateExitRecord(editingExit.id, { exited_at: exitDate, reason: exitReason, price_cents: price ?? null, notes: exitNotes || null })
        showToast('Record updated', 'success')
      } else {
        await createExitRecord({ household_id: householdId, animal_id: id, user_id: user.id, exited_at: exitDate, reason: exitReason, price_cents: price, notes: exitNotes || undefined })
        showToast('Exit recorded', 'success')
      }
      refreshExit(); setExitOpen(false)
    } catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
    finally { setSavingExit(false) }
  }
  async function handleDeleteExit(r: ExitRecord) {
    if (!confirm('Delete this exit record?')) return
    try { await deleteExitRecord(r.id); refreshExit(); showToast('Deleted', 'success') }
    catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
  }

  // ── Breeding handlers ─────────────────────────────────────────────────────
  function openAddBreeding() { setEditingBreeding(null); setBreedPairingDate(new Date().toISOString().split('T')[0]); setBreedPartnerName(''); setBreedOutcome('unknown'); setBreedClutchSize(''); setBreedEggsFertile(''); setBreedHatchDate(''); setBreedNotes(''); setBreedingOpen(true) }
  function openEditBreeding(r: BreedingRecord) { setEditingBreeding(r); setBreedPairingDate(r.pairing_date); setBreedPartnerName(r.paired_with_name ?? ''); setBreedOutcome(r.outcome ?? 'unknown'); setBreedClutchSize(r.clutch_size != null ? String(r.clutch_size) : ''); setBreedEggsFertile(r.eggs_fertile != null ? String(r.eggs_fertile) : ''); setBreedHatchDate(r.hatch_date ?? ''); setBreedNotes(r.notes ?? ''); setBreedingOpen(true) }
  async function handleSaveBreeding() {
    if (!user || !householdId || !id) return
    setSavingBreed(true)
    try {
      if (editingBreeding) {
        await updateBreedingRecord(editingBreeding.id, { pairing_date: breedPairingDate, paired_with_name: breedPartnerName || null, outcome: breedOutcome || null, clutch_size: breedClutchSize ? Number(breedClutchSize) : null, eggs_fertile: breedEggsFertile ? Number(breedEggsFertile) : null, hatch_date: breedHatchDate || null, notes: breedNotes || null })
        showToast('Record updated', 'success')
      } else {
        await createBreedingRecord({ household_id: householdId, animal_id: id, user_id: user.id, pairing_date: breedPairingDate, paired_with_name: breedPartnerName || undefined, outcome: breedOutcome || undefined, clutch_size: breedClutchSize ? Number(breedClutchSize) : undefined, eggs_fertile: breedEggsFertile ? Number(breedEggsFertile) : undefined, hatch_date: breedHatchDate || undefined, notes: breedNotes || undefined })
        showToast('Breeding recorded', 'success')
      }
      refreshBreeding(); setBreedingOpen(false)
    } catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
    finally { setSavingBreed(false) }
  }
  async function handleDeleteBreeding(r: BreedingRecord) {
    if (!confirm('Delete this breeding record?')) return
    try { await deleteBreedingRecord(r.id); refreshBreeding(); showToast('Deleted', 'success') }
    catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
  }

  async function handleDeactivate() {
    if (!id || !confirm(`Remove ${animal?.name} from your collection?`)) return
    await deactivateAnimal(id)
    navigate('/animals')
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#8fbe5a', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!animal) return <div className="flex-1 flex items-center justify-center" style={{ color: '#a8a090' }}>Animal not found</div>

  const age = animal.date_of_birth
    ? (() => {
        const months = differenceInMonths(new Date(), new Date(animal.date_of_birth))
        if (months < 12) return `${months}mo`
        return `${Math.floor(months / 12)}yr ${months % 12}mo`
      })()
    : null

  const chartData = [...weightLogs].reverse().slice(-12).map((w) => ({
    date: format(new Date(w.logged_at), 'MMM d'),
    weight: w.weight_grams,
  }))

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'feeding', label: 'Feeding' },
    { id: 'weight', label: 'Weight' },
    { id: 'shedding', label: 'Shedding' },
    { id: 'health', label: 'Health' },
    { id: 'acquisition', label: 'Acquisition' },
    { id: 'exit', label: 'Exit' },
    { id: 'breeding', label: 'Breeding' },
  ]

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full">
      {/* Hero */}
      <div className="relative h-52 sm:h-64" style={{ backgroundColor: '#1a1a18' }}>
        {animal.photo_url ? (
          <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🦎</div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, #1a1a18 100%)' }} />
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#f0ece0' }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={() => setEditOpen(true)} className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#f0ece0' }}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
      </div>

      <div className="px-4 -mt-6 relative z-10">
        <div className="mb-4">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>{animal.name}</h1>
          <p className="text-sm mt-1" style={{ color: '#a8a090' }}>
            {animal.species}{animal.morph ? ` · ${animal.morph}` : ''}{animal.sex ? ` · ${animal.sex}` : ''}{age ? ` · ${age}` : ''}
          </p>
          {animal.weight_grams && <p className="text-sm mt-0.5" style={{ color: '#8fbe5a' }}>{animal.weight_grams}g</p>}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
              style={{ backgroundColor: tab === t.id ? 'rgba(143,190,90,0.15)' : 'transparent', color: tab === t.id ? '#8fbe5a' : '#6a6458' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="flex flex-col gap-4 pb-24 md:pb-8">
            {chartData.length > 1 && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-medium mb-3" style={{ color: '#a8a090' }}>WEIGHT TREND</p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6a6458' }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: '#2e2e2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f0ece0' }} labelStyle={{ color: '#a8a090', fontSize: 12 }} />
                    <Line type="monotone" dataKey="weight" stroke="#8fbe5a" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Last fed', value: animal.last_fed_at ? format(new Date(animal.last_fed_at), 'MMM d') : '—' },
                { label: 'Feed every', value: animal.feeding_frequency_days ? `${animal.feeding_frequency_days} days` : '—' },
                { label: 'Last shed', value: sheddingLogs[0] ? format(new Date(sheddingLogs[0].shed_at), 'MMM d') : '—' },
                { label: 'Current weight', value: animal.weight_grams ? `${animal.weight_grams}g` : '—' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl p-3" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-xs" style={{ color: '#6a6458' }}>{stat.label}</p>
                  <p className="text-base font-semibold mt-0.5" style={{ color: '#f0ece0' }}>{stat.value}</p>
                </div>
              ))}
            </div>
            {animal.notes && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: '#a8a090' }}>NOTES</p>
                <p className="text-sm" style={{ color: '#f0ece0', whiteSpace: 'pre-wrap' }}>{animal.notes}</p>
              </div>
            )}
            <Button variant="danger" size="sm" onClick={handleDeactivate}>Remove from collection</Button>
          </div>
        )}

        {/* Feeding */}
        {tab === 'feeding' && (
          <div className="pb-24 md:pb-8">
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={() => setFeedOpen(true)}>Log feeding</Button>
            </div>
            {feedingLogs.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#6a6458' }}>No feedings logged yet</div>
            ) : (
              <div className="flex flex-col gap-2">
                {feedingLogs.map((log) => (
                  <div key={log.id} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: log.refused ? '#c45a5a' : '#5a9e6a' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: log.refused ? '#a8a090' : '#f0ece0' }}>
                        {log.refused ? 'Refused' : `${log.prey_type}${log.prey_size ? ` (${log.prey_size})` : ''} ×${log.quantity}`}
                      </p>
                      {log.notes && <p className="text-xs truncate" style={{ color: '#6a6458' }}>{log.notes}</p>}
                    </div>
                    <p className="text-xs shrink-0 mr-1" style={{ color: '#6a6458' }}>{format(new Date(log.fed_at), 'MMM d')}</p>
                    <RecordActions onEdit={() => openEditFeed(log)} onDelete={() => handleDeleteFeed(log)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Weight */}
        {tab === 'weight' && (
          <div className="pb-24 md:pb-8">
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={openAddWeight}>Log weight</Button>
            </div>
            {weightLogs.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#6a6458' }}>No weights logged yet</div>
            ) : (
              <div className="flex flex-col gap-2">
                {weightLogs.map((log) => (
                  <div key={log.id} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: '#f0ece0' }}>{log.weight_grams}g</p>
                      {log.notes && <p className="text-xs" style={{ color: '#6a6458' }}>{log.notes}</p>}
                    </div>
                    <p className="text-xs shrink-0 mr-1" style={{ color: '#6a6458' }}>{format(new Date(log.logged_at), 'MMM d, yyyy')}</p>
                    <RecordActions onEdit={() => openEditWeight(log)} onDelete={() => handleDeleteWeight(log)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shedding */}
        {tab === 'shedding' && (
          <div className="pb-24 md:pb-8">
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={openAddShed}>Log shed</Button>
            </div>
            {sheddingLogs.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#6a6458' }}>No sheds logged yet</div>
            ) : (
              <div className="flex flex-col gap-2">
                {sheddingLogs.map((log) => (
                  <div key={log.id} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Badge status={log.complete ? 'green' : 'amber'}>{log.complete ? 'Complete' : 'Incomplete'}</Badge>
                    <div className="flex-1">
                      {log.notes && <p className="text-xs" style={{ color: '#6a6458' }}>{log.notes}</p>}
                    </div>
                    <p className="text-xs shrink-0 mr-1" style={{ color: '#6a6458' }}>{format(new Date(log.shed_at), 'MMM d, yyyy')}</p>
                    <RecordActions onEdit={() => openEditShed(log)} onDelete={() => handleDeleteShed(log)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Health */}
        {tab === 'health' && (
          <div className="pb-24 md:pb-8">
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={openAddHealth}>Add event</Button>
            </div>
            {healthEvents.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#6a6458' }}>No health events logged yet</div>
            ) : (
              <div className="flex flex-col gap-2">
                {healthEvents.map((ev) => (
                  <div key={ev.id} className="rounded-xl p-3" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: '#f0ece0' }}>{ev.title}</p>
                        <p className="text-xs mt-0.5 capitalize" style={{ color: '#a8a090' }}>{ev.event_type.replace('_', ' ')}</p>
                        {ev.notes && <p className="text-xs mt-1 truncate" style={{ color: '#6a6458' }}>{ev.notes}</p>}
                      </div>
                      <div className="text-right shrink-0 mr-1">
                        <p className="text-xs" style={{ color: '#6a6458' }}>{format(new Date(ev.event_date), 'MMM d, yyyy')}</p>
                        {ev.cost_cents != null && <p className="text-xs mt-0.5" style={{ color: '#d4924a' }}>${(ev.cost_cents / 100).toFixed(2)}</p>}
                      </div>
                      <RecordActions onEdit={() => openEditHealth(ev)} onDelete={() => handleDeleteHealth(ev)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Acquisition tab */}
        {tab === 'acquisition' && (
          <div className="pb-24 md:pb-8">
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={openAddAcquisition}>Add record</Button>
            </div>
            {acquisitionRecords.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#6a6458' }}>No acquisition records yet</div>
            ) : (
              <div className="flex flex-col gap-2">
                {acquisitionRecords.map((r) => (
                  <div key={r.id} className="rounded-xl p-3" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: '#f0ece0' }}>{r.source_name ?? r.source ?? 'Unknown source'}</p>
                        {r.source && <p className="text-xs mt-0.5 capitalize" style={{ color: '#a8a090' }}>{r.source.replace('_', ' ')}</p>}
                        {r.notes && <p className="text-xs mt-1 truncate" style={{ color: '#6a6458' }}>{r.notes}</p>}
                      </div>
                      <div className="text-right shrink-0 mr-1">
                        <p className="text-xs" style={{ color: '#6a6458' }}>{format(new Date(r.acquired_at), 'MMM d, yyyy')}</p>
                        {r.price_cents != null && <p className="text-xs mt-0.5" style={{ color: '#8fbe5a' }}>${(r.price_cents / 100).toFixed(2)}</p>}
                      </div>
                      <RecordActions onEdit={() => openEditAcquisition(r)} onDelete={() => handleDeleteAcquisition(r)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Exit tab */}
        {tab === 'exit' && (
          <div className="pb-24 md:pb-8">
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={openAddExit}>Add record</Button>
            </div>
            {exitRecords.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#6a6458' }}>No exit records yet</div>
            ) : (
              <div className="flex flex-col gap-2">
                {exitRecords.map((r) => (
                  <div key={r.id} className="rounded-xl p-3" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize" style={{ color: '#f0ece0' }}>{r.reason.replace('_', ' ')}</p>
                        {r.notes && <p className="text-xs mt-1 truncate" style={{ color: '#6a6458' }}>{r.notes}</p>}
                      </div>
                      <div className="text-right shrink-0 mr-1">
                        <p className="text-xs" style={{ color: '#6a6458' }}>{format(new Date(r.exited_at), 'MMM d, yyyy')}</p>
                        {r.price_cents != null && <p className="text-xs mt-0.5" style={{ color: '#8fbe5a' }}>${(r.price_cents / 100).toFixed(2)}</p>}
                      </div>
                      <RecordActions onEdit={() => openEditExit(r)} onDelete={() => handleDeleteExit(r)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Breeding tab */}
        {tab === 'breeding' && (
          <div className="pb-24 md:pb-8">
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={openAddBreeding}>Add record</Button>
            </div>
            {breedingRecords.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#6a6458' }}>No breeding records yet</div>
            ) : (
              <div className="flex flex-col gap-2">
                {breedingRecords.map((r) => (
                  <div key={r.id} className="rounded-xl p-3" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: '#f0ece0' }}>
                          {r.paired_with_name ? `Paired with ${r.paired_with_name}` : 'Pairing'}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {r.outcome && <Badge status={r.outcome === 'fertile' ? 'green' : r.outcome === 'infertile' ? 'red' : 'muted'}>{r.outcome}</Badge>}
                          {r.clutch_size != null && <span className="text-xs" style={{ color: '#a8a090' }}>{r.clutch_size} eggs</span>}
                          {r.eggs_fertile != null && <span className="text-xs" style={{ color: '#8fbe5a' }}>{r.eggs_fertile} fertile</span>}
                        </div>
                        {r.hatch_date && <p className="text-xs mt-1" style={{ color: '#6a6458' }}>Hatch: {format(new Date(r.hatch_date), 'MMM d, yyyy')}</p>}
                        {r.notes && <p className="text-xs mt-1 truncate" style={{ color: '#6a6458' }}>{r.notes}</p>}
                      </div>
                      <div className="text-right shrink-0 mr-1">
                        <p className="text-xs" style={{ color: '#6a6458' }}>{format(new Date(r.pairing_date), 'MMM d, yyyy')}</p>
                      </div>
                      <RecordActions onEdit={() => openEditBreeding(r)} onDelete={() => handleDeleteBreeding(r)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Acquisition modal */}
      <Modal open={acquisitionOpen} onClose={() => setAcquisitionOpen(false)} title={editingAcquisition ? 'Edit acquisition' : 'Add acquisition'}>
        <div className="flex flex-col gap-4">
          <Input label="Date acquired" type="date" value={acqDate} onChange={(e) => setAcqDate(e.target.value)} />
          <Select label="Source" value={acqSource} onChange={(e) => setAcqSource(e.target.value)}>
            <option value="">Select source</option>
            <option value="breeder">Breeder</option>
            <option value="rescue">Rescue</option>
            <option value="pet_store">Pet store</option>
            <option value="wild_caught">Wild caught</option>
            <option value="gift">Gift</option>
            <option value="other">Other</option>
          </Select>
          <Input label="Source name" value={acqSourceName} onChange={(e) => setAcqSourceName(e.target.value)} placeholder="e.g. John's Reptiles" />
          <Input label="Price (AUD)" type="number" min={0} step={0.01} value={acqPrice} onChange={(e) => setAcqPrice(e.target.value)} placeholder="0.00" />
          <Textarea label="Notes" value={acqNotes} onChange={(e) => setAcqNotes(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setAcquisitionOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={handleSaveAcquisition} loading={savingAcq}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Exit modal */}
      <Modal open={exitOpen} onClose={() => setExitOpen(false)} title={editingExit ? 'Edit exit record' : 'Add exit record'}>
        <div className="flex flex-col gap-4">
          <Input label="Date" type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} />
          <Select label="Reason" value={exitReason} onChange={(e) => setExitReason(e.target.value)}>
            <option value="sold">Sold</option>
            <option value="rehomed">Rehomed</option>
            <option value="deceased">Deceased</option>
            <option value="escaped">Escaped</option>
            <option value="other">Other</option>
          </Select>
          <Input label="Sale price (AUD)" type="number" min={0} step={0.01} value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} placeholder="0.00" />
          <Textarea label="Notes" value={exitNotes} onChange={(e) => setExitNotes(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setExitOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={handleSaveExit} loading={savingExit}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Breeding modal */}
      <Modal open={breedingOpen} onClose={() => setBreedingOpen(false)} title={editingBreeding ? 'Edit breeding record' : 'Add breeding record'}>
        <div className="flex flex-col gap-4">
          <Input label="Pairing date" type="date" value={breedPairingDate} onChange={(e) => setBreedPairingDate(e.target.value)} />
          <Input label="Paired with" value={breedPartnerName} onChange={(e) => setBreedPartnerName(e.target.value)} placeholder="Partner name or ID" />
          <Select label="Outcome" value={breedOutcome} onChange={(e) => setBreedOutcome(e.target.value)}>
            <option value="unknown">Unknown</option>
            <option value="fertile">Fertile</option>
            <option value="infertile">Infertile</option>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Clutch size" type="number" min={0} value={breedClutchSize} onChange={(e) => setBreedClutchSize(e.target.value)} placeholder="0" />
            <Input label="Fertile eggs" type="number" min={0} value={breedEggsFertile} onChange={(e) => setBreedEggsFertile(e.target.value)} placeholder="0" />
          </div>
          <Input label="Hatch date" type="date" value={breedHatchDate} onChange={(e) => setBreedHatchDate(e.target.value)} />
          <Textarea label="Notes" value={breedNotes} onChange={(e) => setBreedNotes(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setBreedingOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={handleSaveBreeding} loading={savingBreed}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Edit animal modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit animal">
        <AnimalForm animal={animal} onSuccess={() => { setEditOpen(false); getAnimal(animal.id).then((a) => setAnimal(a as Animal)) }} onCancel={() => setEditOpen(false)} />
      </Modal>

      {/* Log feeding modal */}
      <Modal open={feedOpen} onClose={() => setFeedOpen(false)} title="Log feeding">
        <FeedingLogForm preselectedAnimalId={id} onSuccess={() => { setFeedOpen(false); refreshFeeding() }} onCancel={() => setFeedOpen(false)} />
      </Modal>

      {/* Edit feeding modal */}
      <Modal open={!!editingFeed} onClose={() => setEditingFeed(null)} title="Edit feeding">
        <div className="flex flex-col gap-4">
          <Input label="Date" type="date" value={feedEditDate} onChange={(e) => setFeedEditDate(e.target.value)} />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={feedEditRefused} onChange={(e) => setFeedEditRefused(e.target.checked)} className="w-4 h-4 accent-[#8fbe5a]" />
            <span className="text-sm" style={{ color: '#f0ece0' }}>Refused</span>
          </label>
          {!feedEditRefused && (
            <>
              <Input label="Prey type" value={feedEditPreyType} onChange={(e) => setFeedEditPreyType(e.target.value)} placeholder="e.g. Rat" />
              <Input label="Size" value={feedEditPreySize} onChange={(e) => setFeedEditPreySize(e.target.value)} placeholder="e.g. Medium" />
              <Input label="Quantity" type="number" min={1} value={feedEditQty} onChange={(e) => setFeedEditQty(e.target.value)} />
            </>
          )}
          <Textarea label="Notes" value={feedEditNotes} onChange={(e) => setFeedEditNotes(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setEditingFeed(null)}>Cancel</Button>
            <Button fullWidth onClick={handleSaveFeedEdit} loading={savingFeedEdit}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Weight modal (add + edit) */}
      <Modal open={weightOpen} onClose={() => setWeightOpen(false)} title={editingWeight ? 'Edit weight' : 'Log weight'}>
        <div className="flex flex-col gap-4">
          <Input label="Weight (grams)" type="number" min={0} value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} placeholder="e.g. 450" />
          <Input label="Date" type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} />
          <Textarea label="Notes" value={weightNotes} onChange={(e) => setWeightNotes(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setWeightOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={handleSaveWeight} loading={savingWeight}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Shed modal (add + edit) */}
      <Modal open={shedOpen} onClose={() => setShedOpen(false)} title={editingShed ? 'Edit shed' : 'Log shed'}>
        <div className="flex flex-col gap-4">
          <Input label="Date" type="date" value={shedDate} onChange={(e) => setShedDate(e.target.value)} />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={shedComplete} onChange={(e) => setShedComplete(e.target.checked)} className="w-4 h-4 accent-[#8fbe5a]" />
            <span className="text-sm" style={{ color: '#f0ece0' }}>Complete shed</span>
          </label>
          <Textarea label="Notes" value={shedNotes} onChange={(e) => setShedNotes(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setShedOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={handleSaveShed} loading={savingShed}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Health modal (add + edit) */}
      <Modal open={healthOpen} onClose={() => setHealthOpen(false)} title={editingHealth ? 'Edit health event' : 'Add health event'}>
        <div className="flex flex-col gap-4">
          <Input label="Title" value={healthTitle} onChange={(e) => setHealthTitle(e.target.value)} placeholder="e.g. Vet checkup" />
          <Select label="Type" value={healthType} onChange={(e) => setHealthType(e.target.value)}>
            <option value="observation">Observation</option>
            <option value="vet_visit">Vet visit</option>
            <option value="medication">Medication</option>
            <option value="other">Other</option>
          </Select>
          <Input label="Date" type="date" value={healthDate} onChange={(e) => setHealthDate(e.target.value)} />
          <Input label="Cost (AUD)" type="number" min={0} step={0.01} value={healthCost} onChange={(e) => setHealthCost(e.target.value)} placeholder="0.00" />
          <Textarea label="Notes" value={healthNotes} onChange={(e) => setHealthNotes(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setHealthOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={handleSaveHealth} loading={savingHealth}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
