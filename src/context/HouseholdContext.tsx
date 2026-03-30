import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { getHouseholdForUser, getHouseholdMembers, getPendingRequests } from '@/lib/queries'
import { useAuth } from './AuthContext'

interface HouseholdMember {
  id: string
  household_id: string
  user_id: string
  role: 'owner' | 'member'
  status: 'pending' | 'active' | 'rejected'
  joined_at: string | null
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

interface HouseholdContextValue {
  householdId: string | null
  householdName: string | null
  inviteCode: string | null
  members: HouseholdMember[]
  currentUserRole: 'owner' | 'member' | null
  pendingRequests: HouseholdMember[]
  loading: boolean
  refresh: () => Promise<void>
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [householdName, setHouseholdName] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'member' | null>(null)
  const [pendingRequests, setPendingRequests] = useState<HouseholdMember[]>([])
  const [loading, setLoading] = useState(true)

  const userId = user?.id

  const refresh = useCallback(async () => {
    setLoading(true)
    if (!userId) {
      setHouseholdId(null)
      setHouseholdName(null)
      setInviteCode(null)
      setMembers([])
      setCurrentUserRole(null)
      setPendingRequests([])
      setLoading(false)
      return
    }

    try {
      const memberData = await getHouseholdForUser(userId)
      if (!memberData) {
        setHouseholdId(null)
        setLoading(false)
        return
      }

      const hid = memberData.household_id
      const household = (memberData.households as unknown) as { id: string; name: string; invite_code: string | null } | null
      setHouseholdId(hid)
      setHouseholdName(household?.name ?? null)
      setInviteCode(household?.invite_code ?? null)
      setCurrentUserRole(memberData.role as 'owner' | 'member')

      const [allMembers, pending] = await Promise.all([
        getHouseholdMembers(hid),
        memberData.role === 'owner' ? getPendingRequests(hid) : Promise.resolve([]),
      ])

      setMembers(allMembers as HouseholdMember[])
      setPendingRequests(pending as HouseholdMember[])
    } catch (e) {
      console.error('Failed to load household:', e)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Realtime: watch for household_members changes
  useEffect(() => {
    if (!householdId) return
    const channel = supabase
      .channel(`household-${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'household_members', filter: `household_id=eq.${householdId}` },
        () => { refresh() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [householdId, refresh])

  return (
    <HouseholdContext.Provider value={{ householdId, householdName, inviteCode, members, currentUserRole, pendingRequests, loading, refresh }}>
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider')
  return ctx
}
