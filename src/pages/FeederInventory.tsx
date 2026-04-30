import { useState } from 'react'
import { useFeederInventory } from '@/hooks/useFeederInventory'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import { createFeederItem, createFeederStockEvent, getFeederStockEvents, updateFeederItem, deleteFeederItem } from '@/lib/queries'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

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
  { label: 'Mice – Pinkie',           name: 'Mice (Pinkie)',           type: 'rodent', unit: 'mice' },
  { label: 'Mice – Fuzzie',           name: 'Mice (Fuzzie)',           type: 'rodent', unit: 'mice' },
  { label: 'Mice – Hopper',           name: 'Mice (Hopper)',           type: 'rodent', unit: 'mice' },
  { label: 'Mice – Weaner',           name: 'Mice (Weaner)',           type: 'rodent', unit: 'mice' },
  { label: 'Mice – Adult',            name: 'Mice (Adult)',            type: 'rodent', unit: 'mice' },
  { label: 'Mice – X-Large',          name: 'Mice (X-Large)',          type: 'rodent', unit: 'mice' },
  { label: 'Rats – Pinkie',           name: 'Rats (Pinkie)',           type: 'rodent', unit: 'rats' },
  { label: 'Rats – Fuzzie',           name: 'Rats (Fuzzie)',           type: 'rodent', unit: 'rats' },
  { label: 'Rats – Hopper',           name: 'Rats (Hopper)',           type: 'rodent', unit: 'rats' },
  { label: 'Rats – Weaner',           name: 'Rats (Weaner)',           type: 'rodent', unit: 'rats' },
  { label: 'Rats – Juvenile',         name: 'Rats (Juvenile)',         type: 'rodent', unit: 'rats' },
  { label: 'Rats – Medium',           name: 'Rats (Medium)',           type: 'rodent', unit: 'rats' },
  { label: 'Rats – Large',            name: 'Rats (Large)',            type: 'rodent', unit: 'rats' },
  { label: 'Rats – X-Large',          name: 'Rats (X-Large)',          type: 'rodent', unit: 'rats' },
  { label: 'Rats – Jumbo',            name: 'Rats (Jumbo)',            type: 'rodent', unit: 'rats' },
  { label: 'Rabbits – Small',         name: 'Rabbits (Small)',         type: 'rodent', unit: 'rabbits' },
  { label: 'Rabbits – Medium',        name: 'Rabbits (Medium)',        type: 'rodent', unit: 'rabbits' },
  { label: 'Rabbits – Large',         name: 'Rabbits (Large)',         type: 'rodent', unit: 'rabbits' },
  { label: 'Rabbits – X-Large',       name: 'Rabbits (X-Large)',       type: 'rodent', unit: 'rabbits' },
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
  const [editFeeder, setEditFeeder] = useState<typeof feeders[number] | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)

  // Add feeder form
  const [feederName, setFeederName] = useState('')
  const [feederType, setFeederType] = useState('insect')
  const [unitLabel, setUnitLabel] = useState('insects')
  const [lowThreshold, setLowThreshold] = useState('10')
  const [savingFeeder, setSavingFeeder] = useState(false)

  // Edit feeder form
  const [editName, setEditName] = useState('')
  const [editUnitLabel, setEditUnitLabel] = useState('')
  const [editThreshold, setEditThreshold] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

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
      await createFeederStockEvent({ household_id: householdId, feeder_item_id: feederId, user_id: user.id, event_type: 'purchase', quantity_delta: Number(stockQty), unit_cost: stockCost ? Number(stockCost) * 100 : undefined, notes: stockNotes || undefined })
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

  function openEdit(f: typeof feeders[number]) {
    setEditName(f.name)
    setEditUnitLabel(f.unit_label)
    setEditThreshold(String(f.low_stock_threshold))
    setEditFeeder(f)
  }

  async function handleSaveEdit() {
    if (!editFeeder) return
    setSavingEdit(true)
    try {
      await updateFeederItem(editFeeder.id, { name: editName, unit_label: editUnitLabel, low_stock_threshold: Number(editThreshold) })
      refresh()
      setEditFeeder(null)
      showToast('Feeder updated', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error', 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  function handleDeleteFeeder(f: typeof feeders[number]) {
    setConfirmDialog({
      title: `Delete ${f.name}`,
      message: 'This will remove the feeder item and all its stock history. This cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          await deleteFeederItem(f.id)
          refresh()
          showToast('Feeder deleted', 'success')
        } catch (e) {
          showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error', 'error')
        }
      },
    })
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
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm truncate" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>{f.name}</h3>
                  <p className="text-xs" style={{ color: '#6a6458' }}>{f.unit_label}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openHistory(f.id)} style={{ color: '#6a6458' }} className="p-1 rounded-lg hover:bg-white/5">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button onClick={() => openEdit(f)} style={{ color: '#6a6458' }} className="p-1 rounded-lg hover:bg-white/5">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDeleteFeeder(f)} style={{ color: '#6a6458' }} className="p-1 rounded-lg hover:bg-white/5">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
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
                <p className="text-sm" style={{ color: '#f0ece0' }}>{ev.event_type === 'purchase' ? '+' : ''}{ev.quantity_delta}</p>
                <p className="text-xs" style={{ color: '#6a6458' }}>{ev.notes ?? ev.event_type}</p>
              </div>
              <p className="text-xs" style={{ color: '#6a6458' }}>{new Date(ev.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </Modal>

      {/* Edit feeder modal */}
      <Modal open={!!editFeeder} onClose={() => setEditFeeder(null)} title="Edit feeder">
        <div className="flex flex-col gap-4">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input label="Unit label" value={editUnitLabel} onChange={(e) => setEditUnitLabel(e.target.value)} placeholder="e.g. insects, mice" />
          <Input label="Low stock threshold" type="number" min={0} value={editThreshold} onChange={(e) => setEditThreshold(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setEditFeeder(null)}>Cancel</Button>
            <Button fullWidth onClick={handleSaveEdit} loading={savingEdit}>Save</Button>
          </div>
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

      <ConfirmDialog
        open={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        title={confirmDialog?.title ?? 'Are you sure?'}
        message={confirmDialog?.message ?? ''}
        onConfirm={() => confirmDialog?.onConfirm()}
      />
    </div>
  )
}
