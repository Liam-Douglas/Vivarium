# Implementation plan

`vivarium-build-order.html` — six dependency-ordered phases to ship the design markups
in `docs/design/markups/`, published at
https://claude.ai/code/artifact/51069e40-1e3e-40d4-8715-6c78ad52d570

Ordered by what unblocks what rather than by screen. Each phase stands alone; the app is
coherent if you stop after any of them.

| | Phase | Size | Depends on |
|---|---|---|---|
| ✓ | Fix the false all-clear | — | shipped (`f312465`) |
| 1 | Foundations — three defects, three queries widened | S | — |
| 2 | Delete the duplication | M | — |
| 3 | Surface what already exists | M | 1 |
| 4 | Navigation and action parity | S | — |
| 5 | Make it responsive | L | 2 |
| 6 | The quiet states | M | 1, 5 |

## Defects found while planning

1. **Enclosure batch feed does not deduct feeder stock.** `handleBatchFeed` in
   `pages/Animals.tsx` uses the legacy `createFeedingLog` + `updateAnimal` pair while
   single feeding goes through the atomic `log_feeding` RPC. Stock silently drifts, and
   the two writes are not atomic.
2. **Notifications disagree with the screens.** `isOverdue` in `lib/dates.ts` uses
   `days >= freq`; every screen uses `> freq`.
3. **The profile turns amber a day early** — `AnimalDetail.tsx` uses `freq - 2` against
   the shared module's `freq - 1`.

## Data layer

No Supabase migration is required. `medication_logs`, `medication_schedules`,
`enclosures` and the `feeder_stock` view all exist; the only data-layer work is making
`getWeightLogs`, `getMedicationSchedules` and `getMedicationLogs` accept a missing
`animalId`. The one exception is the optional `log_feedings` RPC in decision six.

Seven open decisions are listed on the published page, each with a recommendation.
