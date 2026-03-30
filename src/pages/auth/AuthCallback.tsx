import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

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
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a18' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg animate-pulse" style={{ backgroundColor: '#8fbe5a', color: '#1a1a18' }}>
          V
        </div>
        <p className="text-sm" style={{ color: '#6a6458' }}>Signing you in…</p>
      </div>
    </div>
  )
}
