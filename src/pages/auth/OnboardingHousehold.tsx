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
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-label)' }}>
            Waiting for approval
          </h2>
          <p className="text-sm mb-2" style={{ color: 'var(--color-label-2)' }}>
            Your request to join the collection has been sent. The owner needs to approve it before you can see any of the animals.
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--color-label-2)' }}>
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
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-label)' }}>
            Request declined
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-label-2)' }}>
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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-label)' }}>
            Set up your collection
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-label-2)' }}>
            Create a new collection or join one from a partner
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--color-red) 10%, transparent)', color: 'var(--color-red)', border: '1px solid color-mix(in srgb, var(--color-red) 20%, transparent)' }}>
            {error}
          </div>
        )}

        {mode === 'choice' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setMode('create')}
              className="w-full rounded-2xl p-5 text-left transition-colors hover:border-tint/50"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-separator)' }}
            >
              <div className="text-2xl mb-2">🌿</div>
              <div className="font-semibold mb-1" style={{ color: 'var(--color-label)' }}>Start a new collection</div>
              <div className="text-sm" style={{ color: 'var(--color-label-2)' }}>Create your own reptile collection and invite others</div>
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full rounded-2xl p-5 text-left transition-colors hover:border-tint/50"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-separator)' }}
            >
              <div className="text-2xl mb-2">🤝</div>
              <div className="font-semibold mb-1" style={{ color: 'var(--color-label)' }}>Join an existing collection</div>
              <div className="text-sm" style={{ color: 'var(--color-label-2)' }}>Enter an invite code from your partner</div>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-separator)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-label)' }}>
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
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-separator)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-label)' }}>
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
