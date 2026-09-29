// The shopping list must flag the same items the dashboard warns about.
//
// useFeederInventory's isLowStock carried a note that these two have to agree
// on what "low" means, or the dashboard warns about items the list does not
// offer to buy. Moving the dashboard to a projection broke that until both
// screens went through lib/feederDemand — so this scenario is the pair to
// dashboard-stock-and-care, with the same fixtures and the same expected
// verdict on each item.
import { animal, feedingLog, feeder } from '../fixtures.mjs'

const suki = animal('Suki')

// A fortnight's worth, at one rat a fortnight.
const rats = feeder('Rats (Medium)', { stock: 1 })
// Nothing eats these, so the threshold is all there is to go on.
const mice = feeder('Mice (Pinkie)', { stock: 1, low_stock_threshold: 4 })
// Nothing eats these either, and there are plenty: neither rule flags it.
const crickets = feeder('Crickets (Large)', { stock: 500, low_stock_threshold: 50 })

export default {
  name: 'Expenses — the shopping list agrees with the dashboard',
  path: '/expenses',
  fixtures: {
    animals: [suki],
    feeding_logs: [feedingLog(suki.id, { prey_type: 'Rat', prey_size: 'Medium' })],
    feeder_items: [rats.item, mice.item, crickets.item],
    feeder_stock: [rats.stock, mice.stock, crickets.stock],
  },
  expect: {
    // The alert names exactly what it flagged, so asserting on the joined list
    // is what proves the crickets were left out. A blanket `absent` on their
    // name would not: the page also renders the full stock table below, which
    // lists every item whether it is low or not.
    contains: ['2 feeders running low', 'Rats (Medium), Mice (Pinkie)'],
    absent: ['3 feeders running low', 'undefined'],
  },
}
