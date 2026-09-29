/**
 * What a run of health events costs, broken down.
 *
 * Small, but it was written inline on AnimalDetail in two places that had to
 * agree: the total shown on the Health tab and the vet figure in the ROI
 * panel. Both read `cost_cents`, and the page also decided there what counted
 * as a cost worth charting.
 */

export interface CostedEvent {
  event_type: string
  cost_cents: number | null
}

export interface CostByType {
  /** The event type, underscores turned back into spaces for display. */
  type: string
  /** Dollars, because the chart's axis and tooltip are in dollars. */
  cost: number
}

/** Every cost added up, in cents. Events with no cost contribute nothing. */
export function totalCostCents(events: readonly CostedEvent[]): number {
  return events.reduce((sum, event) => sum + (event.cost_cents ?? 0), 0)
}

/**
 * Cost per event type, for the breakdown chart.
 *
 * Types with no cost recorded are left out rather than charted as zero: a bar
 * of length nothing says an observation was free, when what happened is that
 * nobody entered a number.
 */
export function costByType(events: readonly CostedEvent[]): CostByType[] {
  const byType = new Map<string, number>()
  for (const event of events) {
    if (event.cost_cents == null || event.cost_cents <= 0) continue
    const label = event.event_type.replace(/_/g, ' ')
    byType.set(label, (byType.get(label) ?? 0) + event.cost_cents)
  }
  return [...byType.entries()].map(([type, cents]) => ({ type, cost: cents / 100 }))
}
