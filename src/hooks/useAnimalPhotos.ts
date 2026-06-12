import { useState, useEffect, useCallback } from 'react'
import { getAnimalPhotos } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface AnimalPhoto {
  id: string
  household_id: string
  animal_id: string
  user_id: string
  url: string
  caption: string | null
  created_at: string
}

export function useAnimalPhotos(animalId?: string) {
  const { householdId } = useHousehold()
  const [data, setData] = useState<AnimalPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!householdId || !animalId) return
    setLoading(true)
    setError(null)
    try {
      const result = await getAnimalPhotos(householdId, animalId)
      setData(result as AnimalPhoto[])
    } catch (e) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to load photos')
    } finally {
      setLoading(false)
    }
  }, [householdId, animalId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
