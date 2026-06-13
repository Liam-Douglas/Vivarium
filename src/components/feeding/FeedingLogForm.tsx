import { useState } from 'react'
import { useAnimals } from '@/hooks/useAnimals'
import { useFeederInventory } from '@/hooks/useFeederInventory'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import { logFeeding } from '@/lib/queries'
import { feedingLogSchema } from '@/lib/validation'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { PREY_TYPES, getPreySizes } from '@/lib/preyTypes'
import { ALL_PREY_NAMES } from '@/lib/preyTypes'

interface FeedingLogFormProps {
  preselectedAnimalId?: string
  onSuccess: () => void
  onCancel: () => void
}

export function FeedingLogForm({ preselectedAnimalId, onSuccess, onCancel }: FeedingLogFormProps) {
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()
  const { data: animals } = useAnimals()
  const { data: feeders, refresh: refreshFeeders } = useFeederInventory()

  const [animalId, setAnimalId] = useState(preselectedAnimalId ?? '')
  const [preyType, setPreyType] = useState('')
  const [preySearch, setPreySearch] = useState('')
  const [showPreyList, setShowPreyList] = useState(false)
  const [preySize, setPreySize] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [fedAt, setFedAt] = useState(new Date().toISOString().slice(0, 16))
  const [refused, setRefused] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const sizes = preyType ? getPreySizes(preyType) : []
  const filteredPrey = ALL_PREY_NAMES.filter((n) =>
    n.toLowerCase().includes(preySearch.toLowerCase())
  )

  const selectedAnimal = animals.find((a) => a.id === animalId)
  const preyWeightMin = selectedAnimal?.weight_grams ? Math.round(selectedAnimal.weight_grams * 0.10) : null
  const preyWeightMax = selectedAnimal?.weight_grams ? Math.round(selectedAnimal.weight_grams * 0.15) : null

  // Find matching feeder for this prey type + optional size.
  // Feeder names follow the pattern "Rats (Large)" — parse base + modifier separately
  // so "Rat" + size "Large" matches "Rats (Large)" and not "Rats (Fuzzie)".
  function findMatchingFeeder() {
    const typeLc = preyType.toLowerCase()
    const sizeLc = preySize?.toLowerCase() ?? ''

    function parse(name: string) {
      const m = name.toLowerCase().match(/^(.+?)\s*\((.+)\)$/)
      return m ? { base: m[1].trim(), modifier: m[2].trim() } : { base: name.toLowerCase(), modifier: '' }
    }

    function typeMatches(base: string) {
      const singular = base.replace(/s$/, '')
      return base.includes(typeLc) || typeLc.includes(base) ||
        singular.includes(typeLc) || typeLc.includes(singular)
    }

    function sizeMatches(modifier: string) {
      if (!sizeLc) return true
      return modifier.includes(sizeLc) || sizeLc.includes(modifier)
    }

    // 1. Type + size both match
    const withBoth = feeders.filter((f) => {
      const { base, modifier } = parse(f.name)
      return typeMatches(base) && sizeMatches(modifier)
    })
    if (withBoth.length === 1) return withBoth[0]
    if (withBoth.length > 1) {
      return withBoth.find((f) => parse(f.name).modifier === sizeLc) ?? withBoth[0]
    }

    // 2. Type-only match (no size specified or no size match found)
    return feeders.find((f) => typeMatches(parse(f.name).base)) ?? null
  }

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
      const feeder = parsed.data.refused ? null : findMatchingFeeder()

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
        showToast(
          `Track ${preyType} in feeder inventory?`,
          'info',
          { label: 'Add', onClick: () => { /* navigate to feeders */ } }
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
          {animals.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </Select>
      )}

      {/* Prey type with search */}
      <div className="relative">
        <label className="text-sm font-medium block mb-1.5" style={{ color: '#a8a090' }}>Prey type *</label>
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
          className="w-full rounded-xl px-4 py-2.5 text-sm border focus:outline-none focus:border-[#8fbe5a]"
          style={{ backgroundColor: '#1a1a18', borderColor: 'rgba(255,255,255,0.1)', color: '#f0ece0' }}
        />
        {showPreyList && (
          <div
            className="absolute z-20 w-full mt-1 rounded-xl overflow-auto shadow-xl"
            style={{ backgroundColor: '#2e2e2a', border: '1px solid rgba(255,255,255,0.08)', maxHeight: 240 }}
          >
            {PREY_TYPES.map((cat) => {
              const items = cat.items.filter((i) => i.name.toLowerCase().includes(preySearch.toLowerCase()))
              if (items.length === 0) return null
              return (
                <div key={cat.category}>
                  <div className="px-3 py-1.5 text-xs font-semibold" style={{ color: '#6a6458' }}>{cat.category}</div>
                  {items.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className="w-full text-left px-4 py-2 text-sm hover:bg-white/5"
                      style={{ color: '#f0ece0' }}
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
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5"
                style={{ color: '#8fbe5a' }}
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
      {preyType && preyWeightMin && preyWeightMax && (
        <p className="text-xs -mt-2" style={{ color: '#8fbe5a' }}>
          Recommended prey: {preyWeightMin}–{preyWeightMax}g (10–15% of {selectedAnimal?.weight_grams}g body weight)
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

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={refused}
          onChange={(e) => setRefused(e.target.checked)}
          className="w-4 h-4 accent-[#c45a5a]"
        />
        <span className="text-sm" style={{ color: '#f0ece0' }}>Animal refused food</span>
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
