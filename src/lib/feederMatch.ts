/**
 * Match a logged prey type + size to an item in the feeder inventory, so a
 * feeding can deduct the right stock.
 *
 * Feeder names follow the pattern "Rats (Large)", so base and modifier are
 * parsed separately — "Rat" + size "Large" must match "Rats (Large)" and not
 * "Rats (Fuzzie)".
 *
 * Shared by the single-feed form and enclosure batch feeding; both routes must
 * deduct from the same item for the same meal.
 */

/** The feeder fields matching depends on. */
export interface MatchableFeeder {
  id: string
  name: string
}

/**
 * Prey names and feeder names come from two separate lists, so stripping a
 * trailing "s" does not connect them all. Prey type "Mouse" against a feeder
 * named "Mice (Pinkie)" matched nothing, so no mouse feeding has ever deducted
 * stock — mice being the standard feeder for hatchling and juvenile snakes.
 */
const WORD_SYNONYMS: Record<string, string> = {
  mice: 'mouse',
  flies: 'fly',
  larvae: 'larva',
}

/** Feeder presets that abbreviate rather than pluralise. */
const NAME_ALIASES: Record<string, string> = {
  bsfl: 'black soldier fly larvae',
}

function canonical(text: string): string {
  const aliased = NAME_ALIASES[text.trim()] ?? text
  return aliased
    .split(/\s+/)
    .map((word) => WORD_SYNONYMS[word] ?? word.replace(/s$/, ''))
    .join(' ')
}

function parse(name: string): { base: string; modifier: string } {
  const m = name.toLowerCase().match(/^(.+?)\s*\((.+)\)$/)
  return m ? { base: m[1].trim(), modifier: m[2].trim() } : { base: name.toLowerCase(), modifier: '' }
}

export function findMatchingFeeder<T extends MatchableFeeder>(
  feeders: T[],
  preyType: string,
  preySize?: string | null
): T | null {
  const typeLc = preyType.trim().toLowerCase()
  if (!typeLc) return null
  const sizeLc = preySize?.trim().toLowerCase() ?? ''

  const typeCanonical = canonical(typeLc)

  function typeMatches(base: string) {
    const singular = base.replace(/s$/, '')
    if (base.includes(typeLc) || typeLc.includes(base) ||
        singular.includes(typeLc) || typeLc.includes(singular)) return true
    const baseCanonical = canonical(base)
    return baseCanonical.includes(typeCanonical) || typeCanonical.includes(baseCanonical)
  }

  function sizeMatches(modifier: string) {
    if (!sizeLc) return true
    return modifier.includes(sizeLc) || sizeLc.includes(modifier)
  }

  // 1. Type and size both match
  const withBoth = feeders.filter((f) => {
    const { base, modifier } = parse(f.name)
    return typeMatches(base) && sizeMatches(modifier)
  })
  if (withBoth.length === 1) return withBoth[0]
  if (withBoth.length > 1) {
    return withBoth.find((f) => parse(f.name).modifier === sizeLc) ?? withBoth[0]
  }

  // 2. Type-only match (no size given, or no size matched)
  return feeders.find((f) => typeMatches(parse(f.name).base)) ?? null
}
