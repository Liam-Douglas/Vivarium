// Ties every hand-written row interface to the database column list that
// scripts/generate-types.mjs produced. A renamed, dropped or retyped column
// resolves an assertion to `false`, and `Assert` refuses it — so `tsc` fails,
// so CI fails, so it cannot ship.
//
// This exists because the medication feature ran for five months against
// columns that were not there (`name` for `medication_name`, `frequency_days`
// for a text `frequency`, `given_at` for `administered_at`), failing silently
// on every read and write. Nothing in the repository could have caught it:
// these tables were created in the Supabase UI and nothing compared the two
// sides. Now something does.
//
// Regenerate the types after any schema change — docs/schema-types.md.

import type { TableRow } from './database.types'
import type { AcquisitionRecord } from '@/hooks/useAcquisitionRecords'
import type { AnimalPhoto } from '@/hooks/useAnimalPhotos'
import type { Animal } from '@/hooks/useAnimals'
import type { BreedingRecord } from '@/hooks/useBreedingRecords'
import type { CareTask } from '@/hooks/useCareTasks'
import type { Enclosure } from '@/hooks/useEnclosures'
import type { ExitRecord } from '@/hooks/useExitRecords'
import type { Expense } from '@/hooks/useExpenses'
import type { FeederItem, FeederStockEvent } from '@/hooks/useFeederInventory'
import type { FeedingLog } from '@/hooks/useFeedingLogs'
import type { HealthEvent } from '@/hooks/useHealthEvents'
import type { MedicationLog } from '@/hooks/useMedicationLogs'
import type { MedicationSchedule } from '@/hooks/useMedicationSchedules'
import type { SheddingLog } from '@/hooks/useSheddingLogs'
import type { VetContact } from '@/hooks/useVetContacts'
import type { WeightLog } from '@/hooks/useWeightLogs'

type Assert<T extends true> = T

/**
 * One-directional on purpose: the row must provide everything the interface
 * requires. A table holding columns the client does not model is normal and
 * not an error; the client expecting something absent is.
 */
type RowSatisfies<Row, Interface> = Row extends Interface ? true : false

export type _AcquisitionRecords = Assert<RowSatisfies<TableRow<'acquisition_records'>, AcquisitionRecord>>
export type _AnimalPhotos = Assert<RowSatisfies<TableRow<'animal_photos'>, AnimalPhoto>>
// custom_fields is omitted: it is jsonb, so the generated type is `Json` —
// maximally permissive, because Postgres does not enforce a shape inside a
// jsonb column. The client narrowing it to Record<string, string> is a choice
// about content, not a claim about the schema, and this file only checks the
// latter.
export type _Animals = Assert<RowSatisfies<TableRow<'animals'>, Omit<Animal, 'custom_fields'>>>
export type _BreedingRecords = Assert<RowSatisfies<TableRow<'breeding_records'>, BreedingRecord>>
export type _CareTasks = Assert<RowSatisfies<TableRow<'care_tasks'>, CareTask>>
export type _Enclosures = Assert<RowSatisfies<TableRow<'enclosures'>, Enclosure>>
export type _ExitRecords = Assert<RowSatisfies<TableRow<'exit_records'>, ExitRecord>>
export type _Expenses = Assert<RowSatisfies<TableRow<'expenses'>, Expense>>
export type _FeederItems = Assert<RowSatisfies<TableRow<'feeder_items'>, FeederItem>>
export type _FeederStockEvents = Assert<RowSatisfies<TableRow<'feeder_stock_events'>, FeederStockEvent>>
// FeederItemWithStock adds computed fields that no column backs, so only the
// base interface is checked.
export type _FeedingLogs = Assert<RowSatisfies<TableRow<'feeding_logs'>, Omit<FeedingLog, 'animals'>>>
export type _HealthEvents = Assert<RowSatisfies<TableRow<'health_events'>, HealthEvent>>
export type _MedicationLogs = Assert<RowSatisfies<TableRow<'medication_logs'>, MedicationLog>>
export type _MedicationSchedules = Assert<RowSatisfies<TableRow<'medication_schedules'>, MedicationSchedule>>
export type _SheddingLogs = Assert<RowSatisfies<TableRow<'shedding_logs'>, Omit<SheddingLog, 'animals'>>>
export type _VetContacts = Assert<RowSatisfies<TableRow<'vet_contacts'>, VetContact>>
export type _WeightLogs = Assert<RowSatisfies<TableRow<'weight_logs'>, WeightLog>>
