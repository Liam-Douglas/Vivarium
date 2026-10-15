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
// the limit is, that nothing is lost, and the two ways forward. The first is
// one a keeper can take today: the limit counts active animals only, so
// removing one that has left frees its place.
export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={`All ${FREE_ANIMAL_LIMIT} places are taken`}>
      <div className="flex flex-col gap-4">
        <p className="text-[15px] text-label-2">
          The free plan holds up to {FREE_ANIMAL_LIMIT} animals per household. Nothing you have recorded is affected.
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

function Option({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl px-4 py-3 bg-fill">
      <p className="text-[17px] font-semibold text-label">{title}</p>
      <p className="text-[15px] mt-0.5 text-label-2">{body}</p>
    </div>
  )
}
