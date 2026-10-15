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
import { useFeederInventory, type FeederStockEvent } from '@/hooks/useFeederInventory'
import { useFeedingLogs } from '@/hooks/useFeedingLogs'
import { restockList, deriveFeederDemand, lastMealPerAnimal } from '@/lib/feederDemand'
import { readJson, writeJson } from '@/lib/localStore'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { format } from 'date-fns'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ListSection, ListRow, Chevron } from '@/components/ui/List'
import { Icon, IconTile } from '@/components/ui/icons'
import { EmptyState } from '@/components/ui/EmptyState'
import { RecordActions } from '@/components/ui/RecordActions'
import { formatAUD, formatDate } from '@/lib/format'

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

interface ExpensesProps {
  /** Opens straight onto a tab, so /feeders is a real destination. */
  initialTab?: 'expenses' | 'feeders'
}

const budgetsKey = (householdId: string | null) => `vivarium-budgets-${householdId}`

export function Expenses({ initialTab = 'expenses' }: ExpensesProps = {}) {
  const [activeTab, setActiveTab] = useState<'expenses' | 'feeders'>(initialTab)

  // ── Shared ────────────────────────────────────────────────────────────────
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()
  const { data: animals } = useAnimals()
  const { data: feedingLogs } = useFeedingLogs()

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

  // This screen only ever mounts inside RequireHousehold, so householdId is
  // set by now. JSON.parse was unguarded, though, and a corrupt value threw
  // during render — which the error boundary turns into a blank page.
  const [budgets, setBudgets] = useState<Record<string, number>>(
    () => readJson<Record<string, number>>(budgetsKey(householdId), {})
  )
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
  const [history, setHistory] = useState<FeederStockEvent[]>([])
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
  const [editCurrentStock, setEditCurrentStock] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [stockQty, setStockQty] = useState('')
  const [stockCost, setStockCost] = useState('')
  const [stockNotes, setStockNotes] = useState('')
  const [savingStock, setSavingStock] = useState(false)
  const [stockMode, setStockMode] = useState<'add' | 'set'>('add')
  const [stockFeederCurrentStock, setStockFeederCurrentStock] = useState(0)

  const [inlineEditId, setInlineEditId] = useState<string | null>(null)
  const [inlineEditValue, setInlineEditValue] = useState('')

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
  // The same question the dashboard's stock card asks, through the same code:
  // an item is low when the collection will eat through it before the next
  // shop, falling back to the threshold for items nothing is scheduled
  // against. Two different answers here would mean the dashboard warning about
  // items this list does not offer to buy.
  const lowStockFeeders = restockList(
    feeders,
    deriveFeederDemand(animals, lastMealPerAnimal(feedingLogs), feeders)
  ).map((entry) => entry.item)

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
    if (Number.isFinite(val) && val > 0) updated[cat] = val; else delete updated[cat]
    setBudgets(updated)
    if (!writeJson(budgetsKey(householdId), updated)) {
      showToast('Budget saved for this session only — storage is unavailable', 'info')
    }
    setEditingBudget(null); setBudgetInput('')
  }

  function openEdit(expense: Expense) {
    setEditExpense(expense)
    setEditCategory(expense.category)
    setEditAmount((expense.amount_cents / 100).toFixed(2))
    setEditDescription(expense.description ?? '')
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
      if (stockMode === 'set') {
        const target = Number(stockQty)
        await createFeederStockEvent({ household_id: householdId, feeder_item_id: feederId, user_id: user.id, event_type: 'adjustment', quantity_delta: target - stockFeederCurrentStock, notes: stockNotes || 'Manual stock correction' })
      } else {
        await createFeederStockEvent({ household_id: householdId, feeder_item_id: feederId, user_id: user.id, event_type: 'purchase', quantity_delta: Number(stockQty), unit_cost: stockCost ? Number(stockCost) * 100 : undefined, notes: stockNotes || undefined })
      }
      refreshFeeders(); setAddStockOpen(null); setStockQty(''); setStockCost(''); setStockNotes('')
      showToast(stockMode === 'set' ? 'Stock updated' : 'Stock added', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setSavingStock(false) }
  }

  function openEditFeeder(f: typeof feeders[number]) {
    setEditName(f.name); setEditUnitLabel(f.unit_label); setEditThreshold(String(f.low_stock_threshold))
    setEditCurrentStock(String(f.currentStock)); setEditFeeder(f)
  }

  async function handleSaveEditFeeder() {
    if (!editFeeder || !user || !householdId) return
    setSavingEdit(true)
    try {
      await updateFeederItem(editFeeder.id, { name: editName, unit_label: editUnitLabel, low_stock_threshold: Number(editThreshold) })
      const targetStock = Number(editCurrentStock)
      if (!isNaN(targetStock) && targetStock !== editFeeder.currentStock) {
        await createFeederStockEvent({
          household_id: householdId, feeder_item_id: editFeeder.id, user_id: user.id,
          event_type: 'adjustment', quantity_delta: targetStock - editFeeder.currentStock,
          notes: 'Manual stock correction',
        })
      }
      refreshFeeders(); setEditFeeder(null)
      showToast('Feeder updated', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setSavingEdit(false) }
  }

  async function handleInlineStockSave(feeder: typeof feeders[number]) {
    const target = Number(inlineEditValue)
    if (isNaN(target) || target === feeder.currentStock) { setInlineEditId(null); return }
    if (!user || !householdId) return
    try {
      await createFeederStockEvent({
        household_id: householdId, feeder_item_id: feeder.id, user_id: user.id,
        event_type: 'adjustment', quantity_delta: target - feeder.currentStock,
        notes: 'Manual stock correction',
      })
      refreshFeeders()
      showToast('Stock updated', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setInlineEditId(null) }
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
    setHistory(events as FeederStockEvent[]); setHistoryOpen(feederId)
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
  const addButton = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="tap-target inline-flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto sm:px-3.5 rounded-full bg-tint text-on-tint text-[15px] font-semibold active:opacity-70 transition-opacity"
    >
      <Icon name="plus" size={18} strokeWidth={2.4} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
  const barButton = 'tap-target w-9 h-9 rounded-full flex items-center justify-center text-tint active:bg-fill disabled:opacity-40 transition-colors'
  const tabAction = activeTab === 'expenses'
    ? addButton('Add expense', () => setAddOpen(true))
    : (
      <>
        {lowStockFeeders.length > 0 && (
          <button type="button" onClick={() => setShoppingOpen(true)} aria-label="Shopping list" className={barButton}>
            <Icon name="cart" size={22} strokeWidth={1.8} />
          </button>
        )}
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={scanning} aria-label={scanning ? 'Scanning…' : 'Scan receipt'} className={barButton}>
          {scanning
            ? <span className="w-5 h-5 rounded-full border-2 border-tint border-t-transparent animate-spin" />
            : <Icon name="camera" size={22} strokeWidth={1.8} />}
        </button>
        {addButton('Add feeder', () => setAddFeederOpen(true))}
      </>
    )

  /** Stock level: red when out, amber below the threshold, green above it. */
  const stockColor = (f: { currentStock: number; low_stock_threshold: number }) =>
    f.currentStock <= 0 ? 'var(--color-red)' : f.currentStock < f.low_stock_threshold ? 'var(--color-orange)' : 'var(--color-green)'

  return (
    <div className="flex-1 px-4 lg:px-8 pt-2 md:pt-6 pb-nav md:pb-8 max-w-3xl mx-auto w-full">
      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleReceiptFile} />
      <Header title="Expenses" action={tabAction} />

      <SegmentedControl
        label="Show"
        className="mb-5 sm:max-w-xs"
        value={activeTab}
        onChange={setActiveTab}
        options={[{ value: 'expenses', label: 'Expenses' }, { value: 'feeders', label: 'Feeder Stock' }]}
      />

      {/* ── EXPENSES TAB ── */}
      {activeTab === 'expenses' && (
        <>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[20px] font-bold text-label px-1">{monthName} {year}</span>
            <div className="flex items-center">
              <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="tap-target w-9 h-9 rounded-full flex items-center justify-center text-tint active:bg-fill">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="tap-target w-9 h-9 rounded-full flex items-center justify-center text-tint active:bg-fill">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="rounded-xl bg-surface px-4 py-3.5 mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold text-label-2">Total this month</p>
              <p className="text-[34px] leading-[41px] font-bold text-label tabular-nums">{formatAUD(totalCents)}</p>
              <p className="text-[13px] text-label-2">AUD</p>
            </div>
            {/* Category breakdown */}
            {byCategory.length > 0 && (
              <div className="flex flex-col items-end gap-0.5 pb-0.5">
                {byCategory.slice(0, 3).map(({ cat, total }) => (
                  <p key={cat} className="text-[13px] text-label-2 tabular-nums">
                    {EXPENSE_CATEGORY_LABELS[cat] ?? cat} <span className="text-label">${(total / 100).toFixed(0)}</span>
                  </p>
                ))}
                {byCategory.length > 3 && (
                  <span className="text-[13px] text-label-2">+{byCategory.length - 3} more</span>
                )}
              </div>
            )}
          </div>

          {/* Low feeder stock alert */}
          {lowStockFeeders.length > 0 && (
            <ListSection className="mb-6">
              <ListRow onClick={() => setActiveTab('feeders')} leading={<IconTile name="box" color="var(--color-orange)" />} trailing={<Chevron />}>
                <p className="text-[17px] text-label">
                  {lowStockFeeders.length} feeder{lowStockFeeders.length > 1 ? 's' : ''} running low
                </p>
                <p className="text-[13px] text-label-2 truncate">
                  {lowStockFeeders.map((f) => f.name).join(', ')}
                </p>
              </ListRow>
            </ListSection>
          )}

          {expLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--color-tint)', borderTopColor: 'transparent' }} />
            </div>
          ) : byCategory.length === 0 ? (
            <>
              <EmptyState
                icon="expense"
                title="No expenses this month"
                description="Tap 'Add expense' to record a purchase or cost."
                action={<Button onClick={() => setAddOpen(true)}>Add expense</Button>}
              />

              {/* Feeder stock overview when expenses tab is empty */}
              {feeders.length > 0 && (
                <ListSection
                  header="Feeder stock"
                  action={<button onClick={() => setActiveTab('feeders')} className="tap-target text-[15px] text-tint active:opacity-60">Manage</button>}
                >
                  {feeders.slice(0, 5).map((f) => {
                    const pct = Math.min(f.currentStock / (f.low_stock_threshold * 2), 1)
                    const color = stockColor(f)
                    return (
                      <ListRow
                        key={f.id}
                        separatorInset={68}
                        leading={<span className="block w-10 text-center text-[20px] font-bold tabular-nums" style={{ color }}>{f.currentStock}</span>}
                        trailing={<span className="text-[13px] text-label-2">{f.unit_label}</span>}
                      >
                        <p className="text-[17px] text-label truncate">{f.name}</p>
                        <div className="h-1.5 rounded-full mt-1.5 overflow-hidden bg-fill">
                          <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
                        </div>
                      </ListRow>
                    )
                  })}
                  {feeders.length > 5 && (
                    <ListRow onClick={() => setActiveTab('feeders')}>
                      <span className="text-[17px] text-tint">+{feeders.length - 5} more feeders</span>
                    </ListRow>
                  )}
                </ListSection>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-6">
              {byCategory.map(({ cat, total, items }) => {
                const budget = budgets[cat]
                const over = budget ? total / 100 > budget : false
                return (
                  <ListSection
                    key={cat}
                    prominent
                    header={EXPENSE_CATEGORY_LABELS[cat] ?? cat}
                    action={
                      <div className="flex items-center gap-1.5">
                        <span className="text-[17px] font-semibold text-label tabular-nums">{formatAUD(total)}</span>
                        {budget && (
                          <span className={`text-[15px] tabular-nums ${over ? 'text-red' : 'text-label-2'}`}>/ {formatAUD(Math.round(budget * 100))}</span>
                        )}
                        <button
                          onClick={() => { setEditingBudget(editingBudget === cat ? null : cat); setBudgetInput(budget ? String(budget) : '') }}
                          aria-label="Set budget"
                          aria-expanded={editingBudget === cat}
                          className="tap-target w-8 h-8 rounded-full flex items-center justify-center text-tint active:bg-fill"
                        >
                          <Icon name="target" size={20} strokeWidth={1.8} />
                        </button>
                      </div>
                    }
                  >
                    {editingBudget === cat && (
                      <div className="list-row flex items-center gap-2 px-4 py-2.5">
                        <input
                          type="number" inputMode="decimal" min={0} step={0.01} value={budgetInput}
                          onChange={(e) => setBudgetInput(e.target.value)}
                          placeholder="Monthly budget (AUD)" autoFocus
                          className="flex-1 min-w-0 h-9 rounded-[10px] px-3 text-[17px] bg-fill text-label placeholder:text-label-2 outline-none focus-visible:ring-2 focus-visible:ring-tint"
                        />
                        <button onClick={() => saveBudget(cat)} className="tap-target px-2 text-[17px] text-tint active:opacity-60">Set</button>
                        {budget && <button onClick={() => { setBudgetInput(''); saveBudget(cat) }} className="tap-target px-2 text-[17px] text-label-2 active:opacity-60">Clear</button>}
                      </div>
                    )}
                    <div className="list-row px-4 py-3">
                      {budget ? (
                        <>
                          <div className="h-2 rounded-full overflow-hidden bg-fill">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (total / 100 / budget) * 100)}%`, backgroundColor: over ? 'var(--color-red)' : total / 100 > budget * 0.8 ? 'var(--color-orange)' : 'var(--color-tint)' }} />
                          </div>
                          <p className={`text-[13px] mt-1 ${over ? 'text-red' : 'text-label-2'}`}>
                            {over ? `${formatAUD(total - Math.round(budget * 100))} over budget` : `${formatAUD(Math.round(budget * 100) - total)} remaining`}
                          </p>
                        </>
                      ) : (
                        <div className="h-2 rounded-full overflow-hidden bg-fill">
                          <div className="h-full rounded-full bg-tint" style={{ width: `${totalCents > 0 ? (total / totalCents) * 100 : 0}%` }} />
                        </div>
                      )}
                    </div>
                    {items.map((expense) => (
                      <div key={expense.id} className="list-row flex items-center gap-2 pl-4 pr-2 py-1.5 min-h-11">
                        <div className="min-w-0 flex-1">
                          <p className="text-[17px] text-label truncate">{expense.description}</p>
                          <p className="text-[13px] text-label-2">{format(new Date(expense.expense_date), 'd MMM')}</p>
                        </div>
                        <p className="text-[17px] text-label tabular-nums shrink-0 mr-1">{formatAUD(expense.amount_cents)}</p>
                        <RecordActions what="expense" onEdit={() => openEdit(expense)} onDelete={() => handleDelete(expense)} />
                      </div>
                    ))}
                  </ListSection>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── FEEDERS TAB ── */}
      {activeTab === 'feeders' && (
        <>
          {feedersError && (
            <div className="mb-4 px-4 py-3 rounded-xl text-[15px] text-red" style={{ backgroundColor: 'color-mix(in srgb, var(--color-red) 10%, transparent)' }}>{feedersError}</div>
          )}
          {feedersLoading ? (
            <div className="rounded-xl bg-surface overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="list-row px-4 py-3"><div className="skeleton rounded-lg h-10" /></div>
              ))}
            </div>
          ) : feeders.length === 0 ? (
            <EmptyState
              icon="box"
              title="No feeder inventory"
              description="Set up your feeder inventory to track stock levels."
              action={<Button size="lg" onClick={() => setAddFeederOpen(true)}>Add first feeder</Button>}
            />
          ) : (
            <div className="rounded-xl bg-surface overflow-hidden">
              {feeders.map((f) => {
                const pct = Math.min(f.currentStock / (f.low_stock_threshold * 2), 1)
                const color = stockColor(f)
                return (
                  <div key={f.id} className="list-row list-row-leading flex items-center gap-3 pl-3 pr-2 py-2.5" style={{ '--sep-inset': '80px' } as React.CSSProperties}>
                    {/* Stock count — tap to edit inline */}
                    <div className="text-center shrink-0 w-14">
                      {inlineEditId === f.id ? (
                        <input
                          type="number" inputMode="numeric" min={0} value={inlineEditValue} autoFocus
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onBlur={() => handleInlineStockSave(f)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleInlineStockSave(f); if (e.key === 'Escape') setInlineEditId(null) }}
                          aria-label={`Stock of ${f.name}`}
                          className="w-full h-9 text-center text-[20px] font-bold tabular-nums rounded-[8px] bg-fill outline-none ring-2"
                          style={{ color, ['--tw-ring-color' as string]: color }}
                        />
                      ) : (
                        <button type="button" title="Tap to set stock amount"
                          onClick={() => { setInlineEditId(f.id); setInlineEditValue(String(f.currentStock)) }}
                          aria-label={`Set stock of ${f.name}, currently ${f.currentStock}`}
                          className="w-full rounded-[8px] py-0.5 active:bg-fill hover:bg-fill"
                        >
                          <p className="text-[22px] leading-7 font-bold tabular-nums" style={{ color }}>{f.currentStock}</p>
                        </button>
                      )}
                      <p className="text-[12px] text-label-2 truncate">{f.unit_label}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <h3 className="text-[17px] text-label truncate">{f.name}</h3>
                        <span className="text-[13px] text-label-2 shrink-0 tabular-nums">/{f.low_stock_threshold}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-fill">
                        <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 -ml-1.5">
                        <button
                          onClick={() => { setAddStockOpen(f.id); setStockQty(''); setStockCost(''); setStockNotes(''); setStockMode('add'); setStockFeederCurrentStock(f.currentStock) }}
                          className="h-[30px] px-3 rounded-full text-[15px] font-semibold text-tint active:opacity-60"
                          style={{ backgroundColor: 'color-mix(in srgb, var(--color-tint) 14%, transparent)' }}
                        >+ Stock</button>
                        <span className="flex-1" />
                        <button onClick={() => openHistory(f.id)} aria-label={`Stock history: ${f.name}`} className="tap-target w-8 h-8 rounded-full flex items-center justify-center text-label-2 active:bg-fill hover:bg-fill">
                          <Icon name="clock" size={18} />
                        </button>
                        <button onClick={() => openEditFeeder(f)} aria-label={`Edit ${f.name}`} className="tap-target w-8 h-8 rounded-full flex items-center justify-center text-tint active:bg-fill hover:bg-fill">
                          <Icon name="pencil" size={18} />
                        </button>
                        <button onClick={() => handleDeleteFeeder(f)} aria-label={`Delete ${f.name}`} className="tap-target w-8 h-8 rounded-full flex items-center justify-center text-red active:bg-fill hover:bg-fill">
                          <Icon name="trash" size={18} />
                        </button>
                      </div>
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

      <Modal open={!!addStockOpen} onClose={() => setAddStockOpen(null)} title="Stock">
        <div className="flex flex-col gap-4">
          <SegmentedControl
            label="Stock change"
            value={stockMode}
            onChange={setStockMode}
            options={[{ value: 'add', label: 'Add quantity' }, { value: 'set', label: 'Set exact amount' }]}
          />
          {stockMode === 'add' ? (
            <>
              <Input label="Quantity to add" type="number" min={1} value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder="How many?" />
              <Input label="Unit cost (AUD)" type="number" min={0} step={0.01} value={stockCost} onChange={(e) => setStockCost(e.target.value)} placeholder="0.00" />
            </>
          ) : (
            <div>
              <Input label="Set stock to" type="number" min={0} value={stockQty} onChange={(e) => setStockQty(e.target.value)} placeholder={`Currently ${stockFeederCurrentStock}`} />
              <p className="text-[13px] mt-1.5 px-1 text-label-2">Current: {stockFeederCurrentStock} — saves a correction event to history</p>
            </div>
          )}
          <Textarea label="Notes" value={stockNotes} onChange={(e) => setStockNotes(e.target.value)} rows={2} placeholder={stockMode === 'set' ? 'Reason for correction (optional)' : 'Where purchased, etc.'} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setAddStockOpen(null)}>Cancel</Button>
            <Button fullWidth onClick={() => addStockOpen && handleAddStock(addStockOpen)} loading={savingStock}>
              {stockMode === 'set' ? 'Set amount' : 'Add stock'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!historyOpen} onClose={() => setHistoryOpen(null)} title="Stock history">
        <div className="max-h-80 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-[15px] text-center py-6 text-label-2">No history</p>
          ) : (
            <div className="rounded-xl bg-fill overflow-hidden">
              {history.map((ev) => (
                <div key={ev.id} className="list-row flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[17px] text-label tabular-nums">{ev.event_type === 'purchase' ? '+' : ''}{ev.quantity_delta}</p>
                    <p className="text-[13px] text-label-2">{ev.notes ?? ev.event_type}</p>
                  </div>
                  <p className="text-[13px] text-label-2 shrink-0">{formatDate(ev.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal open={!!editFeeder} onClose={() => setEditFeeder(null)} title="Edit feeder">
        <div className="flex flex-col gap-4">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input label="Unit label" value={editUnitLabel} onChange={(e) => setEditUnitLabel(e.target.value)} placeholder="e.g. insects, mice" />
          <div>
            <Input label="Current stock" type="number" min={0} value={editCurrentStock} onChange={(e) => setEditCurrentStock(e.target.value)} />
            <p className="text-[13px] mt-1.5 px-1 text-label-2">Set the actual count — saves an adjustment to history</p>
          </div>
          <Input label="Low stock threshold" type="number" min={0} value={editThreshold} onChange={(e) => setEditThreshold(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setEditFeeder(null)}>Cancel</Button>
            <Button fullWidth onClick={handleSaveEditFeeder} loading={savingEdit}>Save</Button>
          </div>
        </div>
      </Modal>

      <Modal open={shoppingOpen} onClose={() => setShoppingOpen(false)} title="Shopping list">
        <div className="rounded-xl bg-fill overflow-hidden">
          {lowStockFeeders.map((f) => (
            <div key={f.id} className="list-row flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-[17px] text-label">{f.name}</p>
                <p className="text-[13px] text-label-2">Stock: {f.currentStock} / threshold: {f.low_stock_threshold}</p>
              </div>
              <p className="text-[17px] font-semibold text-orange shrink-0">
                Buy ~{Math.max(f.low_stock_threshold * 2 - f.currentStock, 0)}
              </p>
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={receiptOpen} onClose={() => { setReceiptOpen(false); setReceiptItems([]) }} title="Review scanned receipt">
        <div className="flex flex-col gap-3">
          <p className="text-[15px] text-label-2">Select which items to add to inventory and adjust quantities as needed.</p>
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
            {receiptItems.map((item) => (
              <div key={item._id} className={`flex items-start gap-3 p-3 rounded-xl bg-fill transition-opacity ${item.selected ? '' : 'opacity-60'}`}>
                <input type="checkbox" checked={item.selected} onChange={(e) => updateReceiptItem(item._id, { selected: e.target.checked })} aria-label={`Include ${item.editedName || 'item'}`} className="mt-2.5 w-5 h-5 accent-tint shrink-0" />
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <Input value={item.editedName} onChange={(e) => updateReceiptItem(item._id, { editedName: e.target.value })} disabled={!item.selected} />
                  <div className="flex items-center gap-2">
                    <Input label="Qty" type="number" min={1} value={item.editedQty} onChange={(e) => updateReceiptItem(item._id, { editedQty: e.target.value })} disabled={!item.selected} />
                    {item.unit_price_cents > 0 && (
                      <p className="text-[13px] whitespace-nowrap text-label-2">{formatAUD(item.unit_price_cents)} ea</p>
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
