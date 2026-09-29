// The same collection with meals overdue.
//
// "Worth a look" is things to notice, not things to do, and it must never sit
// above an overdue feeding. This is the half of that rule that a unit test
// cannot see: lib/worthALook still returns four rows here — it is the screen
// that decides not to draw them.
import { animal, shedSeries, weightLog, daysAgo } from '../fixtures.mjs'

const nagini = animal('Nagini', { last_fed_at: daysAgo(30) })
const kobe = animal('Kobe', { last_fed_at: daysAgo(30), quarantine_started_at: daysAgo(12) })
const suki = animal('Suki', { last_fed_at: daysAgo(30) })

export default {
  name: 'Dashboard — the section stays out of the way when meals are due',
  path: '/',
  fixtures: {
    animals: [nagini, kobe, suki],
    shedding_logs: shedSeries(nagini.id, { everyDays: 30, lastDaysAgo: 47 }),
    weight_logs: [weightLog(suki.id, { logged_at: daysAgo(213) })],
  },
  expect: {
    contains: ['Today', '16 days overdue'],
    absent: [
      'Worth a look',
      // The conditions are all still true — they are simply not drawn.
      'In quarantine 12 days',
      'Not weighed in 213 days',
    ],
  },
}
