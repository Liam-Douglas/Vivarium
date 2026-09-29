import { differenceInCalendarDays } from 'date-fns'
import { predictNextShed, isShedOverdue, describeNextShed, type ShedLog } from './shedStatus'
import {
  inQuarantine, quarantineDays, lastWeighedAt, hasStaleWeight,
  type QuarantineState, type WeighedAt,
} from './animalState'

/**
 * The conditions a queue cannot express.
 *
 * Feeding, doses and care tasks all have a cadence someone set, so the
 * dashboard can ask "what is due today" and get an answer. On a collection
 * where everything is on schedule that answer is nothing, and the dashboard
 * used to stop there — the state it should have the most to say about was the
 * one it said least about.
 *
 * These four conditions have no due date behind them. Each is true until
 * somebody looks.
 */

export type WorthALookKind = 'shed-overdue' | 'quarantine' | 'shed-soon' | 'stale-weight'

export interface WorthALookItem {
  key: string
  animalId: string
  animalName: string
  kind: WorthALookKind
  /** The one-line reason, already phrased for display. */
  detail: string
}

export interface WorthALookAnimal extends QuarantineState {
  id: string
  name: string
}

export interface WorthALookInput {
  animals: readonly WorthALookAnimal[]
  shedLogsByAnimal: ReadonlyMap<string, readonly ShedLog[]>
  weightLogsByAnimal: ReadonlyMap<string, readonly WeighedAt[]>
}

/**
 * The dot beside each row, following FEEDING_STATUS_META's palette: amber for
 * something slipping, sage for something in hand, stone for a gap in the
 * records rather than a problem with the animal.
 */
export const WORTH_A_LOOK_COLOR: Record<WorthALookKind, string> = {
  'shed-overdue': '#d4924a',
  quarantine: '#8fbe5a',
  'shed-soon': '#5a9e6a',
  'stale-weight': '#9f9684',
}

/** A shed this close is worth mentioning; further out it is just a calendar. */
export const SHED_SOON_DAYS = 5

/** Most pressing first. A row's position in this array is its priority. */
const PRIORITY: readonly WorthALookKind[] = [
  'shed-overdue', 'quarantine', 'shed-soon', 'stale-weight',
]

/** Four rows. Past that it stops being a glance and becomes another list to triage. */
export const MAX_ITEMS = 4

interface Candidate extends WorthALookItem {
  /** Within one kind, larger sorts first: days late, days in quarantine, days unweighed. */
  weight: number
}

/**
 * Every condition currently true, ranked, at most one row per animal.
 *
 * One row per animal on purpose: an animal that is in quarantine, overdue to
 * shed and unweighed is one animal to go and look at, and letting it take
 * three of the four rows would hide the other two animals that also need
 * looking at. Its most pressing condition is the one that gets said.
 */
export function collectWorthALook(
  { animals, shedLogsByAnimal, weightLogsByAnimal }: WorthALookInput,
  now: Date = new Date()
): WorthALookItem[] {
  const best = new Map<string, Candidate>()

  for (const animal of animals) {
    const candidates: Candidate[] = []

    const sheds = shedLogsByAnimal.get(animal.id) ?? []
    const prediction = predictNextShed(sheds)
    if (prediction) {
      const days = differenceInCalendarDays(prediction.due, now)
      if (isShedOverdue(prediction, now)) {
        candidates.push({
          key: `shed-${animal.id}`, animalId: animal.id, animalName: animal.name,
          kind: 'shed-overdue',
          detail: `Shed ${describeNextShed(prediction, now)?.toLowerCase()} — every ${prediction.intervalDays} days`,
          weight: -days,
        })
      } else if (days >= 0 && days <= SHED_SOON_DAYS) {
        candidates.push({
          key: `shed-${animal.id}`, animalId: animal.id, animalName: animal.name,
          kind: 'shed-soon',
          detail: `Shed expected — ${describeNextShed(prediction, now)?.toLowerCase()}`,
          // Sooner is more pressing, so the sign flips here too.
          weight: -days,
        })
      }
    }

    if (inQuarantine(animal)) {
      const days = quarantineDays(animal, now) ?? 0
      candidates.push({
        key: `quarantine-${animal.id}`, animalId: animal.id, animalName: animal.name,
        kind: 'quarantine',
        detail: `In quarantine ${days} day${days === 1 ? '' : 's'}`,
        weight: days,
      })
    }

    const weights = weightLogsByAnimal.get(animal.id) ?? []
    if (hasStaleWeight(weights, now)) {
      const last = lastWeighedAt(weights)
      const days = last ? differenceInCalendarDays(now, last) : 0
      candidates.push({
        key: `weight-${animal.id}`, animalId: animal.id, animalName: animal.name,
        kind: 'stale-weight',
        detail: `Not weighed in ${days} days`,
        weight: days,
      })
    }

    for (const candidate of candidates) {
      const held = best.get(animal.id)
      if (!held || rank(candidate.kind) < rank(held.kind)) best.set(animal.id, candidate)
    }
  }

  return [...best.values()]
    .sort((a, b) =>
      rank(a.kind) - rank(b.kind) ||
      b.weight - a.weight ||
      a.animalName.localeCompare(b.animalName))
    .slice(0, MAX_ITEMS)
    .map(({ weight: _weight, ...item }) => item)
}

function rank(kind: WorthALookKind): number {
  return PRIORITY.indexOf(kind)
}
