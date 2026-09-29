import { findMatchingFeeder, type MatchableFeeder } from './feederMatch'
import {
  projectFeederStock, needsRestocking,
  type Demand, type Projection, type StockedItem,
} from './feederProjection'

/**
 * What the collection draws on each feeder item, and what that means for
 * restocking.
 *
 * lib/feederProjection does the arithmetic and deliberately knows nothing
 * about prey; lib/feederMatch connects a logged meal to an item. This is the
 * join between them, and it lives here because two screens need the same
 * answer.
 *
 * That matters more than it sounds. useFeederInventory's isLowStock carries a
 * note that the dashboard's warning and the Expenses shopping list have to
 * agree on what "low" means, or the dashboard flags items the list does not
 * offer to buy. Moving the dashboard to a projection broke that agreement
 * until this module existed to be shared.
 */

export interface DemandingAnimal {
  id: string
  feeding_frequency_days: number | null
}

export interface LastMeal {
  prey_type: string
  prey_size: string | null
  quantity: number
  refused: boolean
}

/** The most recent meal per animal, however the logs happen to be ordered. */
export function lastMealPerAnimal<T extends { animal_id: string; fed_at: string }>(
  logs: readonly T[]
): Map<string, T> {
  const byAnimal = new Map<string, T>()
  for (const log of logs) {
    const held = byAnimal.get(log.animal_id)
    if (!held || new Date(log.fed_at) > new Date(held.fed_at)) byAnimal.set(log.animal_id, log)
  }
  return byAnimal
}

/**
 * One demand entry per animal whose feeding can be attributed to an item.
 *
 * An animal is skipped when it has no schedule (there is no rate to derive),
 * when its last meal was refused (a refusal records what was offered, not what
 * was consumed), or when nothing in the inventory matches what it ate.
 */
export function deriveFeederDemand(
  animals: readonly DemandingAnimal[],
  lastMealByAnimal: ReadonlyMap<string, LastMeal>,
  feeders: readonly MatchableFeeder[]
): Demand[] {
  return animals.flatMap((animal) => {
    const meal = lastMealByAnimal.get(animal.id)
    if (!meal || meal.refused || !animal.feeding_frequency_days) return []
    const matched = findMatchingFeeder(feeders, meal.prey_type, meal.prey_size)
    if (!matched) return []
    return [{
      itemId: matched.id,
      everyDays: animal.feeding_frequency_days,
      quantity: meal.quantity,
    }]
  })
}

export interface RestockEntry<T> {
  item: T
  projection: Projection
}

/**
 * Items worth restocking, each with the projection that says why.
 *
 * The caller renders either the days remaining or, for an item nothing is
 * scheduled against, the count the threshold rule still speaks for.
 */
export function restockList<T extends StockedItem>(
  feeders: readonly T[],
  demand: readonly Demand[],
  now: Date = new Date()
): RestockEntry<T>[] {
  const byId = new Map(feeders.map((f) => [f.id, f]))
  return projectFeederStock(feeders, demand, now)
    // Not `.filter(needsRestocking)`: filter passes the index as the second
    // argument, which needsRestocking reads as its horizon. That quietly
    // checked the first item against a nought-day horizon, the second against
    // one day, and so on, so the projection flagged almost nothing.
    .filter((projection) => needsRestocking(projection))
    .flatMap((projection) => {
      const item = byId.get(projection.itemId)
      return item ? [{ item, projection }] : []
    })
}
