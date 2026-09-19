import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { AuthShell } from './AuthShell'

const MIN_PASSWORD_LENGTH = 6

type Phase = 'verifying' | 'ready' | 'invalid'

/** Supabase reports a rejected link (expired, already used) on the URL. */
function readLinkFailure(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('error_description') ?? params.get('error')
}

/**
 * Landing page for the emailed recovery link.
 *
 * The link arrives as a PKCE code which supabase-js exchanges during its own
 * initialisation — before this component can read it off the URL — so the
 * recovery session is detected from auth events rather than query params,
 * the same way AuthCallback handles OAuth. `PASSWORD_RECOVERY` is the event
 * the exchange emits; `INITIAL_SESSION` covers the case where initialisation
 * finished before we subscribed.
 */
export function ResetPassword() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  // Known before first paint, so it is initial state rather than an effect.
  const [linkError] = useState<string | null>(readLinkFailure)
  const [phase, setPhase] = useState<Phase>(linkError ? 'invalid' : 'verifying')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (linkError) return

    let settled = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled) return
      if (event === 'PASSWORD_RECOVERY' || (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION'))) {
        settled = true
        setPhase('ready')
      } else if (event === 'INITIAL_SESSION' && !session) {
        // Nothing was exchanged: the link is spent, or it was opened in a
        // browser other than the one that requested it (the PKCE verifier
        // never leaves the originating browser).
        settled = true
        setPhase('invalid')
      }
    })

    // Safety net in case the exchange outlives INITIAL_SESSION.
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        setPhase('invalid')
      }
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [linkError])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setSaving(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    // The recovery link already signed them in, so send them straight on.
    showToast('Password updated', 'success')
    navigate('/', { replace: true })
  }

  if (phase === 'verifying') {
    return (
      <AuthShell>
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg mx-auto mb-4 animate-pulse" style={{ backgroundColor: '#8fbe5a', color: '#1a1a18' }}>
            V
          </div>
          <p className="text-sm" style={{ color: '#a8a090' }}>Checking your reset link…</p>
        </div>
      </AuthShell>
    )
  }

  if (phase === 'invalid') {
    return (
      <AuthShell>
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-4xl mb-4">🔗</div>
          <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
            This link didn't work
          </h2>
          <p className="text-sm mb-2" style={{ color: '#a8a090' }}>
            {linkError ?? 'The link has expired, has already been used, or was opened in a different browser from the one that requested it.'}
          </p>
          <p className="text-sm mb-6" style={{ color: '#a8a090' }}>
            Request a new one and open it in this browser.
          </p>
          <Link to="/auth/forgot-password">
            <Button fullWidth>Send a new link</Button>
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="rounded-2xl p-6" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
          Choose a new password
        </h2>
        <p className="text-sm mb-6" style={{ color: '#a8a090' }}>
          You'll be signed in on this device once it's saved.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(196,90,90,0.1)', color: '#c45a5a', border: '1px solid rgba(196,90,90,0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          />
          <Input
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Type it again"
            error={confirm.length > 0 && confirm !== password ? 'Passwords do not match' : undefined}
          />
          <Button type="submit" loading={saving} fullWidth>
            Save new password
          </Button>
        </form>
      </div>
    </AuthShell>
  )
}
