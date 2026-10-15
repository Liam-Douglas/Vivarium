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
// feature while export is free in Settings. It now says only what is true:
// where the limit is, that nothing is lost, and that Pro is still to come.
export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="You've reached the free limit">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm" style={{ color: '#f0ece0' }}>
            The free plan holds up to {FREE_ANIMAL_LIMIT} animals per household.
          </p>
          <p className="text-sm" style={{ color: '#a8a090' }}>
            Your animals and their records stay exactly as they are.
          </p>
        </div>

        <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(143,190,90,0.08)', border: '1px solid rgba(143,190,90,0.2)' }}>
          <p className="text-sm font-semibold" style={{ color: '#8fbe5a' }}>Pro is on the way</p>
          <ul className="text-sm mt-2 flex flex-col gap-1.5" style={{ color: '#a8a090' }}>
            <li className="flex gap-2"><Tick />Unlimited animals</li>
            <li className="flex gap-2"><Tick />Advanced health tracking</li>
            <li className="flex gap-2"><Tick />Priority support</li>
          </ul>
          <p className="text-sm mt-3" style={{ color: '#a8a090' }}>
            We'll announce it here in the app.
          </p>
        </div>

        <Button fullWidth onClick={onClose}>Got it</Button>
      </div>
    </Modal>
  )
}

function Tick() {
  return (
    <svg className="shrink-0 mt-0.5" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8fbe5a" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}
