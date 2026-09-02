# Implementation plan

`vivarium-build-order.html` — six dependency-ordered phases to ship the design markups
in `docs/design/markups/`, published at
https://claude.ai/code/artifact/51069e40-1e3e-40d4-8715-6c78ad52d570

Ordered by what unblocks what rather than by screen. Each phase stands alone; the app is
coherent if you stop after any of them.

| | Phase | Size | Depends on |
|---|---|---|---|
| ✓ | Fix the false all-clear | — | shipped (`f312465`) |
| ✓ | Foundations — four defects, three queries widened | S | shipped (`00920ed`) |
| ✓ | Delete the duplication | M | shipped (`ff7e459`), tab fold withdrawn |
| ✓ | Surface what already exists | M | shipped |
| 4 | Navigation and action parity | S | — |
| 5 | Make it responsive | L | 2 |
| 6 | The quiet states | M | 1, 5 |

**Phase 2 note.** Folding the Feeding and Vitals tabs into Timeline was dropped: both
hold charts (per-month feedings, the growth chart with its localStorage target-weight
feature, and the shed-interval chart) that Timeline's event filters cannot represent.
Tabs stay at six pending a decision on where those charts should live.

## Defects found while planning

1. **Enclosure batch feed does not deduct feeder stock.** `handleBatchFeed` in
   `pages/Animals.tsx` uses the legacy `createFeedingLog` + `updateAnimal` pair while
   single feeding goes through the atomic `log_feeding` RPC. Stock silently drifts, and
   the two writes are not atomic.
2. **Notifications disagree with the screens.** `isOverdue` in `lib/dates.ts` uses
   `days >= freq`; every screen uses `> freq`.
3. **Mouse feedings never deducted stock.** Prey type "Mouse" never matched the
   "Mice (…)" feeder presets, because the plural rule only strips a trailing `s`. Six
   presets, both feed paths. `Black soldier fly larvae` vs the `BSFL` preset failed the
   same way. Found while extracting `lib/feederMatch.ts`.
4. **The profile turns amber a day early** — `AnimalDetail.tsx` uses `freq - 2` against
   the shared module's `freq - 1`.

## Data layer

No Supabase migration is required. `medication_logs`, `medication_schedules`,
`enclosures` and the `feeder_stock` view all exist; the only data-layer work is making
`getWeightLogs`, `getMedicationSchedules` and `getMedicationLogs` accept a missing
`animalId`. The one exception is the optional `log_feedings` RPC in decision six.

Seven open decisions are listed on the published page, each with a recommendation.
