import { supabase } from './supabase'

// ─── Animals ─────────────────────────────────────────────────────────────────

export async function getAnimals(householdId: string) {
  const { data, error } = await supabase
    .from('animals')
    .select('*')
    .eq('household_id', householdId)
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data
}

export async function getAnimal(id: string) {
  const { data, error } = await supabase
    .from('animals')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createAnimal(animal: {
  household_id: string
  user_id: string
  name: string
  species: string
  morph?: string
  sex?: string
  date_of_birth?: string
  photo_url?: string
  notes?: string
  feeding_frequency_days?: number
}) {
  const { data, error } = await supabase
    .from('animals')
    .insert({ ...animal, is_active: true })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAnimal(id: string, updates: Record<string, unknown>) {
  const { error } = await supabase
    .from('animals')
    .update(updates)
    .eq('id', id)
  if (error) throw error
  return { id }
}

export async function deactivateAnimal(id: string) {
  const { error } = await supabase
    .from('animals')
    .update({ is_active: false })
    .eq('id', id)
  if (error) throw error
}

// ─── Feeding logs ────────────────────────────────────────────────────────────

export async function getFeedingLogs(householdId: string, animalId?: string) {
  let query = supabase
    .from('feeding_logs')
    .select('*, animals(name)')
    .eq('household_id', householdId)
    .order('fed_at', { ascending: false })
  if (animalId) query = query.eq('animal_id', animalId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createFeedingLog(log: {
  household_id: string
  animal_id: string
  user_id: string
  fed_at: string
  prey_type: string
  prey_size?: string
  quantity: number
  refused: boolean
  notes?: string
}) {
  const { data, error } = await supabase.from('feeding_logs').insert(log).select().single()
  if (error) throw error
  return data
}

// ─── Shedding logs ───────────────────────────────────────────────────────────

export async function getSheddingLogs(householdId: string, animalId?: string) {
  let query = supabase
    .from('shedding_logs')
    .select('*, animals(name)')
    .eq('household_id', householdId)
    .order('shed_at', { ascending: false })
  if (animalId) query = query.eq('animal_id', animalId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createSheddingLog(log: {
  household_id: string
  animal_id: string
  user_id: string
  shed_at: string
  complete: boolean
  notes?: string
}) {
  const { data, error } = await supabase.from('shedding_logs').insert(log).select().single()
  if (error) throw error
  return data
}

// ─── Weight logs ─────────────────────────────────────────────────────────────

export async function getWeightLogs(householdId: string, animalId: string) {
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('household_id', householdId)
    .eq('animal_id', animalId)
    .order('logged_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createWeightLog(log: {
  household_id: string
  animal_id: string
  user_id: string
  weight_grams: number
  logged_at: string
  notes?: string
}) {
  const { data, error } = await supabase.from('weight_logs').insert(log).select().single()
  if (error) throw error
  return data
}

// ─── Health events ───────────────────────────────────────────────────────────

export async function getHealthEvents(householdId: string, animalId: string) {
  const { data, error } = await supabase
    .from('health_events')
    .select('*')
    .eq('household_id', householdId)
    .eq('animal_id', animalId)
    .order('event_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createHealthEvent(event: {
  household_id: string
  animal_id: string
  user_id: string
  event_type: string
  event_date: string
  title: string
  notes?: string
  cost_cents?: number
}) {
  const { data, error } = await supabase.from('health_events').insert(event).select().single()
  if (error) throw error
  return data
}

// ─── Feeder inventory ────────────────────────────────────────────────────────

export async function getFeederItems(householdId: string) {
  const { data, error } = await supabase
    .from('feeder_items')
    .select('*')
    .eq('household_id', householdId)
    .order('name')
  if (error) throw error
  return data
}

export async function createFeederItem(item: {
  household_id: string
  user_id: string
  name: string
  feeder_type: string
  unit_label: string
  low_stock_threshold: number
}) {
  const { data, error } = await supabase.from('feeder_items').insert(item).select().single()
  if (error) throw error
  return data
}

export async function getFeederStock(feederItemId: string): Promise<number> {
  const { data, error } = await supabase
    .from('feeder_stock_events')
    .select('quantity_delta')
    .eq('feeder_item_id', feederItemId)
  if (error) throw error
  return (data ?? []).reduce((sum, row) => sum + (row.quantity_delta as number), 0)
}

export async function createFeederStockEvent(event: {
  household_id: string
  feeder_item_id: string
  user_id: string
  event_type: string
  quantity_delta: number
  unit_cost?: number
  source_ref_id?: string
  notes?: string
}) {
  const { data, error } = await supabase.from('feeder_stock_events').insert(event).select().single()
  if (error) throw error
  return data
}

export async function getFeederStockEvents(householdId: string, feederItemId: string) {
  const { data, error } = await supabase
    .from('feeder_stock_events')
    .select('*')
    .eq('household_id', householdId)
    .eq('feeder_item_id', feederItemId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export async function getExpenses(householdId: string, year: number, month: number) {
  const start = new Date(year, month - 1, 1).toISOString()
  const end = new Date(year, month, 1).toISOString()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('household_id', householdId)
    .gte('expense_date', start)
    .lt('expense_date', end)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })
  if (error) throw error
  return data
}

export async function createExpense(expense: {
  household_id: string
  user_id: string
  animal_id?: string
  category: string
  amount_cents: number
  currency: string
  description: string
  expense_date: string
  source_ref_id?: string
}) {
  const { data, error } = await supabase.from('expenses').insert(expense).select().single()
  if (error) throw error
  return data
}

export async function softDeleteExpense(id: string) {
  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId: string, updates: { full_name?: string; avatar_url?: string }) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Household ───────────────────────────────────────────────────────────────

export async function getHousehold(householdId: string) {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', householdId)
    .single()
  if (error) throw error
  return data
}

export async function getHouseholdForUser(userId: string) {
  const { data, error } = await supabase
    .rpc('get_household_for_user', { p_user_id: userId })
  if (error || !data || data.length === 0) return null
  const row = data[0]
  return {
    household_id: row.household_id,
    role: row.role,
    status: row.status,
    households: { id: row.household_id, name: row.household_name, invite_code: row.invite_code },
  }
}

export async function getHouseholdMembers(householdId: string) {
  const { data, error } = await supabase
    .rpc('get_household_members', { p_household_id: householdId })
  if (error) throw error
  return (data ?? []).map((row: { id: string; household_id: string; user_id: string; role: string; status: string; joined_at: string | null; full_name: string | null; avatar_url: string | null }) => ({
    id: row.id,
    household_id: row.household_id,
    user_id: row.user_id,
    role: row.role,
    status: row.status,
    joined_at: row.joined_at,
    profiles: { full_name: row.full_name, avatar_url: row.avatar_url },
  }))
}

export async function getPendingRequests(householdId: string) {
  const { data, error } = await supabase
    .rpc('get_pending_requests', { p_household_id: householdId })
  if (error) throw error
  return (data ?? []).map((row: { id: string; household_id: string; user_id: string; role: string; status: string; joined_at: string | null; full_name: string | null; avatar_url: string | null }) => ({
    id: row.id,
    household_id: row.household_id,
    user_id: row.user_id,
    role: row.role,
    status: row.status,
    joined_at: row.joined_at,
    profiles: { full_name: row.full_name, avatar_url: row.avatar_url },
  }))
}

export async function removeMember(memberId: string) {
  const { error } = await supabase
    .rpc('remove_household_member', { p_member_id: memberId })
  if (error) throw error
}

export async function setMemberRole(memberId: string, role: 'owner' | 'member') {
  const { error } = await supabase
    .rpc('set_member_role', { p_member_id: memberId, p_role: role })
  if (error) throw error
}

export async function approveHouseholdRequest(memberId: string) {
  const { error } = await supabase
    .rpc('approve_household_request', { p_member_id: memberId })
  if (error) throw error
}

export async function denyHouseholdRequest(memberId: string) {
  const { error } = await supabase
    .rpc('deny_household_request', { p_member_id: memberId })
  if (error) throw error
}

export async function joinHouseholdByCode(inviteCode: string, userId: string) {
  // Use SECURITY DEFINER RPC to bypass RLS — new users can't query households directly
  const { data, error: rpcError } = await supabase
    .rpc('get_household_by_invite_code', { p_invite_code: inviteCode.toUpperCase() })
  if (rpcError || !data || data.length === 0) throw new Error('Invalid invite code')
  const householdId = data[0].household_id

  // Insert pending member
  const { error } = await supabase.from('household_members').insert({
    household_id: householdId,
    user_id: userId,
    role: 'member',
    status: 'pending',
  })
  if (error) throw error
  return householdId
}

export async function createHousehold(userId: string, name: string) {
  const { data, error } = await supabase.rpc('create_household_for_user', {
    p_user_id: userId,
    p_name: name,
  })
  if (error) throw error
  return data
}

export async function leaveHousehold(householdId: string, userId: string) {
  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('household_id', householdId)
    .eq('user_id', userId)
  if (error) throw error
}

// ─── Recent activity ─────────────────────────────────────────────────────────

export async function getRecentActivity(householdId: string) {
  const [feedings, sheddings, weights] = await Promise.all([
    supabase
      .from('feeding_logs')
      .select('id, fed_at, prey_type, refused, animal_id, user_id, animals(name), profiles(full_name)')
      .eq('household_id', householdId)
      .order('fed_at', { ascending: false })
      .limit(5),
    supabase
      .from('shedding_logs')
      .select('id, shed_at, complete, animal_id, user_id, animals(name), profiles(full_name)')
      .eq('household_id', householdId)
      .order('shed_at', { ascending: false })
      .limit(5),
    supabase
      .from('weight_logs')
      .select('id, logged_at, weight_grams, animal_id, user_id, animals(name), profiles(full_name)')
      .eq('household_id', householdId)
      .order('logged_at', { ascending: false })
      .limit(5),
  ])

  type ActivityEntry = {
    id: string
    type: 'feeding' | 'shedding' | 'weight'
    timestamp: string
    animalName: string
    userId: string
    loggedBy: string
    detail: string
  }

  const activities: ActivityEntry[] = []

  if (feedings.data) {
    feedings.data.forEach((f) => {
      const a = (f.animals as unknown) as { name: string } | null
      const p = (f.profiles as unknown) as { full_name: string } | null
      activities.push({
        id: f.id,
        type: 'feeding',
        timestamp: f.fed_at,
        animalName: a?.name ?? 'Unknown',
        userId: f.user_id,
        loggedBy: p?.full_name ?? 'Unknown',
        detail: f.refused ? 'Refused' : f.prey_type,
      })
    })
  }
  if (sheddings.data) {
    sheddings.data.forEach((s) => {
      const a = (s.animals as unknown) as { name: string } | null
      const p = (s.profiles as unknown) as { full_name: string } | null
      activities.push({
        id: s.id,
        type: 'shedding',
        timestamp: s.shed_at,
        animalName: a?.name ?? 'Unknown',
        userId: s.user_id,
        loggedBy: p?.full_name ?? 'Unknown',
        detail: s.complete ? 'Complete shed' : 'Incomplete shed',
      })
    })
  }
  if (weights.data) {
    weights.data.forEach((w) => {
      const a = (w.animals as unknown) as { name: string } | null
      const p = (w.profiles as unknown) as { full_name: string } | null
      activities.push({
        id: w.id,
        type: 'weight',
        timestamp: w.logged_at,
        animalName: a?.name ?? 'Unknown',
        userId: w.user_id,
        loggedBy: p?.full_name ?? 'Unknown',
        detail: `${w.weight_grams}g`,
      })
    })
  }

  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)
}

// ─── Photo upload ─────────────────────────────────────────────────────────────

export async function uploadAnimalPhoto(
  householdId: string,
  animalId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${householdId}/${animalId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('animal-photos').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('animal-photos').getPublicUrl(path)
  return data.publicUrl
}

// ─── Batch import ─────────────────────────────────────────────────────────────

export async function batchInsertAnimals(animals: Record<string, unknown>[]) {
  const chunks = []
  for (let i = 0; i < animals.length; i += 50) chunks.push(animals.slice(i, i + 50))
  let inserted = 0
  for (const chunk of chunks) {
    const { error } = await supabase.from('animals').insert(chunk)
    if (error) throw error
    inserted += chunk.length
  }
  return inserted
}

export async function batchInsertFeedingLogs(logs: Record<string, unknown>[]) {
  const chunks = []
  for (let i = 0; i < logs.length; i += 50) chunks.push(logs.slice(i, i + 50))
  let inserted = 0
  for (const chunk of chunks) {
    const { error } = await supabase.from('feeding_logs').insert(chunk)
    if (error) throw error
    inserted += chunk.length
  }
  return inserted
}

export async function batchInsertSheddingLogs(logs: Record<string, unknown>[]) {
  const chunks = []
  for (let i = 0; i < logs.length; i += 50) chunks.push(logs.slice(i, i + 50))
  let inserted = 0
  for (const chunk of chunks) {
    const { error } = await supabase.from('shedding_logs').insert(chunk)
    if (error) throw error
    inserted += chunk.length
  }
  return inserted
}
