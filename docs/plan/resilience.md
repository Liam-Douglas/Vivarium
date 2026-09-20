# Resilience plan

Work arising from the September 2026 review that followed the Feeding Log work.
The app is feature-complete in a way the review did not expect — weight charts,
shed tracking, medications, breeding, ROI, QR labels all exist and work. What it
does badly is fail. Ordered by how much damage each defect does today rather than
by how hard it is to fix. Each phase lands as its own pull request and stands alone.

| | Phase | Size | Needs Liam |
|---|---|---|---|
| ✓ | 1 — Failures say so | M | shipped (`9d9fd47`) |
| ✓ | 2 — The last silent truncations | S | shipped |
| ✓ | 3 — The cache forgets | S | shipped |
| ✓ | 4 — Small correctness batch | XS | shipped |
| ◐ | 5 — AnimalDetail, in slices | L | slice 1 shipped |

## Phase 1 — Failures say so

Twelve hooks compute an `error` and return it. Two pages read it: `Animals.tsx:316`
and `Expenses.tsx:606`. Everywhere else it is destructured away or never asked for —
`Dashboard.tsx:80-82`, all ten hooks in `AnimalDetail.tsx:89-98`, `Stats`, and
`FeedingLog`.

So a failed load renders as an empty state. The Dashboard reports no animals. The
Feeding Log says "No feedings logged yet". On a flaky connection, or an expired
session, or a Supabase hiccup, the app tells the keeper their records are gone.

This is the same defect the Feeding Log plan fixed for *filters* one phase ago —
"an empty list now says which kind of empty it is" — applied to the wrong half of
the problem. The filter case needs a filter set before it can mislead anyone. This
one needs a dropped packet.

Fix, in three parts:

- A shared `LoadError` component: what failed, the message, and a Retry that calls
  the hook's `refresh`. One component, because four pages rendering four different
  error treatments is how the current inconsistency happened.
- Pages read the error. Where a page composes several hooks — AnimalDetail has ten —
  the page surfaces one error region rather than ten, since ten simultaneous failures
  are one failure.
- An empty state is only rendered once a load has *succeeded* and returned nothing.
  The distinction is the whole point: `loading`, `error` and `empty` are three states
  and the app currently renders two of them.

Tests: the state selection is the part worth pinning, so it goes in `lib/loadState.ts`
as a pure function over `{ loading, error, rowCount }` and is tested there. The
components that consume it are not testable in this repo — there is no DOM harness,
by design.

## Phase 2 — The last silent truncations

Two more instances of the defect already fixed twice, plus the tie-break follow-up
the Feeding Log plan recorded.

**Stats under-reports spend.** `getAllExpenses` (`queries.ts:547`) does not paginate,
and `Stats.tsx:34` is its only caller. Past 1000 expenses the YTD total and the
category breakdown are wrong with no error. A paginated `getAllExpensesComplete`
already exists directly beside it — the export uses that one, Stats got the other.
The fix is to delete the unpaginated function and point Stats at the complete one,
rather than leaving two near-identical names and a trap for the next caller.

**The export is still partly truncated.** `Settings.tsx:107-119` calls six `getAll*`
variants that page correctly and nine queries that do not, `getHealthEvents` among
them. Health events accumulate over a collection's life. Acquisition, exit, breeding,
schedule, feeder, vet and enclosure rows are bounded by animal count in practice, but
the inconsistency is the bug: a reader cannot tell which half of the export is
complete, and neither could the code's author.

**Four `getAll*` wrappers turned out to be redundant, not just untidy.** Once the
base queries page, `getAllFeedingLogs`, `getAllSheddingLogs`, `getAllWeightLogs` and
`getAllMedicationLogs` are exact aliases of them. They were deleted rather than fixed
in parallel, which is the same decision as deleting `getAllExpenses` applied to the
rest of the family.

**Three more reads were unpaginated for the same reason nobody noticed the first
ones.** `getAllAnimalsForMatching` feeds the importer's duplicate check, where
truncation has the same consequence as the failed load Phase 1 fixed: rows it cannot
see look like animals it has never met. `recalculateLastFedAt` reads the animal list
to rebuild feeding dates, so an animal past the cap keeps a stale `last_fed_at`
silently. `getFeederStockEvents` is scoped to one feeder item, but a feeder used
weekly accumulates events for years.

