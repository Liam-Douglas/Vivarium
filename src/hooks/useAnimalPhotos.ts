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

  const fetch = useCallback(async () => {
    if (!householdId || !animalId) return
    setLoading(true)
    try {
      const result = await getAnimalPhotos(householdId, animalId)
      setData(result as AnimalPhoto[])
    } catch {
      // silently fail — photos are non-critical
    } finally {
      setLoading(false)
    }
  }, [householdId, animalId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, refresh: fetch }
}
