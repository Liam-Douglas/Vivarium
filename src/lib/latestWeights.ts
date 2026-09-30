import { currentWeight, type WeighIn } from './weightStats'

/**
 * Each animal's current weight, keyed by id.
 *
 * Written for the spreadsheet export, whose Animals sheet read
 * `animals.weight_grams` — a column nothing in the app writes — and so
 * exported a blank cell for every animal not imported with one, while the
 * Weight log sheet beside it carried the real figures.
 *
 * It is a `Map` rather than a lookup per row because the export has every
 * weigh-in for the household in hand and filters it once per animal
 * otherwise, which is the whole list scanned once per row.
 */

export interface WeighedRow extends WeighIn {
  animal_id: string
}

export interface WeighableAnimal {
  id: string
  /** The stored column, kept only as a fallback for an import with no logs. */
  weight_grams?: number | null
}

export function latestWeightByAnimal(
  animals: readonly WeighableAnimal[],
  logs: readonly WeighedRow[]
): Map<string, number | null> {
  const byAnimal = new Map<string, WeighedRow[]>()
  for (const log of logs) {
    const held = byAnimal.get(log.animal_id)
    if (held) held.push(log)
    else byAnimal.set(log.animal_id, [log])
  }

  return new Map(animals.map((animal) => [
    animal.id,
    currentWeight(byAnimal.get(animal.id) ?? [], animal.weight_grams ?? null),
  ]))
}