**The `getAll*` family orders on a date column alone.** Recorded as a follow-up in
the Feeding Log plan. Offset paging over a sort with ties can repeat a row on one page
and drop it from the next. Ties are less common here than on a batch feed, but the
failure mode is the same and the fix is one `.order('id')` per query.

## Phase 3 — The cache forgets

`vite.config.ts:32-36` caches every Supabase response:

```js
urlPattern: /^https:\/\/.*supabase\.co\/.*/i,
handler: 'NetworkFirst',
options: { cacheName: 'supabase-cache', networkTimeoutSeconds: 10 },
```

No `expiration`, so no maximum age and no maximum entries. The pattern matches
`/auth/v1/` as well as the REST paths. Sign-out is a bare `supabase.auth.signOut()`
(`Settings.tsx:364`, `OnboardingHousehold.tsx:78`) and nothing in the app ever calls
`caches.delete`.

State the risk accurately, because it is narrower than it first reads: after sign-out
the next user's queries return 401 from the network, so the app does not serve them
the previous user's data. What persists is a household's records sitting in
CacheStorage on that device indefinitely, readable by anyone with the device and by
any script on the origin.

Fix: an `expiration` block bounding age and entries; exclude `/auth/` from the cached
pattern, since a token or user response has no business in a cache; and a sign-out
path that clears the caches it owns before redirecting.

## Phase 4 — Small correctness batch

**A toast button that does nothing.** `FeedingLogForm.tsx:113` offers "Add" after a
feeding logs prey that is not in feeder inventory:

```js
{ label: 'Add', onClick: () => { /* navigate to feeders */ } }
```

The handler is an empty comment. The toast renders, the button is tappable, and
nothing happens. Either wire it to `/feeders` or drop the action — an affordance that
does nothing is worse than no affordance.

Anything else small enough to not deserve a phase, found while working the others,
joins this one.

## Phase 5 — AnimalDetail, in slices

1922 lines holding weight, shedding, health, feeding, acquisition, exit, breeding,
photos, medications, QR, timeline and ROI, each with its own state block and its own
handler block in a single component.

This is not a rewrite. It is the reason two defects are still open: the shared
`FeedingEditForm` was not adopted there because the page could not be exercised
safely, and its inline editor still reads `fed_at` through a date-only input seeded
by `log.fed_at.split('T')[0]` — a UTC clock that drops the time on save.

Slices, smallest first, each its own pull request:

1. ✓ Adopt `FeedingEditForm`, deleting the inline editor and its seven state
   variables. This fixed the UTC bug as a side effect, which was the point of going
   first. It also restored the time-of-day field: the inline editor offered a date
   picker only, so every edit silently moved the feeding to noon.
2. Extract the weight section, chart included.
3. Extract shedding, then health, then the remaining record types.

Stop when the page stops being the reason a fix is risky. Extracting all twelve is
not the goal.

## Decisions taken

- **Errors get one shared component, not per-page treatments.** Four pages inventing
  four error treatments is how two pages ended up with none.
- **Delete `getAllExpenses` rather than paginate it.** Two functions differing only in
  completeness, named twelve characters apart, is the trap that produced this bug.
- **No offline mode.** The service worker already serves the shell offline; making the
  app *work* offline means a write queue and conflict resolution, which is a different
  project. Phase 1 makes offline fail honestly, which is the part worth having.

## Out of scope

- A service-worker update prompt. `registerType: 'autoUpdate'` with `skipWaiting`
  swaps the bundle without telling anyone, which made the stale-bundle diagnosis
  confusing, but changing it is a behaviour change to how the app updates and belongs
  in its own discussion.
- Global search across animals, feedings and records. Animals has its own search;
  extending it is a feature, not a repair.
- Anything in `lib/feedingStatus.ts`, `lib/groupByDay.ts` or the other tested pure
  modules. They are consumed here, not altered.
