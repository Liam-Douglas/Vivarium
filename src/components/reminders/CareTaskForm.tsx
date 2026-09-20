import { useState } from 'react'
import { createCareTask, updateCareTask } from '@/lib/queries'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import type { CareTask } from '@/hooks/useCareTasks'
import type { Animal } from '@/hooks/useAnimals'
import type { Enclosure } from '@/hooks/useEnclosures'

/** Starting points, not a closed set — `kind` is free text in the database. */
const KIND_SUGGESTIONS = ['Cleaning', 'Weighing', 'Water change', 'Substrate change', 'Health check']

interface CareTaskFormProps {
  /** Absent when adding. */
  task?: CareTask | null
  animals: Animal[]
  enclosures: Enclosure[]
  onSaved: () => void
  onCancel: () => void
}

export function CareTaskForm({ task, animals, enclosures, onSaved, onCancel }: CareTaskFormProps) {
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()

  const [name, setName] = useState(task?.name ?? '')
  const [kind, setKind] = useState(task?.kind ?? 'Cleaning')
  // One target control rather than two selects: a task belongs to an animal, an
  // enclosure, or the household, and offering both at once invites a row that
  // claims two owners.
  const [target, setTarget] = useState<string>(
    task?.animal_id ? `animal:${task.animal_id}`
      : task?.enclosure_id ? `enclosure:${task.enclosure_id}`
      : ''
  )
  const [frequencyDays, setFrequencyDays] = useState(String(task?.frequency_days ?? 7))
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    if (!user || !householdId) return
    if (!name.trim()) { showToast('Give the reminder a name', 'error'); return }
    const days = Number(frequencyDays)
    if (!Number.isInteger(days) || days < 1) {
      showToast('Repeat every must be a whole number of days, at least 1', 'error')
      return
    }

    const [targetKind, targetId] = target.split(':')
    const fields = {
      name: name.trim(),
      kind: kind.trim() || 'custom',
      animal_id: targetKind === 'animal' ? targetId : null,
      enclosure_id: targetKind === 'enclosure' ? targetId : null,
      frequency_days: days,
      notes: notes.trim() || null,
    }

    setSaving(true)
    try {
      if (task) {
        await updateCareTask(task.id, fields)
        showToast('Reminder updated', 'success')
      } else {
        await createCareTask({ household_id: householdId, user_id: user.id, ...fields })
        showToast('Reminder added', 'success')
      }
      onSaved()
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Clean the rack" />

      <div>
        <Input label="Type" value={kind} onChange={(e) => setKind(e.target.value)} placeholder="e.g. Cleaning" />
        <div className="flex gap-1.5 flex-wrap mt-2">
          {KIND_SUGGESTIONS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className="text-xs px-2 py-1 rounded-lg transition-colors"
              style={{
                backgroundColor: kind === k ? 'rgba(143,190,90,0.15)' : 'rgba(255,255,255,0.04)',
                color: kind === k ? '#8fbe5a' : '#a8a090',
                border: `1px solid ${kind === k ? 'rgba(143,190,90,0.25)' : 'transparent'}`,
              }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <Select label="Applies to" value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="">The whole collection</option>
        {animals.length > 0 && (
          <optgroup label="Animal">
            {animals.map((a) => <option key={a.id} value={`animal:${a.id}`}>{a.name}</option>)}
          </optgroup>
        )}
        {enclosures.length > 0 && (
          <optgroup label="Enclosure">
            {enclosures.map((e) => <option key={e.id} value={`enclosure:${e.id}`}>{e.name}</option>)}
          </optgroup>
        )}
      </Select>

      <Input
        label="Repeat every (days) *"
        type="number"
        min={1}
        value={frequencyDays}
        onChange={(e) => setFrequencyDays(e.target.value)}
      />

      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes…" />

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" fullWidth onClick={onCancel}>Cancel</Button>
        <Button fullWidth onClick={handleSave} loading={saving} disabled={saving}>
          {task ? 'Save changes' : 'Add reminder'}
        </Button>
      </div>
    </div>
  )
}
