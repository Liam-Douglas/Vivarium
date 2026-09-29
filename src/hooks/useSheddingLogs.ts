import { useState, useEffect, useCallback } from 'react'
import { getSheddingLogs } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface SheddingLog {
  id: string
  household_id: string
  animal_id: string
  user_id: string
  shed_at: string
  complete: boolean
  notes: string | null
  created_at: string
  animals?: { name: string } | null
}

export function useSheddingLogs(animalId?: string) {
  const { householdId } = useHousehold()
  const [data, setData] = useState<SheddingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!householdId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const result = await getSheddingLogs(householdId, animalId)
      setData(result as SheddingLog[])
    } catch (e) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to load shedding logs')
    } finally {
      setLoading(false)
    }
  }, [householdId, animalId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
