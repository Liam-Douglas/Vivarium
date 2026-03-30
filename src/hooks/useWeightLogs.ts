import { useState, useEffect, useCallback } from 'react'
import { getWeightLogs } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface WeightLog {
  id: string
  household_id: string
  animal_id: string
  user_id: string
  weight_grams: number
  logged_at: string
  notes: string | null
  created_at: string
}

export function useWeightLogs(animalId: string) {
  const { householdId } = useHousehold()
  const [data, setData] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!householdId || !animalId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const result = await getWeightLogs(householdId, animalId)
      setData(result as WeightLog[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load weight logs')
    } finally {
      setLoading(false)
    }
  }, [householdId, animalId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
