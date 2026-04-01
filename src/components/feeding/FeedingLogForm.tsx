import { useState } from 'react'
import { useAnimals } from '@/hooks/useAnimals'
import { useFeederInventory } from '@/hooks/useFeederInventory'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useToast } from '@/components/ui/Toast'
import { createFeedingLog, createFeederStockEvent } from '@/lib/queries'
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

  // Find matching feeder for this prey type
  function findMatchingFeeder() {
    const lc = preyType.toLowerCase()
    return feeders.find((f) => f.name.toLowerCase().includes(lc) || lc.includes(f.name.toLowerCase()))
  }

  async function handleSubmit() {
    if (!user || !householdId || !animalId || !preyType) return
    setSaving(true)
    try {
      const log = await createFeedingLog({
        household_id: householdId,
        animal_id: animalId,
        user_id: user.id,
        fed_at: new Date(fedAt).toISOString(),
        prey_type: preyType,
        prey_size: preySize || undefined,
        quantity: Number(quantity),
        refused,
        notes: notes || undefined,
      })

      // Try to deduct from inventory silently
      if (!refused) {
        const feeder = findMatchingFeeder()
        if (feeder) {
          try {
            await createFeederStockEvent({
              household_id: householdId,
              feeder_item_id: feeder.id,
              user_id: user.id,
              event_type: 'feeding_deduction',
              quantity_delta: -Number(quantity),
              source_ref_id: log.id,
            })
            refreshFeeders()
          } catch {
            // Silent failure — inventory deduction is secondary
          }
        } else {
          showToast(
            `Track ${preyType} in feeder inventory?`,
            'info',
            { label: 'Add', onClick: () => { /* navigate to feeders */ } }
          )
        }
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
          disabled={!animalId || !preyType}
        >
          Save feeding
        </Button>
      </div>
    </div>
  )
}
