#!/usr/bin/env node
/**
 * Generates an import workbook that puts a collection into a known state, so
 * the dashboard's busy and quiet layouts can both be looked at in a browser.
 *
 *   node scripts/make-test-fixtures.mjs busy
 *   node scripts/make-test-fixtures.mjs quiet
 *
 * Dates are written relative to the day you run it, so the states hold whenever
 * you import. Sheets are named to match the app's own template, which is what
 * the import wizard classifies on.
 *
 * Not importable, and so not covered here: weights, quarantine flags and
 * medication schedules. See docs/testing/responsive-check.md for the handful of
 * clicks those need.
 */
import * as XLSX from 'xlsx'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scenario = (process.argv[2] ?? 'busy').toLowerCase()
if (!['busy', 'quiet'].includes(scenario)) {
  console.error(`Unknown scenario "${scenario}". Use "busy" or "quiet".`)
  process.exit(1)
}

const DAY = 86_400_000
const today = new Date()
today.setHours(12, 0, 0, 0)
const ago = (days) => new Date(today.getTime() - days * DAY).toISOString().slice(0, 10)

/**
 * `fedDaysAgo: null` means no feeding rows at all — the "never fed" state.
 * `frequency: ''` leaves feeding_frequency_days null, which is the state that
 * used to render "Overdue 0" in green.
 */
const collections = {
  // Something in every urgency bucket, so the Today queue is populated.
  busy: [
    { name: 'Kaa', species: 'Ball Python', morph: 'Pastel', sex: 'Female', frequency: 14, fedDaysAgo: 18, prey: 'Rat', size: 'Medium', note: 'overdue by 4 days' },
    { name: 'Nagini', species: 'Ball Python', morph: 'Banana', sex: 'Female', frequency: 14, fedDaysAgo: 15, prey: 'Rat', size: 'Small', refused: true, note: 'overdue by 1 day, last meal refused' },
    { name: 'Monty', species: 'Carpet Python', morph: 'Jaguar', sex: 'Male', frequency: 14, fedDaysAgo: 14, prey: 'Rat', size: 'Large', sheds: [6, 58, 110], note: 'due soon + shed predicted' },
    { name: 'Sahara', species: 'Bearded Dragon', sex: 'Female', frequency: 7, fedDaysAgo: 5, prey: 'Dubia roach', size: 'Medium', quantity: 6, note: 'due in 2 days' },
    { name: 'Iris', species: 'Crested Gecko', frequency: 14, fedDaysAgo: 2, prey: 'Mouse', size: 'Pinkie', note: 'on schedule, stays out of the queue' },
    { name: 'Ivy', species: 'Corn Snake', frequency: '', fedDaysAgo: 30, prey: 'Mouse', size: 'Adult', note: 'NO SCHEDULE — the untracked state' },
    { name: 'Root', species: 'Western Hognose', frequency: 10, fedDaysAgo: null, note: 'NEVER FED — has a schedule, nothing to count from' },
  ],
  // Nothing due inside three days, so the queue empties and "Coming up" and
  // "Worth a look" take over.
  quiet: [
    { name: 'Kaa', species: 'Ball Python', morph: 'Pastel', sex: 'Female', frequency: 14, fedDaysAgo: 8, prey: 'Rat', size: 'Medium', note: 'due in 6 days' },
    { name: 'Nagini', species: 'Ball Python', morph: 'Banana', sex: 'Female', frequency: 14, fedDaysAgo: 9, prey: 'Rat', size: 'Small', note: 'due in 5 days' },
    { name: 'Monty', species: 'Carpet Python', morph: 'Jaguar', sex: 'Male', frequency: 21, fedDaysAgo: 15, prey: 'Rat', size: 'Large', sheds: [4, 56, 108], note: 'due in 6 days + shed predicted' },
    { name: 'Sahara', species: 'Bearded Dragon', sex: 'Female', frequency: 14, fedDaysAgo: 10, prey: 'Dubia roach', size: 'Medium', quantity: 6, note: 'due in 4 days' },
    { name: 'Ivy', species: 'Corn Snake', frequency: '', fedDaysAgo: 30, prey: 'Mouse', size: 'Adult', note: 'NO SCHEDULE — leads Worth a look' },
    { name: 'Root', species: 'Western Hognose', frequency: 10, fedDaysAgo: null, note: 'NEVER FED — second Worth a look row' },
  ],
}

const animals = collections[scenario]

const animalRows = [
  ['Name *', 'Species *', 'Morph', 'Sex', 'Date of birth', 'Feeding frequency', 'Notes'],
  ...animals.map((a) => [a.name, a.species, a.morph ?? '', a.sex ?? '', '', a.frequency, a.note]),
]

const feedingRows = [
  ['Animal name *', 'Date *', 'Prey type *', 'Prey size', 'Quantity', 'Refused', 'Notes'],
]
for (const a of animals) {
  if (a.fedDaysAgo === null) continue
  // A short history, so "Takes food — N of last 10" and the per-month chart
  // both have something to show.
  const interval = Number(a.frequency) || 14
  for (let i = 0; i < 4; i++) {
    const when = a.fedDaysAgo + i * interval
    feedingRows.push([
      a.name, ago(when), a.prey, a.size ?? '', String(a.quantity ?? 1),
      i === 0 && a.refused ? 'true' : 'false', '',
    ])
  }
}

const sheddingRows = [['Animal name *', 'Date *', 'Complete', 'Notes']]
for (const a of animals) {
  for (const days of a.sheds ?? []) sheddingRows.push([a.name, ago(days), 'true', ''])
}

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(animalRows), 'Animals')
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(feedingRows), 'Feeding logs')
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheddingRows), 'Shedding logs')

const out = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', `vivarium-${scenario}.xlsx`)
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }))

console.log(`${out}`)
console.log(`  ${animals.length} animals · ${feedingRows.length - 1} feedings · ${sheddingRows.length - 1} sheds`)
for (const a of animals) console.log(`  ${a.name.padEnd(8)} ${a.note}`)
