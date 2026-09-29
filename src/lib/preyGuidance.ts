/**
 * How big a meal should be, from what the animal weighs.
 *
 * The common rule of thumb for snakes: prey between a tenth and about a
 * seventh of body weight. It was written inline in FeedingLogForm against
 * `animals.weight_grams` — a column nothing in the app writes — so the line it
 * draws has never once appeared. It is guarded, so what a keeper saw was
 * nothing at all rather than a wrong number.
 */

/** The share of body weight a meal should fall between. */
export const PREY_WEIGHT_MIN_RATIO = 0.10
export const PREY_WEIGHT_MAX_RATIO = 0.15

export interface PreyWeightRange {
  minGrams: number
  maxGrams: number
}

/**
 * The range to suggest, or null when there is nothing useful to say.
 *
 * Null for an animal with no weight on record, and null when the animal is
 * light enough that the range rounds away to nothing — "Recommended prey: 0–0g"
 * is worse than silence, and a hatchling that small is being fed by judgement
 * rather than by arithmetic.
 *
 * Below about 12g the two ends round to the same gram. That is still sound
 * advice, so it is returned rather than refused; phrasing a range whose ends
 * match is the caller's problem, not this function's.
 */
export function recommendedPreyWeight(bodyGrams: number | null): PreyWeightRange | null {
  if (bodyGrams == null || !Number.isFinite(bodyGrams) || bodyGrams <= 0) return null

  const minGrams = Math.round(bodyGrams * PREY_WEIGHT_MIN_RATIO)
  const maxGrams = Math.round(bodyGrams * PREY_WEIGHT_MAX_RATIO)
  if (minGrams < 1 || maxGrams < 1) return null

  return { minGrams, maxGrams }
}
