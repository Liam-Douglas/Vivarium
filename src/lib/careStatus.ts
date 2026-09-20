import { addDays, differenceInCalendarDays } from 'date-fns'

/**
 * Status for a recurring care task — cleaning, weighing, anything on an
 * interval.
 *
 * Deliberately shaped like lib/feedingStatus.ts, including keeping `never-done`
 * distinct from `on-schedule`. Collapsing those is what let a collection with
 * no feeding data at all report "0 overdue" in green; a task that has never been
 * done is not a task that is doing fine.
 */
export type CareStatus =
  | 'overdue'
  | 'due-soon'
  | 'on-schedule'
  | 'never-done'
  /** Switched off by the keeper. Not due, not late, not a problem. */
  | 'paused'

export interface CareSchedule {
  last_done_at: string | null
  frequency_days: number
  is_active: boolean
}

export const CARE_STATUS_META: Record<CareStatus, { color: string; label: string }> = {
  overdue: { color: '#c45a5a', label: 'Overdue' },
  'due-soon': { color: '#d4924a', label: 'Due soon' },
  'on-schedule': { color: '#5a9e6a', label: 'Done recently' },
  'never-done': { color: '#9f9684', label: 'Never done' },
  paused: { color: '#9f9684', label: 'Paused' },
}

export function getCareStatus(task: CareSchedule, now: Date = new Date()): CareStatus {
  if (!task.is_active) return 'paused'
  if (!task.frequency_days || task.frequency_days < 1) return 'never-done'
  if (!task.last_done_at) return 'never-done'
  // Calendar days, not elapsed 24h periods, so "cleaned yesterday" is one day
  // whatever the clock says — the rule lib/dates.ts documents and applies.
  const daysSince = differenceInCalendarDays(now, new Date(task.last_done_at))
  if (daysSince > task.frequency_days) return 'overdue'
  if (daysSince >= task.frequency_days - 1) return 'due-soon'
  return 'on-schedule'
}

/** When the task next falls due, or null when it cannot produce one. */
export function getNextCareDue(task: CareSchedule): Date | null {
  if (!task.is_active || !task.last_done_at || !task.frequency_days) return null
  return addDays(new Date(task.last_done_at), task.frequency_days)
}

/** "4 days overdue", "Due tomorrow", or the status label when there is no date. */
export function describeNextCare(task: CareSchedule, now: Date = new Date()): string {
  const nextDue = getNextCareDue(task)
  if (!nextDue) return CARE_STATUS_META[getCareStatus(task, now)].label
  const days = differenceInCalendarDays(nextDue, now)
  if (days < 0) return `${Math.abs(days)} day${days !== -1 ? 's' : ''} overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

/** Sort key for "most urgent first". */
export const CARE_URGENCY: Record<CareStatus, number> = {
  overdue: 0,
  'due-soon': 1,
  'on-schedule': 2,
  'never-done': 3,
  paused: 4,
}

export interface CareSummary {
  overdue: number
  dueSoon: number
  onSchedule: number
  neverDone: number
  paused: number
  /** Tasks a queue can actually surface — active, with a date to work from. */
  tracked: number
}

export function summariseCare<T extends CareSchedule>(
  tasks: T[],
  now: Date = new Date()
): CareSummary {
  const summary: CareSummary = {
    overdue: 0, dueSoon: 0, onSchedule: 0, neverDone: 0, paused: 0, tracked: 0,
  }
  for (const task of tasks) {
    switch (getCareStatus(task, now)) {
      case 'overdue': summary.overdue++; break
      case 'due-soon': summary.dueSoon++; break
      case 'on-schedule': summary.onSchedule++; break
      case 'never-done': summary.neverDone++; break
      case 'paused': summary.paused++; break
    }
  }
  summary.tracked = summary.overdue + summary.dueSoon + summary.onSchedule
  return summary
}
