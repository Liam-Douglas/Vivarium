# Remaining work

Everything still outstanding after the hardening, feeding-log, resilience,
reminders, schema-types and follow-through plans. Ordered by exposure: the one
item with a live security dimension first, then the last unshipped phase of the
original build order, then the refactor that has been deferred twice on purpose.

| | Phase | Size | Needs Liam |
|---|---|---|---|
| ✓ | 1 — Signed photo URLs, then `0002` | M | applied — see `0002`'s header |
| ✓ | 2 — The quiet states | M | no |
| ✓ | 3 — AnimalDetail, slices 2 and 3 | L | no |

## Phase 1 — Signed photo URLs, then `0002`

The photo bucket is public. Anyone holding an object URL can read that photo
without being signed in. This has been blocked since the security work, for a
reason that is worth restating precisely: `0002` makes the bucket private, and
the client reads photos with `getPublicUrl()` (`queries.ts:924` and `:1130`), so
applying it first turns every photo in the app into a broken image — existing
rows included, because the absolute URLs already stored in `animals.photo_url`
and `animal_photos.url` stop resolving.

EXIF GPS is stripped before upload (`lib/image.ts`), so the worst case — a photo
leaking where it was taken — is already closed. What remains is that the photos
themselves are readable by anyone with a link.

**What applying it found.** The bucket already carried three policies, each
scoping to `bucket_id` and nothing else, so every signed-in user could read,
overwrite and upload into every household's folder. This plan described the
problem as "the bucket is public"; that was incomplete. Making it private would
have closed the anonymous-link hole, left the cross-household one open, and
looked like it had worked. The three were edited in place, because permissive
policies are OR'd and adding beside them would have changed nothing.

Also: the file could not be run at all. `storage.objects` is owned by
`supabase_storage_admin`, so the SQL editor can neither alter it nor create
policies on it, and the `alter table ... enable row level security` line it
carried was never needed — RLS is already on. Storage policies go through the
Dashboard. `0002` now documents that.

**The client change.** Stop storing an absolute URL. `uploadAnimalPhoto` and
`uploadAdditionalPhoto` already compute the storage path before asking for a
URL; they should return that path instead. Rendering then resolves a path to a
signed URL at display time.

No data migration is needed. The path is recoverable from every URL already
stored — it is whatever follows `/object/public/animal-photos/`. So the
resolver takes either shape and normalises, which is the whole compatibility
story:

- `lib/photoPaths.ts` — pure, tested: given a stored value, return the storage
  path, whether that value is already a path or a legacy absolute URL. The cases
  worth pinning are a legacy URL, a bare path, a URL with a query string, and a
  value that is neither.
- A resolver that signs a batch of paths and caches by path until shortly before
  expiry. Signed URLs expire, so a cached `<img src>` that outlives its
  signature is the obvious new failure — the cache holds the expiry, not just
  the URL.

**Render sites.** Four: `AnimalCard` (`:28`), `AnimalDetail`'s hero (`:835`) and
its gallery and lightbox (`:1036`), and `AnimalForm`'s preview (`:39`).

**Ordering, which is the part that bites.** The client change must be merged
*and deployed* before `0002` is applied. Signing works on a public bucket, so
the client change is safe to ship on its own and the two steps genuinely can be
separated. Apply it first and every photo breaks
until the deploy lands. The phase therefore ends with a step only Liam can take,
and the migration must not be pasted early.

## Phase 2 — The quiet states

The last unshipped phase of the original build order
(`vivarium-build-order.html`, phase 6). Its dependencies — phases 1 and 5 of
that plan — are both long shipped, so nothing blocks it.

The reasoning still holds: the dashboard is built out of exceptions, and on a
well-run collection that is blank most days. Three items, and the current code
is further along than the original plan assumed.

**Shipped.** All three, in `lib/shedStatus.ts`, `lib/animalState.ts`,
`lib/feederProjection.ts` and `lib/worthALook.ts`, with 47 tests between them.
Two things came out differently from the plan below, both deliberate:

- **A never-weighed animal is not a stale weight.** It is a different condition
  — nobody started rather than somebody stopped — and folding them together
  would have listed every animal in the collection on the day the section
  shipped, which is the fastest way to teach a keeper to skip it.
- **One row per animal, its most pressing condition only.** An animal that is
  quarantined, overdue to shed and unweighed is one animal to go and look at,
  and three rows for it would have pushed out two others that also needed it.

And one correction to the plan's reading of the code: the existing
`unscheduledAnimals` / `neverFedAnimals` block is *not* half of "Worth a look"
and did not fold into it. That block reports a gap in the records rather than a
state of an animal, and it is what keeps "Nothing due today" from being a lie on
an untracked collection, so it stays visible whether or not there is a queue.
"Worth a look" is a separate section that appears only when the queue is
empty.

