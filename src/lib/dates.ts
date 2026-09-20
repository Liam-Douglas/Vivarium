// Shared date helpers.
//
// `<input type="date">` yields a date-only string ("YYYY-MM-DD") with no timezone.
// Passing that straight to `new Date(str).toISOString()` parses it as UTC midnight,
// which then renders as the *previous* day for users west of UTC (and shifts the
// recorded time for everyone). We anchor date-only values to local noon so the
// stored timestamp always falls on the day the user actually picked.

import { differenceInCalendarDays, format } from 'date-fns'
import { getFeedingStatus } from '@/lib/feedingStatus'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

// Convert a date-only input value to an ISO timestamp anchored at local noon.
export function dateInputToISO(dateStr: string): string {
  if (DATE_ONLY.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d, 12, 0, 0).toISOString()
  }
  // Already a datetime (e.g. datetime-local) — preserve as given.
  return new Date(dateStr).toISOString()
}

/**
 * ISO timestamp to a value `<input type="datetime-local">` accepts, in local time.
 *
 * The obvious wrong version is `iso.slice(0, 16)`, which reads the stored UTC
 * string as if it were local: AnimalDetail's inline feeding editor used
 * `iso.split('T')[0]` and so showed a 9pm feeding in UTC+10 as the next day,
 * then anchored it to noon on save. Both halves of that bug are covered by the
 * round-trip test: slicing loses the time, so it cannot come back unchanged.
 */
export function isoToDateTimeInput(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm")
}

// Whole-day difference using the user's local calendar, so "fed yesterday" is 1
// regardless of the time of day either timestamp falls on.
export function daysSince(iso: string): number {
  return differenceInCalendarDays(new Date(), new Date(iso))
}

// Delegates to the shared feeding status so a notification can never disagree
// with what the screens show. Previously this used `>= frequencyDays` while
// every screen used `>`, so an animal at exactly its interval was pushed as
// "overdue" and displayed as "due soon".
export function isOverdue(
  lastFedAt: string | null,
  frequencyDays: number | null,
  now: Date = new Date()
): boolean {
  return getFeedingStatus(
    { last_fed_at: lastFedAt, feeding_frequency_days: frequencyDays },
    now
  ) === 'overdue'
}
