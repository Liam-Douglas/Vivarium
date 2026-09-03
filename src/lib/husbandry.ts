import { differenceInCalendarDays } from 'date-fns'

/**
 * Husbandry that is always true but never urgent, so a feeding-led dashboard
 * never surfaces it. These are what fill a quiet day — nothing here is
 * invented for the empty state; it is all outranked on a busy one.
 */

export interface HusbandryAnimal {
  id: string
  name: string
  feeding_frequency_days: number | null
  last_fed_at: string | null
  quarantine_started_at: string | null
  quarantine_ended_at: string | null
}

/** A weight or shed entry, reduced to what the checks need. */
export interface AnimalEvent {
  animal_id: string
  at: string
}

export type AttentionTone = 'warn' | 'info' | 'muted'

export interface AttentionItem {
  id: string
  title: string
  detail: string
  tone: AttentionTone
}

export const STALE_WEIGHT_DAYS = 90
export const SHED_HORIZON_DAYS = 10

/** Average of the most recent intervals — the rule the animal profile uses. */
export function predictNextShed(shedDates: Date[], maxSamples = 5): Date | null {
  const sorted = [...shedDates].sort((a, b) => b.getTime() - a.getTime())
  if (sorted.length < 3) return null
  const intervals: number[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    intervals.push(differenceInCalendarDays(sorted[i], sorted[i + 1]))
  }
  const recent = intervals.slice(0, maxSamples)
  const avg = Math.round(recent.reduce((s, d) => s + d, 0) / recent.length)
  if (!Number.isFinite(avg) || avg <= 0) return null
  const next = new Date(sorted[0])
  next.setDate(next.getDate() + avg)
  return next
}

function names(list: { name: string }[], max = 3): string {
  const shown = list.slice(0, max).map((a) => a.name)
  const rest = list.length - shown.length
  return rest > 0 ? `${shown.join(', ')} and ${rest} more` : shown.join(', ')
}

export function buildAttentionItems(input: {
  animals: HusbandryAnimal[]
  weights: AnimalEvent[]
  sheds: AnimalEvent[]
  now?: Date
  limit?: number
}): AttentionItem[] {
  const { animals, weights, sheds, now = new Date(), limit = 4 } = input
  const items: AttentionItem[] = []

  // An animal with no schedule is invisible to every queue in the app. Nothing
  // else will ever mention it, so it leads.
  const unscheduled = animals.filter((a) => !a.feeding_frequency_days)
  if (unscheduled.length > 0) {
    items.push({
      id: 'unscheduled',
      tone: 'warn',
      title: `${unscheduled.length} animal${unscheduled.length !== 1 ? 's have' : ' has'} no feeding schedule`,
      detail: `${names(unscheduled)} — ${unscheduled.length !== 1 ? 'they' : 'it'} can never show as due`,
    })
  }

  const neverFed = animals.filter((a) => a.feeding_frequency_days && !a.last_fed_at)
  if (neverFed.length > 0) {
    items.push({
      id: 'never-fed',
      tone: 'warn',
      title: `${neverFed.length} animal${neverFed.length !== 1 ? 's have' : ' has'} no feeding logged`,
      detail: `${names(neverFed)} — there is nothing to count a schedule from`,
    })
  }

  // Weights drift slowly and silently; nothing prompts you to take one.
  const latestWeight = new Map<string, Date>()
  for (const w of weights) {
    const at = new Date(w.at)
    const held = latestWeight.get(w.animal_id)
    if (!held || at > held) latestWeight.set(w.animal_id, at)
  }
  const stale = animals
    .map((a) => ({ animal: a, at: latestWeight.get(a.id) ?? null }))
    .filter(({ at }) => at !== null && differenceInCalendarDays(now, at) > STALE_WEIGHT_DAYS)
    .sort((a, b) => a.at!.getTime() - b.at!.getTime())
  if (stale.length > 0) {
    const [oldest] = stale
    const days = differenceInCalendarDays(now, oldest.at!)
    items.push({
      id: 'stale-weight',
      tone: 'info',
      title: `${oldest.animal.name} has not been weighed in ${days} days`,
      detail: stale.length > 1
        ? `${stale.length - 1} other${stale.length - 1 !== 1 ? 's' : ''} also over ${STALE_WEIGHT_DAYS} days`
        : `Nothing else is over ${STALE_WEIGHT_DAYS} days`,
    })
  }

  // A shed coming up is a reason to hold food, so it is worth knowing early.
  const shedsByAnimal = new Map<string, Date[]>()
  for (const s of sheds) {
    const list = shedsByAnimal.get(s.animal_id) ?? []
    list.push(new Date(s.at))
    shedsByAnimal.set(s.animal_id, list)
  }
  const shedding = animals
    .map((a) => ({ animal: a, due: predictNextShed(shedsByAnimal.get(a.id) ?? []) }))
    .filter(({ due }) => due !== null && Math.abs(differenceInCalendarDays(due, now)) <= SHED_HORIZON_DAYS)
    .sort((a, b) => a.due!.getTime() - b.due!.getTime())
  if (shedding.length > 0) {
    const [soonest] = shedding
    const days = differenceInCalendarDays(soonest.due!, now)
    items.push({
      id: 'shed-due',
      tone: 'muted',
      title: days < 0
        ? `${soonest.animal.name} was due to shed ${Math.abs(days)} day${days !== -1 ? 's' : ''} ago`
        : days === 0
          ? `${soonest.animal.name} is due to shed today`
          : `${soonest.animal.name} is due to shed in ${days} day${days !== 1 ? 's' : ''}`,
      detail: 'Predicted from past intervals — hold food if it goes opaque',
    })
  }

  const quarantined = animals.filter((a) => a.quarantine_started_at && !a.quarantine_ended_at)
  if (quarantined.length > 0) {
    const [first] = quarantined
    const days = differenceInCalendarDays(now, new Date(first.quarantine_started_at!))
    items.push({
      id: 'quarantine',
      tone: 'warn',
      title: quarantined.length === 1
        ? `${first.name} is on day ${days} of quarantine`
        : `${quarantined.length} animals are in quarantine`,
      detail: quarantined.length === 1 ? 'Started ' + first.quarantine_started_at!.slice(0, 10) : names(quarantined),
    })
  }

  return items.slice(0, limit)
}
