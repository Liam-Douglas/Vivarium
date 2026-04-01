import { useState, useEffect, useCallback } from 'react'
import { getAnimals } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface Animal {
  id: string
  household_id: string
  user_id: string
  name: string
  species: string
  morph: string | null
  sex: string | null
  date_of_birth: string | null
  weight_grams: number | null
  last_fed_at: string | null
  photo_url: string | null
  notes: string | null
  feeding_frequency_days: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useAnimals() {
  const { householdId } = useHousehold()
  const [data, setData] = useState<Animal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!householdId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const result = await getAnimals(householdId)
      setData(result as Animal[])
    } catch (e) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to load animals')
    } finally {
      setLoading(false)
    }
  }, [householdId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
