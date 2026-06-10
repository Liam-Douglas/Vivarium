import { useState, useEffect, useCallback } from 'react'
import { getVetContacts } from '@/lib/queries'
import { useHousehold } from '@/context/HouseholdContext'

export interface VetContact {
  id: string
  household_id: string
  user_id: string
  name: string
  clinic_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export function useVetContacts() {
  const { householdId } = useHousehold()
  const [data, setData] = useState<VetContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!householdId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const result = await getVetContacts(householdId)
      setData(result as VetContact[])
    } catch (e) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to load vet contacts')
    } finally {
      setLoading(false)
    }
  }, [householdId])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refresh: fetch }
}
