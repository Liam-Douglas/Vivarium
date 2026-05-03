import { useState, useEffect, useCallback } from 'react'
import { getEnclosures } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface Enclosure {
  id: string
  household_id: string
  user_id: string
  name: string
  enclosure_type: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export function useEnclosures() {
  const { householdId } = useHousehold()
  const [data, setData] = useState<Enclosure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!householdId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const result = await getEnclosures(householdId)
      setData(result as Enclosure[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load enclosures')
    } finally {
      setLoading(false)
    }
  }, [householdId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
