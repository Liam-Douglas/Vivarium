// How numbers and dates read on screen. Display only: nothing here changes a
// stored value, and every caller still holds grams, cents and Dates.
//
// These existed as a dozen hand-rolled `toFixed(2)` and `${g}g` expressions,
// which is how the profile came to show "−$95.00" two lines above "$-95.00",
// and a 98.5 kg python as "98500g".

import { format } from 'date-fns'

const aud = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })
const audSigned = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', signDisplay: 'exceptZero' })

/**
 * Cents as Australian dollars: 9500 → "$95.00", -9500 → "-$95.00".
 * `signed` adds a "+" to positive amounts, for changes and net figures.
 * The minus is a true minus sign (U+2212), which lines up with the plus.
 */
export function formatAUD(cents: number, { signed = false }: { signed?: boolean } = {}): string {
  const text = (signed ? audSigned : aud).format(cents / 100)
  return text.replace('-', '−')
}

const grams = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0, useGrouping: false })
const smallGrams = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1 })
const kilograms = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 2 })

/**
 * A weight in grams, the way a keeper says it.
 *
 * - under 10 g keeps one decimal, because a 0.4 g hatchling is not 0 g;
 * - up to 10 kg stays in whole grams ("1610g", as keepers write it), because
 *   a ball python is tracked in 10 g steps and "1.6kg" would hide them;
 * - from 10 kg it is kilograms ("98.5kg"), where grams stop being readable.
 *
 * `signed` is for changes: "+150g", "−1200g".
 */
export function formatWeight(g: number, { signed = false }: { signed?: boolean } = {}): string {
  const magnitude = Math.abs(g)
  let body: string
  if (magnitude >= 10_000) body = `${kilograms.format(magnitude / 1000)}kg`
  else if (magnitude < 10) body = `${smallGrams.format(magnitude)}g`
  else body = `${grams.format(magnitude)}g`

  if (g < 0) return `−${body}`
  if (signed && g > 0) return `+${body}`
  return body
}

/** A range in one unit: "120–180g", "10–12.5kg". */
export function formatWeightRange(min: number, max: number): string {
  const lo = formatWeight(min)
  const hi = formatWeight(max)
  const unit = hi.endsWith('kg') ? 'kg' : 'g'
  return lo.endsWith(unit) && !(unit === 'g' && lo.endsWith('kg'))
    ? `${lo.slice(0, -unit.length)}–${hi}`
    : `${lo}–${hi}`
}

/** "27 Sep": day first, the Australian order. */
export function formatDay(date: Date | string): string {
  return format(new Date(date), 'd MMM')
}

/** "27 Sep 2026". */
export function formatDate(date: Date | string): string {
  return format(new Date(date), 'd MMM yyyy')
}
