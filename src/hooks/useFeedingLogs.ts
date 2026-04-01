import { useState, useEffect, useCallback } from 'react'
import { getFeedingLogs } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface FeedingLog {
  id: string
  household_id: string
  animal_id: string
  user_id: string
  fed_at: string
  prey_type: string
  prey_size: string | null
  quantity: number
  refused: boolean
  notes: string | null
  created_at: string
  animals?: { name: string } | null
}

export function useFeedingLogs(animalId?: string) {
  const { householdId } = useHousehold()
  const [data, setData] = useState<FeedingLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!householdId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const result = await getFeedingLogs(householdId, animalId)
      setData(result as FeedingLog[])
    } catch (e) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to load feeding logs')
    } finally {
      setLoading(false)
    }
  }, [householdId, animalId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
