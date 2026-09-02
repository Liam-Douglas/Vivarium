import { useState, useEffect, useCallback } from 'react'
import { getMedicationLogs } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface MedicationLog {
  id: string
  household_id: string
  schedule_id: string
  animal_id: string
  user_id: string
  given_at: string
  notes: string | null
  created_at: string
}

/** Omit `animalId` for every dose logged across the household. */
export function useMedicationLogs(animalId?: string) {
  const { householdId } = useHousehold()
  const [data, setData] = useState<MedicationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!householdId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const result = await getMedicationLogs(householdId, animalId)
      setData(result as MedicationLog[])
    } catch (e) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to load medication logs')
    } finally {
      setLoading(false)
    }
  }, [householdId, animalId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
