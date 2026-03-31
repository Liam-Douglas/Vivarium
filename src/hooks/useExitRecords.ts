import { useState, useEffect, useCallback } from 'react'
import { getExitRecords } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface ExitRecord {
  id: string
  household_id: string
  animal_id: string
  user_id: string
  exited_at: string
  reason: string
  price_cents: number | null
  notes: string | null
  created_at: string
}

export function useExitRecords(animalId?: string) {
  const { householdId } = useHousehold()
  const [data, setData] = useState<ExitRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!householdId || !animalId) { setLoading(false); return }
    setLoading(true)
    try {
      const result = await getExitRecords(householdId, animalId)
      setData(result as ExitRecord[])
    } catch { setData([]) }
    finally { setLoading(false) }
  }, [householdId, animalId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refresh: fetch }
}
