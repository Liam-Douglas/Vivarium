import { describe, it, expect } from 'vitest'
import { getNextDose, describeDose, type DoseSchedule } from './medicationSchedule'

const NOW = new Date('2026-09-01T09:00:00')

const course = (over: Partial<DoseSchedule> = {}): DoseSchedule => ({
  id: 's1',
  animal_id: 'a1',
  name: 'Baytril',
  dosage: '0.1 ml',
  frequency_days: 2,
  start_date: '2026-08-26',
  end_date: '2026-09-07',
  is_active: true,
  ...over,
})

const given = (...dates: string[]) => dates.map((d) => ({ schedule_id: 's1', given_at: d }))

describe('getNextDose', () => {
  it('starts the course on its start date before any dose is given', () => {
    const dose = getNextDose(course(), [], NOW)
    expect(dose?.due).toEqual(new Date('2026-08-26'))
    expect(dose?.index).toBe(1)
  })

  it('counts an interval from the dose actually given, not from the schedule', () => {
    // Given late on the 29th, so the next is due the 31st — not the 30th that a
    // strict every-2-days-from-start schedule would say.
    const dose = getNextDose(course(), given('2026-08-27', '2026-08-29'), NOW)
    expect(dose?.due).toEqual(new Date('2026-08-31'))
    expect(dose?.index).toBe(3)
  })

  it('derives the course length from the window and interval', () => {
    // 26 Aug to 7 Sep is 12 days at 2-day intervals: 7 doses.
    expect(getNextDose(course(), [], NOW)?.total).toBe(7)
    expect(getNextDose(course({ end_date: null }), [], NOW)?.total).toBeNull()
  })

  it('produces nothing once the course is complete', () => {
    const all = given('2026-08-26', '2026-08-28', '2026-08-30', '2026-09-01', '2026-09-03', '2026-09-05', '2026-09-07')
    expect(getNextDose(course(), all, new Date('2026-09-08'))).toBeNull()
  })

  it('ignores schedules it cannot compute from', () => {
    expect(getNextDose(course({ is_active: false }), [], NOW)).toBeNull()
    expect(getNextDose(course({ frequency_days: null }), [], NOW)).toBeNull()
    expect(getNextDose(course({ start_date: null }), [], NOW)).toBeNull()
  })

  it('only counts doses belonging to the schedule', () => {
    const mixed = [
      { schedule_id: 'other', given_at: '2026-08-30' },
      { schedule_id: 's1', given_at: '2026-08-26' },
    ]
    const dose = getNextDose(course(), mixed, NOW)
    expect(dose?.index).toBe(2)
    expect(dose?.due).toEqual(new Date('2026-08-28'))
  })

  it('keeps a missed dose visible rather than dropping it silently', () => {
    // Two doses in, then nothing; well past due but inside the abandonment window.
    const dose = getNextDose(course(), given('2026-08-26', '2026-08-28'), new Date('2026-09-06'))
    expect(dose?.due).toEqual(new Date('2026-08-30'))
    expect(dose?.index).toBe(3)
  })

  it('stops surfacing a course abandoned well past its end', () => {
    expect(getNextDose(course(), given('2026-08-26'), new Date('2026-09-30'))).toBeNull()
  })
})

describe('describeDose', () => {
  it('names the position in a bounded course', () => {
    const dose = getNextDose(course(), given('2026-08-26', '2026-08-28'), NOW)!
    expect(describeDose(course(), dose)).toBe('Baytril · dose 3 of 7')
  })

  it('omits the total for an open-ended course', () => {
    const open = course({ end_date: null })
    const dose = getNextDose(open, given('2026-08-26'), NOW)!
    expect(describeDose(open, dose)).toBe('Baytril · dose 2')
  })
})
