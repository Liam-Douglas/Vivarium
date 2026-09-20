import { useState } from 'react'
import { format } from 'date-fns'
import { updateFeedingLog, recalculateAnimalLastFedAt } from '@/lib/queries'
import { dateInputToISO } from '@/lib/dates'
import { getPreySizes } from '@/lib/preyTypes'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import type { FeedingLog } from '@/hooks/useFeedingLogs'

interface FeedingEditFormProps {
  log: FeedingLog
  onSaved: () => void
  onCancel: () => void
}

/**
 * Correct a feeding that has already been recorded.
 *
 * Editing or deleting a feeding moves the animal's last_fed_at, and every
 * feeding status on every screen derives from that, so both paths recalculate
 * it rather than leaving the animal reading as fed on a date it was not.
 */
export function FeedingEditForm({ log, onSaved, onCancel }: FeedingEditFormProps) {
  const { showToast } = useToast()

  const [preyType, setPreyType] = useState(log.prey_type)
  const [preySize, setPreySize] = useState(log.prey_size ?? '')
  const [quantity, setQuantity] = useState(String(log.quantity))
  // Local time for the picker: slicing the stored ISO string would show the
  // keeper a UTC clock and silently shift the feeding on save.
  const [fedAt, setFedAt] = useState(format(new Date(log.fed_at), "yyyy-MM-dd'T'HH:mm"))
  const [refused, setRefused] = useState(log.refused)
  const [notes, setNotes] = useState(log.notes ?? '')
  const [saving, setSaving] = useState(false)

  const sizes = preyType ? getPreySizes(preyType) : []

  async function handleSave() {
    if (saving) return
    if (!preyType.trim()) { showToast('Prey type is required', 'error'); return }
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty < 1) { showToast('Quantity must be at least 1', 'error'); return }

    setSaving(true)
    try {
      await updateFeedingLog(log.id, {
        prey_type: preyType.trim(),
        // A size that the edited prey type does not offer would be saved
        // against a Select that never rendered it.
        prey_size: sizes.includes(preySize) ? preySize : null,
        quantity: qty,
        refused,
        notes: notes.trim() || null,
        fed_at: dateInputToISO(fedAt),
      })
      await recalculateAnimalLastFedAt(log.animal_id)
      showToast('Feeding updated', 'success')
      onSaved()
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Input label="Prey type *" value={preyType} onChange={(e) => setPreyType(e.target.value)} />

      {sizes.length > 0 && (
        <Select label="Size" value={preySize} onChange={(e) => setPreySize(e.target.value)}>
          <option value="">Any size</option>
          {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      )}

      <Input label="Quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />

      <Input label="Date & time" type="datetime-local" value={fedAt} onChange={(e) => setFedAt(e.target.value)} />

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={refused}
          onChange={(e) => setRefused(e.target.checked)}
          className="w-4 h-4 accent-[#c45a5a]"
        />
        <span className="text-sm" style={{ color: '#f0ece0' }}>Animal refused food</span>
      </label>

      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes…" />

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" fullWidth onClick={onCancel}>Cancel</Button>
        <Button fullWidth onClick={handleSave} loading={saving} disabled={saving}>Save changes</Button>
      </div>
    </div>
  )
}
