import { differenceInCalendarDays, format } from 'date-fns'

// The feeding list repeated a date on every row — "Sep 14, Sep 14, Sep 5, Sep 5,
// Sep 5" down the right-hand edge — which is noise standing in for structure.
// Feeding happens in sessions, so the list groups by the day it happened on.

export interface DayGroup<T> {
  /** Local calendar day, yyyy-MM-dd. Local, not UTC: a 9pm feeding in Sydney
   *  belongs to the day the keeper remembers, not to the next UTC date. */
  key: string
  date: Date
  /** "Today", "Yesterday", or the weekday and date. */
  label: string
  /** "6 days ago" — empty for today and yesterday, where the label says it. */
  relative: string
  entries: T[]
}

/** How long ago, in the coarsest unit that still reads precisely. */
export function describeElapsed(date: Date, now: Date = new Date()): string {
  const days = differenceInCalendarDays(now, date)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  // A date picker lets a feeding be logged ahead of time; say so rather than
  // rendering "-3 days ago".
  if (days < 0) {
    const ahead = Math.abs(days)
    return ahead === 1 ? 'tomorrow' : `in ${ahead} days`
  }
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.round(days / 7)} weeks ago`
  // No "last month" case: anything that would round to one month is already
  // under 60 days and answered in weeks above.
  return `${Math.round(days / 30)} months ago`
}

export function dayHeading(date: Date, now: Date = new Date()): { label: string; relative: string } {
  const days = differenceInCalendarDays(now, date)
  if (days === 0) return { label: 'Today', relative: '' }
  if (days === 1) return { label: 'Yesterday', relative: '' }
  const sameYear = date.getFullYear() === now.getFullYear()
  return {
    label: format(date, sameYear ? 'EEEE d MMMM' : 'd MMMM yyyy'),
    relative: describeElapsed(date, now),
  }
}

/**
 * Group timestamped entries into local calendar days, newest day first.
 *
 * Entry order within a day is the order they arrived in, so a caller that
 * sorted its rows keeps that sort. Entries with an unparseable timestamp are
 * dropped rather than collapsed into an "Invalid Date" group.
 */
export function groupByDay<T extends { fed_at: string }>(
  entries: T[],
  now: Date = new Date()
): DayGroup<T>[] {
  const groups = new Map<string, DayGroup<T>>()

  for (const entry of entries) {
    const date = new Date(entry.fed_at)
    if (Number.isNaN(date.getTime())) continue
    const key = format(date, 'yyyy-MM-dd')
    const existing = groups.get(key)
    if (existing) {
      existing.entries.push(entry)
      continue
    }
    const { label, relative } = dayHeading(date, now)
    groups.set(key, { key, date, label, relative, entries: [entry] })
  }

  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key))
}
