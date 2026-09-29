// The two rail cards: feeder stock, and care tasks.
//
// Stock is the interesting one. It used to be a threshold — is this number
// small? — and is now a projection from what the collection actually eats, so
// the card has to say days rather than a count. Both paths are here: an item
// something is scheduled against, and an item nothing is, which has no rate to
// project from and falls back to the threshold it always used.
//
// It also exercises the join that makes that possible. A meal records a prey
// type and size; lib/feederMatch turns "Rat" + "Medium" into the item named
// "Rats (Medium)". A fixture named "rats" would match nothing and the card
// would quietly say the wrong thing.
import { animal, feedingLog, feeder, careTask, daysAgo } from '../fixtures.mjs'

const suki = animal('Suki')

// One rat a fortnight against one rat in the freezer: a fortnight left, which
// is exactly the horizon the dashboard asks about.
const rats = feeder('Rats (Medium)', { stock: 1 })
// Nothing eats these, so there is no date to give and the old threshold speaks.
const mice = feeder('Mice (Pinkie)', { stock: 1, low_stock_threshold: 4 })

export default {
  name: 'Dashboard — stock projects, and falls back where it cannot',
  path: '/',
  fixtures: {
    animals: [suki],
    feeding_logs: [feedingLog(suki.id, { prey_type: 'Rat', prey_size: 'Medium' })],
    feeder_items: [rats.item, mice.item],
    feeder_stock: [rats.stock, mice.stock],
    care_tasks: [careTask('Clean the rack', { frequency_days: 7, last_done_at: daysAgo(10) })],
  },
  expect: {
    contains: [
      'Feeder stock is running low',
      // Projected from demand...
      'Rats (Medium) — 14d left',
      // ...and not projected, because nothing draws on it.
      'Mice (Pinkie) — 1 left',
      '1 care task due',
      'Clean the rack',
    ],
    absent: ['undefined', 'NaN'],
  },
}
