import { useState, useEffect, useCallback } from 'react'
import { getMedicationSchedules } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface MedicationSchedule {
  id: string
  household_id: string
  animal_id: string
  user_id: string
  name: string
  dosage: string | null
  frequency_days: number | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useMedicationSchedules(animalId?: string) {
  const { householdId } = useHousehold()
  const [data, setData] = useState<MedicationSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!householdId || !animalId) return
    setLoading(true)
    setError(null)
    try {
      const result = await getMedicationSchedules(householdId, animalId)
      setData(result as MedicationSchedule[])
    } catch (e) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to load medication schedules')
    } finally {
      setLoading(false)
    }
  }, [householdId, animalId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
