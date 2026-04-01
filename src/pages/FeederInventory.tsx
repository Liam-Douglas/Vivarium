import { useState } from 'react'
import { useFeederInventory } from '@/hooks/useFeederInventory'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import { createFeederItem, createFeederStockEvent, getFeederStockEvents } from '@/lib/queries'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'

const FEEDER_PRESETS = [
  // Insects
  { label: 'Dubia Roaches – Small',   name: 'Dubia Roaches (Small)',   type: 'insect', unit: 'roaches' },
  { label: 'Dubia Roaches – Medium',  name: 'Dubia Roaches (Medium)',  type: 'insect', unit: 'roaches' },
  { label: 'Dubia Roaches – Large',   name: 'Dubia Roaches (Large)',   type: 'insect', unit: 'roaches' },
  { label: 'Crickets – Small',        name: 'Crickets (Small)',        type: 'insect', unit: 'crickets' },
  { label: 'Crickets – Medium',       name: 'Crickets (Medium)',       type: 'insect', unit: 'crickets' },
  { label: 'Crickets – Large',        name: 'Crickets (Large)',        type: 'insect', unit: 'crickets' },
  { label: 'Mealworms',               name: 'Mealworms',               type: 'insect', unit: 'worms' },
  { label: 'Superworms',              name: 'Superworms',              type: 'insect', unit: 'worms' },
  { label: 'Waxworms',                name: 'Waxworms',                type: 'insect', unit: 'worms' },
  { label: 'Hornworms',               name: 'Hornworms',               type: 'insect', unit: 'worms' },
  { label: 'Black Soldier Fly Larvae',name: 'BSFL',                   type: 'insect', unit: 'larvae' },
  // Rodents
  { label: 'Pinky Mice',              name: 'Pinky Mice',              type: 'rodent', unit: 'mice' },
  { label: 'Fuzzy Mice',              name: 'Fuzzy Mice',              type: 'rodent', unit: 'mice' },
  { label: 'Hopper Mice',             name: 'Hopper Mice',             type: 'rodent', unit: 'mice' },
  { label: 'Mice – Small',            name: 'Mice (Small)',            type: 'rodent', unit: 'mice' },
  { label: 'Mice – Medium',           name: 'Mice (Medium)',           type: 'rodent', unit: 'mice' },
  { label: 'Mice – Large',            name: 'Mice (Large)',            type: 'rodent', unit: 'mice' },
  { label: 'Rats – Small',            name: 'Rats (Small)',            type: 'rodent', unit: 'rats' },
  { label: 'Rats – Medium',           name: 'Rats (Medium)',           type: 'rodent', unit: 'rats' },
  { label: 'Rats – Large',            name: 'Rats (Large)',            type: 'rodent', unit: 'rats' },
  { label: 'Rats – Jumbo',            name: 'Rats (Jumbo)',            type: 'rodent', unit: 'rats' },
  // Other
  { label: 'Quail',                   name: 'Quail',                   type: 'other',  unit: 'quail' },
  { label: 'Day-old Chicks',          name: 'Day-old Chicks',          type: 'other',  unit: 'chicks' },
]

