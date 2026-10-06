import { useState, useEffect, useCallback } from 'react'
import { getIncubations } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface Incubation {
  id: string
  household_id: string
  animal_id: string
  breeding_record_id: string | null
  user_id: string
  clutch_size: number | null
  eggs_fertile: number | null
  start_date: string
  expected_hatch_date: string | null
  actual_hatch_date: string | null
  temperature_c: number | null
  humidity_percent: number | null
  incubation_medium: string | null
  hatchlings: number | null
  outcome: string | null
  notes: string | null
  created_at: string | null
}

export function useIncubations(animalId?: string) {
  const { householdId } = useHousehold()
  const [data, setData] = useState<Incubation[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!householdId || !animalId) { setLoading(false); return }
    setLoading(true)
    try {
      const result = await getIncubations(householdId, animalId)
      setData(result as Incubation[])
    } catch { setData([]) }
    finally { setLoading(false) }
  }, [householdId, animalId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refresh: fetch }
}
