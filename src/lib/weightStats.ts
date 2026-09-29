/**
 * What a run of weigh-ins says about an animal.
 *
 * Written because AnimalDetail's "Current weight" card read
 * `animals.weight_grams` — a column nothing in the app has ever written.
 * createAnimal does not accept it, AnimalForm has no field for it, and logging
 * a weight only inserts a weight_logs row. So the card showed an em dash for
 * every animal in the app, with the trend badge computed from the logs sitting
 * beside it: "—+150", a change against nothing.
 *
 * The logs are the record. The column is kept only as a fallback, because a
 * spreadsheet import could carry one for an animal with no logs yet.
 *
 * Order-independent throughout: the query returns newest-first and nothing in
 * these signatures says so, so a caller holding them any other way gets the
 * right answer rather than a confident wrong one.
 */

export interface WeighIn {
  weight_grams: number
  logged_at: string
}

/** Oldest first, invalid timestamps dropped. */
function chronological<T extends WeighIn>(logs: readonly T[]): T[] {
  return logs
    .filter((log) => !Number.isNaN(new Date(log.logged_at).getTime()))
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
}

/**
 * The weight to show now: the most recent weigh-in, or the stored column for
 * an animal that has none.
 */
export function currentWeight(
  logs: readonly WeighIn[],
  storedGrams: number | null = null
): number | null {
  const sorted = chronological(logs)
  return sorted.length > 0 ? sorted[sorted.length - 1].weight_grams : storedGrams
}

/**
 * The change at the last weigh-in — the most recent weight against the one
 * before it — or null when there is nothing to compare.
 *
 * Deliberately not "change since the stored column": comparing a log against a
 * number of unknown vintage would produce a figure with no meaning.
 */
export function weightTrend(logs: readonly WeighIn[]): number | null {
  const sorted = chronological(logs)
  if (sorted.length < 2) return null
  return sorted[sorted.length - 1].weight_grams - sorted[sorted.length - 2].weight_grams
}

export interface GrowthSummary {
  /** The earliest weight on record. */
  start: number
  /** The most recent. */
  latest: number
  /** Latest less start; negative for an animal that has lost weight. */
  gain: number
}

/**
 * Start, latest and the difference, across the whole history.
 *
 * Across the whole history on purpose, not the window the chart draws: a chart
 * showing the last twelve weigh-ins beside a "total gain" covering only those
 * twelve would be two different claims under one heading.
 */
export function growthSummary(logs: readonly WeighIn[]): GrowthSummary | null {
  const sorted = chronological(logs)
  if (sorted.length === 0) return null
  const start = sorted[0].weight_grams
  const latest = sorted[sorted.length - 1].weight_grams
  return { start, latest, gain: latest - start }
}

/**
 * Chart points, oldest first, optionally limited to the most recent `limit`.
 *
 * The limit trims from the old end, so the chart always ends at today.
 */
export function weightSeries<T extends WeighIn>(
  logs: readonly T[],
  limit?: number
): { at: Date; weight: number }[] {
  const sorted = chronological(logs)
  const window = limit != null && limit > 0 ? sorted.slice(-limit) : sorted
  return window.map((log) => ({ at: new Date(log.logged_at), weight: log.weight_grams }))
}
