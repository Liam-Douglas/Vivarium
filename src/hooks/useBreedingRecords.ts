import { useState, useEffect, useCallback } from 'react'
import { getBreedingRecords } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface BreedingRecord {
  id: string
  household_id: string
  animal_id: string
  user_id: string
  paired_with_id: string | null
  paired_with_name: string | null
  pairing_date: string
  outcome: string | null
  clutch_size: number | null
  eggs_fertile: number | null
  hatch_date: string | null
  notes: string | null
  created_at: string
}

export function useBreedingRecords(animalId?: string) {
  const { householdId } = useHousehold()
  const [data, setData] = useState<BreedingRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!householdId || !animalId) { setLoading(false); return }
    setLoading(true)
    try {
      const result = await getBreedingRecords(householdId, animalId)
      setData(result as BreedingRecord[])
    } catch { setData([]) }
    finally { setLoading(false) }
  }, [householdId, animalId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refresh: fetch }
}
