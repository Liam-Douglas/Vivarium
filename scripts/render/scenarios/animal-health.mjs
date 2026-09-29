// The Health tab: the totals, the cost breakdown and the list.
//
// The totals are the point. The same figure appears on the Records tab's ROI
// panel, computed on the page, and the two read the same events — so they had
// to be made to agree rather than left to drift.
import { animal, healthEvent, daysAgo } from '../fixtures.mjs'

const suki = animal('Suki')

export default {
  name: 'Animal detail — health events and their cost',
  path: `/animals/${suki.id}`,
  act: async (page) => { await page.getByRole('button', { name: 'Health' }).click() },
  fixtures: {
    animals: [suki],
    health_events: [
      healthEvent(suki.id, 'Mites', { event_type: 'vet_visit', cost_cents: 12000, event_date: daysAgo(60) }),
      healthEvent(suki.id, 'Follow-up', { event_type: 'vet_visit', cost_cents: 3000, event_date: daysAgo(30) }),
      healthEvent(suki.id, 'Ivermectin course', { event_type: 'medication', cost_cents: 2500, event_date: daysAgo(28) }),
      // No cost recorded: counted as an event, absent from the breakdown.
      healthEvent(suki.id, 'Looking brighter', { event_date: daysAgo(7) }),
    ],
  },
  expect: {
    contains: [
      'Total events', 'Total cost',
      '$175.00',
      'COST BY TYPE (AUD)',
      'Mites', 'Looking brighter',
      // Underscores become spaces, and the label is capitalised in CSS.
      'vet visit',
    ],
    absent: ['undefined', 'NaN', '$0.00'],
  },
}
