// The summary cards on an animal's Overview.
//
// "Current weight" read `animals.weight_grams`, a column nothing in the app
// has ever written — not the weight form, which only inserts a weight_logs
// row, and not AnimalForm, which has no weight field. So for any animal added
// through the app it rendered an em dash, with the trend badge beside it,
// giving "—+150": a change against nothing.
//
// Three logged weights here and no column value, which is what every animal in
// a real collection looks like.
import { animal, weightLog, shedSeries, daysAgo } from '../fixtures.mjs'

const suki = animal('Suki')

export default {
  name: 'Animal detail — the overview cards read the logs',
  path: `/animals/${suki.id}`,
  fixtures: {
    animals: [suki],
    weight_logs: [
      weightLog(suki.id, { weight_grams: 1100, logged_at: daysAgo(60) }),
      weightLog(suki.id, { weight_grams: 1250, logged_at: daysAgo(5) }),
    ],
    shedding_logs: shedSeries(suki.id, { everyDays: 30, lastDaysAgo: 47 }),
  },
  expect: {
    contains: [
      'Current weight',
      // The latest logged weight, and the change since the one before it.
      '1250g',
      '+150',
      'Last shed',
    ],
    // An em dash here means the card fell back to the dead column.
    absent: ['—+150', 'undefined', 'NaN'],
  },
}
