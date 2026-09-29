// The suggested meal size on the feeding form.
//
// This line has never appeared. It was computed from `animals.weight_grams`, a
// column nothing in the app writes, and it is guarded — so what a keeper saw
// was silence rather than a wrong number, which is why it went unnoticed for
// as long as it did. It reads the animal's weigh-ins now.
//
// The scenario opens the form and picks the animal, because the line only
// renders once both a prey type and an animal are chosen.
import { animal, weightLog, feeder, daysAgo } from '../fixtures.mjs'

const suki = animal('Suki')
const rats = feeder('Rats (Medium)', { stock: 20 })

export default {
  name: 'Feeding form — the meal size suggestion reads the weigh-ins',
  path: '/feeding',
  // Idempotent, as `act` must be: the runner re-runs it while the expectations
  // fail, and clicking "Log feeding" a second time would land on the modal
  // overlay rather than the button underneath it.
  act: async (page) => {
    const animalPicker = page.getByLabel('Animal *')
    if (await animalPicker.count() === 0) {
      await page.getByRole('button', { name: 'Log feeding' }).first().click()
    }
    await animalPicker.selectOption(suki.id)

    // The prey picker is a search box over a list, not a select. Typing
    // narrows it; the row is a button.
    const preySearch = page.getByPlaceholder('Search prey types…')
    if (await preySearch.count() > 0) {
      await preySearch.fill('Rat')
      await page.getByRole('button', { name: 'Rat', exact: true }).first().click()
    }
  },
  fixtures: {
    animals: [suki],
    weight_logs: [
      weightLog(suki.id, { weight_grams: 900, logged_at: daysAgo(90) }),
      // The latest is what the suggestion must use: 10–15% of 1200g.
      weightLog(suki.id, { weight_grams: 1200, logged_at: daysAgo(3) }),
    ],
    feeder_items: [rats.item],
    feeder_stock: [rats.stock],
  },
  expect: {
    contains: ['Recommended prey: 120–180g (10–15% of 1200g body weight)'],
    absent: ['undefined', 'NaN', '0–0g'],
  },
}