**"Coming up".** The queue already reaches three days ahead
(`Dashboard.tsx:203`), so this is not a new section but a widening. Recommend
widening to seven days *only when nothing is overdue or due soon*, rather than
always: a busy day should not bury today's work under next week's. That keeps
the queue's meaning — what needs doing — and fills it only when it would
otherwise be empty.

**"Worth a look".** Half of this exists: `unscheduledAnimals` and
`neverFedAnimals` are already computed and rendered (`Dashboard.tsx:237-241`,
`:516`). Missing are stale weights, predicted sheds and running quarantines.
`inQuarantine` already exists in `pages/Animals.tsx:31` and should move to a
shared module rather than being written twice. Shed prediction does not exist
anywhere — it needs an interval derived from `shedding_logs`, which is the same
arithmetic `feedingStatus` and `careStatus` already do, and it belongs in
`lib/shedStatus.ts` beside them, tested the same way.

Capped at four rows and hidden entirely when there is a real queue, per the
original plan: the point is to fill a quiet day, not to add a second list to a
busy one.

**Stock as a projection.** Today it is a threshold — `currentStock <
low_stock_threshold` (`useFeederInventory.ts:39-41`). A projection asks a better
question: at the current feeding schedules, when does this item run out?
`lib/feederMatch.ts` already maps prey to feeder items, and every animal carries
`feeding_frequency_days`, so expected consumption over two weeks is derivable.
Pure arithmetic over two arrays, so it lands in `lib/feederProjection.ts` with
tests, and the threshold stays as the fallback for items nothing is scheduled
against.

## Phase 3 — AnimalDetail, slices 2 and 3

1908 lines holding twelve domains. Slice 1 — adopting the shared feeding editor
— shipped and closed two defects that had stayed open precisely because the page
was too risky to touch.

2. Extract the weight section, chart included.
3. Extract shedding, then health.

Deferred twice, both times for the same honest reason: it is JSX that cannot be
run in the build environment, `tsc` does not catch a section rendering in the
wrong place, and the defects it would prevent are hypothetical.

**Both halves of that turned out to be wrong, and the render harness is what
showed it.**

The JSX can be run now — `npm run render` drives the real built page against
fixtures, and a scenario for each section was written *before* it was moved, so
the extraction had something to be wrong against.

And the defects were not hypothetical. Rendering the page found two:

- **"Current weight" read a column nothing writes.** `animals.weight_grams` is
  not accepted by `createAnimal`, has no field in `AnimalForm`, and is not
  touched when a weight is logged — logging inserts a `weight_logs` row and
  nothing else. So the card showed an em dash for every animal in the app,
  with the trend badge computed from the logs sitting beside it: `—+150`, a
  change against nothing. It now reads the logs, keeping the column as a
  fallback for an import that carries one.
- **The shed prediction existed twice, by different rules.** Phase 2 extracted
  `lib/shedStatus`, but the inline copy on this page was never removed. The
  inline one had no cap on a gap too long to be a cycle and silently depended
  on the query's newest-first order, so this card and the dashboard's "Worth a
  look" could name different dates for the same animal.

Shipped: `lib/weightStats`, `lib/healthStats`, shed intervals folded into
`lib/shedStatus`, and `WeightSection`, `SheddingSection`, `HealthEventsSection`
and a shared `RecordActions` out of the page. 1915 lines to 1720, and the
arithmetic that left is tested rather than inlined.

## Decisions taken

- **Where the Feeding and Vitals tab charts live: they stay.** The original
  plan's one open question. Folding those tabs into Timeline was withdrawn
  because Timeline's event filters cannot represent a chart, and nothing since
  has changed that. Tabs stay at six and the question is closed rather than
  carried.
- **Widen the queue conditionally, not always.** A seven-day queue every day
  makes the busy days worse to read.
- **Keep the stock threshold as a fallback.** A projection says nothing about an
  item no animal is scheduled against, and silently showing nothing would be a
  regression on today's behaviour.

## The negative RLS test — run, and passed

**30 September 2026, against production.** 41 checks, 0 leaks, 0 blind spots,
0 unresolved. Twenty-two household-scoped relations returned nothing to a
stranger; fourteen returned their rows to a member; all three write probes
were refused by a policy rather than by a grant or a foreign key.

`feeder_stock` passed all three of its checks, including the one that reads
`security_invoker` out of the live catalog. Every previous statement about that
option in this project came from reading `0003`.

