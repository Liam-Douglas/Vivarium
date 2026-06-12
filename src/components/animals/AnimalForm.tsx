import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { createAnimal, updateAnimal, uploadAnimalPhoto } from '@/lib/queries'
import { processImage, ImageValidationError } from '@/lib/image'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
import { useEnclosures } from '@/hooks/useEnclosures'
import { useRef, useState } from 'react'
import type { Animal } from '@/hooks/useAnimals'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  species: z.string().min(1, 'Species is required'),
  morph: z.string().optional(),
  sex: z.string().optional(),
  date_of_birth: z.string().optional(),
  feeding_frequency_days: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface AnimalFormProps {
  animal?: Animal
  onSuccess: (updated?: Partial<Animal>) => void
  onCancel: () => void
}

export function AnimalForm({ animal, onSuccess, onCancel }: AnimalFormProps) {
  const { user } = useAuth()
  const { householdId } = useHousehold()
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(animal?.photo_url ?? null)
  const [saving, setSaving] = useState(false)

  // Tags
  const [tags, setTags] = useState<string[]>(animal?.tags ?? [])
  const [tagInput, setTagInput] = useState('')

  // Quarantine
  const isCurrentlyInQuarantine = !!(animal?.quarantine_started_at && !animal?.quarantine_ended_at)
  const [inQuarantine, setInQuarantine] = useState(isCurrentlyInQuarantine)
  const [quarantineDate, setQuarantineDate] = useState(
    animal?.quarantine_started_at?.split('T')[0] ?? new Date().toISOString().split('T')[0]
  )

  // Sale listing
  const [isForSale, setIsForSale] = useState(animal?.is_for_sale ?? false)
  const [askingPrice, setAskingPrice] = useState(
    animal?.asking_price_cents != null ? String(animal.asking_price_cents / 100) : ''
  )

  // Enclosure
  const { data: enclosures } = useEnclosures()
  const [enclosureId, setEnclosureId] = useState<string>(animal?.enclosure_id ?? '')

  // Custom fields
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>(
    Object.entries(animal?.custom_fields ?? {}).map(([key, value]) => ({ key, value: String(value) }))
  )

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: animal?.name ?? '',
      species: animal?.species ?? '',
      morph: animal?.morph ?? '',
      sex: animal?.sex ?? '',
      date_of_birth: animal?.date_of_birth ? animal.date_of_birth.split('T')[0] : '',
      feeding_frequency_days: animal?.feeding_frequency_days != null ? String(animal.feeding_frequency_days) : '',
      notes: animal?.notes ?? '',
    },
  })

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      // Resize + re-encode, which also strips EXIF GPS metadata.
      const processed = await processImage(file)
      setPhotoFile(processed)
      setPhotoPreview(URL.createObjectURL(processed))
    } catch (err) {
      showToast(err instanceof ImageValidationError ? err.message : 'Could not load image', 'error')
    }
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/,/g, '')
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }
  function removeTag(t: string) { setTags(tags.filter((x) => x !== t)) }
  function handleTagKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
  }

  function addCustomField() { setCustomFields([...customFields, { key: '', value: '' }]) }
  function updateCustomField(i: number, field: 'key' | 'value', val: string) {
    const next = [...customFields]; next[i][field] = val; setCustomFields(next)
  }
  function removeCustomField(i: number) { setCustomFields(customFields.filter((_, j) => j !== i)) }

  async function onSubmit(values: FormValues) {
    if (!user || !householdId) return
    setSaving(true)
    try {
      let photo_url = animal?.photo_url ?? null

      const quarantine_started_at = inQuarantine ? new Date(quarantineDate).toISOString() : null
      const quarantine_ended_at = !inQuarantine && isCurrentlyInQuarantine ? new Date().toISOString() : (inQuarantine ? null : animal?.quarantine_ended_at ?? null)
      const custom_fields = Object.fromEntries(
        customFields.filter((f) => f.key.trim()).map((f) => [f.key.trim(), f.value])
      )

      const payload = {
        name: values.name,
        species: values.species,
        morph: values.morph || null,
        sex: values.sex || null,
        date_of_birth: values.date_of_birth || null,
        feeding_frequency_days: values.feeding_frequency_days ? Number(values.feeding_frequency_days) : 7,
        notes: values.notes || null,
        tags,
        quarantine_started_at,
        quarantine_ended_at,
        is_for_sale: isForSale,
        asking_price_cents: isForSale && askingPrice ? Math.round(Number(askingPrice) * 100) : null,
        custom_fields,
        enclosure_id: enclosureId || null,
      }

      if (animal) {
        await updateAnimal(animal.id, payload)
        if (photoFile) {
          try {
            photo_url = await uploadAnimalPhoto(householdId, animal.id, photoFile)
            await updateAnimal(animal.id, { photo_url })
          } catch {
            showToast('Details saved but photo upload failed', 'error')
          }
        }
      } else {
        const created = await createAnimal({ household_id: householdId, user_id: user.id, ...payload })
        if (photoFile) {
          try {
            photo_url = await uploadAnimalPhoto(householdId, created.id, photoFile)
            await updateAnimal(created.id, { photo_url })
          } catch {
            showToast('Animal added but photo upload failed', 'error')
          }
        }
      }

      showToast(animal ? 'Animal updated' : 'Animal added', 'success')
      onSuccess(animal ? { ...payload, photo_url } : undefined)
    } catch (e) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Something went wrong'
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as SubmitHandler<FormValues>)} className="flex flex-col gap-4">
      {/* Photo */}
      <div
        className="w-full h-36 rounded-xl flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
        style={{ backgroundColor: '#1a1a18', border: '1px dashed rgba(255,255,255,0.12)' }}
        onClick={() => fileRef.current?.click()}
      >
        {photoPreview ? (
          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: '#6a6458' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-xs mt-2" style={{ color: '#6a6458' }}>Tap to add photo</p>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
      </div>

      <Input label="Name *" {...register('name')} error={errors.name?.message} placeholder="e.g. Noodle" />
      <Input label="Species *" {...register('species')} error={errors.species?.message} placeholder="e.g. Ball python" />
      <Input label="Morph" {...register('morph')} placeholder="e.g. Pastel" />
      <Select label="Sex" {...register('sex')}>
        <option value="">Unknown</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </Select>
      <Input label="Date of birth" type="date" {...register('date_of_birth')} />
      <Input label="Feeding frequency (days)" type="number" min={1} {...register('feeding_frequency_days')} placeholder="e.g. 7" />
      {enclosures.length > 0 && (
        <Select
          label="Enclosure"
          value={enclosureId}
          onChange={(e) => setEnclosureId((e.target as HTMLSelectElement).value)}
        >
          <option value="">No enclosure</option>
          {enclosures.map((enc) => (
            <option key={enc.id} value={enc.id}>
              {enc.name}
            </option>
          ))}
        </Select>
      )}
      <Textarea label="Notes" {...register('notes')} placeholder="Any notes..." rows={3} />

      {/* Tags */}
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: '#a8a090' }}>Tags</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'rgba(143,190,90,0.12)', color: '#8fbe5a', border: '1px solid rgba(143,190,90,0.25)' }}>
              #{t}
              <button type="button" onClick={() => removeTag(t)} style={{ color: '#8fbe5a', lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKey}
            onBlur={addTag}
            placeholder="Add tag (Enter to confirm)"
            className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ backgroundColor: '#1a1a18', border: '1px solid rgba(255,255,255,0.08)', color: '#f0ece0' }}
          />
        </div>
      </div>

      {/* Quarantine */}
      <div className="rounded-xl p-3" style={{ backgroundColor: '#242420', border: `1px solid ${inQuarantine ? 'rgba(212,146,74,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={inQuarantine} onChange={(e) => setInQuarantine(e.target.checked)} className="w-4 h-4 accent-[#d4924a]" />
          <span className="text-sm font-medium" style={{ color: inQuarantine ? '#d4924a' : '#a8a090' }}>🔬 In quarantine</span>
        </label>
        {inQuarantine && (
          <div className="mt-3">
            <Input label="Quarantine started" type="date" value={quarantineDate} onChange={(e) => setQuarantineDate(e.target.value)} />
          </div>
        )}
      </div>

      {/* Sale listing */}
      <div className="rounded-xl p-3" style={{ backgroundColor: '#242420', border: `1px solid ${isForSale ? 'rgba(143,190,90,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={isForSale} onChange={(e) => setIsForSale(e.target.checked)} className="w-4 h-4 accent-[#8fbe5a]" />
          <span className="text-sm font-medium" style={{ color: isForSale ? '#8fbe5a' : '#a8a090' }}>🏷️ Listed for sale</span>
        </label>
        {isForSale && (
          <div className="mt-3">
            <Input label="Asking price (AUD)" type="number" min={0} step={0.01} value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} placeholder="0.00" />
          </div>
        )}
      </div>

      {/* Custom fields */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium" style={{ color: '#a8a090' }}>Custom fields</p>
          <button type="button" onClick={addCustomField} className="text-xs" style={{ color: '#8fbe5a' }}>+ Add field</button>
        </div>
        {customFields.map((cf, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              value={cf.key}
              onChange={(e) => updateCustomField(i, 'key', e.target.value)}
              placeholder="Field name"
              className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ backgroundColor: '#1a1a18', border: '1px solid rgba(255,255,255,0.08)', color: '#f0ece0' }}
            />
            <input
              value={cf.value}
              onChange={(e) => updateCustomField(i, 'value', e.target.value)}
              placeholder="Value"
              className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ backgroundColor: '#1a1a18', border: '1px solid rgba(255,255,255,0.08)', color: '#f0ece0' }}
            />
            <button type="button" onClick={() => removeCustomField(i)} className="w-8 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(196,90,90,0.1)', color: '#c45a5a' }}>×</button>
          </div>
        ))}
        {customFields.length === 0 && (
          <p className="text-xs" style={{ color: '#6a6458' }}>No custom fields. Tap "+ Add field" to track extra info like permit numbers, temperatures, etc.</p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel} fullWidth>Cancel</Button>
        <Button type="submit" loading={saving} fullWidth>{animal ? 'Save changes' : 'Add animal'}</Button>
      </div>
    </form>
  )
}
