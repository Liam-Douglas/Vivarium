import { useState, useEffect, useCallback } from 'react'
import { getFeederItems, getFeederStock, getFeederStockMap, isMissingDbObject } from '@/lib/queries'
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
      const items = (await getFeederItems(householdId)) as FeederItem[]
      let itemsWithStock: FeederItemWithStock[]
      try {
        // One grouped query via the feeder_stock view.
        const stockMap = await getFeederStockMap(householdId)
        itemsWithStock = items.map((item) => ({ ...item, currentStock: stockMap[item.id] ?? 0 }))
      } catch (e) {
        if (!isMissingDbObject(e)) throw e
        // View not applied yet — fall back to the per-item query.
        itemsWithStock = await Promise.all(
          items.map(async (item) => ({ ...item, currentStock: await getFeederStock(item.id) }))
        )
      }
      setData(itemsWithStock)
    } catch (e) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to load feeder inventory')
    } finally {
      setLoading(false)
    }
  }, [householdId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
