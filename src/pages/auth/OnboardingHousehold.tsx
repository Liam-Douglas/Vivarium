import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { createHousehold, joinHouseholdByCode } from '@/lib/queries'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useHousehold } from '@/context/HouseholdContext'

export function OnboardingHousehold() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refresh } = useHousehold()
  const { householdId } = useHousehold()
  const [mode, setMode] = useState<'choice' | 'create' | 'join' | 'pending'>('choice')

  useEffect(() => {
    if (householdId) navigate('/', { replace: true })
  }, [householdId, navigate])
  const [collectionName, setCollectionName] = useState('Our Collection')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      await createHousehold(user.id, collectionName)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create collection')
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
      setMode('pending')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid invite code')
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#1a1a18' }}>
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
            Request sent
          </h2>
          <p className="text-sm mb-6" style={{ color: '#a8a090' }}>
            Your request to join the collection has been sent. You'll gain access once the owner approves it.
          </p>
          <Button variant="secondary" onClick={() => navigate('/auth/signin')}>
            Back to sign in
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: '#1a1a18' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl mx-auto mb-4" style={{ backgroundColor: '#8fbe5a', color: '#1a1a18' }}>
            V
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
            Set up your collection
          </h1>
          <p className="text-sm mt-2" style={{ color: '#a8a090' }}>
            Create a new collection or join one from a partner
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(196,90,90,0.1)', color: '#c45a5a', border: '1px solid rgba(196,90,90,0.2)' }}>
            {error}
          </div>
        )}

        {mode === 'choice' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setMode('create')}
              className="w-full rounded-2xl p-5 text-left transition-colors hover:border-[#8fbe5a]/50"
              style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-2xl mb-2">🌿</div>
              <div className="font-semibold mb-1" style={{ color: '#f0ece0' }}>Start a new collection</div>
              <div className="text-sm" style={{ color: '#a8a090' }}>Create your own reptile collection and invite others</div>
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full rounded-2xl p-5 text-left transition-colors hover:border-[#8fbe5a]/50"
              style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="text-2xl mb-2">🤝</div>
              <div className="font-semibold mb-1" style={{ color: '#f0ece0' }}>Join an existing collection</div>
              <div className="text-sm" style={{ color: '#a8a090' }}>Enter an invite code from your partner</div>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
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
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
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
    </div>
  )
}
