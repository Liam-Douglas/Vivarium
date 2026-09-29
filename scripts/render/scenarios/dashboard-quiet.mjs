// A collection where nothing is due — the state the dashboard used to have
// nothing to say about, and the reason "Worth a look" exists.
//
// Every animal was fed yesterday on a fortnightly cycle, so the queue is
// empty. What is left is four conditions no schedule produces, and the order
// they come out in is the thing worth checking: lib/worthALook ranks them, and
// a ranked list is exactly the kind of output that passes a "does it contain"
// check while being in the wrong order.
import { animal, shedSeries, weightLog, daysAgo } from '../fixtures.mjs'

const nagini = animal('Nagini')
const pascal = animal('Pascal')
const kobe = animal('Kobe', { quarantine_started_at: daysAgo(12) })
const suki = animal('Suki')
const benji = animal('Benji')

export default {
  name: 'Dashboard — a quiet day',
  path: '/',
  fixtures: {
    animals: [nagini, pascal, kobe, suki, benji],
    shedding_logs: [
      // 30-day cycle, last shed 47 days ago: 17 days late, against a margin of 6.
      ...shedSeries(nagini.id, { everyDays: 30, lastDaysAgo: 47 }),
      // 30-day cycle, last shed 27 days ago: due in 3 days.
      ...shedSeries(pascal.id, { everyDays: 30, lastDaysAgo: 27 }),
    ],
    weight_logs: [
      weightLog(suki.id, { logged_at: daysAgo(213) }),
      // Benji was weighed last week, so he has nothing to say.
      weightLog(benji.id, { logged_at: daysAgo(6) }),
    ],
  },
  expect: {
    contains: [
      'Worth a look',
      'Nothing due today',
      'Shed 17 days late — every 30 days',
      'In quarantine 12 days',
      'Shed expected — due in 3 days',
      'Not weighed in 213 days',
    ],
    // Late sheds, then quarantines, then coming sheds, then stale weights.
    order: ['Nagini', 'Kobe', 'Pascal', 'Suki'],
    absent: [
      // Fed recently, weighed recently, no sheds logged: nothing to report.
      'Benji',
      // The row text is built by interpolation, so a null reaches the screen
      // as this rather than as an error anywhere.
      'undefined',
    ],
  },
}
