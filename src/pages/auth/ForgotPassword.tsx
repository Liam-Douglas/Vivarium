import { useState, useRef, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthShell } from './AuthShell'

export function ForgotPassword() {
  const captchaRef = useRef<HCaptcha>(null)

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  // Supabase's captcha protection covers the recovery endpoint alongside
  // sign-up, so send the token when the project is configured for one.
  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (siteKey && !captchaToken) {
      setError('Please complete the captcha')
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
      ...(captchaToken ? { captchaToken } : {}),
    })

    if (error) {
      setError(error.message)
      captchaRef.current?.resetCaptcha()
      setCaptchaToken(null)
      setLoading(false)
    } else {
      // Deliberately neutral: never confirm whether an address has an account.
      setSent(true)
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthShell>
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-4xl mb-4">📬</div>
          <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
            Check your inbox
          </h2>
          <p className="text-sm mb-6" style={{ color: '#a8a090' }}>
            If an account exists for <strong style={{ color: '#f0ece0' }}>{email}</strong>, we've sent a link to reset your password. It expires in one hour.
          </p>
          <p className="text-xs mb-6" style={{ color: '#a8a090' }}>
            Open the link in this browser — for security, a reset started here can only be completed here.
          </p>
          <Link to="/auth/signin">
            <Button variant="secondary" fullWidth>Back to sign in</Button>
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="rounded-2xl p-6" style={{ backgroundColor: '#242420', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
          Reset your password
        </h2>
        <p className="text-sm mb-6" style={{ color: '#a8a090' }}>
          Enter the email you signed up with and we'll send you a link to set a new password.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(196,90,90,0.1)', color: '#c45a5a', border: '1px solid rgba(196,90,90,0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />

          {siteKey && (
            <div className="flex justify-center">
              <HCaptcha
                ref={captchaRef}
                sitekey={siteKey}
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken(null)}
                theme="dark"
              />
            </div>
          )}

          <Button type="submit" loading={loading} fullWidth disabled={!!siteKey && !captchaToken}>
            Send reset link
          </Button>
        </form>
      </div>

      <p className="text-center text-sm mt-4" style={{ color: '#a8a090' }}>
        Remembered it?{' '}
        <Link to="/auth/signin" className="font-medium" style={{ color: '#8fbe5a' }}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