function StockGauge({ current, threshold }: { current: number; threshold: number }) {
  const max = threshold * 2
  const pct = Math.min(current / max, 1)
  const color = current <= 0 ? '#c45a5a' : current < threshold ? '#d4924a' : '#5a9e6a'
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg font-bold" style={{ color, fontFamily: 'Playfair Display, serif' }}>{current}</span>
        <span className="text-xs" style={{ color: '#6a6458' }}>threshold: {threshold}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export function FeederInventory() {
  const { data: feeders, loading, error, refresh } = useFeederInventory()
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()

  const [addFeederOpen, setAddFeederOpen] = useState(false)
  const [addStockOpen, setAddStockOpen] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState<string | null>(null)
  const [shoppingOpen, setShoppingOpen] = useState(false)
  const [history, setHistory] = useState<any[]>([])

  // Add feeder form
  const [feederName, setFeederName] = useState('')
  const [feederType, setFeederType] = useState('insect')
  const [unitLabel, setUnitLabel] = useState('insects')
  const [lowThreshold, setLowThreshold] = useState('10')
  const [savingFeeder, setSavingFeeder] = useState(false)

  // Add stock form
  const [stockQty, setStockQty] = useState('')
  const [stockCost, setStockCost] = useState('')
  const [stockNotes, setStockNotes] = useState('')
  const [savingStock, setSavingStock] = useState(false)

  async function handleAddFeeder() {
    if (!user || !householdId || !feederName) return
    setSavingFeeder(true)
    try {
      await createFeederItem({ household_id: householdId, user_id: user.id, name: feederName, feeder_type: feederType, unit_label: unitLabel, low_stock_threshold: Number(lowThreshold) })
      refresh()
      setAddFeederOpen(false)
      setFeederName('')
      showToast('Feeder type added', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error', 'error')
    } finally {
      setSavingFeeder(false)
    }
  }

  async function handleAddStock(feederId: string) {
    if (!user || !householdId || !stockQty) return
    setSavingStock(true)
    try {
      await createFeederStockEvent({ household_id: householdId, feeder_item_id: feederId, user_id: user.id, event_type: 'restock', quantity_delta: Number(stockQty), unit_cost: stockCost ? Number(stockCost) * 100 : undefined, notes: stockNotes || undefined })
      refresh()
      setAddStockOpen(null)
      setStockQty('')
      setStockCost('')
      setStockNotes('')
      showToast('Stock added', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error', 'error')
    } finally {
      setSavingStock(false)
    }
  }

  async function openHistory(feederId: string) {
    if (!householdId) return
    const events = await getFeederStockEvents(householdId, feederId)
    setHistory(events)
    setHistoryOpen(feederId)
  }

  const lowStockFeeders = feeders.filter((f) => f.currentStock < f.low_stock_threshold)

  return (
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-5xl mx-auto w-full">
      <Header
        title="Feeder Inventory"
        action={
          <div className="flex gap-2">
            {lowStockFeeders.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => setShoppingOpen(true)}>
                🛒 Shopping list
              </Button>
            )}
            <Button size="sm" onClick={() => setAddFeederOpen(true)}>Add feeder</Button>
          </div>
        }
      />

      {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(196,90,90,0.1)', color: '#c45a5a' }}>{error}</div>}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton rounded-xl h-32" />
          ))}
        </div>
      ) : feeders.length === 0 ? (
        <EmptyState icon="📦" title="No feeder inventory" description="Set up your feeder inventory to track stock" action={<Button onClick={() => setAddFeederOpen(true)}>Add first feeder</Button>} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {feeders.map((f) => (
            <div key={f.id} className="rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>{f.name}</h3>
                  <p className="text-xs" style={{ color: '#6a6458' }}>{f.unit_label}</p>
                </div>
                <button onClick={() => openHistory(f.id)} style={{ color: '#6a6458' }} className="shrink-0 mt-0.5">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              <StockGauge current={f.currentStock} threshold={f.low_stock_threshold} />
              <Button size="sm" fullWidth className="mt-3" onClick={() => { setAddStockOpen(f.id); setStockQty(''); setStockCost(''); setStockNotes('') }}>
                Add stock
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add feeder modal */}
      <Modal open={addFeederOpen} onClose={() => setAddFeederOpen(false)} title="Add feeder type">
        <div className="flex flex-col gap-4">
          <Select
            label="Quick select preset"
            value=""
            onChange={(e) => {
              const preset = FEEDER_PRESETS.find((p) => p.label === e.target.value)
              if (preset) {
                setFeederName(preset.name)
                setFeederType(preset.type)
                setUnitLabel(preset.unit)
              }
            }}
          >
            <option value="">— choose a preset —</option>
            <optgroup label="Insects">
              {FEEDER_PRESETS.filter((p) => p.type === 'insect').map((p) => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </optgroup>
            <optgroup label="Rodents">
              {FEEDER_PRESETS.filter((p) => p.type === 'rodent').map((p) => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </optgroup>
            <optgroup label="Other">
              {FEEDER_PRESETS.filter((p) => p.type === 'other').map((p) => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </optgroup>
          </Select>
          <Input label="Name" value={feederName} onChange={(e) => setFeederName(e.target.value)} placeholder="e.g. Dubia roaches" />
          <Select label="Type" value={feederType} onChange={(e) => setFeederType(e.target.value)}>
            <option value="insect">Insect</option>
            <option value="rodent">Rodent</option>
            <option value="other">Other</option>
          </Select>
          <Input label="Unit label" value={unitLabel} onChange={(e) => setUnitLabel(e.target.value)} placeholder="e.g. insects, mice" />
          <Input label="Low stock threshold" type="number" min={0} value={lowThreshold} onChange={(e) => setLowThreshold(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setAddFeederOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={handleAddFeeder} loading={savingFeeder}>Add</Button>
          </div>
        </div>
      </Modal>

      {/* Add stock modal */}
      <Modal open={!!addStockOpen} onClose={() => setAddStockOpen(null)} title="Add stock">
        <div className="flex flex-col gap-4">
          <Input label="Quantity" type="number" min={1} value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="How many?" />
          <Input label="Unit cost (AUD)" type="number" min={0} step={0.01} value={stockCost} onChange={(e) => setStockCost(e.target.value)} placeholder="0.00" />
          <Textarea label="Notes" value={stockNotes} onChange={(e) => setStockNotes(e.target.value)} rows={2} placeholder="Where purchased, etc." />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setAddStockOpen(null)}>Cancel</Button>
            <Button fullWidth onClick={() => addStockOpen && handleAddStock(addStockOpen)} loading={savingStock}>Add stock</Button>
          </div>
        </div>
      </Modal>

      {/* History modal */}
      <Modal open={!!historyOpen} onClose={() => setHistoryOpen(null)} title="Stock history">
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: '#6a6458' }}>No history</p>
          ) : history.map((ev: any) => (
            <div key={ev.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <p className="text-sm" style={{ color: '#f0ece0' }}>{ev.event_type === 'restock' ? '+' : ''}{ev.quantity_delta}</p>
                <p className="text-xs" style={{ color: '#6a6458' }}>{ev.notes ?? ev.event_type}</p>
              </div>
              <p className="text-xs" style={{ color: '#6a6458' }}>{new Date(ev.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </Modal>

      {/* Shopping list modal */}
      <Modal open={shoppingOpen} onClose={() => setShoppingOpen(false)} title="Shopping list">
        <div className="flex flex-col gap-3">
          {lowStockFeeders.map((f) => (
            <div key={f.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: '#f0ece0' }}>{f.name}</p>
                <p className="text-xs" style={{ color: '#6a6458' }}>Stock: {f.currentStock} / threshold: {f.low_stock_threshold}</p>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#d4924a' }}>
                Buy ~{Math.max(f.low_stock_threshold * 2 - f.currentStock, 0)}
              </p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
