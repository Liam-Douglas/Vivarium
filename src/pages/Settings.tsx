import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Import } from '@/pages/Import'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import { approveHouseholdRequest, denyHouseholdRequest, leaveHousehold, updateProfile, removeMember, setMemberRole, getAnimals, getFeedingLogs, getSheddingLogs, getAllExpenses, detectOrphanedFeedingLogs, repairOrphanedFeedingLogs } from '@/lib/queries'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Link } from 'react-router-dom'

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
  const [scanResult, setScanResult] = useState<{ orphanedCount: number; fixableCount: number } | null>(null)
  const [repairing, setRepairing] = useState(false)

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
      const result = await detectOrphanedFeedingLogs(householdId)
      setScanResult({ orphanedCount: result.orphanedCount, fixableCount: result.fixableCount })
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
      setScanResult(null)
      showToast(`Fixed ${fixed} feeding record${fixed !== 1 ? 's' : ''}`, 'success')
    } catch {
      showToast('Repair failed', 'error')
    } finally {
      setRepairing(false)
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
              If feeding records appear in the global log but not on an animal's profile, run a scan to detect and fix broken links.
            </p>
            {scanResult ? (
              <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: scanResult.fixableCount > 0 ? 'rgba(212,146,74,0.08)' : 'rgba(90,158,106,0.08)', border: `1px solid ${scanResult.fixableCount > 0 ? 'rgba(212,146,74,0.2)' : 'rgba(90,158,106,0.2)'}` }}>
                {scanResult.fixableCount > 0 ? (
                  <p className="text-sm" style={{ color: '#d4924a' }}>
                    Found {scanResult.fixableCount} fixable record{scanResult.fixableCount !== 1 ? 's' : ''} ({scanResult.orphanedCount} total orphaned)
                  </p>
                ) : (
                  <p className="text-sm" style={{ color: '#5a9e6a' }}>
                    {scanResult.orphanedCount === 0 ? 'No issues found — all records are linked correctly.' : `${scanResult.orphanedCount} orphaned records found but none can be auto-repaired (animal names don't match).`}
                  </p>
                )}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleScan} loading={scanning}>Scan for issues</Button>
              {scanResult && scanResult.fixableCount > 0 && (
                <Button size="sm" onClick={handleRepair} loading={repairing}>Fix {scanResult.fixableCount} record{scanResult.fixableCount !== 1 ? 's' : ''}</Button>
              )}
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

      {/* Sign out */}
      <div className="mt-6">
        <Button variant="ghost" onClick={handleSignOut} fullWidth>Sign out</Button>
      </div>

      </>}

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
