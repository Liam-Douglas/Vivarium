import { addDays, differenceInCalendarDays } from 'date-fns'
import { findMatchingFeeder, type MatchableFeeder } from '@/lib/feederMatch'
import { getNextFeedingDue, type FeedingSchedule } from '@/lib/feedingStatus'

/**
 * How much feeder stock the next fortnight actually needs.
 *
 * The threshold warning only fires once you are already short. Schedules give
 * the burn rate, so the same data can answer "will I run out?" instead — which
 * is the question you have before you order, not after.
 */

export interface ProjectionAnimal extends FeedingSchedule {
  id: string
}

/** What an animal usually eats, taken from its most recent feeding. */
export interface UsualMeal {
  preyType: string
  preySize?: string | null
  quantity: number
}

export interface ProjectedFeeder<T extends MatchableFeeder> {
  feeder: T
  needed: number
  stock: number
}

export interface FeederProjection<T extends MatchableFeeder> {
  days: number
  /** Feedings the schedules put inside the window. */
  feeds: number
  /** Feeders whose stock will not cover the window. */
  short: ProjectedFeeder<T>[]
  /** True when every matched feeder covers its demand. */
  covered: boolean
}

export function projectFeederDemand<T extends MatchableFeeder & { currentStock: number }>(input: {
  animals: ProjectionAnimal[]
  usualMeals: Map<string, UsualMeal>
  feeders: T[]
  days?: number
  now?: Date
}): FeederProjection<T> {
  const { animals, usualMeals, feeders, days = 14, now = new Date() } = input
  const horizon = addDays(now, days)
  const demand = new Map<string, number>()
  let feeds = 0

  for (const animal of animals) {
    if (!animal.feeding_frequency_days) continue
    const meal = usualMeals.get(animal.id)
    const firstDue = getNextFeedingDue(animal)
    if (!firstDue) continue

    // Step forward by the interval, counting every feeding that lands inside
    // the window. An overdue animal still owes the meal it has missed.
    let due = firstDue
    let guard = 0
    while (differenceInCalendarDays(horizon, due) >= 0 && guard < 100) {
      feeds++
      if (meal) {
        const feeder = findMatchingFeeder(feeders, meal.preyType, meal.preySize)
        if (feeder) demand.set(feeder.id, (demand.get(feeder.id) ?? 0) + Math.max(1, meal.quantity))
      }
      due = addDays(due, animal.feeding_frequency_days)
      guard++
    }
  }

  const short = feeders
    .filter((f) => (demand.get(f.id) ?? 0) > f.currentStock)
    .map((f) => ({ feeder: f, needed: demand.get(f.id) ?? 0, stock: f.currentStock }))
    .sort((a, b) => (b.needed - b.stock) - (a.needed - a.stock))

  return { days, feeds, short, covered: short.length === 0 }
}
