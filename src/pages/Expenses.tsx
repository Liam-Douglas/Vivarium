import { useState } from 'react'
import { useExpenses, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from '@/hooks/useExpenses'
import { useAnimals } from '@/hooks/useAnimals'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import { createExpense, updateExpense, softDeleteExpense } from '@/lib/queries'
import type { Expense } from '@/hooks/useExpenses'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { format } from 'date-fns'

const CATEGORY_ICONS: Record<string, string> = {
  feeder_stock: '🐛',
  veterinary: '🏥',
  enclosure: '🏠',
  acquisition: '🦎',
  supplies: '🛍️',
  misc: '📦',
}

export function Expenses() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const { data: expenses, loading, refresh } = useExpenses(year, month)
  const { data: animals } = useAnimals()
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()
  const [addOpen, setAddOpen] = useState(false)

  // Form state
  const [category, setCategory] = useState('misc')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [animalId, setAnimalId] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])

  const [saving, setSaving] = useState(false)

  // Edit state
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [editCategory, setEditCategory] = useState('misc')
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAnimalId, setEditAnimalId] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  function openEdit(expense: Expense) {
    setEditExpense(expense)
    setEditCategory(expense.category)
    setEditAmount((expense.amount_cents / 100).toFixed(2))
    setEditDescription(expense.description)
    setEditAnimalId(expense.animal_id ?? '')
    setEditDate(expense.expense_date.split('T')[0])
  }

  async function handleEdit() {
    if (!editExpense || !editAmount || !editDescription) return
    setEditSaving(true)
    try {
      await updateExpense(editExpense.id, {
        category: editCategory,
        amount_cents: Math.round(Number(editAmount) * 100),
        description: editDescription,
        animal_id: editAnimalId || null,
        expense_date: new Date(editDate).toISOString(),
      })
      refresh()
      setEditExpense(null)
      showToast('Expense updated', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error', 'error')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(expense: Expense) {
    try {
      await softDeleteExpense(expense.id)
      refresh()
      showToast('Expense deleted', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error', 'error')
    }
  }

  const totalCents = expenses.reduce((s, e) => s + e.amount_cents, 0)

  const byCategory = Object.entries(
    expenses.reduce((acc, e) => {
      acc[e.category] = [...(acc[e.category] ?? []), e]
      return acc
    }, {} as Record<string, typeof expenses>)
  ).map(([cat, items]) => ({
    cat,
    items,
    total: items.reduce((s, e) => s + e.amount_cents, 0),
  })).filter((g) => g.total > 0)

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' })

  function changeMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m)
    setYear(y)
  }

  async function handleAdd() {
    if (!user || !householdId || !amount || !description) return
    setSaving(true)
    try {
      await createExpense({ household_id: householdId, user_id: user.id, animal_id: animalId || undefined, category, amount_cents: Math.round(Number(amount) * 100), currency: 'AUD', description, expense_date: new Date(expenseDate).toISOString(), })
      refresh()
      setAddOpen(false)
      setAmount('')
      setDescription('')

      showToast('Expense added', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-3xl mx-auto w-full">
      <Header
        title="Expenses"
        action={<Button size="sm" onClick={() => setAddOpen(true)}>Add expense</Button>}
      />

      {/* Month nav */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={{ color: '#a8a090' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="text-sm font-medium" style={{ color: '#f0ece0' }}>{monthName} {year}</span>
        <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5" style={{ color: '#a8a090' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Total */}
      <div className="rounded-xl p-5 mb-5 text-center" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs mb-1" style={{ color: '#6a6458' }}>Total this month</p>
        <p className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
          ${(totalCents / 100).toFixed(2)}
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#6a6458' }}>AUD</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#8fbe5a', borderTopColor: 'transparent' }} />
        </div>
      ) : byCategory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="text-5xl mb-4 opacity-60">💸</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: '#f0ece0', fontFamily: 'Playfair Display, serif' }}>No expenses this month</h3>
          <p className="text-sm max-w-xs" style={{ color: '#a8a090' }}>Tap 'Add expense' to record a purchase or cost.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {byCategory.map(({ cat, total, items }) => (
            <div key={cat} className="rounded-xl overflow-hidden" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{CATEGORY_ICONS[cat] ?? '📦'}</span>
                  <span className="text-sm font-medium" style={{ color: '#f0ece0' }}>{EXPENSE_CATEGORY_LABELS[cat] ?? cat}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: '#f0ece0' }}>${(total / 100).toFixed(2)}</span>
              </div>
              {/* Progress bar */}
              <div className="mx-4 mb-3">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${totalCents > 0 ? (total / totalCents) * 100 : 0}%`, backgroundColor: '#8fbe5a' }} />
                </div>
              </div>
              {items.map((expense) => (
                <div key={expense.id} className="px-4 py-2 flex items-center justify-between gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate" style={{ color: '#a8a090' }}>{expense.description}</p>
                    <p className="text-xs" style={{ color: '#6a6458' }}>{format(new Date(expense.expense_date), 'MMM d')}</p>
                  </div>
                  <p className="text-sm shrink-0" style={{ color: '#f0ece0' }}>${(expense.amount_cents / 100).toFixed(2)}</p>
                  <button onClick={() => openEdit(expense)} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5" style={{ color: '#6a6458' }} title="Edit">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(expense)} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5" style={{ color: '#6a6458' }} title="Delete">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

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
    </div>
  )
}
