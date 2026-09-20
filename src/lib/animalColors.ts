// Calendar dots are colour-coded per animal. The colour has to be a property of
// the animal, not of its position in a list: keying off an array index meant
// adding or archiving one animal repainted every dot on the calendar, so a
// colour learned last week pointed at a different animal this week.

export const ANIMAL_COLORS = [
  '#8fbe5a', '#d4924a', '#5a8ebe', '#c45a5a', '#a87ac4',
  '#5abeaa', '#be5a8f', '#8e8e5a', '#5a8e8e', '#be8f5a',
] as const

/**
 * Stable colour for an animal id — FNV-1a over the id, indexed into the palette.
 *
 * The palette is smaller than most collections, so two animals sharing a colour
 * is expected rather than a failure. What matters is that one animal keeps its
 * colour for as long as the row exists, which array position never gave us.
 */
export function animalColor(id: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return ANIMAL_COLORS[(hash >>> 0) % ANIMAL_COLORS.length]
}
