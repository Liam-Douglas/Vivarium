import { addDays } from 'date-fns'

/**
 * When a feeder item runs out, at the rate the collection is actually eating.
 *
 * The existing signal is a threshold — currentStock < low_stock_threshold —
 * which answers "is this number small?" rather than "will I run out before I
 * next shop?". Twelve rats is plenty for one snake and a fortnight's notice for
 * eight.
 *
 * Purely arithmetic on purpose. Which item an animal eats from is a matching
 * problem that lib/feederMatch.ts already solves, so the caller resolves that
 * and passes the answer in; this module never has to know what a prey type is.
 */

export interface StockedItem {
  id: string
  currentStock: number
  low_stock_threshold: number
}

/** One animal's draw on one feeder item. */
export interface Demand {
  itemId: string
  /** The animal's feeding interval. */
  everyDays: number
  /** Units taken per feeding. */
  quantity: number
}

export interface Projection {
  itemId: string
  /** Units consumed per day across every animal drawing on this item. */
  perDay: number
  /** Whole days of stock left, or null when nothing is scheduled against it. */
  daysRemaining: number | null
  /** When it runs out, or null when nothing is scheduled against it. */
  runsOutOn: Date | null
  /** True when the old threshold would have flagged it. Kept as a fallback. */
  belowThreshold: boolean
}

export function projectFeederStock(
  items: readonly StockedItem[],
  demand: readonly Demand[],
  now: Date = new Date()
): Projection[] {
  const perDayByItem = new Map<string, number>()
  for (const d of demand) {
    // A zero or negative interval is not a schedule, and dividing by it would
    // poison the total with Infinity.
    if (d.everyDays <= 0 || d.quantity <= 0) continue
    perDayByItem.set(d.itemId, (perDayByItem.get(d.itemId) ?? 0) + d.quantity / d.everyDays)
  }

  return items.map((item) => {
    const perDay = perDayByItem.get(item.id) ?? 0
    const belowThreshold = item.currentStock < item.low_stock_threshold

    if (perDay <= 0) {
      // Nothing is scheduled against it, so there is no date to give. The
      // threshold still speaks, which is why it stays.
      return { itemId: item.id, perDay: 0, daysRemaining: null, runsOutOn: null, belowThreshold }
    }

    const daysRemaining = Math.max(0, Math.floor(item.currentStock / perDay))
    return {
      itemId: item.id,
      perDay,
      daysRemaining,
      runsOutOn: addDays(now, daysRemaining),
      belowThreshold,
    }
  })
}

/** The horizon the dashboard asks about: will this last until I next shop? */
export const PROJECTION_HORIZON_DAYS = 14

/**
 * True when an item wants attention — running out inside the horizon, or
 * already below its threshold with nothing scheduled to give a date.
 */
export function needsRestocking(
  projection: Projection,
  horizonDays: number = PROJECTION_HORIZON_DAYS
): boolean {
  if (projection.daysRemaining !== null) return projection.daysRemaining <= horizonDays
  return projection.belowThreshold
}
