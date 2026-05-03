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

export async function getAllAnimalsForMatching(householdId: string) {
  const { data, error } = await supabase
    .from('animals')
    .select('id, name, species')
    .eq('household_id', householdId)
    .order('name')
  if (error) throw error
  return data ?? []
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
  morph?: string | null
  sex?: string | null
  date_of_birth?: string | null
  photo_url?: string | null
  notes?: string | null
  feeding_frequency_days?: number
  tags?: string[]
  quarantine_started_at?: string | null
  quarantine_ended_at?: string | null
  is_for_sale?: boolean
  asking_price_cents?: number | null
  custom_fields?: Record<string, string>
  enclosure_id?: string | null
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

export async function updateFeedingLog(id: string, updates: { fed_at?: string; prey_type?: string; prey_size?: string | null; quantity?: number; refused?: boolean; notes?: string | null }) {
  const { error } = await supabase.from('feeding_logs').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteFeedingLog(id: string) {
  const { error } = await supabase.from('feeding_logs').delete().eq('id', id)
  if (error) throw error
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

export async function updateSheddingLog(id: string, updates: { shed_at?: string; complete?: boolean; notes?: string | null }) {
  const { error } = await supabase.from('shedding_logs').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteSheddingLog(id: string) {
  const { error } = await supabase.from('shedding_logs').delete().eq('id', id)
  if (error) throw error
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

export async function updateWeightLog(id: string, updates: { weight_grams?: number; logged_at?: string; notes?: string | null }) {
  const { error } = await supabase.from('weight_logs').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteWeightLog(id: string) {
  const { error } = await supabase.from('weight_logs').delete().eq('id', id)
  if (error) throw error
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

export async function updateHealthEvent(id: string, updates: { event_type?: string; event_date?: string; title?: string; notes?: string | null; cost_cents?: number | null }) {
  const { error } = await supabase.from('health_events').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteHealthEvent(id: string) {
  const { error } = await supabase.from('health_events').delete().eq('id', id)
  if (error) throw error
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

// ─── Acquisition records ─────────────────────────────────────────────────────

export async function getAcquisitionRecords(householdId: string, animalId: string) {
  const { data, error } = await supabase.from('acquisition_records').select('*').eq('household_id', householdId).eq('animal_id', animalId).order('acquired_at', { ascending: false })
  if (error) throw error
  return data
}
export async function createAcquisitionRecord(r: { household_id: string; animal_id: string; user_id: string; acquired_at: string; source?: string; source_name?: string; price_cents?: number; notes?: string }) {
  const { error } = await supabase.from('acquisition_records').insert(r)
  if (error) throw error
}
export async function updateAcquisitionRecord(id: string, r: { acquired_at?: string; source?: string | null; source_name?: string | null; price_cents?: number | null; notes?: string | null }) {
  const { error } = await supabase.from('acquisition_records').update(r).eq('id', id)
  if (error) throw error
}
export async function deleteAcquisitionRecord(id: string) {
  const { error } = await supabase.from('acquisition_records').delete().eq('id', id)
  if (error) throw error
}

// ─── Exit records ─────────────────────────────────────────────────────────────

export async function getExitRecords(householdId: string, animalId: string) {
  const { data, error } = await supabase.from('exit_records').select('*').eq('household_id', householdId).eq('animal_id', animalId).order('exited_at', { ascending: false })
  if (error) throw error
  return data
}
export async function createExitRecord(r: { household_id: string; animal_id: string; user_id: string; exited_at: string; reason: string; price_cents?: number; notes?: string }) {
  const { error } = await supabase.from('exit_records').insert(r)
  if (error) throw error
}
export async function updateExitRecord(id: string, r: { exited_at?: string; reason?: string; price_cents?: number | null; notes?: string | null }) {
  const { error } = await supabase.from('exit_records').update(r).eq('id', id)
  if (error) throw error
}
export async function deleteExitRecord(id: string) {
  const { error } = await supabase.from('exit_records').delete().eq('id', id)
  if (error) throw error
}

// ─── Breeding records ─────────────────────────────────────────────────────────

export async function getBreedingRecords(householdId: string, animalId: string) {
  const { data, error } = await supabase.from('breeding_records').select('*').eq('household_id', householdId).eq('animal_id', animalId).order('pairing_date', { ascending: false })
  if (error) throw error
  return data
}
export async function createBreedingRecord(r: { household_id: string; animal_id: string; user_id: string; pairing_date: string; paired_with_id?: string; paired_with_name?: string; outcome?: string; clutch_size?: number; eggs_fertile?: number; hatch_date?: string; notes?: string }) {
  const { error } = await supabase.from('breeding_records').insert(r)
  if (error) throw error
}
export async function updateBreedingRecord(id: string, r: { pairing_date?: string; paired_with_name?: string | null; outcome?: string | null; clutch_size?: number | null; eggs_fertile?: number | null; hatch_date?: string | null; notes?: string | null }) {
  const { error } = await supabase.from('breeding_records').update(r).eq('id', id)
  if (error) throw error
}
export async function deleteBreedingRecord(id: string) {
  const { error } = await supabase.from('breeding_records').delete().eq('id', id)
  if (error) throw error
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

export async function updateFeederItem(id: string, updates: { name?: string; unit_label?: string; low_stock_threshold?: number }) {
  const { error } = await supabase.from('feeder_items').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteFeederItem(id: string) {
  const { error } = await supabase.from('feeder_items').delete().eq('id', id)
  if (error) throw error
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

export async function getAllExpenses(householdId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('household_id', householdId)
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

export async function updateExpense(id: string, updates: {
  category?: string
  amount_cents?: number
  description?: string
  animal_id?: string | null
  expense_date?: string
}) {
  const { data, error } = await supabase.from('expenses').update(updates).eq('id', id).select().single()
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

// ─── Data repair ─────────────────────────────────────────────────────────────

export async function detectOrphanedFeedingLogs(householdId: string) {
  const { data: activeAnimals, error: animalsErr } = await supabase
    .from('animals')
    .select('id, name')
    .eq('household_id', householdId)
    .eq('is_active', true)
  if (animalsErr) throw animalsErr

  const activeIds = new Set((activeAnimals ?? []).map((a) => a.id))

  const { data: logs, error: logsErr } = await supabase
    .from('feeding_logs')
    .select('id, animal_id, animals(id, name)')
    .eq('household_id', householdId)
  if (logsErr) throw logsErr

  type LogRow = { id: string; animal_id: string; animals: { id: string; name: string } | null }
  const orphaned = ((logs as unknown) as LogRow[] ?? []).filter((l) => l.animal_id && !activeIds.has(l.animal_id))

  const fixable = orphaned.filter((l) => {
    const name = l.animals?.name
    return name && (activeAnimals ?? []).some((a) => a.name.toLowerCase() === name.toLowerCase())
  })

  return { orphanedCount: orphaned.length, fixableCount: fixable.length, fixable, activeAnimals: activeAnimals ?? [] }
}

export async function repairOrphanedFeedingLogs(householdId: string): Promise<{ fixed: number }> {
  const { fixable, activeAnimals } = await detectOrphanedFeedingLogs(householdId)
  let fixed = 0
  for (const log of fixable) {
    const name = log.animals?.name
    const correct = activeAnimals.find((a) => a.name.toLowerCase() === name?.toLowerCase())
    if (!correct) continue
    const { error } = await supabase.from('feeding_logs').update({ animal_id: correct.id }).eq('id', log.id)
    if (!error) fixed++
  }
  return { fixed }
}

export async function detectDuplicateRecords(householdId: string) {
  const [feedRes, shedRes, weightRes] = await Promise.all([
    supabase.from('feeding_logs').select('id, animal_id, fed_at, prey_type, refused, animals(name)').eq('household_id', householdId).order('fed_at'),
    supabase.from('shedding_logs').select('id, animal_id, shed_at, animals(name)').eq('household_id', householdId).order('shed_at'),
    supabase.from('weight_logs').select('id, animal_id, logged_at, weight_grams, animals(name)').eq('household_id', householdId).order('logged_at'),
  ])

  function groupDuplicates<T extends { id: string }>(rows: T[], key: (r: T) => string) {
    const map = new Map<string, T[]>()
    for (const r of (rows ?? [])) {
      const k = key(r)
      const list = map.get(k) ?? []
      list.push(r)
      map.set(k, list)
    }
    return [...map.values()].filter((g) => g.length > 1)
  }

  type FeedRow = { id: string; animal_id: string; fed_at: string; prey_type: string; refused: boolean; animals: { name: string } | null }
  type ShedRow = { id: string; animal_id: string; shed_at: string; animals: { name: string } | null }
  type WeightRow = { id: string; animal_id: string; logged_at: string; weight_grams: number; animals: { name: string } | null }

  const feeding = groupDuplicates((feedRes.data as unknown as FeedRow[]) ?? [], (r) => `${r.animal_id}|${r.fed_at.slice(0, 10)}|${r.prey_type}|${r.refused}`)
  const shedding = groupDuplicates((shedRes.data as unknown as ShedRow[]) ?? [], (r) => `${r.animal_id}|${r.shed_at.slice(0, 10)}`)
  const weight = groupDuplicates((weightRes.data as unknown as WeightRow[]) ?? [], (r) => `${r.animal_id}|${r.logged_at.slice(0, 10)}`)

  const extraCount = [...feeding, ...shedding, ...weight].reduce((s, g) => s + g.length - 1, 0)

  return { feeding, shedding, weight, groupCount: feeding.length + shedding.length + weight.length, extraCount }
}

export async function removeDuplicateRecords(householdId: string): Promise<{ removed: number }> {
  const { feeding, shedding, weight } = await detectDuplicateRecords(householdId)
  let removed = 0

  for (const group of feeding) {
    const [, ...extras] = group
    for (const r of extras) {
      const { error } = await supabase.from('feeding_logs').delete().eq('id', r.id)
      if (!error) removed++
    }
  }
  for (const group of shedding) {
    const [, ...extras] = group
    for (const r of extras) {
      const { error } = await supabase.from('shedding_logs').delete().eq('id', r.id)
      if (!error) removed++
    }
  }
  for (const group of weight) {
    const [, ...extras] = group
    for (const r of extras) {
      const { error } = await supabase.from('weight_logs').delete().eq('id', r.id)
      if (!error) removed++
    }
  }

  return { removed }
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

// ─── Enclosures ──────────────────────────────────────────────────────────────

export async function getEnclosures(householdId: string) {
  const { data, error } = await supabase
    .from('enclosures')
    .select('*')
    .eq('household_id', householdId)
    .order('name')
  if (error) throw error
  return data
}

export async function createEnclosure(enclosure: {
  household_id: string
  user_id: string
  name: string
  enclosure_type?: string | null
  notes?: string | null
}) {
  const { data, error } = await supabase
    .from('enclosures')
    .insert(enclosure)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEnclosure(id: string, updates: Record<string, unknown>) {
  const { error } = await supabase.from('enclosures').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteEnclosure(id: string) {
  const { error } = await supabase.from('enclosures').delete().eq('id', id)
  if (error) throw error
}

// ─── Animal photos ────────────────────────────────────────────────────────────

export async function getAnimalPhotos(householdId: string, animalId: string) {
  const { data, error } = await supabase
    .from('animal_photos')
    .select('*')
    .eq('household_id', householdId)
    .eq('animal_id', animalId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createAnimalPhotoRecord(photo: {
  household_id: string
  animal_id: string
  user_id: string
  url: string
  caption?: string | null
}) {
  const { data, error } = await supabase.from('animal_photos').insert(photo).select().single()
  if (error) throw error
  return data
}

export async function deleteAnimalPhotoRecord(id: string) {
  const { error } = await supabase.from('animal_photos').delete().eq('id', id)
  if (error) throw error
}

export async function uploadAdditionalPhoto(householdId: string, animalId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${householdId}/${animalId}/gallery/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('animal-photos').upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('animal-photos').getPublicUrl(path)
  return data.publicUrl
}

// ─── Medication schedules ─────────────────────────────────────────────────────

export async function getMedicationSchedules(householdId: string, animalId: string) {
  const { data, error } = await supabase
    .from('medication_schedules')
    .select('*')
    .eq('household_id', householdId)
    .eq('animal_id', animalId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createMedicationSchedule(schedule: {
  household_id: string
  animal_id: string
  user_id: string
  name: string
  dosage?: string | null
  frequency_days?: number | null
  start_date?: string | null
  end_date?: string | null
  notes?: string | null
}) {
  const { data, error } = await supabase.from('medication_schedules').insert(schedule).select().single()
  if (error) throw error
  return data
}

export async function updateMedicationSchedule(id: string, updates: Record<string, unknown>) {
  const { error } = await supabase.from('medication_schedules').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteMedicationSchedule(id: string) {
  const { error } = await supabase.from('medication_schedules').delete().eq('id', id)
  if (error) throw error
}

export async function getMedicationLogs(householdId: string, animalId: string) {
  const { data, error } = await supabase
    .from('medication_logs')
    .select('*')
    .eq('household_id', householdId)
    .eq('animal_id', animalId)
    .order('given_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createMedicationLog(log: {
  household_id: string
  schedule_id: string
  animal_id: string
  user_id: string
  given_at: string
  notes?: string | null
}) {
  const { data, error } = await supabase.from('medication_logs').insert(log).select().single()
  if (error) throw error
  return data
}

// ─── Vet contacts ─────────────────────────────────────────────────────────────

export async function getVetContacts(householdId: string) {
  const { data, error } = await supabase
    .from('vet_contacts')
    .select('*')
    .eq('household_id', householdId)
    .order('name')
  if (error) throw error
  return data
}

export async function createVetContact(contact: {
  household_id: string
  user_id: string
  name: string
  clinic_name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}) {
  const { data, error } = await supabase.from('vet_contacts').insert(contact).select().single()
  if (error) throw error
  return data
}

export async function updateVetContact(id: string, updates: Record<string, unknown>) {
  const { error } = await supabase.from('vet_contacts').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteVetContact(id: string) {
  const { error } = await supabase.from('vet_contacts').delete().eq('id', id)
  if (error) throw error
}
