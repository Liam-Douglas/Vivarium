import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnimals } from '@/hooks/useAnimals'
import { useFeederInventory } from '@/hooks/useFeederInventory'
import { useWeightLogs } from '@/hooks/useWeightLogs'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import { logFeeding } from '@/lib/queries'
import { findMatchingFeeder } from '@/lib/feederMatch'
import { feedingLogSchema } from '@/lib/validation'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { PREY_TYPES, getPreySizes } from '@/lib/preyTypes'
import { getFeedingStatus, describeNextFeeding, FEEDING_URGENCY } from '@/lib/feedingStatus'
import { ALL_PREY_NAMES } from '@/lib/preyTypes'
import { currentWeight } from '@/lib/weightStats'
import { recommendedPreyWeight } from '@/lib/preyGuidance'
import { formatWeight, formatWeightRange } from '@/lib/format'

interface FeedingLogFormProps {
  preselectedAnimalId?: string
  /** Last meal for that animal, so a repeat feed opens ready to save. */
  prefill?: { preyType: string; preySize?: string | null; quantity?: number }
  onSuccess: () => void
  onCancel: () => void
}

export function FeedingLogForm({ preselectedAnimalId, prefill, onSuccess, onCancel }: FeedingLogFormProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()
  const { data: animals } = useAnimals()
  const { data: feeders, refresh: refreshFeeders } = useFeederInventory()
  // Household-wide rather than per-animal: the selection changes as the keeper
  // scrolls the picker, and refetching on each change would put a request
  // behind every keystroke of a decision.
  const { data: weightLogs } = useWeightLogs()

  const [animalId, setAnimalId] = useState(preselectedAnimalId ?? '')
  const [preyType, setPreyType] = useState(prefill?.preyType ?? '')
  const [preySearch, setPreySearch] = useState('')
  const [showPreyList, setShowPreyList] = useState(false)
  // Only carry the size over when the type actually offers it, so a prefilled
  // value can never be submitted from a Select that never rendered.
  const [preySize, setPreySize] = useState(
    prefill?.preyType && prefill.preySize && getPreySizes(prefill.preyType).includes(prefill.preySize)
      ? prefill.preySize
      : ''
  )
  const [quantity, setQuantity] = useState(String(prefill?.quantity ?? 1))
  const [fedAt, setFedAt] = useState(new Date().toISOString().slice(0, 16))
  const [refused, setRefused] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // The picker used to list the collection in whatever order it arrived, so
  // choosing who to feed meant remembering who was due. The queue on the
  // Dashboard answers that question; this puts the same answer where the
  // decision is actually made, without repeating the queue as another panel.
  const animalsByUrgency = useMemo(
    () => [...animals].sort((a, b) => {
      const byUrgency = FEEDING_URGENCY[getFeedingStatus(a)] - FEEDING_URGENCY[getFeedingStatus(b)]
      return byUrgency !== 0 ? byUrgency : a.name.localeCompare(b.name)
    }),
    [animals]
  )

  const sizes = preyType ? getPreySizes(preyType) : []
  const filteredPrey = ALL_PREY_NAMES.filter((n) =>
    n.toLowerCase().includes(preySearch.toLowerCase())
  )

  const selectedAnimal = animals.find((a) => a.id === animalId)

  /**
   * The suggested meal size, from the animal's own weigh-ins.
   *
   * This read `animals.weight_grams` — a column nothing in the app writes, so
   * the line it draws had never once appeared. It is guarded, which is why
   * nobody noticed: what a keeper saw was silence rather than a wrong number.
   * The column stays as a fallback for an imported animal with no logs yet.
   */
  const selectedWeight = useMemo(() => {
    if (!selectedAnimal) return null
    return currentWeight(
      weightLogs.filter((log) => log.animal_id === selectedAnimal.id),
      selectedAnimal.weight_grams
    )
  }, [selectedAnimal, weightLogs])
  const preyWeight = recommendedPreyWeight(selectedWeight)

  async function handleSubmit() {
    if (!user || !householdId || saving) return

    const parsed = feedingLogSchema.safeParse({
      animal_id: animalId,
      prey_type: preyType,
      prey_size: preySize || undefined,
      quantity: Number(quantity),
      fed_at: fedAt,
      refused,
      notes: notes || undefined,
    })
    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message ?? 'Please check the form', 'error')
      return
    }

    setSaving(true)
    try {
      const feeder = parsed.data.refused ? null : findMatchingFeeder(feeders, preyType, preySize)

      // Single atomic write (log + last_fed_at + stock deduction) via RPC,
      // with a legacy sequential fallback until the migration is applied.
      const { stockError } = await logFeeding({
        household_id: householdId,
        user_id: user.id,
        fed_at: new Date(parsed.data.fed_at).toISOString(),
        animal_id: parsed.data.animal_id,
        prey_type: parsed.data.prey_type,
        prey_size: parsed.data.prey_size || undefined,
        quantity: parsed.data.quantity,
        refused: parsed.data.refused,
        notes: parsed.data.notes || undefined,
        feeder_item_id: feeder?.id ?? null,
        stock_note: `Fed to ${animals.find((a) => a.id === animalId)?.name ?? 'animal'}`,
      })

      if (feeder) {
        refreshFeeders()
        if (stockError) showToast(`Feeding saved but stock not updated — ${stockError}`, 'error')
      } else if (!parsed.data.refused) {
        // The handler here was an empty comment: the toast rendered, the
        // button was tappable, and nothing happened.
        showToast(
          `Track ${preyType} in feeder inventory?`,
          'info',
          { label: 'Add', onClick: () => navigate('/feeders') }
        )
      }

      onSuccess()
    } catch (e) {
      showToast(e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Animal selector */}
      {!preselectedAnimalId && (
        <Select
          label="Animal *"
          value={animalId}
          onChange={(e) => setAnimalId(e.target.value)}
        >
          <option value="">Select animal…</option>
          {animalsByUrgency.map((a) => (
            <option key={a.id} value={a.id}>{a.name} — {describeNextFeeding(a)}</option>
          ))}
        </Select>
      )}

      {/* Prey type with search */}
      <div className="relative">
        <label htmlFor="prey-type" className="text-[13px] font-medium text-label-2 px-1 block mb-1.5">Prey type *</label>
        <input
          type="text"
          value={preyType || preySearch}
          onChange={(e) => {
            setPreySearch(e.target.value)
            setPreyType('')
            setShowPreyList(true)
          }}
          onFocus={() => setShowPreyList(true)}
          placeholder="Search prey types…"
          id="prey-type"
          className="w-full rounded-[10px] px-3.5 py-2.5 min-h-11 text-[17px] bg-fill text-label placeholder:text-label-3 border-0 outline-none transition-shadow duration-150 focus:ring-2 focus:ring-tint"
        />
        {showPreyList && (
          <div
            className="absolute z-20 w-full mt-1.5 rounded-xl overflow-auto bg-surface-2 shadow-[0_12px_32px_rgba(0,0,0,0.2)]"
            style={{ maxHeight: 240 }}
          >
            {PREY_TYPES.map((cat) => {
              const items = cat.items.filter((i) => i.name.toLowerCase().includes(preySearch.toLowerCase()))
              if (items.length === 0) return null
              return (
                <div key={cat.category}>
                  <div className="px-4 pt-2.5 pb-1 text-[13px] font-semibold text-label-2">{cat.category}</div>
                  {items.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className="w-full text-left px-4 min-h-11 text-[17px] text-label hover:bg-fill active:bg-fill"
                      onClick={() => {
                        setPreyType(item.name)
                        setPreySearch('')
                        setPreySize('')
                        setShowPreyList(false)
                      }}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )
            })}
            {filteredPrey.length === 0 && preySearch && (
              <button
                type="button"
                className="w-full text-left px-4 min-h-11 text-[17px] text-tint hover:bg-fill active:bg-fill"
                onClick={() => {
                  setPreyType(preySearch)
                  setPreySearch('')
                  setShowPreyList(false)
                }}
              >
                Use "{preySearch}"
              </button>
            )}
          </div>
        )}
      </div>

      {/* Prey weight recommendation */}
      {preyType && preyWeight && (
        <p className="text-[13px] -mt-2 px-1 text-tint">
          {/* The two ends round together below about 12g, and "1–1g" reads as
              a mistake rather than as advice. */}
          Recommended prey: {preyWeight.minGrams === preyWeight.maxGrams
            ? formatWeight(preyWeight.minGrams)
            : formatWeightRange(preyWeight.minGrams, preyWeight.maxGrams)}
          {' '}(10–15% of {selectedWeight != null ? formatWeight(selectedWeight) : '—'} body weight)
        </p>
      )}

      {/* Prey size */}
      {sizes.length > 0 && (
        <Select label="Size" value={preySize} onChange={(e) => setPreySize(e.target.value)}>
          <option value="">Any size</option>
          {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      )}

      <Input
        label="Quantity"
        type="number"
        inputMode="numeric"
        min={1}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
      />

      <Input
        label="Date & time"
        type="datetime-local"
        value={fedAt}
        onChange={(e) => setFedAt(e.target.value)}
      />

      <label className="flex items-center justify-between gap-3 min-h-11 px-4 py-1.5 rounded-[10px] bg-fill cursor-pointer">
        <span className="text-[17px] text-label">Animal refused food</span>
        <input
          type="checkbox"
          checked={refused}
          onChange={(e) => setRefused(e.target.checked)}
          className="switch switch-red"
        />
      </label>

      <Textarea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes…"
        rows={2}
      />

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" fullWidth onClick={onCancel}>Cancel</Button>
        <Button
          fullWidth
          onClick={handleSubmit}
          loading={saving}
          disabled={!animalId || !preyType || saving}
        >
          Save feeding
        </Button>
      </div>
    </div>
  )
}
