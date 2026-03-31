import { useState, useEffect, useCallback } from 'react'
import { getHealthEvents } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface HealthEvent {
  id: string
  household_id: string
  animal_id: string
  user_id: string
  event_type: string
  event_date: string
  title: string
  notes: string | null
  cost_cents: number | null
  created_at: string
}

export function useHealthEvents(animalId?: string) {
  const { householdId } = useHousehold()
  const [data, setData] = useState<HealthEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!householdId || !animalId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const result = await getHealthEvents(householdId, animalId)
      setData(result as HealthEvent[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load health events')
    } finally {
      setLoading(false)
    }
  }, [householdId, animalId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
