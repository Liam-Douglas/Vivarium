import { useState, useRef } from 'react'
import { useExpenses, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from '@/hooks/useExpenses'
import { useAnimals } from '@/hooks/useAnimals'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import {
  createExpense, updateExpense, softDeleteExpense,
  createFeederItem, createFeederStockEvent, getFeederStockEvents, updateFeederItem, deleteFeederItem,
} from '@/lib/queries'
import type { Expense } from '@/hooks/useExpenses'
import { useFeederInventory } from '@/hooks/useFeederInventory'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { format } from 'date-fns'

const CATEGORY_ICONS: Record<string, string> = {
  feeder_stock: '🐛',
  veterinary: '🏥',
  enclosure: '🏠',
  acquisition: '🦎',
  supplies: '🛍️',
  misc: '📦',
}

const FEEDER_PRESETS = [
  { label: 'Dubia Roaches – Small',    name: 'Dubia Roaches (Small)',    type: 'insect', unit: 'roaches' },
  { label: 'Dubia Roaches – Medium',   name: 'Dubia Roaches (Medium)',   type: 'insect', unit: 'roaches' },
  { label: 'Dubia Roaches – Large',    name: 'Dubia Roaches (Large)',    type: 'insect', unit: 'roaches' },
  { label: 'Crickets – Small',         name: 'Crickets (Small)',         type: 'insect', unit: 'crickets' },
  { label: 'Crickets – Medium',        name: 'Crickets (Medium)',        type: 'insect', unit: 'crickets' },
  { label: 'Crickets – Large',         name: 'Crickets (Large)',         type: 'insect', unit: 'crickets' },
  { label: 'Mealworms',                name: 'Mealworms',               type: 'insect', unit: 'worms' },
  { label: 'Superworms',               name: 'Superworms',              type: 'insect', unit: 'worms' },
  { label: 'Waxworms',                 name: 'Waxworms',                type: 'insect', unit: 'worms' },
  { label: 'Hornworms',                name: 'Hornworms',               type: 'insect', unit: 'worms' },
  { label: 'Black Soldier Fly Larvae', name: 'BSFL',                    type: 'insect', unit: 'larvae' },
  { label: 'Mice – Pinkie',            name: 'Mice (Pinkie)',            type: 'rodent', unit: 'mice' },
  { label: 'Mice – Fuzzie',            name: 'Mice (Fuzzie)',            type: 'rodent', unit: 'mice' },
  { label: 'Mice – Hopper',            name: 'Mice (Hopper)',            type: 'rodent', unit: 'mice' },
  { label: 'Mice – Weaner',            name: 'Mice (Weaner)',            type: 'rodent', unit: 'mice' },
  { label: 'Mice – Adult',             name: 'Mice (Adult)',             type: 'rodent', unit: 'mice' },
  { label: 'Mice – X-Large',           name: 'Mice (X-Large)',           type: 'rodent', unit: 'mice' },
  { label: 'Rats – Pinkie',            name: 'Rats (Pinkie)',            type: 'rodent', unit: 'rats' },
  { label: 'Rats – Fuzzie',            name: 'Rats (Fuzzie)',            type: 'rodent', unit: 'rats' },
  { label: 'Rats – Hopper',            name: 'Rats (Hopper)',            type: 'rodent', unit: 'rats' },
  { label: 'Rats – Weaner',            name: 'Rats (Weaner)',            type: 'rodent', unit: 'rats' },
  { label: 'Rats – Juvenile',          name: 'Rats (Juvenile)',          type: 'rodent', unit: 'rats' },
  { label: 'Rats – Medium',            name: 'Rats (Medium)',            type: 'rodent', unit: 'rats' },
  { label: 'Rats – Large',             name: 'Rats (Large)',             type: 'rodent', unit: 'rats' },
  { label: 'Rats – X-Large',           name: 'Rats (X-Large)',           type: 'rodent', unit: 'rats' },
  { label: 'Rats – Jumbo',             name: 'Rats (Jumbo)',             type: 'rodent', unit: 'rats' },
  { label: 'Rabbits – Small',          name: 'Rabbits (Small)',          type: 'rodent', unit: 'rabbits' },
  { label: 'Rabbits – Medium',         name: 'Rabbits (Medium)',         type: 'rodent', unit: 'rabbits' },
  { label: 'Rabbits – Large',          name: 'Rabbits (Large)',          type: 'rodent', unit: 'rabbits' },
  { label: 'Rabbits – X-Large',        name: 'Rabbits (X-Large)',        type: 'rodent', unit: 'rabbits' },
  { label: 'Quail',                    name: 'Quail',                    type: 'other',  unit: 'quail' },
  { label: 'Day-old Chicks',           name: 'Day-old Chicks',           type: 'other',  unit: 'chicks' },
]

interface ParsedReceiptItem {
  _id: string
  name: string
  quantity: number
  unit_price_cents: number
  total_price_cents: number
  selected: boolean
  editedName: string
  editedQty: string
}

export function Expenses() {
  const [activeTab, setActiveTab] = useState<'expenses' | 'feeders'>('expenses')

  // ── Shared ────────────────────────────────────────────────────────────────
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()
  const { data: animals } = useAnimals()

  // ── Expenses ──────────────────────────────────────────────────────────────
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const { data: expenses, loading: expLoading, refresh: refreshExp } = useExpenses(year, month)
  const [addOpen, setAddOpen] = useState(false)

  const [category, setCategory] = useState('misc')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [animalId, setAnimalId] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    const stored = localStorage.getItem(`vivarium-budgets-${householdId ?? 'default'}`)
    return stored ? (JSON.parse(stored) as Record<string, number>) : {}
  })
  const [editingBudget, setEditingBudget] = useState<string | null>(null)
  const [budgetInput, setBudgetInput] = useState('')

  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [editCategory, setEditCategory] = useState('misc')
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAnimalId, setEditAnimalId] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // ── Feeders ───────────────────────────────────────────────────────────────
  const { data: feeders, loading: feedersLoading, error: feedersError, refresh: refreshFeeders } = useFeederInventory()
  const [addFeederOpen, setAddFeederOpen] = useState(false)
  const [addStockOpen, setAddStockOpen] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState<string | null>(null)
  const [shoppingOpen, setShoppingOpen] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [editFeeder, setEditFeeder] = useState<typeof feeders[number] | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)

  const [feederName, setFeederName] = useState('')
  const [feederType, setFeederType] = useState('insect')
  const [unitLabel, setUnitLabel] = useState('insects')
  const [lowThreshold, setLowThreshold] = useState('10')
  const [savingFeeder, setSavingFeeder] = useState(false)

  const [editName, setEditName] = useState('')
  const [editUnitLabel, setEditUnitLabel] = useState('')
  const [editThreshold, setEditThreshold] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [stockQty, setStockQty] = useState('')
  const [stockCost, setStockCost] = useState('')
  const [stockNotes, setStockNotes] = useState('')
  const [savingStock, setSavingStock] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [receiptItems, setReceiptItems] = useState<ParsedReceiptItem[]>([])
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [confirmingReceipt, setConfirmingReceipt] = useState(false)

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalCents = expenses.reduce((s, e) => s + e.amount_cents, 0)
  const byCategory = Object.entries(
    expenses.reduce((acc, e) => {
      acc[e.category] = [...(acc[e.category] ?? []), e]
      return acc
    }, {} as Record<string, typeof expenses>)
  ).map(([cat, items]) => ({
    cat, items,
    total: items.reduce((s, e) => s + e.amount_cents, 0),
  })).filter((g) => g.total > 0)
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' })
  const lowStockFeeders = feeders.filter((f) => f.currentStock < f.low_stock_threshold)

  // ── Expense handlers ──────────────────────────────────────────────────────
  function changeMonth(delta: number) {
    let m = month + delta, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  function saveBudget(cat: string) {
    const val = Number(budgetInput)
    const updated = { ...budgets }
    if (val > 0) updated[cat] = val; else delete updated[cat]
    setBudgets(updated)
    localStorage.setItem(`vivarium-budgets-${householdId ?? 'default'}`, JSON.stringify(updated))
    setEditingBudget(null); setBudgetInput('')
  }

  function openEdit(expense: Expense) {
    setEditExpense(expense)
    setEditCategory(expense.category)
    setEditAmount((expense.amount_cents / 100).toFixed(2))
    setEditDescription(expense.description)
    setEditAnimalId(expense.animal_id ?? '')
    setEditDate(expense.expense_date.split('T')[0])
  }

  async function handleAdd() {
    if (!user || !householdId || !amount || !description) return
    setSaving(true)
    try {
      await createExpense({ household_id: householdId, user_id: user.id, animal_id: animalId || undefined, category, amount_cents: Math.round(Number(amount) * 100), currency: 'AUD', description, expense_date: new Date(expenseDate).toISOString() })
      refreshExp(); setAddOpen(false); setAmount(''); setDescription('')
      showToast('Expense added', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setSaving(false) }
  }

  async function handleEdit() {
    if (!editExpense || !editAmount || !editDescription) return
    setEditSaving(true)
    try {
      await updateExpense(editExpense.id, { category: editCategory, amount_cents: Math.round(Number(editAmount) * 100), description: editDescription, animal_id: editAnimalId || null, expense_date: new Date(editDate).toISOString() })
      refreshExp(); setEditExpense(null)
      showToast('Expense updated', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setEditSaving(false) }
  }

  async function handleDelete(expense: Expense) {
    try {
      await softDeleteExpense(expense.id); refreshExp()
      showToast('Expense deleted', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    }
  }

  // ── Feeder handlers ───────────────────────────────────────────────────────
  async function handleAddFeeder() {
    if (!user || !householdId || !feederName) return
    setSavingFeeder(true)
    try {
      await createFeederItem({ household_id: householdId, user_id: user.id, name: feederName, feeder_type: feederType, unit_label: unitLabel, low_stock_threshold: Number(lowThreshold) })
      refreshFeeders(); setAddFeederOpen(false); setFeederName('')
      showToast('Feeder type added', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setSavingFeeder(false) }
  }

  async function handleAddStock(feederId: string) {
    if (!user || !householdId || !stockQty) return
    setSavingStock(true)
    try {
      await createFeederStockEvent({ household_id: householdId, feeder_item_id: feederId, user_id: user.id, event_type: 'purchase', quantity_delta: Number(stockQty), unit_cost: stockCost ? Number(stockCost) * 100 : undefined, notes: stockNotes || undefined })
      refreshFeeders(); setAddStockOpen(null); setStockQty(''); setStockCost(''); setStockNotes('')
      showToast('Stock added', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setSavingStock(false) }
  }

  function openEditFeeder(f: typeof feeders[number]) {
    setEditName(f.name); setEditUnitLabel(f.unit_label); setEditThreshold(String(f.low_stock_threshold)); setEditFeeder(f)
  }

  async function handleSaveEditFeeder() {
    if (!editFeeder) return
    setSavingEdit(true)
    try {
      await updateFeederItem(editFeeder.id, { name: editName, unit_label: editUnitLabel, low_stock_threshold: Number(editThreshold) })
      refreshFeeders(); setEditFeeder(null)
      showToast('Feeder updated', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setSavingEdit(false) }
  }

  function handleDeleteFeeder(f: typeof feeders[number]) {
    setConfirmDialog({
      title: `Delete ${f.name}`,
      message: 'This will remove the feeder item and all its stock history. This cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog(null)
        try {
          await deleteFeederItem(f.id); refreshFeeders()
          showToast('Feeder deleted', 'success')
        } catch (e) {
          showToast(e instanceof Error ? e.message : 'Error', 'error')
        }
      },
    })
  }

  async function openHistory(feederId: string) {
    if (!householdId) return
    const events = await getFeederStockEvents(householdId, feederId)
    setHistory(events); setHistoryOpen(feederId)
  }

  async function handleReceiptFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setScanning(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-receipt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      })
      if (!res.ok) throw new Error(`Scan failed (${res.status})`)
      const data = await res.json()
      const items: ParsedReceiptItem[] = (data?.items ?? []).map((item: { name: string; quantity: number; unit_price_cents: number; total_price_cents: number }, i: number) => ({
        _id: String(i), name: item.name, quantity: item.quantity ?? 1,
        unit_price_cents: item.unit_price_cents ?? 0, total_price_cents: item.total_price_cents ?? 0,
        selected: true, editedName: item.name, editedQty: String(item.quantity ?? 1),
      }))
      if (items.length === 0) { showToast('No feeder items found on receipt', 'error'); return }
      setReceiptItems(items); setReceiptOpen(true)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Scan failed', 'error')
    } finally { setScanning(false) }
  }

  function updateReceiptItem(id: string, updates: Partial<ParsedReceiptItem>) {
    setReceiptItems((prev) => prev.map((item) => item._id === id ? { ...item, ...updates } : item))
  }

  async function handleConfirmReceipt() {
    if (!user || !householdId) return
    setConfirmingReceipt(true)
    const selected = receiptItems.filter((i) => i.selected && i.editedName.trim())
    try {
      for (const item of selected) {
        const match = feeders.find((f) => f.name.toLowerCase() === item.editedName.trim().toLowerCase())
        let feederId = match?.id
        if (!feederId) {
          const created = await createFeederItem({ household_id: householdId, user_id: user.id, name: item.editedName.trim(), feeder_type: 'other', unit_label: 'units', low_stock_threshold: 10 })
          feederId = (created as { id: string }).id
        }
        await createFeederStockEvent({ household_id: householdId, feeder_item_id: feederId, user_id: user.id, event_type: 'restock', quantity_delta: Number(item.editedQty) || 1, unit_cost: item.unit_price_cents || undefined, notes: 'Added from receipt scan' })
      }
      refreshFeeders(); setReceiptOpen(false); setReceiptItems([])
      showToast(`Added ${selected.length} item${selected.length !== 1 ? 's' : ''} from receipt`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add items', 'error')
    } finally { setConfirmingReceipt(false) }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const tabAction = activeTab === 'expenses'
    ? <Button size="sm" onClick={() => setAddOpen(true)}>Add expense</Button>
    : (
      <div className="flex gap-2">
        {lowStockFeeders.length > 0 && (
          <Button size="sm" variant="secondary" onClick={() => setShoppingOpen(true)}>🛒 List</Button>
        )}
        <Button size="sm" variant="secondary" loading={scanning} onClick={() => fileInputRef.current?.click()}>
          {scanning ? 'Scanning…' : '📷 Scan'}
        </Button>
        <Button size="sm" onClick={() => setAddFeederOpen(true)}>Add feeder</Button>
      </div>
    )

  return (
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-3xl mx-auto w-full">
      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleReceiptFile} />
      <Header title="Expenses" action={tabAction} />

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
        {(['expenses', 'feeders'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === tab ? 'rgba(143,190,90,0.15)' : 'transparent',
              color: activeTab === tab ? '#8fbe5a' : '#6a6458',
              border: activeTab === tab ? '1px solid rgba(143,190,90,0.25)' : '1px solid transparent',
            }}
          >
            {tab === 'expenses' ? 'Expenses' : 'Feeder Stock'}
          </button>
        ))}
      </div>

      {/* ── EXPENSES TAB ── */}
      {activeTab === 'expenses' && (
        <>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={{ color: '#a8a090' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-medium" style={{ color: '#f0ece0' }}>{monthName} {year}</span>
            <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={{ color: '#a8a090' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Total */}
          <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs mb-1" style={{ color: '#6a6458' }}>Total this month</p>
                <p className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
                  ${(totalCents / 100).toFixed(2)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#6a6458' }}>AUD</p>
              </div>
              {/* Category breakdown pills */}
              {byCategory.length > 0 && (
                <div className="flex flex-col items-end gap-1">
                  {byCategory.slice(0, 3).map(({ cat, total }) => (
                    <div key={cat} className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ color: '#6a6458' }}>{CATEGORY_ICONS[cat] ?? '📦'}</span>
                      <span className="text-xs" style={{ color: '#a8a090' }}>${(total / 100).toFixed(0)}</span>
                    </div>
                  ))}
                  {byCategory.length > 3 && (
                    <span className="text-xs" style={{ color: '#6a6458' }}>+{byCategory.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Low feeder stock alert */}
          {lowStockFeeders.length > 0 && (
            <button
              onClick={() => setActiveTab('feeders')}
              className="w-full text-left rounded-xl px-4 py-3 mb-4 flex items-center gap-3"
              style={{ backgroundColor: 'rgba(212,146,74,0.08)', border: '1px solid rgba(212,146,74,0.2)' }}
            >
              <span className="text-base">📦</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: '#d4924a' }}>
                  {lowStockFeeders.length} feeder{lowStockFeeders.length > 1 ? 's' : ''} running low
                </p>
                <p className="text-xs truncate" style={{ color: '#a8a090' }}>
                  {lowStockFeeders.map((f) => f.name).join(', ')}
                </p>
              </div>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: '#d4924a', flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {expLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#8fbe5a', borderTopColor: 'transparent' }} />
            </div>
          ) : byCategory.length === 0 ? (
            <>
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="text-5xl mb-4 opacity-60">💸</div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#f0ece0', fontFamily: 'Playfair Display, serif' }}>No expenses this month</h3>
                <p className="text-sm max-w-xs mb-5" style={{ color: '#a8a090' }}>Tap 'Add expense' to record a purchase or cost.</p>
                <Button size="sm" onClick={() => setAddOpen(true)}>Add expense</Button>
              </div>

              {/* Feeder stock overview when expenses tab is empty */}
              {feeders.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium tracking-wide" style={{ color: '#a8a090' }}>FEEDER STOCK</p>
                    <button onClick={() => setActiveTab('feeders')} className="text-xs" style={{ color: '#8fbe5a' }}>Manage →</button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {feeders.slice(0, 5).map((f) => {
                      const pct = Math.min(f.currentStock / (f.low_stock_threshold * 2), 1)
                      const color = f.currentStock <= 0 ? '#c45a5a' : f.currentStock < f.low_stock_threshold ? '#d4924a' : '#5a9e6a'
                      return (
                        <div key={f.id} className="rounded-xl px-4 py-2.5 flex items-center gap-3" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p className="text-lg font-bold w-10 shrink-0 text-center" style={{ color, fontFamily: 'Playfair Display, serif' }}>{f.currentStock}</p>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate" style={{ color: '#f0ece0' }}>{f.name}</p>
                            <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                              <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
                            </div>
                          </div>
                          <p className="text-xs shrink-0" style={{ color: '#6a6458' }}>{f.unit_label}</p>
                        </div>
                      )
                    })}
                    {feeders.length > 5 && (
                      <button onClick={() => setActiveTab('feeders')} className="text-center py-2 text-xs" style={{ color: '#6a6458' }}>
                        +{feeders.length - 5} more feeders
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-4">
              {byCategory.map(({ cat, total, items }) => (
                <div key={cat} className="rounded-xl overflow-hidden" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{CATEGORY_ICONS[cat] ?? '📦'}</span>
                      <span className="text-sm font-medium" style={{ color: '#f0ece0' }}>{EXPENSE_CATEGORY_LABELS[cat] ?? cat}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {budgets[cat] && (
                        <span className="text-xs" style={{ color: total / 100 > budgets[cat] ? '#c45a5a' : '#6a6458' }}>/ ${budgets[cat].toFixed(2)}</span>
                      )}
                      <span className="text-sm font-semibold" style={{ color: '#f0ece0' }}>${(total / 100).toFixed(2)}</span>
                      <button
                        onClick={() => { setEditingBudget(editingBudget === cat ? null : cat); setBudgetInput(budgets[cat] ? String(budgets[cat]) : '') }}
                        className="w-6 h-6 rounded flex items-center justify-center text-xs"
                        style={{ color: '#6a6458' }} title="Set budget"
                      >🎯</button>
                    </div>
                  </div>
                  {editingBudget === cat && (
                    <div className="mx-4 mb-2 flex gap-2">
                      <input
                        type="number" min={0} step={0.01} value={budgetInput}
                        onChange={(e) => setBudgetInput(e.target.value)}
                        placeholder="Monthly budget (AUD)" autoFocus
                        className="flex-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                        style={{ backgroundColor: '#1a1a18', border: '1px solid rgba(255,255,255,0.08)', color: '#f0ece0' }}
                      />
                      <button onClick={() => saveBudget(cat)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: 'rgba(143,190,90,0.15)', color: '#8fbe5a', border: '1px solid rgba(143,190,90,0.2)' }}>Set</button>
                      {budgets[cat] && <button onClick={() => { setBudgetInput(''); saveBudget(cat) }} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: '#6a6458' }}>Clear</button>}
                    </div>
                  )}
                  <div className="mx-4 mb-3">
                    {budgets[cat] ? (
                      <div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (total / 100 / budgets[cat]) * 100)}%`, backgroundColor: total / 100 > budgets[cat] ? '#c45a5a' : total / 100 > budgets[cat] * 0.8 ? '#d4924a' : '#8fbe5a' }} />
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: '#6a6458' }}>
                          {total / 100 > budgets[cat] ? `$${((total / 100) - budgets[cat]).toFixed(2)} over budget` : `$${(budgets[cat] - total / 100).toFixed(2)} remaining`}
                        </p>
                      </div>
                    ) : (
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${totalCents > 0 ? (total / totalCents) * 100 : 0}%`, backgroundColor: '#8fbe5a' }} />
                      </div>
                    )}
                  </div>
                  {items.map((expense) => (
                    <div key={expense.id} className="px-4 py-2 flex items-center justify-between gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate" style={{ color: '#a8a090' }}>{expense.description}</p>
                        <p className="text-xs" style={{ color: '#6a6458' }}>{format(new Date(expense.expense_date), 'MMM d')}</p>
                      </div>
                      <p className="text-sm shrink-0" style={{ color: '#f0ece0' }}>${(expense.amount_cents / 100).toFixed(2)}</p>
                      <button onClick={() => openEdit(expense)} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5" style={{ color: '#6a6458' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(expense)} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5" style={{ color: '#6a6458' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── FEEDERS TAB ── */}
      {activeTab === 'feeders' && (
        <>
          {feedersError && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(196,90,90,0.1)', color: '#c45a5a' }}>{feedersError}</div>
          )}
          {feedersLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton rounded-xl h-16" />
              ))}
            </div>
          ) : feeders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="text-5xl mb-4 opacity-60">📦</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#f0ece0', fontFamily: 'Playfair Display, serif' }}>No feeder inventory</h3>
              <p className="text-sm max-w-xs mb-5" style={{ color: '#a8a090' }}>Set up your feeder inventory to track stock levels.</p>
              <Button onClick={() => setAddFeederOpen(true)}>Add first feeder</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {feeders.map((f) => {
                const pct = Math.min(f.currentStock / (f.low_stock_threshold * 2), 1)
                const color = f.currentStock <= 0 ? '#c45a5a' : f.currentStock < f.low_stock_threshold ? '#d4924a' : '#5a9e6a'
                return (
                  <div key={f.id} className="rounded-xl px-4 py-3 flex items-center gap-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-center shrink-0 w-12">
                      <p className="text-2xl font-bold leading-tight" style={{ color, fontFamily: 'Playfair Display, serif' }}>{f.currentStock}</p>
                      <p className="text-xs truncate" style={{ color: '#6a6458' }}>{f.unit_label}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <h3 className="font-semibold text-sm truncate" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>{f.name}</h3>
                        <span className="text-xs shrink-0" style={{ color: '#6a6458' }}>/{f.low_stock_threshold}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setAddStockOpen(f.id); setStockQty(''); setStockCost(''); setStockNotes('') }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: 'rgba(143,190,90,0.15)', color: '#8fbe5a', border: '1px solid rgba(143,190,90,0.2)' }}
                      >+ Stock</button>
                      <button onClick={() => openHistory(f.id)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: '#6a6458' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                      <button onClick={() => openEditFeeder(f)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: '#6a6458' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => handleDeleteFeeder(f)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: '#6a6458' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── EXPENSES MODALS ── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add expense">
        <div className="flex flex-col gap-4">
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}
          </Select>
          <Input label="Amount (AUD)" type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What did you buy?" />
          <Select label="Animal (optional)" value={animalId} onChange={(e) => setAnimalId(e.target.value)}>
            <option value="">No specific animal</option>
            {animals.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Input label="Date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={handleAdd} loading={saving}>Add expense</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editExpense} onClose={() => setEditExpense(null)} title="Edit expense">
        <div className="flex flex-col gap-4">
          <Select label="Category" value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}
          </Select>
          <Input label="Amount (AUD)" type="number" min={0} step={0.01} value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="0.00" />
          <Input label="Description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="What did you buy?" />
          <Select label="Animal (optional)" value={editAnimalId} onChange={(e) => setEditAnimalId(e.target.value)}>
            <option value="">No specific animal</option>
            {animals.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Input label="Date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setEditExpense(null)}>Cancel</Button>
            <Button fullWidth onClick={handleEdit} loading={editSaving}>Save changes</Button>
          </div>
        </div>
      </Modal>

      {/* ── FEEDERS MODALS ── */}
      <Modal open={addFeederOpen} onClose={() => setAddFeederOpen(false)} title="Add feeder type">
        <div className="flex flex-col gap-4">
          <Select label="Quick select preset" value="" onChange={(e) => {
            const preset = FEEDER_PRESETS.find((p) => p.label === e.target.value)
            if (preset) { setFeederName(preset.name); setFeederType(preset.type); setUnitLabel(preset.unit) }
          }}>
            <option value="">— choose a preset —</option>
            <optgroup label="Insects">
              {FEEDER_PRESETS.filter((p) => p.type === 'insect').map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
            </optgroup>
            <optgroup label="Rodents">
              {FEEDER_PRESETS.filter((p) => p.type === 'rodent').map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
            </optgroup>
            <optgroup label="Other">
              {FEEDER_PRESETS.filter((p) => p.type === 'other').map((p) => <option key={p.label} value={p.label}>{p.label}</option>)}
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

      <Modal open={!!editFeeder} onClose={() => setEditFeeder(null)} title="Edit feeder">
        <div className="flex flex-col gap-4">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input label="Unit label" value={editUnitLabel} onChange={(e) => setEditUnitLabel(e.target.value)} placeholder="e.g. insects, mice" />
          <Input label="Low stock threshold" type="number" min={0} value={editThreshold} onChange={(e) => setEditThreshold(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setEditFeeder(null)}>Cancel</Button>
            <Button fullWidth onClick={handleSaveEditFeeder} loading={savingEdit}>Save</Button>
          </div>
        </div>
      </Modal>

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

      <Modal open={receiptOpen} onClose={() => { setReceiptOpen(false); setReceiptItems([]) }} title="Review scanned receipt">
        <div className="flex flex-col gap-3">
          <p className="text-xs" style={{ color: '#a8a090' }}>Select which items to add to inventory and adjust quantities as needed.</p>
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {receiptItems.map((item) => (
              <div key={item._id} className="flex items-start gap-3 p-3 rounded-xl"
                style={{ backgroundColor: item.selected ? 'rgba(143,190,90,0.07)' : 'rgba(255,255,255,0.03)', border: `1px solid ${item.selected ? 'rgba(143,190,90,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                <input type="checkbox" checked={item.selected} onChange={(e) => updateReceiptItem(item._id, { selected: e.target.checked })} className="mt-1 accent-[#8fbe5a]" />
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <Input value={item.editedName} onChange={(e) => updateReceiptItem(item._id, { editedName: e.target.value })} disabled={!item.selected} />
                  <div className="flex items-center gap-2">
                    <Input label="Qty" type="number" min={1} value={item.editedQty} onChange={(e) => updateReceiptItem(item._id, { editedQty: e.target.value })} disabled={!item.selected} />
                    {item.unit_price_cents > 0 && (
                      <p className="text-xs whitespace-nowrap" style={{ color: '#6a6458' }}>${(item.unit_price_cents / 100).toFixed(2)} ea</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" fullWidth onClick={() => { setReceiptOpen(false); setReceiptItems([]) }}>Cancel</Button>
            <Button fullWidth loading={confirmingReceipt} onClick={handleConfirmReceipt} disabled={!receiptItems.some((i) => i.selected && i.editedName.trim())}>
              Add to inventory
            </Button>
          </div>
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
