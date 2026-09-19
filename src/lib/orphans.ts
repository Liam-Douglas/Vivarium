// Which feeding records have actually lost their animal.
//
// Archiving an animal is a soft delete: the row stays, `is_active` goes false,
// and the animal keeps its history. An earlier version of this check compared
// logs against the *active* animals only, so every archived animal's records
// counted as orphaned — and the repair that followed reassigned them to
// whichever living animal happened to share the name. Archive "Monty", take in
// a new "Monty", press the button, and the first one's feeding history moved
// onto the second. Keeping the rule in one tested place is the point.

export interface AnimalRef {
  id: string
  name: string
  is_active: boolean
}

export interface LogRef {
  id: string
  animal_id: string | null
}

export interface OrphanReport {
  /** The animal row is gone. Nothing identifies where these belonged. */
  orphaned: LogRef[]
  /** Attached to an archived animal. Normal; reported only for clarity. */
  onArchived: LogRef[]
}

export function classifyFeedingLogs(animals: AnimalRef[], logs: LogRef[]): OrphanReport {
  const byId = new Map(animals.map((a) => [a.id, a]))
  const orphaned: LogRef[] = []
  const onArchived: LogRef[] = []

  for (const log of logs) {
    if (!log.animal_id) continue          // never attached to anything
    const animal = byId.get(log.animal_id)
    if (!animal) orphaned.push(log)
    else if (!animal.is_active) onArchived.push(log)
  }

  return { orphaned, onArchived }
}
