import { Icon, IconTile } from '@/components/ui/icons'
import { Chevron } from '@/components/ui/List'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { createHousehold, joinHouseholdByCode } from '@/lib/queries'
import { signOutAndClearCaches } from '@/lib/session'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useHousehold } from '@/context/HouseholdContext'
import { BrandMark } from '@/components/ui/BrandMark'

export function OnboardingHousehold() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { householdId, membershipStatus, refresh } = useHousehold()
  const { showToast } = useToast()
  const [mode, setMode] = useState<'choice' | 'create' | 'join'>('choice')

  // Approval lands here: the household context picks the change up over
  // realtime, householdId becomes set, and the app opens on its own.
  useEffect(() => {
    if (householdId) navigate('/', { replace: true })
  }, [householdId, navigate])

  const [collectionName, setCollectionName] = useState('Our Collection')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Held locally as well as in the context so the waiting screen still shows
  // immediately after requesting, even if the membership row is not yet
  // readable back.
  const [justRequested, setJustRequested] = useState(false)
  const awaitingApproval = membershipStatus === 'pending' || justRequested
  const wasRejected = membershipStatus === 'rejected' && !justRequested

  async function handleCreate() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      await createHousehold(user.id, collectionName)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to create collection')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      await joinHouseholdByCode(inviteCode, user.id)
      setJustRequested(true)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Invalid invite code')
    } finally {
      setLoading(false)
    }
  }

  // Realtime can be missed, so the waiting screen can always ask directly.
  async function handleCheckAgain() {
    setChecking(true)
    try {
      await refresh()
      showToast('Still waiting on the owner to approve', 'info')
    } finally {
      setChecking(false)
    }
  }

  async function handleSignOut() {
    const { error } = await signOutAndClearCaches()
    if (error) showToast(`Signed out on this device, but the server was not reached — ${error}`, 'error')
    navigate('/auth/signin', { replace: true })
  }

  if (awaitingApproval) {
    return (
      <Shell>
        <div className="w-full max-w-sm text-center">
          <span className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--color-tint) 14%, transparent)', color: 'var(--color-tint)' }}><Icon name="clock" size={28} strokeWidth={1.8} /></span>
          <h2 className="text-xl font-semibold mb-2 text-label">
            Waiting for approval
          </h2>
          <p className="text-[15px] mb-2 text-label-2">
            Your request to join the collection has been sent. The owner needs to approve it before you can see any of the animals.
          </p>
          <p className="text-[15px] mb-6 text-label-2">
            This page opens the collection by itself the moment they do — you can leave it open.
          </p>
          <div className="flex flex-col gap-2">
            <Button fullWidth onClick={handleCheckAgain} loading={checking}>
              Check again
            </Button>
            <Button variant="secondary" fullWidth onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </Shell>
    )
  }

  if (wasRejected) {
    return (
      <Shell>
        <div className="w-full max-w-sm text-center">
          <span className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--color-red) 14%, transparent)', color: 'var(--color-red)' }}><Icon name="alert" size={28} strokeWidth={1.8} /></span>
          <h2 className="text-xl font-semibold mb-2 text-label">
            Request declined
          </h2>
          <p className="text-[15px] mb-6 text-label-2">
            The owner didn't approve your request to join. You can try a different invite code, or start a collection of your own.
          </p>
          <div className="flex flex-col gap-2">
            <Button fullWidth onClick={() => { setMode('choice'); setError(null) }}>
              Try again
            </Button>
            <Button variant="secondary" fullWidth onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <BrandMark size="lg" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-label">
            Set up your collection
          </h1>
          <p className="text-[15px] mt-2 text-label-2">
            Create a new collection or join one from a partner
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-[15px]" style={{ backgroundColor: 'color-mix(in srgb, var(--color-red) 10%, transparent)', color: 'var(--color-red)' }}>
            {error}
          </div>
        )}

        {mode === 'choice' && (
          <div className="rounded-xl bg-surface overflow-hidden">
            {([
              { next: 'create', icon: 'plus', color: 'var(--color-tint)', title: 'Start a new collection', body: 'Create your own reptile collection and invite others' },
              { next: 'join', icon: 'person', color: 'var(--color-blue)', title: 'Join an existing collection', body: 'Enter an invite code from your partner' },
            ] as const).map((o) => (
              <button
                key={o.next}
                onClick={() => setMode(o.next)}
                className="list-row list-row-leading relative w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-fill transition-colors"
                style={{ '--sep-inset': '62px' } as React.CSSProperties}
              >
                <IconTile name={o.icon} color={o.color} size={34} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[17px] font-semibold text-label">{o.title}</span>
                  <span className="block text-[15px] text-label-2">{o.body}</span>
                </span>
                <Chevron />
              </button>
            ))}
          </div>
        )}

        {mode === 'create' && (
          <div className="rounded-2xl p-6 bg-surface">
            <h2 className="text-lg font-semibold mb-4 text-label">
              Name your collection
            </h2>
            <div className="flex flex-col gap-4">
              <Input
                label="Collection name"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="Our Collection"
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setMode('choice'); setError(null) }}>
                  Back
                </Button>
                <Button fullWidth onClick={handleCreate} loading={loading}>
                  Create collection
                </Button>
              </div>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="rounded-2xl p-6 bg-surface">
            <h2 className="text-lg font-semibold mb-4 text-label">
              Enter invite code
            </h2>
            <div className="flex flex-col gap-4">
              <Input
                label="Invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="GECKO-7821"
                style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setMode('choice'); setError(null) }}>
                  Back
                </Button>
                <Button fullWidth onClick={handleJoin} loading={loading}>
                  Send request
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: 'var(--color-bg)' }}>
      {children}
    </div>
  )
}
