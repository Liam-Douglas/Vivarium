// The Feeding Log offered one filter — a single animal — so questions the data
// can plainly answer ("what has this one refused?", "how much has gone out this
// month?") meant reading the whole list. These run client-side: the household's
// history is a few hundred rows and the page already holds all of them, so a
// round trip per keystroke would buy nothing.

export type FeedingOutcome = 'all' | 'fed' | 'refused'

export interface FeedingFilter {
  animalId?: string
  outcome?: FeedingOutcome
  preyType?: string
  /** Inclusive lower bound on fed_at. */
  since?: Date
}

export interface FilterableFeeding {
  animal_id: string
  refused: boolean
  prey_type: string
  fed_at: string
}

export function filterFeedings<T extends FilterableFeeding>(
  logs: T[],
  filter: FeedingFilter
): T[] {
  const { animalId, outcome = 'all', preyType, since } = filter
  const sinceMs = since?.getTime()

  return logs.filter((log) => {
    if (animalId && log.animal_id !== animalId) return false
    if (outcome === 'fed' && log.refused) return false
    if (outcome === 'refused' && !log.refused) return false
    // Case-insensitive: prey types are free text at the point of entry, so
    // "Rat" and "rat" are the same prey and filtering must agree.
    if (preyType && log.prey_type.toLowerCase() !== preyType.toLowerCase()) return false
    if (sinceMs !== undefined) {
      const fedMs = new Date(log.fed_at).getTime()
      // An unparseable timestamp cannot be shown to fall inside a window, so
      // it drops out rather than being silently counted as recent.
      if (Number.isNaN(fedMs) || fedMs < sinceMs) return false
    }
    return true
  })
}

/**
 * The prey types actually present, for populating the filter.
 *
 * Case-insensitively deduplicated, keeping the first spelling seen so the
 * option reads the way the keeper typed it.
 */
export function preyTypesIn<T extends FilterableFeeding>(logs: T[]): string[] {
  const seen = new Map<string, string>()
  for (const log of logs) {
    const key = log.prey_type.toLowerCase()
    if (!seen.has(key)) seen.set(key, log.prey_type)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}
