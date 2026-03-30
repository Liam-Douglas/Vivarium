import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, differenceInMonths } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getAnimal, deactivateAnimal, createWeightLog, createSheddingLog, createHealthEvent } from '@/lib/queries'
import { useFeedingLogs } from '@/hooks/useFeedingLogs'
import { useSheddingLogs } from '@/hooks/useSheddingLogs'
import { useWeightLogs } from '@/hooks/useWeightLogs'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { AnimalForm } from '@/components/animals/AnimalForm'
import type { Animal } from '@/hooks/useAnimals'
import { FeedingLogForm } from '@/components/feeding/FeedingLogForm'

type Tab = 'overview' | 'feeding' | 'weight' | 'shedding' | 'health'

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
  const [weightOpen, setWeightOpen] = useState(false)
  const [shedOpen, setShedOpen] = useState(false)
  const [healthOpen, setHealthOpen] = useState(false)

  const { data: feedingLogs, refresh: refreshFeeding } = useFeedingLogs(id)
  const { data: sheddingLogs, refresh: refreshShedding } = useSheddingLogs(id)
  const { data: weightLogs, refresh: refreshWeight } = useWeightLogs(id ?? '')

  // Weight log form state
  const [weightGrams, setWeightGrams] = useState('')
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0])
  const [weightNotes, setWeightNotes] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)

  // Shed log form state
  const [shedDate, setShedDate] = useState(new Date().toISOString().split('T')[0])
  const [shedComplete, setShedComplete] = useState(true)
  const [shedNotes, setShedNotes] = useState('')
  const [savingShed, setSavingShed] = useState(false)

  // Health event form state
  const [healthTitle, setHealthTitle] = useState('')
  const [healthType, setHealthType] = useState('observation')
  const [healthDate, setHealthDate] = useState(new Date().toISOString().split('T')[0])
  const [healthNotes, setHealthNotes] = useState('')
  const [healthCost, setHealthCost] = useState('')
  const [savingHealth, setSavingHealth] = useState(false)

  const { refresh: refreshHealth } = useFeedingLogs(id) // reuse pattern — we'll handle separately

  useEffect(() => {
    if (!id) return
    getAnimal(id).then((a) => {
      setAnimal(a as Animal)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  async function handleSaveWeight() {
    if (!user || !householdId || !id || !weightGrams) return
    setSavingWeight(true)
    try {
      await createWeightLog({ household_id: householdId, animal_id: id, user_id: user.id, weight_grams: Number(weightGrams), logged_at: new Date(weightDate).toISOString(), notes: weightNotes || undefined })
      refreshWeight()
      setWeightOpen(false)
      setWeightGrams('')
      setWeightNotes('')
      showToast('Weight logged', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setSavingWeight(false)
    }
  }

  async function handleSaveShed() {
    if (!user || !householdId || !id) return
    setSavingShed(true)
    try {
      await createSheddingLog({ household_id: householdId, animal_id: id, user_id: user.id, shed_at: new Date(shedDate).toISOString(), complete: shedComplete, notes: shedNotes || undefined })
      refreshShedding()
      setShedOpen(false)
      setShedNotes('')
      showToast('Shed logged', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setSavingShed(false)
    }
  }

  async function handleSaveHealth() {
    if (!user || !householdId || !id || !healthTitle) return
    setSavingHealth(true)
    try {
      await createHealthEvent({ household_id: householdId, animal_id: id, user_id: user.id, event_type: healthType, event_date: new Date(healthDate).toISOString(), title: healthTitle, notes: healthNotes || undefined, cost_cents: healthCost ? Math.round(Number(healthCost) * 100) : undefined })
      refreshHealth()
      setHealthOpen(false)
      setHealthTitle('')
      setHealthNotes('')
      setHealthCost('')
      showToast('Health event added', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setSavingHealth(false)
    }
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
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#f0ece0' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => setEditOpen(true)}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#f0ece0' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      <div className="px-4 -mt-6 relative z-10">
        {/* Identity */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>{animal.name}</h1>
          <p className="text-sm mt-1" style={{ color: '#a8a090' }}>
            {animal.species}{animal.morph ? ` · ${animal.morph}` : ''}{animal.sex ? ` · ${animal.sex}` : ''}{age ? ` · ${age}` : ''}
          </p>
          {animal.weight_grams && (
            <p className="text-sm mt-0.5" style={{ color: '#8fbe5a' }}>{animal.weight_grams}g</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                backgroundColor: tab === t.id ? 'rgba(143,190,90,0.15)' : 'transparent',
                color: tab === t.id ? '#8fbe5a' : '#6a6458',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && (
          <div className="flex flex-col gap-4 pb-24 md:pb-8">
            {chartData.length > 1 && (
              <div className="rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-medium mb-3" style={{ color: '#a8a090' }}>WEIGHT TREND</p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6a6458' }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#2e2e2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#f0ece0' }}
                      labelStyle={{ color: '#a8a090', fontSize: 12 }}
                    />
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
                    <p className="text-xs shrink-0" style={{ color: '#6a6458' }}>{format(new Date(log.fed_at), 'MMM d')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'weight' && (
          <div className="pb-24 md:pb-8">
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={() => setWeightOpen(true)}>Log weight</Button>
            </div>
            {weightLogs.length === 0 ? (
              <div className="text-center py-12" style={{ color: '#6a6458' }}>No weights logged yet</div>
            ) : (
              <div className="flex flex-col gap-2">
                {weightLogs.map((log) => (
                  <div key={log.id} className="rounded-xl p-3 flex items-center justify-between" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#f0ece0' }}>{log.weight_grams}g</p>
                      {log.notes && <p className="text-xs" style={{ color: '#6a6458' }}>{log.notes}</p>}
                    </div>
                    <p className="text-xs" style={{ color: '#6a6458' }}>{format(new Date(log.logged_at), 'MMM d, yyyy')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'shedding' && (
          <div className="pb-24 md:pb-8">
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={() => setShedOpen(true)}>Log shed</Button>
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
                    <p className="text-xs shrink-0" style={{ color: '#6a6458' }}>{format(new Date(log.shed_at), 'MMM d, yyyy')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'health' && (
          <div className="pb-24 md:pb-8">
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={() => setHealthOpen(true)}>Add event</Button>
            </div>
            <div className="text-center py-12" style={{ color: '#6a6458' }}>No health events logged yet</div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit animal">
        <AnimalForm
          animal={animal}
          onSuccess={() => {
            setEditOpen(false)
            getAnimal(animal.id).then((a) => setAnimal(a as Animal))
          }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Feed modal */}
      <Modal open={feedOpen} onClose={() => setFeedOpen(false)} title="Log feeding">
        <FeedingLogForm
          preselectedAnimalId={id}
          onSuccess={() => { setFeedOpen(false); refreshFeeding() }}
          onCancel={() => setFeedOpen(false)}
        />
      </Modal>

      {/* Weight modal */}
      <Modal open={weightOpen} onClose={() => setWeightOpen(false)} title="Log weight">
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

      {/* Shed modal */}
      <Modal open={shedOpen} onClose={() => setShedOpen(false)} title="Log shed">
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

      {/* Health modal */}
      <Modal open={healthOpen} onClose={() => setHealthOpen(false)} title="Add health event">
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
