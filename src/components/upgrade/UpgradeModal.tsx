import { useSearchParams } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FREE_ANIMAL_LIMIT } from '@/lib/tiers'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
}

// This used to collect an email and reply "You're on the list! We'll email
// you when Pro launches" — but the address only ever lived in component state,
// so the promise could not be kept. It also listed data export as a Pro
// feature while export is free in Settings. It says only what is true: where
// the limit is, that nothing is lost, and that Pro is still to come.
//
// Three presentations while one is chosen (?upgrade=b, ?upgrade=c); the
// others are deleted once a decision is made.
export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const [searchParams] = useSearchParams()
  const variant = searchParams.get('upgrade')

  if (variant === 'b') {
    return (
      <Modal open={open} onClose={onClose} title="Free plan">
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium" style={{ color: 'var(--color-parchment)' }}>Animals</p>
              <p className="text-sm tabular-nums" style={{ color: 'var(--color-dry-grass)' }}>
                {FREE_ANIMAL_LIMIT} of {FREE_ANIMAL_LIMIT}
              </p>
            </div>
            {/* One segment per place; every one taken. */}
            <div className="flex gap-1.5 mt-2" aria-hidden="true">
              {Array.from({ length: FREE_ANIMAL_LIMIT }).map((_, i) => (
                <span key={i} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: 'var(--color-leaf)' }} />
              ))}
            </div>
            <p className="text-sm mt-3" style={{ color: 'var(--color-dry-grass)' }}>
              The free plan holds up to {FREE_ANIMAL_LIMIT} animals per household. Your animals and their records stay exactly as they are.
            </p>
          </div>
          <div style={{ borderTop: '1px solid var(--color-hairline)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-parchment)' }}>Pro is on the way</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-dry-grass)' }}>
              Unlimited animals, advanced health tracking and priority support. We'll announce it here in the app.
            </p>
          </div>
          <Button fullWidth onClick={onClose}>Got it</Button>
        </div>
      </Modal>
    )
  }

  if (variant === 'c') {
    return (
      <Modal open={open} onClose={onClose} title="Room for one more?">
        <div className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: 'var(--color-dry-grass)' }}>
            The free plan holds up to {FREE_ANIMAL_LIMIT} animals per household, and all {FREE_ANIMAL_LIMIT} places are taken. Nothing you have recorded is affected.
          </p>
          <Option
            title="Make room"
            body="If an animal has left your care, removing it from the collection on its profile frees its place."
          />
          <Option
            title="Pro, on the way"
            body="Unlimited animals, advanced health tracking and priority support. We'll announce it here in the app."
          />
          <Button fullWidth className="mt-1" onClick={onClose}>Got it</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="You've reached the free limit">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm" style={{ color: 'var(--color-parchment)' }}>
            The free plan holds up to {FREE_ANIMAL_LIMIT} animals per household.
          </p>
          <p className="text-sm" style={{ color: 'var(--color-dry-grass)' }}>
            Your animals and their records stay exactly as they are.
          </p>
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(143,190,90,0.08)', border: '1px solid rgba(143,190,90,0.2)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-leaf)' }}>Pro is on the way</p>
          <ul className="text-sm mt-2 flex flex-col gap-1.5" style={{ color: 'var(--color-dry-grass)' }}>
            <li className="flex gap-2"><Tick />Unlimited animals</li>
            <li className="flex gap-2"><Tick />Advanced health tracking</li>
            <li className="flex gap-2"><Tick />Priority support</li>
          </ul>
          <p className="text-sm mt-3" style={{ color: 'var(--color-dry-grass)' }}>
            We'll announce it here in the app.
          </p>
        </div>

        <Button fullWidth onClick={onClose}>Got it</Button>
      </div>
    </Modal>
  )
}

function Option({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-bark)', border: '1px solid var(--color-hairline)' }}>
      <p className="text-sm font-medium" style={{ color: 'var(--color-parchment)' }}>{title}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--color-dry-grass)' }}>{body}</p>
    </div>
  )
}

function Tick() {
  return (
    <svg className="shrink-0 mt-0.5" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--color-leaf)" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}
