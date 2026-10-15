import { Icon } from '@/components/ui/icons'
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
        <div className="rounded-2xl p-8 text-center bg-surface">
          <span className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--color-tint) 14%, transparent)', color: 'var(--color-tint)' }}><Icon name="mail" size={28} strokeWidth={1.8} /></span>
          <h2 className="text-[22px] font-semibold mb-2 text-label">
            Check your inbox
          </h2>
          <p className="text-[15px] mb-6 text-label-2">
            If an account exists for <strong style={{ color: 'var(--color-label)' }}>{email}</strong>, we've sent a link to reset your password. It expires in one hour.
          </p>
          <p className="text-[13px] mb-6 text-label-2">
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
      <div className="rounded-2xl p-6 bg-surface">
        <h2 className="text-[22px] font-semibold mb-2 text-label">
          Reset your password
        </h2>
        <p className="text-[15px] mb-6 text-label-2">
          Enter the email you signed up with and we'll send you a link to set a new password.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-[15px]" style={{ backgroundColor: 'color-mix(in srgb, var(--color-red) 10%, transparent)', color: 'var(--color-red)' }}>
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
                theme={window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'}
              />
            </div>
          )}

          <Button type="submit" loading={loading} fullWidth disabled={!!siteKey && !captchaToken}>
            Send reset link
          </Button>
        </form>
      </div>

      <p className="text-center text-[15px] mt-4 text-label-2">
        Remembered it?{' '}
        <Link to="/auth/signin" className="font-medium text-tint">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
