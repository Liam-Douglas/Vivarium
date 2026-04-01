import { useState, useEffect, useCallback } from 'react'
import { getExpenses } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface Expense {
  id: string
  household_id: string
  user_id: string
  animal_id: string | null
  category: string
  amount_cents: number
  currency: string
  description: string
  expense_date: string
  source_ref_id: string | null
  created_at: string
  deleted_at: string | null
}

export const EXPENSE_CATEGORIES = [
  'feeder_stock',
  'veterinary',
  'enclosure',
  'acquisition',
  'supplies',
  'misc',
] as const

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  feeder_stock: 'Feeder stock',
  veterinary: 'Veterinary',
  enclosure: 'Enclosure',
  acquisition: 'Acquisition',
  supplies: 'Supplies',
  misc: 'Misc',
}

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export function useExpenses(year: number, month: number) {
  const { householdId } = useHousehold()
  const [data, setData] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!householdId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const result = await getExpenses(householdId, year, month)
      setData(result as Expense[])
    } catch (e) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [householdId, year, month])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
