import { addDays, differenceInCalendarDays } from 'date-fns'

/**
 * When an animal is next expected to shed, from its own history.
 *
 * Unlike feeding and care, a shed has no schedule anyone sets — the interval is
 * whatever the animal has been doing. This was computed inline on AnimalDetail
 * to draw one label; the Dashboard needs the same answer across a collection,
 * so it lives here and is tested rather than being written twice.
 *
 * Deliberately order-independent: the logs arrive newest-first from the query
 * but nothing in the signature says so, and a caller that reversed them would
 * otherwise get a confident wrong answer.
 */

export interface ShedLog {
  shed_at: string
}

export interface ShedPrediction {
  /** When the next shed is expected. */
  due: Date
  /** The average interval it was derived from, in days. */
  intervalDays: number
  /** How many intervals that average covers. */
  samples: number
}

/** Intervals beyond this are not a cycle — a gap in the records, or a move. */
const MAX_SANE_INTERVAL_DAYS = 400

/** Only the recent past predicts: a hatchling's intervals say nothing about an adult's. */
const INTERVALS_CONSIDERED = 5

export interface ShedInterval {
  /** The shed that closed this interval. */
  at: Date
  /** Days since the shed before it. */
  days: number
  /** Whether the shed that closed it came away whole. */
  complete: boolean
}

export interface DetailedShedLog extends ShedLog {
  complete: boolean
}

/**
 * The gap before each shed, oldest first.
 *
 * What the interval chart draws, and what the summary averages. It shares
 * predictNextShed's view of a sane interval, so the chart, the average and the
 * prediction cannot quietly disagree about which gaps are cycles and which are
 * missing records.
 */
export function shedIntervals(logs: readonly DetailedShedLog[]): ShedInterval[] {
  const sorted = logs
    .filter((log) => !Number.isNaN(new Date(log.shed_at).getTime()))
    .sort((a, b) => new Date(a.shed_at).getTime() - new Date(b.shed_at).getTime())

  const intervals: ShedInterval[] = []
  for (let i = 1; i < sorted.length; i++) {
    const at = new Date(sorted[i].shed_at)
    const days = Math.round((at.getTime() - new Date(sorted[i - 1].shed_at).getTime()) / 86_400_000)
    if (days > 0 && days <= MAX_SANE_INTERVAL_DAYS) {
      intervals.push({ at, days, complete: sorted[i].complete })
    }
  }
  return intervals
}

export interface ShedSummary {
  total: number
  complete: number
  /** Mean of the recent intervals, or null when there are none to average. */
  averageIntervalDays: number | null
}

/** The three figures above the interval chart. */
export function summariseSheds(logs: readonly DetailedShedLog[]): ShedSummary {
  const intervals = shedIntervals(logs)
  const recent = intervals.slice(-INTERVALS_CONSIDERED)
  return {
    total: logs.length,
    complete: logs.filter((log) => log.complete).length,
    averageIntervalDays: recent.length > 0
      ? Math.round(recent.reduce((sum, i) => sum + i.days, 0) / recent.length)
      : null,
  }
}

/**
 * The next expected shed, or null when the history cannot support a guess.
 *
 * Needs three logs, because two only give one interval and one interval is an
 * observation rather than a cycle.
 */
export function predictNextShed(logs: readonly ShedLog[]): ShedPrediction | null {
  const times = logs
    .map((l) => new Date(l.shed_at).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b)

  if (times.length < 3) return null

  const intervals: number[] = []
  for (let i = 1; i < times.length; i++) {
    const days = Math.round((times[i] - times[i - 1]) / 86_400_000)
    // A year-long gap is missing records, not a cycle, and averaging it in
    // pushes every prediction absurdly far out.
    if (days > 0 && days <= MAX_SANE_INTERVAL_DAYS) intervals.push(days)
  }
  if (intervals.length < 2) return null

  const recent = intervals.slice(-INTERVALS_CONSIDERED)
  const intervalDays = Math.round(recent.reduce((sum, d) => sum + d, 0) / recent.length)
  if (intervalDays < 1) return null

  return {
    due: addDays(new Date(times[times.length - 1]), intervalDays),
    intervalDays,
    samples: recent.length,
  }
}

/**
 * True when a shed is late by more than a fifth of its own interval.
 *
 * A flat margin would cry wolf on an animal that sheds every three weeks and
 * say nothing about one that sheds twice a year.
 */
export function isShedOverdue(
  prediction: ShedPrediction | null,
  now: Date = new Date()
): boolean {
  if (!prediction) return false
  const late = differenceInCalendarDays(now, prediction.due)
  return late > Math.max(3, Math.round(prediction.intervalDays * 0.2))
}

/** "Due in 5 days", "3 days late", "Due today". */
export function describeNextShed(
  prediction: ShedPrediction | null,
  now: Date = new Date()
): string | null {
  if (!prediction) return null
  const days = differenceInCalendarDays(prediction.due, now)
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days > 0) return `Due in ${days} days`
  const late = Math.abs(days)
  return `${late} day${late === 1 ? '' : 's'} late`
}
