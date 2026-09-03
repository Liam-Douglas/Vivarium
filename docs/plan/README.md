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
| ✓ | Navigation and action parity | S | shipped |
| ✓ | Make it responsive | L | shipped |
| ✓ | The quiet states | M | shipped |

**Phase 2 note — resolved.** Folding the Feeding and Vitals tabs into Timeline was
dropped, and on investigation the premise was wrong twice over. Both tabs hold charts
Timeline cannot represent (per-month feedings, the growth chart with its
localStorage target-weight feature, the shed-interval chart) — and, decisively,
**Timeline has no `RecordActions` at all.** It is read-only. Those tabs are the only
place in the app a feeding, weight or shed can be edited or deleted, so folding them
into Timeline would have removed record editing, not a duplicate view.

Instead Feeding merged into Vitals as a third sub-tab, giving one **Logs** tab over
feeding, weight and shedding: six tabs to five, with every chart, every edit and delete
control, and the target-weight feature intact. Timeline reads history across types;
Logs is where a record is corrected.

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

**Decisions taken.** The fifth bottom-nav tab went to Stats, with Expenses under More
(decision 1); the two orphaned pages were deleted (decision 2); `isOverdue` aligned to
`> freq` (decision 3); the streak badge was cut from the card and kept on Stats
(decision 4); the dashboard's all-animals grid was removed (decision 5); batch feeding
loops the existing RPC rather than adding `log_feedings` (decision 6); vitest was added
early, before Phase 3 rather than before Phase 6 (decision 7).

All six phases are shipped and the tab question is resolved (see the Phase 2 note).
One thing remains open: a browser pass over Phase 5's responsive work at 390, 768 and
1440 against a real Supabase environment — that phase was verified by construction and
type-checking, not visually.
