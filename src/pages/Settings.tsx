import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Import } from '@/pages/Import'
import { signOutAndClearCaches } from '@/lib/session'
import { latestWeightByAnimal } from '@/lib/latestWeights'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import {
  approveHouseholdRequest, denyHouseholdRequest, leaveHousehold, updateProfile,
  removeMember, setMemberRole, getAnimals, detectOrphanedFeedingLogs,
  detectDuplicateRecords, removeDuplicateRecords,
  createVetContact, updateVetContact, deleteVetContact, recalculateLastFedAt,
  getFeedingLogs, getSheddingLogs, getWeightLogs, getAllExpensesComplete,
  getMedicationLogs, getAllFeederStockEvents, getHealthEvents,
  getAcquisitionRecords, getExitRecords, getBreedingRecords, getIncubations,
  getMedicationSchedules, getFeederItems, getVetContacts, getEnclosures,
} from '@/lib/queries'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ListSection, ListRow } from '@/components/ui/List'
import { Icon, IconTile } from '@/components/ui/icons'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { RecordActions } from '@/components/ui/RecordActions'
import { useVetContacts } from '@/hooks/useVetContacts'
import { requestNotificationPermission, notificationPermission } from '@/hooks/useOverdueNotification'
import type { VetContact } from '@/hooks/useVetContacts'

interface SettingsProps {
  /** Opens straight onto a tab, so /import is a real destination. */
  initialTab?: 'settings' | 'import'
}

