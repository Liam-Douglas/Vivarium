import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Import } from '@/pages/Import'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import { approveHouseholdRequest, denyHouseholdRequest, leaveHousehold, updateProfile, removeMember, setMemberRole, getAnimals, getFeedingLogs, getSheddingLogs, getAllExpenses, detectOrphanedFeedingLogs, repairOrphanedFeedingLogs, detectDuplicateRecords, removeDuplicateRecords, createVetContact, updateVetContact, deleteVetContact, recalculateLastFedAt } from '@/lib/queries'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { useVetContacts } from '@/hooks/useVetContacts'
import type { VetContact } from '@/hooks/useVetContacts'

export function Settings() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'settings' | 'import'>('settings')
  const { user, profile, refreshProfile } = useAuth()
  const { householdId, householdName, inviteCode, members, currentUserRole, pendingRequests, refresh: refreshHousehold } = useHousehold()
  const { showToast } = useToast()

  const [displayName, setDisplayName] = useState(profile?.full_name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<{ orphanedCount: number; fixableCount: number; dupGroups: number; dupExtra: number } | null>(null)
  const [repairing, setRepairing] = useState(false)
  const [removingDups, setRemovingDups] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

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
    setEditingVet(vet); setVetName(vet.name); setVetClinic(vet.clinic_name ?? ''); setVetPhone(vet.phone ?? ''); setVetEmail(vet.email ?? ''); setVetAddress(vet.address ?? ''); setVetNotes(vet.notes ?? '')
    setVetFormOpen(true)
  }
  async function handleSaveVet() {
    if (!user || !householdId || !vetName.trim()) return
    setSavingVet(true)
    try {
      const payload = { name: vetName.trim(), clinic_name: vetClinic || null, phone: vetPhone || null, email: vetEmail || null, address: vetAddress || null, notes: vetNotes || null }
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
      const [animals, feedingLogs, sheddingLogs, expenses] = await Promise.all([
        getAnimals(householdId),
        getFeedingLogs(householdId),
        getSheddingLogs(householdId),
        getAllExpenses(householdId),
      ])
      const wb = utils.book_new()
      utils.book_append_sheet(wb, utils.json_to_sheet(animals.map((a) => ({
        Name: a.name, Species: a.species, Morph: a.morph ?? '', Sex: a.sex ?? '',
        DOB: a.date_of_birth ?? '', 'Weight (g)': a.weight_grams ?? '', Notes: a.notes ?? '',
        'Feeding frequency (days)': a.feeding_frequency_days ?? '', 'Last fed': a.last_fed_at ?? '',
      }))), 'Animals')
      utils.book_append_sheet(wb, utils.json_to_sheet(feedingLogs.map((l) => ({
        Animal: (l.animals as { name: string } | null)?.name ?? l.animal_id,
        Date: l.fed_at, 'Prey type': l.prey_type, Size: l.prey_size ?? '',
        Quantity: l.quantity, Refused: l.refused ? 'Yes' : 'No', Notes: l.notes ?? '',
      }))), 'Feeding log')
      utils.book_append_sheet(wb, utils.json_to_sheet(sheddingLogs.map((l) => ({
        Animal: (l.animals as { name: string } | null)?.name ?? l.animal_id,
        Date: l.shed_at, Complete: l.complete ? 'Yes' : 'No', Notes: l.notes ?? '',
      }))), 'Shedding log')
      utils.book_append_sheet(wb, utils.json_to_sheet(expenses.map((e) => ({
        Date: e.expense_date, Category: e.category,
        'Amount (AUD)': (e.amount_cents / 100).toFixed(2),
        Description: e.description, 'Animal ID': e.animal_id ?? '',
      }))), 'Expenses')
      writeFile(wb, `vivarium-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
      showToast('Export downloaded', 'success')
    } catch {
      showToast('Export failed', 'error')
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
      setScanResult({ orphanedCount: orphans.orphanedCount, fixableCount: orphans.fixableCount, dupGroups: dups.groupCount, dupExtra: dups.extraCount })
    } catch {
      showToast('Scan failed', 'error')
    } finally {
      setScanning(false)
    }
  }

  async function handleRepair() {
    if (!householdId) return
    setRepairing(true)
    try {
      const { fixed } = await repairOrphanedFeedingLogs(householdId)
      setScanResult((r) => r ? { ...r, fixableCount: 0, orphanedCount: r.orphanedCount - fixed } : null)
      showToast(`Fixed ${fixed} feeding record${fixed !== 1 ? 's' : ''}`, 'success')
    } catch {
      showToast('Repair failed', 'error')
    } finally {
      setRepairing(false)
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

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/auth/signin')
  }

  return (
    <div className="flex-1 px-4 py-6 pb-24 md:pb-8 max-w-2xl mx-auto w-full">
      <Header title="Settings" />

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
        {(['settings', 'import'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === tab ? 'rgba(143,190,90,0.15)' : 'transparent',
              color: activeTab === tab ? '#8fbe5a' : '#6a6458',
              border: activeTab === tab ? '1px solid rgba(143,190,90,0.25)' : '1px solid transparent',
            }}
          >
            {tab === 'settings' ? 'Settings' : 'Import & Export'}
          </button>
        ))}
      </div>

      {activeTab === 'import' && <Import embedded />}

      {activeTab === 'settings' && <>

      {/* Profile */}
      <Section title="Profile">
        <div className="flex flex-col gap-4">
          <Input
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSaveName} loading={savingName}>Save</Button>
          </div>
          <p className="text-xs" style={{ color: '#6a6458' }}>{user?.email}</p>
        </div>
      </Section>

      {/* Household */}
      <Section title="Collection">
        {householdId ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-medium mb-0.5" style={{ color: '#f0ece0' }}>{householdName}</p>
              <p className="text-xs" style={{ color: '#6a6458' }}>
                Your role: {currentUserRole === 'owner' ? 'Owner' : 'Member'}
              </p>
            </div>

            {/* Invite code */}
            {inviteCode && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: '#a8a090' }}>INVITE CODE</p>
                <div className="flex items-center gap-2">
                  <code
                    className="flex-1 px-4 py-2 rounded-xl text-sm font-mono tracking-widest"
                    style={{ backgroundColor: '#1a1a18', border: '1px solid rgba(255,255,255,0.08)', color: '#8fbe5a' }}
                  >
                    {inviteCode}
                  </code>
                  <Button size="sm" variant="secondary" onClick={handleCopyCode}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </Button>
                </div>
                <p className="text-xs mt-1.5" style={{ color: '#6a6458' }}>Share this code so your partner can join</p>
              </div>
            )}

            {/* Pending requests */}
            {currentUserRole === 'owner' && pendingRequests.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: '#a8a090' }}>PENDING REQUESTS</p>
                {pendingRequests.map((req) => {
                  const p = req.profiles as { full_name: string | null } | null
                  return (
                    <div key={req.id} className="flex items-center justify-between gap-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <p className="text-sm" style={{ color: '#f0ece0' }}>{p?.full_name ?? 'Unknown'}</p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(req.id)}>Approve</Button>
                        <Button size="sm" variant="secondary" onClick={() => handleDeny(req.id)}>Deny</Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Members */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: '#a8a090' }}>MEMBERS</p>
              {members.filter((m) => m.status === 'active').map((m) => {
                const p = m.profiles as { full_name: string | null } | null
                const isSelf = m.user_id === user?.id
                const name = p?.full_name ?? 'Unknown'
                return (
                  <div key={m.id} className="flex items-center justify-between gap-2 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: '#f0ece0' }}>{name}{isSelf ? ' (you)' : ''}</p>
                    </div>
                    {currentUserRole === 'owner' && !isSelf ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleRole(m.id, m.role)}
                          className="text-xs px-2 py-1 rounded-lg transition-colors"
                          style={{ backgroundColor: 'rgba(143,190,90,0.12)', color: '#8fbe5a', border: '1px solid rgba(143,190,90,0.2)' }}
                        >
                          {m.role === 'owner' ? 'Demote' : 'Make owner'}
                        </button>
                        <button
                          onClick={() => handleRemoveMember(m.id, name)}
                          className="text-xs px-2 py-1 rounded-lg transition-colors"
                          style={{ backgroundColor: 'rgba(196,90,90,0.12)', color: '#c45a5a', border: '1px solid rgba(196,90,90,0.2)' }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <Badge status="muted">{m.role}</Badge>
                    )}
                  </div>
                )
              })}
            </div>

            {currentUserRole === 'member' && (
              <Button variant="danger" size="sm" onClick={handleLeave}>Leave collection</Button>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm mb-3" style={{ color: '#a8a090' }}>You're not part of a collection yet.</p>
            <Button size="sm" onClick={() => navigate('/onboarding')}>Set up collection</Button>
          </div>
        )}
      </Section>

      {/* Data */}
      <Section title="Data">
        <div className="flex flex-col gap-3">
          <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting}>Export collection</Button>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#a8a090' }}>DATA REPAIR</p>
            <p className="text-xs mb-3" style={{ color: '#6a6458' }}>
              Detects broken animal links (records missing from profiles) and duplicate entries (same animal, same day, same type).
            </p>
            {scanResult && (
              <div className="flex flex-col gap-2 mb-3">
                {/* Orphaned links */}
                <div className="rounded-xl p-3" style={{ backgroundColor: scanResult.fixableCount > 0 ? 'rgba(212,146,74,0.08)' : 'rgba(90,158,106,0.08)', border: `1px solid ${scanResult.fixableCount > 0 ? 'rgba(212,146,74,0.2)' : 'rgba(90,158,106,0.2)'}` }}>
                  <p className="text-xs font-medium mb-0.5" style={{ color: '#a8a090' }}>BROKEN LINKS</p>
                  {scanResult.fixableCount > 0 ? (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm" style={{ color: '#d4924a' }}>{scanResult.fixableCount} record{scanResult.fixableCount !== 1 ? 's' : ''} can be re-linked</p>
                      <Button size="sm" onClick={handleRepair} loading={repairing}>Fix</Button>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: '#5a9e6a' }}>{scanResult.orphanedCount === 0 ? 'All clear' : `${scanResult.orphanedCount} orphaned (names don't match any active animal)`}</p>
                  )}
                </div>
                {/* Duplicates */}
                <div className="rounded-xl p-3" style={{ backgroundColor: scanResult.dupExtra > 0 ? 'rgba(196,90,90,0.08)' : 'rgba(90,158,106,0.08)', border: `1px solid ${scanResult.dupExtra > 0 ? 'rgba(196,90,90,0.2)' : 'rgba(90,158,106,0.2)'}` }}>
                  <p className="text-xs font-medium mb-0.5" style={{ color: '#a8a090' }}>DUPLICATES</p>
                  {scanResult.dupExtra > 0 ? (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm" style={{ color: '#c45a5a' }}>{scanResult.dupExtra} extra record{scanResult.dupExtra !== 1 ? 's' : ''} across {scanResult.dupGroups} group{scanResult.dupGroups !== 1 ? 's' : ''}</p>
                      <Button size="sm" onClick={handleRemoveDups} loading={removingDups}>Remove</Button>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: '#5a9e6a' }}>No duplicates found</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" size="sm" onClick={handleScan} loading={scanning}>Scan for issues</Button>
              <Button variant="secondary" size="sm" onClick={handleRecalculateLastFed} loading={recalculating}>Fix feeding dates</Button>
            </div>
          </div>
        </div>
      </Section>

      {/* Legal */}
      <Section title="Legal">
        <div className="flex flex-col gap-2">
          <Link to="/terms" className="text-sm" style={{ color: '#a8a090' }}>Terms of Service</Link>
          <Link to="/privacy" className="text-sm" style={{ color: '#a8a090' }}>Privacy Policy</Link>
        </div>
      </Section>

      {/* Vet Contacts */}
      <Section title="Vet Contacts">
        <div className="flex flex-col gap-3">
          {vetContacts.length === 0 ? (
            <p className="text-sm" style={{ color: '#6a6458' }}>No vet contacts saved yet.</p>
          ) : (
            vetContacts.map((vet) => (
              <div key={vet.id} className="flex items-start gap-3 py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#f0ece0' }}>{vet.name}</p>
                  {vet.clinic_name && <p className="text-xs mt-0.5" style={{ color: '#a8a090' }}>{vet.clinic_name}</p>}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {vet.phone && (
                      <a href={`tel:${vet.phone}`} className="text-xs" style={{ color: '#8fbe5a' }}>{vet.phone}</a>
                    )}
                    {vet.email && (
                      <a href={`mailto:${vet.email}`} className="text-xs" style={{ color: '#8fbe5a' }}>{vet.email}</a>
                    )}
                  </div>
                  {vet.address && <p className="text-xs mt-0.5 truncate" style={{ color: '#6a6458' }}>{vet.address}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEditVet(vet)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(143,190,90,0.1)', color: '#8fbe5a' }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => handleDeleteVet(vet)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(196,90,90,0.1)', color: '#c45a5a' }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))
          )}
          <Button variant="secondary" size="sm" onClick={openAddVet}>+ Add contact</Button>
        </div>
      </Section>

      {/* Sign out */}
      <div className="mt-6">
        <Button variant="ghost" onClick={handleSignOut} fullWidth>Sign out</Button>
      </div>

      </>}

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold tracking-wider mb-3" style={{ color: '#6a6458' }}>{title.toUpperCase()}</p>
      <div className="rounded-xl p-4" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
        {children}
      </div>
    </div>
  )
}
