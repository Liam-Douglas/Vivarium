import { differenceInCalendarDays } from 'date-fns'

/**
 * What an incubation record means, derived rather than stored.
 *
 * `incubations` has existed since before the migration history and no screen has
 * ever read it. Four of its columns are dates and numbers that only mean
 * something in relation to each other — a start with no end is running, an
 * expected date in the past with no actual one is late, hatchlings against
 * fertile eggs is a rate — and every one of those sentences is the kind this
 * project has got wrong inline: an index read as a horizon, a prediction living
 * in two places by two sets of rules. So they live here, once, tested.
 */

export interface IncubationRow {
  start_date: string
  expected_hatch_date: string | null
  actual_hatch_date: string | null
  clutch_size: number | null
  eggs_fertile: number | null
  hatchlings: number | null
}

/**
 * How close to the expected date counts as "due".
 *
 * Matched to the shed window (`SHED_SOON_DAYS`) rather than chosen fresh: both
 * answer "start paying attention", and two numbers for one idea is the shape
 * this project keeps removing.
 */
export const HATCH_SOON_DAYS = 5

export type IncubationState = 'incubating' | 'due' | 'overdue' | 'hatched'

/** A parsed date, or null when the value is absent or unparseable. */
function parsed(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Where an incubation stands.
 *
 * Three decisions worth stating, because each one could defensibly have gone
 * the other way:
 *
 * - **An actual hatch date wins.** Set it and the record is `hatched`, whatever
 *   the expected date says. The thing that happened outranks the thing that was
 *   predicted.
 * - **No expected date is never late.** It is `incubating` until somebody says
 *   when it should end — nobody stated a target, so nothing can be missed. Same
 *   reasoning as a never-weighed animal not being a stale weight: "nobody
 *   started" and "somebody stopped" are different conditions, and folding them
 *   together floods the screen on the day it ships.
 * - **`outcome` is not read.** The column is free text, the database defines no
 *   vocabulary for it, and no migration constrains it. Guessing that "failed"
 *   or "infertile" means something specific would invent a second source of
 *   truth beside these dates and let the two disagree. It is shown to the
 *   keeper, who wrote it, and never interpreted here.
 */
export function incubationState(
  row: IncubationRow,
  now: Date = new Date()
): IncubationState {
  if (parsed(row.actual_hatch_date)) return 'hatched'

  const expected = parsed(row.expected_hatch_date)
  if (!expected) return 'incubating'

  const days = differenceInCalendarDays(expected, now)
  if (days < 0) return 'overdue'
  if (days <= HATCH_SOON_DAYS) return 'due'
  return 'incubating'
}

/**
 * Days elapsed, counted to the hatch once there is one and to now before that.
 *
 * So a running incubation's figure climbs and a finished one's stops, which is
 * what makes the same number readable in both rows. Null when the start date is
 * missing or unparseable, and never negative: a start date in the future is a
 * typo, not a negative incubation.
 */
export function daysIncubating(
  row: IncubationRow,
  now: Date = new Date()
): number | null {
  const start = parsed(row.start_date)
  if (!start) return null
  const end = parsed(row.actual_hatch_date) ?? now
  return Math.max(0, differenceInCalendarDays(end, start))
}

/** Start to hatch, in days. Null while it is still running. */
export function incubationDuration(row: IncubationRow): number | null {
  if (!parsed(row.actual_hatch_date)) return null
  return daysIncubating(row)
}

/**
 * Days until the expected hatch — negative once it has passed.
 *
 * Null when no expected date was set, and null once it has hatched: a countdown
 * to a date that has been overtaken by the event is noise.
 */
export function daysUntilHatch(
  row: IncubationRow,
  now: Date = new Date()
): number | null {
  if (parsed(row.actual_hatch_date)) return null
  const expected = parsed(row.expected_hatch_date)
  if (!expected) return null
  return differenceInCalendarDays(expected, now)
}

/**
 * Hatchlings as a share of the eggs that could have produced them, 0–1.
 *
 * Measured against fertile eggs when that is recorded, because that is the
 * number incubation is responsible for — a clutch that was half infertile is a
 * pairing outcome, not an incubation one. Falls back to the clutch size when
 * fertility was never counted, which is a different question answered with the
 * same arithmetic, so the caller is told which one it got.
 *
 * Null rather than zero when the sum cannot be taken: no hatchlings recorded,
 * no denominator, or a denominator of zero. Zero would read as "nothing
 * hatched", and "not known" is not that.
 *
 * Not clamped. More hatchlings than eggs is impossible, so a rate above 1 is a
 * data-entry error, and showing 150% puts it in front of the person who can fix
 * it rather than hiding it at 100%.
 */
export function hatchRate(
  row: IncubationRow
): { rate: number; basis: 'fertile' | 'clutch' } | null {
  if (row.hatchlings == null) return null

  const fertile = row.eggs_fertile
  if (fertile != null && fertile > 0) {
    return { rate: row.hatchlings / fertile, basis: 'fertile' }
  }

  const clutch = row.clutch_size
  if (clutch != null && clutch > 0) {
    return { rate: row.hatchlings / clutch, basis: 'clutch' }
  }

  return null
}
