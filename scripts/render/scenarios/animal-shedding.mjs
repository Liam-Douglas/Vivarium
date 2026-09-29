// The Vitals tab, shedding side: the summary figures and the interval chart.
//
// Three sheds thirty days apart, the most recent well overdue, so both the
// summary and the prediction on the overview card have something to say.
import { animal, shedSeries } from '../fixtures.mjs'

const suki = animal('Suki')

export default {
  name: 'Animal detail — shed history and intervals',
  path: `/animals/${suki.id}`,
  act: async (page) => {
    await page.getByRole('button', { name: 'Vitals' }).click()
    await page.getByRole('button', { name: /Shedding/ }).click()
  },
  fixtures: {
    animals: [suki],
    // 30-day cycle, last shed 47 days ago: 17 days late against a margin of 6.
    shedding_logs: shedSeries(suki.id, { everyDays: 30, lastDaysAgo: 47 }),
  },
  expect: {
    contains: ['Total sheds', 'Complete', 'Avg interval', '30d', 'SHED INTERVALS (days)'],
    absent: ['undefined', 'NaN', 'Infinity'],
  },
}
