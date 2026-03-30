import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/', { replace: true })
      } else {
        navigate('/auth/signin', { replace: true })
      }
    })
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
