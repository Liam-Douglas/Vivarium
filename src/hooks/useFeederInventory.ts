import { useState, useEffect, useCallback } from 'react'
import { getFeederItems, getFeederStock } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface FeederItem {
  id: string
  household_id: string
  user_id: string
  name: string
  feeder_type: string
  unit_label: string
  low_stock_threshold: number
  created_at: string
}

export interface FeederItemWithStock extends FeederItem {
  currentStock: number
}

export function useFeederInventory() {
  const { householdId } = useHousehold()
  const [data, setData] = useState<FeederItemWithStock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!householdId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const items = await getFeederItems(householdId)
      const itemsWithStock = await Promise.all(
        (items as FeederItem[]).map(async (item) => ({
          ...item,
          currentStock: await getFeederStock(item.id),
        }))
      )
      setData(itemsWithStock)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feeder inventory')
    } finally {
      setLoading(false)
    }
  }, [householdId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
