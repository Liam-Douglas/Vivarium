import { useState, useEffect, useCallback } from 'react'
import { getCareTasks } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface CareTask {
  id: string
  household_id: string
  user_id: string
  name: string
  kind: string
  animal_id: string | null
  enclosure_id: string | null
  frequency_days: number
  last_done_at: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export function useCareTasks() {
  const { householdId } = useHousehold()
  const [data, setData] = useState<CareTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!householdId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      setData(await getCareTasks(householdId) as CareTask[])
    } catch (e) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to load reminders')
    } finally {
      setLoading(false)
    }
  }, [householdId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
