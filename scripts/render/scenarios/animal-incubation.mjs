// The Records tab's incubation section, which had no screen at all until now:
// `incubations` turned up in the negative RLS test as a table nothing in src/
// reads, and was kept rather than dropped because it extends breeding records
// with columns nothing else has.
//
// Three rows, one per sentence the section has to get right — a clutch past its
// date, a finished one with a rate, and one nobody gave a target. The last is
// the interesting case: it has run longer than the overdue one and must still
// read as merely incubating.
import { animal, incubation, daysAgo } from '../fixtures.mjs'

const suki = animal('Suki')

export default {
  name: 'Animal detail — incubation, running and hatched',
  path: `/animals/${suki.id}`,
  act: async (page) => { await page.getByRole('button', { name: 'Records' }).click() },
  fixtures: {
    animals: [suki],
    incubations: [
      // Expected six days ago and still no hatch.
      incubation(suki.id, {
        start_date: daysAgo(58), expected_hatch_date: daysAgo(6),
        clutch_size: 7, eggs_fertile: 6,
        temperature_c: 31.5, humidity_percent: 80, incubation_medium: 'Vermiculite',
      }),
      // Done: 60 days in, 6 of 8 fertile eggs hatched — 75% of fertile.
      incubation(suki.id, {
        start_date: daysAgo(100), expected_hatch_date: daysAgo(42),
        actual_hatch_date: daysAgo(40),
        clutch_size: 10, eggs_fertile: 8, hatchlings: 6,
        outcome: 'Six healthy hatchlings',
      }),
      // Ninety days in, no expected date: incubating, never overdue.
      incubation(suki.id, { start_date: daysAgo(90), clutch_size: 4 }),
    ],
  },
  expect: {
    contains: [
      'Incubation',
      'Overdue', '6 days past the expected date',
      'Hatched', '60 days in the incubator', '75% hatch rate', 'of fertile eggs',
      'Incubating', 'Day 90',
      '31.5°C', '80% RH', 'Vermiculite',
      'Six healthy hatchlings',
    ],
    // NaN is the one that matters: a blank number field written as Number('')
    // or an unparseable date would land here and nowhere else.
    absent: ['undefined', 'NaN', 'Infinity', 'No incubations yet'],
  },
}
