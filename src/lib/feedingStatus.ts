import { differenceInCalendarDays } from 'date-fns'

/**
 * Feeding status for a single animal.
 *
 * `never-fed` and `no-schedule` are deliberately kept distinct from
 * `on-schedule`. An animal the app cannot derive a due date for is not an
 * animal that is doing fine — collapsing the two is what allowed a collection
 * with no feeding data at all to report "0 overdue" in green.
 */
export type FeedingStatus =
  | 'overdue'
  | 'due-soon'
  | 'on-schedule'
  | 'never-fed'
  | 'no-schedule'

/** The animal fields feeding status is derived from. */
export interface FeedingSchedule {
  last_fed_at: string | null
  feeding_frequency_days: number | null
}

export const FEEDING_STATUS_META: Record<FeedingStatus, { color: string; label: string }> = {
  overdue: { color: '#c45a5a', label: 'Overdue' },
  'due-soon': { color: '#d4924a', label: 'Due soon' },
  'on-schedule': { color: '#5a9e6a', label: 'Fed recently' },
  'never-fed': { color: '#6a6458', label: 'Never fed' },
  'no-schedule': { color: '#6a6458', label: 'No schedule' },
}

export function getFeedingStatus(animal: FeedingSchedule, now: Date = new Date()): FeedingStatus {
  if (!animal.feeding_frequency_days) return 'no-schedule'
  if (!animal.last_fed_at) return 'never-fed'
  // Calendar days, not elapsed 24h periods, so "fed yesterday" is 1 whatever
  // the clock says — the rule lib/dates.ts already documents and applies.
  const daysSince = differenceInCalendarDays(now, new Date(animal.last_fed_at))
  if (daysSince > animal.feeding_frequency_days) return 'overdue'
  if (daysSince >= animal.feeding_frequency_days - 1) return 'due-soon'
  return 'on-schedule'
}

/**
 * True when the app has no basis for a due date, so the animal can never
 * appear in a feeding queue. These need setting up, not feeding.
 */
export function isUntracked(status: FeedingStatus): boolean {
  return status === 'never-fed' || status === 'no-schedule'
}

/** Sort key for "most urgent first": overdue, due soon, on schedule, untracked. */
export const FEEDING_URGENCY: Record<FeedingStatus, number> = {
  overdue: 0,
  'due-soon': 1,
  'on-schedule': 2,
  'never-fed': 3,
  'no-schedule': 3,
}

export interface FeedingSummary {
  overdue: number
  dueSoon: number
  onSchedule: number
  neverFed: number
  noSchedule: number
  /** neverFed + noSchedule — animals no queue can ever surface. */
  untracked: number
  /** Animals the app can actually derive a due date for. */
  tracked: number
}

export function summariseFeeding<T extends FeedingSchedule>(
  animals: T[],
  now: Date = new Date()
): FeedingSummary {
  const summary: FeedingSummary = {
    overdue: 0, dueSoon: 0, onSchedule: 0, neverFed: 0, noSchedule: 0, untracked: 0, tracked: 0,
  }
  for (const animal of animals) {
    switch (getFeedingStatus(animal, now)) {
      case 'overdue': summary.overdue++; break
      case 'due-soon': summary.dueSoon++; break
      case 'on-schedule': summary.onSchedule++; break
      case 'never-fed': summary.neverFed++; break
      case 'no-schedule': summary.noSchedule++; break
    }
  }
  summary.untracked = summary.neverFed + summary.noSchedule
  summary.tracked = animals.length - summary.untracked
  return summary
}
