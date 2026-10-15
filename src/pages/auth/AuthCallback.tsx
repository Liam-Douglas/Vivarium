import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { BrandMark } from '@/components/ui/BrandMark'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    const errorDescription = params.get('error_description')

    if (error) {
      navigate(`/auth/signin?error=${encodeURIComponent(errorDescription ?? error)}`, { replace: true })
      return
    }

    // With PKCE flow the SDK exchanges the code automatically on init.
    // Wait for the SIGNED_IN event, then redirect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        navigate('/', { replace: true })
      } else if (event === 'INITIAL_SESSION' && !session) {
        // No session and no pending code — go to sign in
        subscription.unsubscribe()
        navigate('/auth/signin', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <BrandMark pulse />
        <p className="text-[15px] text-label-2">Signing you in…</p>
      </div>
    </div>
  )
}
