// The Vitals tab, weight side: the growth chart and the figures under it.
//
// The scenario exists before the extraction rather than after it. Moving JSX
// between files is not something `tsc` can check — a section rendered in the
// wrong place typechecks perfectly — and that is precisely why this refactor
// was deferred three times. This is what replaces "run it and look".
import { animal, weightLog, daysAgo } from '../fixtures.mjs'

const suki = animal('Suki')

export default {
  name: 'Animal detail — the weight chart and its figures',
  path: `/animals/${suki.id}`,
  act: async (page) => { await page.getByRole('button', { name: 'Vitals' }).click() },
  fixtures: {
    animals: [suki],
    weight_logs: [
      weightLog(suki.id, { weight_grams: 900, logged_at: daysAgo(120) }),
      weightLog(suki.id, { weight_grams: 1100, logged_at: daysAgo(60) }),
      weightLog(suki.id, { weight_grams: 1250, logged_at: daysAgo(5) }),
    ],
  },
  expect: {
    contains: [
      'GROWTH CHART',
      // Start, total gain and latest, across the whole history rather than the
      // twelve points the chart draws.
      '900g', '+350g', '1250g',
    ],
    absent: ['undefined', 'NaN', 'Infinity'],
  },
}
