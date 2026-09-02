import { addDays, differenceInCalendarDays } from 'date-fns'

/**
 * When a medication course's next dose falls due, and where in the course it
 * sits. Schedules and dose logs are both stored already; nothing in the app
 * has ever read them together, so a running course of antibiotics is invisible
 * outside the animal's own Health tab.
 */

export interface DoseSchedule {
  id: string
  animal_id: string
  name: string
  dosage: string | null
  frequency_days: number | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
}

export interface DoseLog {
  schedule_id: string
  given_at: string
}

export interface DoseDue {
  /** When the next dose falls due. */
  due: Date
  /** 1-based position of that dose in the course. */
  index: number
  /** Total doses in the course, when an end date bounds it. */
  total: number | null
}

/**
 * The next dose for a schedule, or null when the course cannot produce one —
 * inactive, no interval, no start, or already finished.
 *
 * `logs` may hold entries for any schedule; only this one's are considered.
 */
export function getNextDose(
  schedule: DoseSchedule,
  logs: DoseLog[],
  now: Date = new Date()
): DoseDue | null {
  if (!schedule.is_active || !schedule.frequency_days) return null

  const given = logs
    .filter((l) => l.schedule_id === schedule.id)
    .map((l) => new Date(l.given_at))
    .sort((a, b) => b.getTime() - a.getTime())

  // Before the first dose the course starts on its start date; after that each
  // dose falls an interval after the last one actually given.
  const anchor = given[0] ?? (schedule.start_date ? new Date(schedule.start_date) : null)
  if (!anchor) return null
  const due = given[0] ? addDays(anchor, schedule.frequency_days) : anchor

  const end = schedule.end_date ? new Date(schedule.end_date) : null
  if (end && differenceInCalendarDays(due, end) > 0) return null

  const total = end && schedule.start_date
    ? Math.floor(differenceInCalendarDays(end, new Date(schedule.start_date)) / schedule.frequency_days) + 1
    : null

  const index = given.length + 1
  if (total !== null && index > total) return null

  // A course whose window has passed without being finished is still shown, so
  // the missed doses do not vanish silently.
  if (now > due && end && differenceInCalendarDays(now, end) > schedule.frequency_days) return null

  return { due, index, total }
}

/** "Baytril · dose 3 of 7", or "Baytril · dose 3" for an open-ended course. */
export function describeDose(schedule: DoseSchedule, dose: DoseDue): string {
  const position = dose.total !== null ? `dose ${dose.index} of ${dose.total}` : `dose ${dose.index}`
  return `${schedule.name} · ${position}`
}
