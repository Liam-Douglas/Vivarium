import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { getMembershipForUser, getHouseholdMembers, getPendingRequests, type MembershipStatus } from '@/lib/queries'
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
  /**
   * The household this user is an ACTIVE member of, and nothing else.
   *
   * A join request that is still awaiting approval used to set this, which put
   * the whole app behind a household the database refuses to serve: every
   * screen loaded, every query came back empty, and it read as a collection
   * that had lost its data. Membership state now travels separately, so a
   * screen that keys off householdId cannot fetch on behalf of someone who is
   * not a member yet.
   */
  householdId: string | null
  householdName: string | null
  inviteCode: string | null
  members: HouseholdMember[]
  currentUserRole: 'owner' | 'member' | null
  /** 'pending' while a join request awaits approval; null when there is none. */
  membershipStatus: MembershipStatus | null
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
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus | null>(null)
  // The household to watch for changes, set even while a request is pending —
  // that subscription is how an approval reaches the waiting member.
  const [watchedHouseholdId, setWatchedHouseholdId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const userId = user?.id

  // Everything that only makes sense for an active member.
  const clearHousehold = useCallback(() => {
    setHouseholdId(null)
    setHouseholdName(null)
    setInviteCode(null)
    setMembers([])
    setCurrentUserRole(null)
    setPendingRequests([])
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    if (!userId) {
      clearHousehold()
      setMembershipStatus(null)
      setWatchedHouseholdId(null)
      setLoading(false)
      return
    }

    try {
      const membership = await getMembershipForUser(userId)
      if (!membership) {
        clearHousehold()
        setMembershipStatus(null)
        setWatchedHouseholdId(null)
        return
      }

      setMembershipStatus(membership.status)
      setWatchedHouseholdId(membership.household_id)

      // Pending or rejected: keep householdId null so no screen queries data
      // the database will refuse, and let the router send them to onboarding.
      if (membership.status !== 'active') {
        clearHousehold()
        return
      }

      const hid = membership.household_id
      setHouseholdId(hid)
      setHouseholdName(membership.household_name)
      setInviteCode(membership.invite_code)
      setCurrentUserRole(membership.role)

      const [allMembers, pending] = await Promise.all([
        getHouseholdMembers(hid),
        membership.role === 'owner' ? getPendingRequests(hid) : Promise.resolve([]),
      ])

      setMembers(allMembers as HouseholdMember[])
      setPendingRequests(pending as HouseholdMember[])
    } catch (e) {
      console.error('Failed to load household:', e)
    } finally {
      setLoading(false)
    }
  }, [userId, clearHousehold])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Realtime: watch for household_members changes
  useEffect(() => {
    if (!watchedHouseholdId) return
    const channel = supabase
      .channel(`household-${watchedHouseholdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'household_members', filter: `household_id=eq.${watchedHouseholdId}` },
        () => { refresh() }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [watchedHouseholdId, refresh])

  return (
    <HouseholdContext.Provider value={{ householdId, householdName, inviteCode, members, currentUserRole, membershipStatus, pendingRequests, loading, refresh }}>
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider')
  return ctx
}
