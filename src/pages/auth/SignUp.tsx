import { Icon } from '@/components/ui/icons'
import { useState, useRef, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BrandMark } from '@/components/ui/BrandMark'

type Step = 'account' | 'verify' | 'collection'

export function SignUp() {
  const navigate = useNavigate()
  const captchaRef = useRef<HCaptcha>(null)

  const [step, setStep] = useState<Step>('account')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string

  async function handleSignUp(e: FormEvent) {
    e.preventDefault()
    // Only gate on the captcha when one is actually configured — otherwise no
    // widget renders, no token can ever exist, and sign-up is a dead end.
    if (siteKey && !captchaToken) {
      setError('Please complete the captcha')
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...(captchaToken ? { captchaToken } : {}),
        data: { full_name: fullName },
      },
    })

    if (error) {
      setError(error.message)
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
      setLoading(false)
    } else {
      setStep('verify')
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  if (step === 'verify') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="w-full max-w-sm">
          <div className="rounded-2xl p-8 text-center bg-surface">
            <span className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--color-tint) 14%, transparent)', color: 'var(--color-tint)' }}><Icon name="mail" size={28} strokeWidth={1.8} /></span>
            <h2 className="text-[22px] font-semibold mb-2 text-label">
              Check your inbox
            </h2>
            <p className="text-[15px] mb-6 text-label-2">
              We sent a confirmation link to <strong style={{ color: 'var(--color-label)' }}>{email}</strong>. Click the link to verify your account.
            </p>
            <Button variant="secondary" fullWidth onClick={() => navigate('/auth/signin')}>
              Back to sign in
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex flex-col items-center gap-3">
            <BrandMark size="xl" />
            <span className="text-[28px] leading-[34px] font-bold text-label">
              Vivarium
            </span>
          </div>
        </div>

        <div className="rounded-2xl p-6 bg-surface">
          <h2 className="text-[22px] leading-7 font-bold mb-5 text-label">
            Create your account
          </h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-[15px]" style={{ backgroundColor: 'color-mix(in srgb, var(--color-red) 10%, transparent)', color: 'var(--color-red)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <Input
              label="Full name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              placeholder="Your name"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
            />

            {siteKey && (
              <div className="flex justify-center">
                <HCaptcha
                  ref={captchaRef}
                  sitekey={siteKey}
                  onVerify={setCaptchaToken}
                  onExpire={() => setCaptchaToken(null)}
                  theme={window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'}
                />
              </div>
            )}

            <Button type="submit" loading={loading} fullWidth disabled={!!siteKey && !captchaToken}>
              Create account
            </Button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-separator" />
            <span className="text-[13px] text-label-2">or</span>
            <div className="flex-1 h-px bg-separator" />
          </div>

          <Button variant="secondary" fullWidth onClick={handleGoogle} loading={googleLoading}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>
        </div>

        <p className="text-center text-[13px] mt-4 leading-relaxed text-label-2">
          By signing up you agree to our{' '}
          <Link to="/terms" className="text-tint">Terms</Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-tint">Privacy Policy</Link>
        </p>

        <p className="text-center text-[15px] mt-3 text-label-2">
          Already have an account?{' '}
          <Link to="/auth/signin" className="font-medium text-tint">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
