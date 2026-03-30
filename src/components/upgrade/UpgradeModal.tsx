import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
}

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (email) setSubmitted(true)
  }

  return (
    <Modal open={open} onClose={onClose} title="Upgrade to Pro">
      <div className="text-center">
        <div className="text-4xl mb-4">🚀</div>
        {!submitted ? (
          <>
            <p className="text-sm mb-2" style={{ color: '#f0ece0' }}>
              You've reached the <strong>5 animal limit</strong> on the free plan.
            </p>
            <p className="text-sm mb-6" style={{ color: '#a8a090' }}>
              Upgrade to Pro for unlimited animals and more features.
            </p>
            <div className="rounded-xl p-4 mb-6 text-left" style={{ backgroundColor: 'rgba(143,190,90,0.08)', border: '1px solid rgba(143,190,90,0.2)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#8fbe5a' }}>Pro plan — coming soon</p>
              <ul className="text-sm space-y-1" style={{ color: '#a8a090' }}>
                <li>• Unlimited animals</li>
                <li>• Advanced health tracking</li>
                <li>• Export your data</li>
                <li>• Priority support</li>
              </ul>
            </div>
            <div className="flex flex-col gap-3">
              <Input
                placeholder="your@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                hint="Get notified when Pro launches"
              />
              <Button fullWidth onClick={handleSubmit}>
                Notify me when Pro launches
              </Button>
              <Button variant="ghost" fullWidth onClick={onClose}>
                Maybe later
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm mb-4" style={{ color: '#f0ece0' }}>
              You're on the list! We'll email <strong>{email}</strong> when Pro launches.
            </p>
            <Button fullWidth onClick={onClose}>Close</Button>
          </>
        )}
      </div>
    </Modal>
  )
}
