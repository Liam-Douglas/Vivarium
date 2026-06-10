// Zod schemas shared by forms and the spreadsheet importer.
// Keeps unbounded / malformed values out of the database.

import { z } from 'zod'

const notes = z.string().trim().max(1000, 'Notes too long').optional().nullable()

export const feedingLogSchema = z.object({
  animal_id: z.string().min(1, 'Select an animal'),
  prey_type: z.string().trim().min(1, 'Prey type is required').max(100),
  prey_size: z.string().trim().max(100).optional(),
  quantity: z.number().int('Quantity must be a whole number').min(1, 'Quantity must be at least 1').max(1000),
  fed_at: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date'),
  refused: z.boolean(),
  notes,
})

// ─── Import row schemas ──────────────────────────────────────────────────────
// Rows are pre-mapped to DB shape in Import.autoMap; these validate the values.

const isoDate = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date')
  .refine((s) => {
    const t = Date.parse(s)
    const year = new Date(t).getFullYear()
    return year >= 1900 && year <= 2100
  }, 'Date out of range')

// Ownership columns are attached by the importer from trusted context; carry
// them through validation so the validated output stays insert-ready.
const ownership = {
  household_id: z.string().min(1),
  user_id: z.string().min(1),
}

export const importAnimalSchema = z.object({
  ...ownership,
  name: z.string().trim().min(1).max(120),
  species: z.string().trim().min(1).max(120),
  morph: z.string().trim().max(120).nullable().optional(),
  sex: z.string().trim().max(20).nullable().optional(),
  date_of_birth: isoDate.nullable().optional(),
  feeding_frequency_days: z.number().int().min(1).max(365).nullable().optional(),
  notes,
  is_active: z.boolean().optional(),
})

export const importFeedingSchema = z.object({
  ...ownership,
  animal_name: z.string().trim().min(1).max(120),
  fed_at: isoDate,
  prey_type: z.string().trim().min(1).max(100),
  prey_size: z.string().trim().max(100).nullable().optional(),
  quantity: z.number().int().min(1).max(1000),
  refused: z.boolean(),
  notes,
})

export const importShedSchema = z.object({
  ...ownership,
  animal_name: z.string().trim().min(1).max(120),
  shed_at: isoDate,
  complete: z.boolean(),
  notes,
})

// Validate a list of rows, returning the valid ones plus the count skipped.
export function partitionValid<T>(
  schema: z.ZodType<T>,
  rows: unknown[]
): { valid: T[]; skipped: number } {
  const valid: T[] = []
  let skipped = 0
  for (const row of rows) {
    const result = schema.safeParse(row)
    if (result.success) valid.push(result.data)
    else skipped++
  }
  return { valid, skipped }
}
