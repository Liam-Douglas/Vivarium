// Animals no feeding queue can reach.
//
// This block is not part of "Worth a look" and does not hide behind it: an
// animal with no schedule reports a gap in the records rather than a state of
// the animal, and it is what keeps "Nothing due today" from being a lie on a
// collection nobody has set schedules for. It shows whether or not there is a
// queue, which is the distinction this scenario pins down.
import { animal, shedSeries, daysAgo } from '../fixtures.mjs'

const drogon = animal('Drogon', { feeding_frequency_days: null, last_fed_at: null })
const viserion = animal('Viserion', { last_fed_at: null })
const nagini = animal('Nagini')

export default {
  name: 'Dashboard — untracked animals show beside a quiet queue',
  path: '/',
  fixtures: {
    animals: [drogon, viserion, nagini],
    shedding_logs: shedSeries(nagini.id, { everyDays: 30, lastDaysAgo: 47 }),
  },
  expect: {
    contains: [
      '2 animals not tracked',
      'has no feeding schedule, so it will never appear as due',
      'but no feeding logged yet',
      // And the quiet-day section alongside it, not instead of it.
      'Worth a look',
      'Shed 17 days late — every 30 days',
    ],
  },
}