That is the first statement about these policies in this project that is an
observation rather than an argument.

Three things the run itself showed, none of them failures:

- **Eight of the twenty-two were empty** at the time of the run:
  `weight_logs`, `health_events`, `medication_schedules`, `vet_contacts`,
  `breeding_records`, `exit_records`, `equipment` and `incubations`. The
  negative half still holds for them (a leak would have shown), but the
  control could not run, so *scoping* is demonstrated only on the fourteen
  that held rows.

  `weight_logs` is no longer empty — a weight was logged on 30 September to
  check the two fixes below — so a re-run now covers fifteen.
- **`feeder_stock` is covered, and passed.** The loops read views, and a
  separate check asks the database whether each view carries
  `security_invoker` — without it a view runs as its owner, which owns the
  base tables, so RLS on them is bypassed and the reads would pass for the
  wrong reason. A materialised view holding a `household_id` is reported
  outright, since it cannot honour the caller's RLS at all; there are none.
  A side finding: the stranger check on the view reported a count rather than
  `CHECK`, so `authenticated` does hold `SELECT` on it and
  `useFeederInventory` is using the grouped query rather than silently falling
  back to the per-item path.
- **`equipment` and `incubations` exist and the client never reads them.**
  Neither appears in any `.from()` in `src/`. They are covered by RLS, so this
  is not a hole; it is either unfinished work or dead schema.

## The negative RLS test — how it was built



Carried since the security work and finally written:
`supabase/tests/negative_rls.sql`.

Everything before it proved the policies do not lock the owning member out.
This proves they lock everybody else out, *and that they do it by scoping
rather than by refusing everything* — the control half, without which the
suite would pass just as happily against a database that denied all access.

Two things are worth recording, because both were found by testing the test
rather than by reading it.

**It reported a pass against a real escalation hole.** With
`household_members` carrying an insert policy that checks nothing, the
stranger's insert went through the policy and was stopped only by the
`auth.users` foreign key. The test called that a rejection. It now gives the
stranger a real `auth.users` row inside its own rolled-back transaction, so
the policy is the only thing that can refuse.

**An inconclusive result is not a pass.** A missing `SELECT` grant makes a
stranger see nothing, which is indistinguishable from a working policy and is
not one. Those report `CHECK`, and `CHECK` fails the suite.

`scripts/check-rls-test.sh` runs the test against a local miniature of the
schema and then against five deliberately broken copies — a loose OR'd read
policy, RLS switched off, an open escalation, a missing grant, and a view
without `security_invoker` — and fails if any goes unnoticed. It runs in CI as the `rls-test` job, against a throwaway
PostgreSQL service container — so the thing that checks the test now runs on
every pull request rather than when somebody remembers.

**Still not proven:** that a member of household B cannot read household A.
The stranger here belongs to nothing. Both cases go through the same
`app_is_household_member(household_id)` and the same policy expression, so the
argument is strong, but it is an argument rather than an observation, and
proving it outright needs a second household with a real member — a fixture
this database does not have.

## The weight column, and the two fixes that depended on it

`animals.weight_grams` is written by nothing in the app: not `createAnimal`,
not `AnimalForm`, and not the weight form, which only inserts a `weight_logs`
row. Two things read it, and both were wrong in different ways.

**AnimalDetail's "Current weight" card** rendered an em dash for every animal
in the app, with the trend badge computed from the logs sitting beside it —
`—+150`, a change against nothing. It reads the logs now, keeping the column as
a fallback for an imported animal with no weigh-ins.

**FeedingLogForm's meal-size suggestion** read the same column but is guarded
on its derived numbers, so it rendered nothing rather than nonsense. A feature
that shipped, typechecked, passed review and never once drew.

**Both confirmed in production, 30 September 2026.** With a weight logged, the
"Current weight" card shows the figure and the feeding form draws its
suggestion. The card had shown an em dash for every animal in the app's life;
the suggestion had never been drawn at all.

Both were found by rendering the page rather than by reading it, which is the
argument for `npm run render` in one line. Neither could have been found by
looking at the app: an em dash reads as "not weighed yet", and a suggestion
that is correctly hidden and one that can never appear are the same screen.

## What is still only read, never written

`Settings.tsx:140` exports `Weight (g)` from `animals.weight_grams`, so that
column is blank in the spreadsheet for every animal not imported with one. Left
alone because changing it changes a file format, which is a decision rather
than a fix.

## Out of scope

- A service-worker update prompt, out of scope since the resilience plan.
- Runtime validation of database rows; `zod` covers user input and Postgres is
  trusted for its own rows.
- Extracting the remaining nine sections of `AnimalDetail`.
