// Builders for the rows the app reads.
//
// Every builder returns a complete row with sensible defaults, so a scenario
// names only the field it is about: `animal('Suki', { last_fed_at: daysAgo(30) })`
// reads as "an animal last fed a month ago" rather than as twenty columns of
// noise. The defaults are deliberately boring — a healthy animal on a
// fortnightly cycle, fed yesterday — so that anything a scenario does not
// mention contributes nothing to what renders.
//
// These are not anyone's records. Nothing here is loaded from the database and
// nothing here proves anything about real data; see docs/render-harness.md.

export const HOUSEHOLD_ID = '11111111-1111-1111-1111-111111111111'
export const USER_ID = '22222222-2222-2222-2222-222222222222'

/** An ISO timestamp `n` days before now. Negative values are in the future. */
export const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString()

let counter = 0
/** Stable within a run, unique across builders — enough for React keys. */
const id = (prefix) => `${prefix}-${String(++counter).padStart(4, '0')}`

const owned = () => ({ household_id: HOUSEHOLD_ID, user_id: USER_ID })

export function animal(name, over = {}) {
  return {
    id: id('animal'), ...owned(), name,
    species: 'Ball python', morph: null, sex: 'unknown', date_of_birth: null,
    feeding_frequency_days: 14, last_fed_at: daysAgo(1),
    enclosure_id: null, photo_url: null, notes: null,
    quarantine_started_at: null, quarantine_ended_at: null,
    acquired_at: null, is_active: true, custom_fields: null,
    created_at: daysAgo(400), updated_at: daysAgo(1),
    ...over,
  }
}

export function feedingLog(animalId, over = {}) {
  return {
    id: id('feeding'), ...owned(), animal_id: animalId,
    fed_at: daysAgo(1), prey_type: 'Rat', prey_size: 'Medium',
    quantity: 1, refused: false, notes: null, created_at: daysAgo(1),
    ...over,
  }
}

export function sheddingLog(animalId, over = {}) {
  return {
    id: id('shed'), ...owned(), animal_id: animalId,
    shed_at: daysAgo(10), complete: true, notes: null, created_at: daysAgo(10),
    ...over,
  }
}

/**
 * A run of sheds at a fixed interval, newest `lastDaysAgo` back.
 *
 * Three is the minimum the predictor accepts — two logs give one interval, and
 * one interval is an observation rather than a cycle.
 */
export function shedSeries(animalId, { everyDays, lastDaysAgo, count = 3 }) {
  return Array.from({ length: count }, (_, i) =>
    sheddingLog(animalId, { shed_at: daysAgo(lastDaysAgo + i * everyDays) }))
}

export function weightLog(animalId, over = {}) {
  return {
    id: id('weight'), ...owned(), animal_id: animalId,
    weight_grams: 1200, logged_at: daysAgo(7), notes: null,
    ...over,
  }
}

export function careTask(name, over = {}) {
  return {
    id: id('task'), ...owned(), name, kind: 'custom',
    animal_id: null, enclosure_id: null,
    frequency_days: 7, last_done_at: daysAgo(1), is_active: true, notes: null,
    created_at: daysAgo(30), updated_at: daysAgo(1),
    ...over,
  }
}

export function enclosure(name, over = {}) {
  return {
    id: id('enclosure'), ...owned(), name,
    type: null, width_cm: null, height_cm: null, depth_cm: null,
    substrate: null, notes: null, created_at: daysAgo(100),
    ...over,
  }
}

/**
 * A feeder item and its stock level, which live in two places: the row comes
 * from feeder_items, the count from the feeder_stock view. useFeederInventory
 * reads both and joins them, so a fixture has to supply both or every item
 * reads as zero in stock.
 *
 * Returns the pair. Scenarios pass `stock` and never think about the view.
 *
 *   feeder('Rats (Medium)', { stock: 3 })
 *
 * The name matters: lib/feederMatch parses "Rats (Medium)" into a base and a
 * size to connect a logged meal to an item, so a fixture named "rats" will
 * silently match nothing.
 */
export function feeder(name, { stock = 20, ...over } = {}) {
  const item = {
    id: id('feeder'), ...owned(), name,
    feeder_type: 'frozen', unit_label: 'each',
    low_stock_threshold: 4, created_at: daysAgo(100),
    ...over,
  }
  return {
    item,
    stock: { feeder_item_id: item.id, household_id: HOUSEHOLD_ID, current_stock: stock },
  }
}

export function medicationSchedule(animalId, name, over = {}) {
  return {
    id: id('medschedule'), ...owned(), animal_id: animalId, name,
    dosage: '0.2ml', frequency_days: 1,
    start_date: daysAgo(3), end_date: null, is_active: true, notes: null,
    created_at: daysAgo(3), updated_at: daysAgo(3),
    ...over,
  }
}

export function medicationLog(scheduleId, animalId, over = {}) {
  return {
    id: id('medlog'), ...owned(), schedule_id: scheduleId, animal_id: animalId,
    given_at: daysAgo(1), notes: null, created_at: daysAgo(1),
    ...over,
  }
}
