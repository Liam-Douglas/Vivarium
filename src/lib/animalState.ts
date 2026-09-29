import { differenceInCalendarDays } from 'date-fns'

/**
 * States an animal can be in that no schedule produces.
 *
 * Feeding, medication and care all have a cadence someone sets, so a queue can
 * ask "what is due". These are the opposite: conditions that are true until
 * somebody notices them. On a well-run collection they are most of what the
 * dashboard has to say.
 */

export interface QuarantineState {
  quarantine_started_at: string | null
  quarantine_ended_at: string | null
}

/** Started and not ended. Was written inline in pages/Animals.tsx. */
export function inQuarantine(animal: QuarantineState): boolean {
  return Boolean(animal.quarantine_started_at) && !animal.quarantine_ended_at
}

/** How long a quarantine has been running, or null when it is not. */
export function quarantineDays(
  animal: QuarantineState,
  now: Date = new Date()
): number | null {
  if (!inQuarantine(animal) || !animal.quarantine_started_at) return null
  return differenceInCalendarDays(now, new Date(animal.quarantine_started_at))
}

/**
 * A weight nobody has taken in a season.
 *
 * Not a schedule — the app has never had one for weighing — so this is a
 * threshold rather than a due date, and it is deliberately generous. A reptile
 * weighed quarterly is being looked after; one last weighed a year ago is a
 * record nobody is keeping.
 */
export const STALE_WEIGHT_DAYS = 120

export interface WeighedAt {
  logged_at: string
}

/**
 * The most recent weight, or null when there is none.
 *
 * Order-independent: the query returns newest-first and nothing in the
 * signature says so.
 */
export function lastWeighedAt(logs: readonly WeighedAt[]): Date | null {
  let latest: number | null = null
  for (const log of logs) {
    const t = new Date(log.logged_at).getTime()
    if (Number.isNaN(t)) continue
    if (latest === null || t > latest) latest = t
  }
  return latest === null ? null : new Date(latest)
}

/**
 * True when an animal has weight records but none recently.
 *
 * An animal that has *never* been weighed is deliberately not stale. It is a
 * different thing — nobody started rather than somebody stopped — and calling
 * it stale would fill the list with every animal on the day the feature ships.
 */
export function hasStaleWeight(
  logs: readonly WeighedAt[],
  now: Date = new Date(),
  thresholdDays: number = STALE_WEIGHT_DAYS
): boolean {
  const last = lastWeighedAt(logs)
  if (!last) return false
  return differenceInCalendarDays(now, last) > thresholdDays
}
