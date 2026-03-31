import { useState, useEffect, useCallback } from 'react'
import { getAcquisitionRecords } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface AcquisitionRecord {
  id: string
  household_id: string
  animal_id: string
  user_id: string
  acquired_at: string
  source: string | null
  source_name: string | null
  price_cents: number | null
  notes: string | null
  created_at: string
}

export function useAcquisitionRecords(animalId?: string) {
  const { householdId } = useHousehold()
  const [data, setData] = useState<AcquisitionRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!householdId || !animalId) { setLoading(false); return }
    setLoading(true)
    try {
      const result = await getAcquisitionRecords(householdId, animalId)
      setData(result as AcquisitionRecord[])
    } catch { setData([]) }
    finally { setLoading(false) }
  }, [householdId, animalId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, refresh: fetch }
}
