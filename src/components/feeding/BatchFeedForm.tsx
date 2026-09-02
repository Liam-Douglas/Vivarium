import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import { useFeederInventory } from '@/hooks/useFeederInventory'
import { logFeeding } from '@/lib/queries'
import { findMatchingFeeder } from '@/lib/feederMatch'
import { dateInputToISO } from '@/lib/dates'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import type { Animal } from '@/hooks/useAnimals'

interface BatchFeedFormProps {
  /** The animals to log the same meal against. */
  animals: Animal[]
  onSuccess: () => void
  onCancel: () => void
}

/**
 * Logs one identical feeding per animal through the same atomic RPC a single
 * feeding uses, so stock is deducted once per animal. Shared by the enclosure
 * batch feed and the dashboard queue's select mode — before this they were two
 * code paths, and the enclosure one silently skipped stock entirely.
 */
export function BatchFeedForm({ animals, onSuccess, onCancel }: BatchFeedFormProps) {
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()
  const { data: feeders, refresh: refreshFeeders } = useFeederInventory()

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [preyType, setPreyType] = useState('')
  const [preySize, setPreySize] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!user || !householdId || animals.length === 0 || saving) return
    setSaving(true)
    try {
      const fedAt = dateInputToISO(date)
      const type = preyType.trim() || 'Unknown'
      const size = preySize.trim() || undefined
      const qty = Math.max(1, parseInt(quantity) || 1)
      const feeder = findMatchingFeeder(feeders, type, size)

      const results = await Promise.allSettled(animals.map((a) =>
        logFeeding({
          household_id: householdId,
          animal_id: a.id,
          user_id: user.id,
          fed_at: fedAt,
          prey_type: type,
          prey_size: size,
          quantity: qty,
          refused: false,
          notes: notes.trim() || undefined,
          feeder_item_id: feeder?.id ?? null,
          stock_note: `Fed to ${a.name}`,
        })
      ))

      const failed = results.filter((r) => r.status === 'rejected').length
      const fed = animals.length - failed
      const stockError = results.find(
        (r): r is PromiseFulfilledResult<{ stockError: string | null }> =>
          r.status === 'fulfilled' && r.value.stockError !== null
      )?.value.stockError

      if (feeder) refreshFeeders()

      // Close either way: the successful writes are committed, so re-running
      // would feed those animals twice.
      onSuccess()

      if (failed > 0) {
        showToast(`Fed ${fed} of ${animals.length} — ${failed} failed`, 'error')
      } else if (stockError) {
        showToast(`Fed ${fed} animal${fed !== 1 ? 's' : ''} but stock not updated — ${stockError}`, 'error')
      } else {
        showToast(`Fed ${fed} animal${fed !== 1 ? 's' : ''}`, 'success')
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Batch feed failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: '#a8a090' }}>
        Logs the same meal for {animals.length} animal{animals.length !== 1 ? 's' : ''}
        {animals.length <= 4 && `: ${animals.map((a) => a.name).join(', ')}`}.
      </p>
      <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Input
        label="Prey type"
        value={preyType}
        onChange={(e) => setPreyType(e.target.value)}
        placeholder="e.g. Rat"
      />
      <div className="flex gap-3">
        <Input
          label="Prey size"
          value={preySize}
          onChange={(e) => setPreySize(e.target.value)}
          placeholder="e.g. Medium"
        />
        <Input
          label="Qty per animal"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="1"
        />
      </div>
      <Textarea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes…"
        rows={2}
      />
      <div className="flex gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel} fullWidth>Cancel</Button>
        <Button type="button" loading={saving} onClick={handleSubmit} fullWidth>
          Log feeding
        </Button>
      </div>
    </div>
  )
}