export function Settings({ initialTab = 'settings' }: SettingsProps = {}) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'settings' | 'import'>(initialTab)
  const { user, profile, refreshProfile } = useAuth()
  const { householdId, householdName, inviteCode, members, currentUserRole, pendingRequests, refresh: refreshHousehold } = useHousehold()
  const { showToast } = useToast()

  const [displayName, setDisplayName] = useState(profile?.full_name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{ orphanedCount: number; onArchivedCount: number; dupGroups: number; dupExtra: number } | null>(null)
  const [removingDups, setRemovingDups] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  // Read once on mount: the browser only changes this in response to the
  // prompt we raise below, so it cannot go stale behind our back.
  const [notifyPermission, setNotifyPermission] = useState(notificationPermission)

  // Vet contacts
  const { data: vetContacts, refresh: refreshVets } = useVetContacts()
  const [vetFormOpen, setVetFormOpen] = useState(false)
  const [editingVet, setEditingVet] = useState<VetContact | null>(null)
  const [vetName, setVetName] = useState('')
  const [vetClinic, setVetClinic] = useState('')
  const [vetPhone, setVetPhone] = useState('')
  const [vetEmail, setVetEmail] = useState('')
  const [vetAddress, setVetAddress] = useState('')
  const [vetNotes, setVetNotes] = useState('')
  const [savingVet, setSavingVet] = useState(false)

  function openAddVet() {
    setEditingVet(null); setVetName(''); setVetClinic(''); setVetPhone(''); setVetEmail(''); setVetAddress(''); setVetNotes('')
    setVetFormOpen(true)
  }
  function openEditVet(vet: VetContact) {
    setEditingVet(vet); setVetName(vet.name); setVetClinic(vet.practice_name ?? ''); setVetPhone(vet.phone ?? ''); setVetEmail(vet.email ?? ''); setVetAddress(vet.address ?? ''); setVetNotes(vet.notes ?? '')
    setVetFormOpen(true)
  }
  async function handleSaveVet() {
    if (!user || !householdId || !vetName.trim()) return
    setSavingVet(true)
    try {
      const payload = { name: vetName.trim(), practice_name: vetClinic || null, phone: vetPhone || null, email: vetEmail || null, address: vetAddress || null, notes: vetNotes || null }
      if (editingVet) {
        await updateVetContact(editingVet.id, payload)
        showToast('Contact updated', 'success')
      } else {
        await createVetContact({ household_id: householdId, user_id: user.id, ...payload })
        showToast('Contact added', 'success')
      }
      setVetFormOpen(false); refreshVets()
    } catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
    finally { setSavingVet(false) }
  }
  async function handleDeleteVet(vet: VetContact) {
    try { await deleteVetContact(vet.id); refreshVets(); showToast('Contact deleted', 'success') }
    catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
  }

  async function handleExport() {
    if (!householdId) return
    setExporting(true)
    try {
      const { utils, writeFile } = await import('xlsx')
      // Every read here pages to the end. The export used to take the first
      // 1000 rows of each table and hand them over as "your data", and to leave
      // out most of what the app tracks entirely.
      const [
        animals, feedingLogs, sheddingLogs, weightLogs, expenses,
        healthEvents, acquisitions, exits, breeding, incubations,
        medSchedules, medLogs, feederItems, stockEvents, vets, enclosures,
      ] = await Promise.all([
        getAnimals(householdId),
        getFeedingLogs(householdId),
        getSheddingLogs(householdId),
        getWeightLogs(householdId),
        getAllExpensesComplete(householdId),
        getHealthEvents(householdId),
        getAcquisitionRecords(householdId),
        getExitRecords(householdId),
        getBreedingRecords(householdId),
        getIncubations(householdId),
        getMedicationSchedules(householdId),
        getMedicationLogs(householdId),
        getFeederItems(householdId),
        getAllFeederStockEvents(householdId),
        getVetContacts(householdId),
        getEnclosures(householdId),
      ])

      // Most tables carry animal_id rather than a name; resolve from the
      // animals we already have rather than asking the database to join.
      const nameById = new Map((animals ?? []).map((a) => [a.id as string, a.name as string]))
      const animalName = (row: Record<string, unknown>) =>
        nameById.get(row.animal_id as string) ?? (row.animal_id as string) ?? ''
      const money = (cents: unknown) =>
        typeof cents === 'number' ? (cents / 100).toFixed(2) : ''

      const wb = utils.book_new()
      const sheet = (rows: Record<string, unknown>[], name: string) => {
        // A sheet with no rows loses its headers, so skip rather than ship a blank.
        if (rows.length === 0) return
        utils.book_append_sheet(wb, utils.json_to_sheet(rows), name)
      }

      // The Animals sheet's weight column read animals.weight_grams, which
      // nothing in the app writes — so it exported a blank cell for every
      // animal not imported with one, while the Weight log sheet below carried
      // the real figures. Same source as the app now: the latest weigh-in,
      // with the column kept as a fallback for an imported animal that has no
      // logs yet.
      const latestWeight = latestWeightByAnimal(
        (animals ?? []) as { id: string; weight_grams?: number | null }[],
        weightLogs as { animal_id: string; logged_at: string; weight_grams: number }[]
      )

      sheet((animals ?? []).map((a) => ({
        Name: a.name, Species: a.species, Morph: a.morph ?? '', Sex: a.sex ?? '',
        DOB: a.date_of_birth ?? '', 'Weight (g)': latestWeight.get(a.id as string) ?? '', Notes: a.notes ?? '',
        'Feeding frequency (days)': a.feeding_frequency_days ?? '', 'Last fed': a.last_fed_at ?? '',
        Active: a.is_active ? 'Yes' : 'No',
      })), 'Animals')

      sheet(feedingLogs.map((l) => ({
        Animal: (l.animals as { name: string } | null)?.name ?? animalName(l),
        Date: l.fed_at, 'Prey type': l.prey_type, Size: l.prey_size ?? '',
        Quantity: l.quantity, Refused: l.refused ? 'Yes' : 'No', Notes: l.notes ?? '',
      })), 'Feeding log')

      sheet(sheddingLogs.map((l) => ({
        Animal: (l.animals as { name: string } | null)?.name ?? animalName(l),
        Date: l.shed_at, Complete: l.complete ? 'Yes' : 'No', Notes: l.notes ?? '',
      })), 'Shedding log')

      sheet(weightLogs.map((l) => ({
        Animal: animalName(l), Date: l.logged_at,
        'Weight (g)': l.weight_grams, Notes: l.notes ?? '',
      })), 'Weight log')

      sheet((healthEvents ?? []).map((e) => ({
        Animal: animalName(e), Date: e.event_date, Type: e.event_type,
        Title: e.title, 'Cost (AUD)': money(e.cost_cents), Notes: e.notes ?? '',
      })), 'Health')

      sheet((acquisitions ?? []).map((r) => ({
        Animal: animalName(r), Date: r.acquired_at, Source: r.source ?? '',
        From: r.source_name ?? '', 'Price (AUD)': money(r.price_cents), Notes: r.notes ?? '',
      })), 'Acquisition')

      sheet((exits ?? []).map((r) => ({
        Animal: animalName(r), Date: r.exited_at, Reason: r.reason,
        'Price (AUD)': money(r.price_cents), Notes: r.notes ?? '',
      })), 'Exit')

      sheet((breeding ?? []).map((r) => ({
        Animal: animalName(r), 'Pairing date': r.pairing_date,
        'Paired with': r.paired_with_name ?? '', Outcome: r.outcome ?? '',
        'Clutch size': r.clutch_size ?? '', 'Eggs fertile': r.eggs_fertile ?? '',
        'Hatch date': r.hatch_date ?? '', Notes: r.notes ?? '',
      })), 'Breeding')

      // Incubations export beside breeding because this file's whole point is
      // that the backup holds everything the app tracks. A table with a screen
      // and no sheet is the gap the header comment above describes.
      sheet((incubations ?? []).map((r) => ({
        Animal: animalName(r), Start: r.start_date,
        'Expected hatch': r.expected_hatch_date ?? '',
        'Actual hatch': r.actual_hatch_date ?? '',
        'Clutch size': r.clutch_size ?? '', 'Eggs fertile': r.eggs_fertile ?? '',
        Hatchlings: r.hatchlings ?? '',
        'Temp (C)': r.temperature_c ?? '', 'Humidity (%)': r.humidity_percent ?? '',
        Medium: r.incubation_medium ?? '', Outcome: r.outcome ?? '',
        Notes: r.notes ?? '',
      })), 'Incubation')

      sheet((medSchedules ?? []).map((m) => ({
        Animal: animalName(m), Medication: m.name, Dosage: m.dosage ?? '',
        'Every (days)': m.frequency_days ?? '', Start: m.start_date ?? '',
        End: m.end_date ?? '', Notes: m.notes ?? '',
      })), 'Medication schedules')

      sheet(medLogs.map((l) => ({
        Animal: animalName(l), Given: l.given_at, Notes: l.notes ?? '',
      })), 'Medication log')

      sheet(expenses.map((e) => ({
        Date: e.expense_date, Category: e.category,
        'Amount (AUD)': money(e.amount_cents),
        Description: e.description,
        Animal: e.animal_id ? animalName(e) : '',
      })), 'Expenses')

      sheet((feederItems ?? []).map((f) => ({
        Name: f.name, Type: f.feeder_type, Unit: f.unit_label,
        'Low stock threshold': f.low_stock_threshold,
      })), 'Feeder inventory')

      sheet(stockEvents.map((e) => ({
        Date: e.created_at, Event: e.event_type, Change: e.quantity_delta,
        'Unit cost (AUD)': money(e.unit_cost), Notes: e.notes ?? '',
      })), 'Feeder stock events')

      sheet((vets ?? []).map((v) => ({
        Name: v.name, Clinic: v.practice_name ?? '', Phone: v.phone ?? '',
        Email: v.email ?? '', Address: v.address ?? '', Notes: v.notes ?? '',
      })), 'Vet contacts')

      sheet((enclosures ?? []).map((e) => ({
        Name: e.name, Notes: e.notes ?? '',
      })), 'Enclosures')

      writeFile(wb, `vivarium-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
      showToast('Export downloaded', 'success')
    } catch (e) {
      // Say what went wrong: a silent "Export failed" on someone's only copy of
      // their records is not a useful thing to be told.
      showToast(e instanceof Error ? `Export failed — ${e.message}` : 'Export failed', 'error')
    } finally {
      setExporting(false)
    }
  }

  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  function requestConfirm(title: string, message: string, onConfirm: () => void) {
    setConfirmDialog({ title, message, onConfirm })
  }

  async function handleSaveName() {
    if (!user) return
    setSavingName(true)
    try {
      await updateProfile(user.id, { full_name: displayName })
      await refreshProfile()
      showToast('Name updated', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error', 'error')
    } finally {
      setSavingName(false)
    }
  }

  async function handleCopyCode() {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleApprove(memberId: string) {
    try {
      await approveHouseholdRequest(memberId)
      refreshHousehold()
      showToast('Member approved', 'success')
    } catch {
      showToast('Failed to approve', 'error')
    }
  }

  async function handleDeny(memberId: string) {
    try {
      await denyHouseholdRequest(memberId)
      refreshHousehold()
    } catch {
      showToast('Failed to deny', 'error')
    }
  }

  function handleRemoveMember(memberId: string, name: string) {
    requestConfirm(`Remove ${name}`, `${name} will lose access to this collection.`, async () => {
      setConfirmDialog(null)
      try {
        await removeMember(memberId)
        refreshHousehold()
        showToast('Member removed', 'success')
      } catch {
        showToast('Failed to remove member', 'error')
      }
    })
  }

  async function handleToggleRole(memberId: string, currentRole: string) {
    const newRole = currentRole === 'owner' ? 'member' : 'owner'
    try {
      await setMemberRole(memberId, newRole)
      refreshHousehold()
      showToast(`Role updated to ${newRole}`, 'success')
    } catch {
      showToast('Failed to update role', 'error')
    }
  }

  function handleLeave() {
    if (!householdId || !user) return
    requestConfirm('Leave collection', 'You will lose access to all shared data. This cannot be undone.', async () => {
      setConfirmDialog(null)
      try {
        await leaveHousehold(householdId, user.id)
        refreshHousehold()
        showToast('Left collection', 'info')
      } catch (e) {
        showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error', 'error')
      }
    })
  }

  async function handleScan() {
    if (!householdId) return
    setScanning(true)
    setScanResult(null)
    try {
      const [orphans, dups] = await Promise.all([
        detectOrphanedFeedingLogs(householdId),
        detectDuplicateRecords(householdId),
      ])
      setScanResult({ orphanedCount: orphans.orphanedCount, onArchivedCount: orphans.onArchivedCount, dupGroups: dups.groupCount, dupExtra: dups.extraCount })
    } catch {
      showToast('Scan failed', 'error')
    } finally {
      setScanning(false)
    }
  }

  async function handleRecalculateLastFed() {
    if (!householdId) return
    setRecalculating(true)
    try {
      await recalculateLastFedAt(householdId)
      showToast('Feeding dates recalculated', 'success')
    } catch {
      showToast('Recalculation failed', 'error')
    } finally {
      setRecalculating(false)
    }
  }

  async function handleRemoveDups() {
    if (!householdId) return
    setRemovingDups(true)
    try {
      const { removed } = await removeDuplicateRecords(householdId)
      setScanResult((r) => r ? { ...r, dupGroups: 0, dupExtra: 0 } : null)
      showToast(`Removed ${removed} duplicate record${removed !== 1 ? 's' : ''}`, 'success')
    } catch {
      showToast('Failed to remove duplicates', 'error')
    } finally {
      setRemovingDups(false)
    }
  }

  async function handleEnableNotifications() {
    // Requested from this click and nowhere else. Asking on page load is what
    // browsers suppress, and it is why this never reliably worked before.
    setNotifyPermission(await requestNotificationPermission())
  }

  async function handleSignOut() {
    // Navigate either way: the point of signing out is to leave, and the local
    // session and caches are cleared whether or not the request reached the
    // server.
    const { error } = await signOutAndClearCaches()
    if (error) showToast(`Signed out on this device, but the server was not reached — ${error}`, 'error')
    navigate('/auth/signin')
  }

  return (
    <div className="flex-1 px-4 lg:px-8 pt-2 md:pt-6 pb-nav md:pb-8 max-w-2xl mx-auto w-full">
      <Header title="Settings" />

      <SegmentedControl
        label="Show"
        className="mb-6 sm:max-w-xs"
        value={activeTab}
        onChange={setActiveTab}
        options={[{ value: 'settings', label: 'Settings' }, { value: 'import', label: 'Import & Export' }]}
      />

      {activeTab === 'import' && <Import embedded />}

      {activeTab === 'settings' && <div className="flex flex-col gap-7">

      {/* Profile */}
      <ListSection
        header="Profile"
        action={<button type="button" onClick={handleSaveName} disabled={savingName} className="tap-target text-[15px] font-semibold text-tint active:opacity-60 disabled:opacity-40">{savingName ? 'Saving…' : 'Save'}</button>}
        footer={user?.email}
      >
        <label className="list-row flex items-center gap-3 px-4 min-h-11">
          <span className="text-[17px] text-label shrink-0">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="flex-1 min-w-0 h-11 bg-transparent text-right text-[17px] text-label-2 placeholder:text-label-3 outline-none focus:text-label"
          />
        </label>
      </ListSection>

      {/* Household */}
      {householdId ? (
        <>
          <ListSection header="Collection" footer={inviteCode ? 'Share this code so your partner can join' : undefined}>
            <ListRow>
              <p className="text-[17px] text-label break-words">{householdName}</p>
              <p className="text-[13px] text-label-2">Your role: {currentUserRole === 'owner' ? 'Owner' : 'Member'}</p>
            </ListRow>
            {/* Invite code */}
            {inviteCode && (
              <ListRow
                trailing={
                  <button type="button" onClick={handleCopyCode} className="tap-target inline-flex items-center gap-1 text-[17px] text-tint active:opacity-60">
                    {copied && <Icon name="check" size={16} strokeWidth={2.6} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                }
              >
                <p className="text-[13px] text-label-2">Invite code</p>
                <code className="text-[20px] font-mono font-semibold tracking-[0.2em] text-tint">{inviteCode}</code>
              </ListRow>
            )}
          </ListSection>

          {/* Pending requests */}
          {currentUserRole === 'owner' && pendingRequests.length > 0 && (
            <ListSection header="Pending requests">
              {pendingRequests.map((req) => {
                const p = req.profiles as { full_name: string | null } | null
                return (
                  <div key={req.id} className="list-row flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                    <p className="flex-1 min-w-[8rem] text-[17px] text-label break-words">{p?.full_name ?? 'Unknown'}</p>
                    <div className="flex gap-2 shrink-0 ml-auto">
                      <Button size="sm" onClick={() => handleApprove(req.id)}>Approve</Button>
                      <Button size="sm" variant="secondary" onClick={() => handleDeny(req.id)}>Deny</Button>
                    </div>
                  </div>
                )
              })}
            </ListSection>
          )}

          {/* Members */}
          <ListSection header="Members">
            {members.filter((m) => m.status === 'active').map((m) => {
              const p = m.profiles as { full_name: string | null } | null
              const isSelf = m.user_id === user?.id
              const name = p?.full_name ?? 'Unknown'
              return (
                // Wraps rather than squeezing: a long name used to crush the two
                // role buttons, which were 24px tall and side by side.
                <div key={m.id} className="list-row flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 min-h-11">
                  <p className="flex-1 min-w-[8rem] text-[17px] text-label break-words">{name}{isSelf ? ' (you)' : ''}</p>
                  {currentUserRole === 'owner' && !isSelf ? (
                    <div className="flex items-center gap-4 shrink-0 ml-auto">
                      <button type="button" onClick={() => handleToggleRole(m.id, m.role)} className="tap-target text-[17px] text-tint active:opacity-60">
                        {m.role === 'owner' ? 'Demote' : 'Make owner'}
                      </button>
                      <button type="button" onClick={() => handleRemoveMember(m.id, name)} className="tap-target text-[17px] text-red active:opacity-60">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <span className="text-[17px] text-label-2 capitalize">{m.role}</span>
                  )}
                </div>
              )
            })}
          </ListSection>

          {currentUserRole === 'member' && (
            <ListSection>
              <ActionRow label="Leave collection" onClick={handleLeave} destructive />
            </ListSection>
          )}
        </>
      ) : (
        <ListSection header="Collection">
          <p className="px-4 pt-3 text-[15px] text-label-2">You're not part of a collection yet.</p>
          <div className="px-4 pt-2 pb-3"><Button size="sm" onClick={() => navigate('/onboarding')}>Set up collection</Button></div>
        </ListSection>
      )}

      {/* Data */}
      <ListSection header="Data">
        <ActionRow label="Export collection" onClick={handleExport} loading={exporting} />
      </ListSection>

      <ListSection
        header="Data repair"
        footer="Detects feeding records pointing at an animal that no longer exists, and duplicate entries (same animal, same day, same type). Archived animals keep their history and are not a problem."
      >
        {scanResult && (
          <>
            {/* Orphaned links */}
            <div className="list-row list-row-leading flex items-start gap-3 px-4 py-2.5">
              <IconTile name={scanResult.orphanedCount > 0 ? 'alert' : 'check'} color={scanResult.orphanedCount > 0 ? 'var(--color-orange)' : 'var(--color-green)'} />
              <div className="flex-1 min-w-0">
                <p className="text-[17px] text-label">Broken links</p>
                {scanResult.orphanedCount > 0 ? (
                  <p className="text-[15px] text-orange">
                    {scanResult.orphanedCount} feeding record{scanResult.orphanedCount !== 1 ? 's point' : ' points'} at an animal that no longer exists. They can't be re-linked automatically — the name went with the animal.
                  </p>
                ) : (
                  <p className="text-[15px] text-green">All clear</p>
                )}
                {scanResult.onArchivedCount > 0 && (
                  <p className="text-[13px] mt-1 text-label-2">
                    {scanResult.onArchivedCount} record{scanResult.onArchivedCount !== 1 ? 's belong' : ' belongs'} to archived animals. That's normal — their history stays with them.
                  </p>
                )}
              </div>
            </div>
            {/* Duplicates */}
            <div className="list-row list-row-leading flex items-center gap-3 px-4 py-2.5">
              <IconTile name={scanResult.dupExtra > 0 ? 'alert' : 'check'} color={scanResult.dupExtra > 0 ? 'var(--color-red)' : 'var(--color-green)'} />
              <div className="flex-1 min-w-0">
                <p className="text-[17px] text-label">Duplicates</p>
                {scanResult.dupExtra > 0 ? (
                  <p className="text-[15px] text-red">{scanResult.dupExtra} extra record{scanResult.dupExtra !== 1 ? 's' : ''} across {scanResult.dupGroups} group{scanResult.dupGroups !== 1 ? 's' : ''}</p>
                ) : (
                  <p className="text-[15px] text-green">No duplicates found</p>
                )}
              </div>
              {scanResult.dupExtra > 0 && <Button size="sm" variant="danger" onClick={handleRemoveDups} loading={removingDups}>Remove</Button>}
            </div>
          </>
        )}
        <ActionRow label="Scan for issues" onClick={handleScan} loading={scanning} />
        <ActionRow label="Fix feeding dates" onClick={handleRecalculateLastFed} loading={recalculating} />
      </ListSection>

      <ListSection header="Notifications" footer="A reminder when animals are overdue a feed, shown while the app is open.">
        {notifyPermission === 'unsupported' && (
          <p className="px-4 py-3 text-[15px] text-label-2">This browser doesn't support notifications.</p>
        )}
        {notifyPermission === 'granted' && (
          <ListRow leading={<IconTile name="bell" color="var(--color-green)" />}>
            <p className="text-[17px] text-label">Notifications are on.</p>
          </ListRow>
        )}
        {notifyPermission === 'denied' && (
          <p className="px-4 py-3 text-[15px] text-label-2">
            Blocked for this site. Your browser's site settings are the only place that can undo it.
          </p>
        )}
        {notifyPermission === 'default' && (
          <ActionRow label="Turn on notifications" onClick={handleEnableNotifications} />
        )}
      </ListSection>

      <ListSection header="Legal">
        <ListRow to="/terms"><span className="text-[17px] text-label">Terms of Service</span></ListRow>
        <ListRow to="/privacy"><span className="text-[17px] text-label">Privacy Policy</span></ListRow>
      </ListSection>

      {/* Vet Contacts */}
      <ListSection header="Vet Contacts">
        {vetContacts.length === 0 ? (
          <p className="list-row px-4 py-3 text-[15px] text-label-2">No vet contacts saved yet.</p>
        ) : (
          vetContacts.map((vet) => (
            <div key={vet.id} className="list-row flex items-start gap-2 pl-4 pr-2 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-[17px] text-label">{vet.name}</p>
                {vet.practice_name && <p className="text-[15px] text-label-2">{vet.practice_name}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                  {vet.phone && <a href={`tel:${vet.phone}`} className="text-[15px] text-tint">{vet.phone}</a>}
                  {vet.email && <a href={`mailto:${vet.email}`} className="text-[15px] text-tint break-all">{vet.email}</a>}
                </div>
                {vet.address && <p className="text-[13px] mt-0.5 truncate text-label-2">{vet.address}</p>}
              </div>
              <RecordActions what="vet contact" onEdit={() => openEditVet(vet)} onDelete={() => handleDeleteVet(vet)} />
            </div>
          ))
        )}
        <ActionRow label="+ Add contact" onClick={openAddVet} />
      </ListSection>

      {/* Sign out */}
      <ListSection>
        <ActionRow label="Sign out" onClick={handleSignOut} destructive center />
      </ListSection>

      </div>}

      {/* Vet contact form modal */}
      <Modal open={vetFormOpen} onClose={() => setVetFormOpen(false)} title={editingVet ? 'Edit vet contact' : 'Add vet contact'}>
        <div className="flex flex-col gap-4">
          <Input label="Name *" value={vetName} onChange={(e) => setVetName(e.target.value)} placeholder="Dr. Jane Smith" />
          <Input label="Clinic / Practice" value={vetClinic} onChange={(e) => setVetClinic(e.target.value)} placeholder="City Exotic Vet" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" type="tel" value={vetPhone} onChange={(e) => setVetPhone(e.target.value)} placeholder="+61 2 1234 5678" />
            <Input label="Email" type="email" value={vetEmail} onChange={(e) => setVetEmail(e.target.value)} placeholder="vet@clinic.com" />
          </div>
          <Input label="Address" value={vetAddress} onChange={(e) => setVetAddress(e.target.value)} placeholder="123 Main St, Sydney NSW" />
          <Textarea label="Notes" value={vetNotes} onChange={(e) => setVetNotes(e.target.value)} rows={2} placeholder="Specialisations, hours, etc." />
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setVetFormOpen(false)}>Cancel</Button>
            <Button fullWidth onClick={handleSaveVet} loading={savingVet} disabled={!vetName.trim()}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        title={confirmDialog?.title ?? 'Are you sure?'}
        message={confirmDialog?.message ?? ''}
        onConfirm={() => confirmDialog?.onConfirm()}
      />
    </div>
  )
}

/** A button row in a grouped list, as in Settings: tint text, or red for a destructive action. */
function ActionRow({ label, onClick, loading = false, destructive = false, center = false }: {
  label: string
  onClick: () => void
  loading?: boolean
  destructive?: boolean
  center?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading || undefined}
      className={`list-row relative flex items-center gap-3 w-full px-4 min-h-11 text-[17px] active:bg-fill disabled:opacity-60 transition-colors ${center ? 'justify-center' : 'justify-between text-left'} ${destructive ? 'text-red' : 'text-tint'}`}
    >
      {label}
      {loading && <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />}
    </button>
  )
}
