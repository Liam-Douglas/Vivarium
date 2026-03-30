import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { createAnimal, updateAnimal, uploadAnimalPhoto } from '@/lib/queries'
import { useAuth } from '@/context/AuthContext'
import { useHousehold } from '@/context/HouseholdContext'
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
  onSuccess: () => void
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

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function onSubmit(values: FormValues) {
    if (!user || !householdId) return
    setSaving(true)
    try {
      let photo_url = animal?.photo_url ?? null

      if (animal) {
        const updated = await updateAnimal(animal.id, {
          name: values.name,
          species: values.species,
          morph: values.morph || null,
          sex: values.sex || null,
          date_of_birth: values.date_of_birth || null,
          feeding_frequency_days: values.feeding_frequency_days ? Number(values.feeding_frequency_days) : null,
          notes: values.notes || null,
        })
        if (photoFile) {
          photo_url = await uploadAnimalPhoto(householdId, updated.id, photoFile)
          await updateAnimal(updated.id, { photo_url })
        }
      } else {
        const created = await createAnimal({
          household_id: householdId,
          user_id: user.id,
          name: values.name,
          species: values.species,
          morph: values.morph || undefined,
          sex: values.sex || undefined,
          date_of_birth: values.date_of_birth || undefined,
          feeding_frequency_days: values.feeding_frequency_days ? Number(values.feeding_frequency_days) : 7,
          notes: values.notes || undefined,
        })
        if (photoFile) {
          photo_url = await uploadAnimalPhoto(householdId, created.id, photoFile)
          await updateAnimal(created.id, { photo_url })
        }
      }

      showToast(animal ? 'Animal updated' : 'Animal added', 'success')
      onSuccess()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Something went wrong', 'error')
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
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </Select>

      <Input label="Date of birth" type="date" {...register('date_of_birth')} />
      <Input label="Feeding frequency (days)" type="number" min={1} {...register('feeding_frequency_days')} placeholder="e.g. 7" />
      <Textarea label="Notes" {...register('notes')} placeholder="Any notes..." rows={3} />

      <div className="flex gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel} fullWidth>Cancel</Button>
        <Button type="submit" loading={saving} fullWidth>{animal ? 'Save changes' : 'Add animal'}</Button>
      </div>
    </form>
  )
}
