// Shared date helpers.
//
// `<input type="date">` yields a date-only string ("YYYY-MM-DD") with no timezone.
// Passing that straight to `new Date(str).toISOString()` parses it as UTC midnight,
// which then renders as the *previous* day for users west of UTC (and shifts the
// recorded time for everyone). We anchor date-only values to local noon so the
// stored timestamp always falls on the day the user actually picked.

import { differenceInCalendarDays } from 'date-fns'

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

// Whole-day difference using the user's local calendar, so "fed yesterday" is 1
// regardless of the time of day either timestamp falls on.
export function daysSince(iso: string): number {
  return differenceInCalendarDays(new Date(), new Date(iso))
}

// An animal is overdue once a full feeding interval of calendar days has elapsed.
export function isOverdue(lastFedAt: string | null, frequencyDays: number | null): boolean {
  if (!lastFedAt || !frequencyDays) return false
  return daysSince(lastFedAt) >= frequencyDays
}
