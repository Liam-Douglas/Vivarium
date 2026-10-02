# Remaining work, and the record of what is no longer remaining

**All three phases below have shipped.** This file keeps them because what each
one *found* is worth more than the plan was — but that is also what makes it
easy to misread. Each phase section was written as a plan, so it opens by
describing a problem in the present tense. **Those descriptions are historical.**
The table is the current state, and each section now says what it shipped before
it says what it was for.

## Status, 1 October 2026

| Phase | State | What that rests on |
|---|---|---|
| 1 — Signed photo URLs, then `0002` | shipped; `0002` applied 21 September 2026 | `lib/photoPaths` and `lib/signedUrlCache`, both tested; no `getPublicUrl` anywhere in `src/`; bucket observed private 2 October 2026 |
| 2 — The quiet states | shipped | four pure modules, all tested |
| 3 — AnimalDetail, slices 2 and 3 | shipped | `npm run render`, which found two live defects in the process |
| `equipment` dropped, `incubations` kept | `0008` applied 30 September 2026 | `equipment` absent from the 1 October RLS run's relation list |
| The Settings export column | fixed | `lib/latestWeights` and its tests |
| The negative RLS test | run and passed, 1 October 2026 | 62 checks, 0 leaks, 0 blind spots, 0 unresolved |

Test counts are deliberately not in that table. The prose below quotes the
numbers as they stood when each phase shipped, and at least one had already
rotted by the time this was written — Phase 2's "47 tests" is 57 today, because
Phase 3 folded shed intervals into `lib/shedStatus` and grew it. `npm test` is
the only count that cannot be stale.

What is genuinely left is under **What is actually left**, below, and it is one
unbuilt feature.

### The misreading this restructuring exists to prevent

On 1 October I read Phase 1's opening line — "The photo bucket is public" — as
current state, and told Liam twice that it was the last item carrying live
exposure, including offering to start work on it. It had been applied on 21
September. The tick in the table said so and `0002`'s header said so; the prose
three lines under that tick said the opposite, in the present tense, and the
prose is what I read.

A plan that outlives its execution stops being a plan and becomes a record, and
a record that still reads as a plan will be acted on. Hence the shape of this
file: state first, story second, everywhere.

## What is actually left

**The incubations UI.** `incubations` is a designed extension of a built
feature that was never wired to a screen — see the section on it below for why
it was kept rather than dropped. The table exists, is scoped by RLS, and carries
columns nothing else has (`start_date`, `expected_hatch_date`,
`actual_hatch_date`, `temperature_c`, `humidity_percent`, `incubation_medium`,
`hatchlings`). What is missing is the UI under the Records tab's breeding
section. It is a feature, not exposure: nothing is wrong today, there is simply
a table no screen reads.

That is the whole list.

## The bucket flag — observed, 2 October 2026

The one claim in this file that rested on nothing observable now rests on
something. Everything else here can be checked from the repository or from a SQL
run, but the `animal-photos` bucket's `public` flag is a Dashboard setting, and
`0002` recorded the toggle being switched off on 21 September 2026 without
anything having confirmed it since. The last line of `0002` is the query that
settles it, and it was run:

```
 id            | public
 animal-photos | false
```

So Phase 1 is closed on an observation rather than on a note somebody wrote at
the time, which is the same distinction the negative RLS test was built to make
about the table policies.

**A standing gap, recorded rather than fixed.** Nothing watches that flag. The
negative RLS test covers `public` schema relations and does not touch storage, so
if the bucket were ever toggled public again no test in the suite would notice —
the three bucket policies still scope to `app_is_household_member`, so a
cross-household read stays blocked either way, but an anonymous fetch of a raw
object URL would start working again. Extending the test to storage means
reaching `storage.objects`, which is owned by `supabase_storage_admin` and so is
not readable the way the rest of the suite reads `pg_class` — `storage.buckets`
is, which is why the check above is a single query and not a loop. Worth doing if
photo privacy ever needs to hold without a person remembering to look.

## Phase 1 — Signed photo URLs, then `0002` — shipped

**Shipped, and `0002` applied on 21 September 2026.** `uploadAnimalPhoto` and
`uploadAdditionalPhoto` return the storage path rather than a URL;
`lib/photoPaths.ts` normalises a stored value to a path whether it is already one
or a legacy absolute URL; `lib/signedUrlCache.ts` signs in batches and caches by
path with its expiry; `hooks/useSignedPhotoUrls.ts` is what the render sites
use. 17 tests across the two pure modules as of 1 October 2026, and
`getPublicUrl` appears nowhere in `src/` except inside a comment explaining why
it went.

The one part of this phase that nothing in the repository can confirm is the
bucket's `public` flag. It was read directly on 2 October 2026 and came back
`false` — see **The bucket flag** above.

### The problem, as it stood before any of that

The photo bucket **was** public: anyone holding an object URL could read that
photo without being signed in. The work sat blocked for a reason worth restating,
because it is why the ordering mattered — `0002` makes the bucket private, and
the client read photos with `getPublicUrl()`, so applying it first would have
turned every photo in the app into a broken image, existing rows included,
because the absolute URLs already stored in `animals.photo_url` and
`animal_photos.url` would stop resolving.

EXIF GPS was already stripped before upload (`lib/image.ts`), so the worst case —
a photo leaking where it was taken — was closed before this phase began. What
this phase closed was that the photos themselves were readable by anyone holding
a link.

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
`uploadAdditionalPhoto` already computed the storage path before asking for a
URL, so they return that path instead, and rendering resolves a path to a signed
URL at display time.

No data migration was needed. The path is recoverable from every URL already
stored — it is whatever follows `/object/public/animal-photos/` — so the resolver
takes either shape and normalises, which is the whole compatibility story:

- `lib/photoPaths.ts` — pure, tested: given a stored value, return the storage
  path, whether that value is already a path or a legacy absolute URL. The cases
  pinned are a legacy URL, a bare path, a URL with a query string, and a value
  that is neither.
- `lib/signedUrlCache.ts` signs a batch of paths and caches by path until shortly
  before expiry. Signed URLs expire, so a cached `<img src>` outliving its
  signature was the obvious new failure — the cache holds the expiry, not just
  the URL.

**Render sites.** Four, reached through `hooks/useSignedPhotoUrls.ts`:
`AnimalCard`, `AnimalDetail`'s hero, its gallery and lightbox, and `AnimalForm`'s
preview.

**Ordering, which was the part that bit.** The client change had to be merged
*and deployed* before `0002` was applied. Signing works on a public bucket, so
the client change was safe to ship on its own and the two steps genuinely
separated. Applying the migration first would have broken every photo until the
deploy landed. That is why the phase ended with a step only Liam could take, and
why the migration was not to be pasted early — it wasn't.

## Phase 2 — The quiet states — shipped

**Shipped: all three items**, in `lib/shedStatus.ts`, `lib/animalState.ts`,
`lib/feederProjection.ts` and `lib/worthALook.ts`, with 47 tests between them at
the time — 57 now, `lib/shedStatus` having grown in Phase 3.
This was the last unshipped phase of the original build order
(`vivarium-build-order.html`, phase 6).

The reasoning that motivated it: the dashboard is built out of exceptions, and on
a well-run collection that is blank most days.

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

### The plan, and the code as it stood when it was written

Line numbers below are from before the work; they are kept as written rather
than chased, since what these paragraphs are for now is the reasoning.

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

## Phase 3 — AnimalDetail, slices 2 and 3 — shipped

**Shipped:** `lib/weightStats`, `lib/healthStats`, shed intervals folded into
`lib/shedStatus`, and `WeightSection`, `SheddingSection`, `HealthEventsSection`
and a shared `RecordActions` lifted out of the page. 1915 lines to 1720, and the
arithmetic that left is tested rather than inlined.

### Why it was deferred twice, and why that reasoning was wrong

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

**1 October 2026, against production, with the cross-household check.** 62
checks, 0 leaks, 0 blind spots, 0 unresolved. The run that matters, because it
is the first one that tests as a *second keeper with an account* rather than as
a stranger who belongs to nothing.

Two of its twenty-one rows carry the evidence, and it is worth being precise
about which, because nineteen of them do not:

- **`other household reads animals`: sees 1, owns 1.** The probe household
  holds one animal. The real household holds thirteen. A member of the probe
  household saw their own and none of the thirteen.
- **`other household reads household_members`: sees 1, owns 1.** Their own
  membership row, not the real household's two.

The other nineteen read `sees 0, owns 0`. That is consistent with correct
scoping and proves nothing on its own: the probe household has no feeding logs,
no enclosures, no expenses, so zero is the right answer either way. They are
worth keeping because the day the probe is given one of those rows the check
starts carrying evidence for that relation too, with no change to the file.

The equality test is what makes this generic. It does not need to know what was
inserted — `sees` must equal `owns` — so a relation added to the schema later is
covered the day it appears.

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

- **Eight of the twenty-two were empty** at the time of the run (`equipment`
  has since been dropped, so a re-run scans twenty-one):
  `weight_logs`, `health_events`, `medication_schedules`, `vet_contacts`,
  `breeding_records`, `exit_records`, `equipment` and `incubations`. The
  negative half still holds for them (a leak would have shown), but the
  control could not run, so *scoping* is demonstrated only on the fourteen
  that held rows.

  `weight_logs` is no longer empty — a weight was logged on 30 September to
  check the two fixes below — so the 1 October re-run covered fifteen of
  twenty-one, with six still empty: `breeding_records`, `exit_records`,
  `health_events`, `incubations`, `medication_schedules` and `vet_contacts`.
  `equipment` is absent from that run's table entirely, which is `0008`
  confirmed from the outside.
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
  Neither appears in any `.from()` in `src/`, and neither is created by a
  migration here — they predate the migration history and appear in `0001`
  only as things to apply policies to. Resolved differently, because they are
  not the same case; see below.

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

**Now proven.** The earlier runs showed only that a stranger — a uuid
belonging to nothing — sees nothing. That is the same predicate but not the
same sentence: what a keeper cares about is that *the other person with an
account* cannot see their animals.

There is no second household here to borrow, so check 6 builds one inside the
rolled-back transaction: a user, a household, a membership and one animal. The
check is generic — for every household-scoped relation, what that member can
see must equal what their own household holds. Larger means they are reading
somebody else.

Verified against a deliberately broken schema as well as a correct one. With a
loose read policy on `animals` the row reads `sees 3 but owns only 1 — reading
another household`.

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

## `equipment`, dropped — and `incubations`, deliberately kept

Both turned up in the negative RLS test as tables nothing in `src/` reads.

**`equipment` is superseded**, and `0008` dropped it on 30 September 2026. Its columns are
`care_tasks` under other names — `replace_every_days` is `frequency_days`,
`last_replaced_at` is `last_done_at`, `equipment_type` is `kind`, and both hang
off an enclosure. `0004` says `care_tasks` exists for "cleaning, weighing, and
anything else a keeper repeats on a schedule"; replacing a UV bulb every six
months is that, and `care_tasks` does it with an `is_active` flag, an
`animal_id` and a completion log behind it. Two answers to one question is the
shape this project has spent most of its effort removing.

**`incubations` is not dead and is not dropped.** It carries a
`breeding_record_id` foreign key into `breeding_records`, which the app does
use, and columns nothing else has: `start_date`, `expected_hatch_date`,
`actual_hatch_date`, `temperature_c`, `humidity_percent`, `incubation_medium`,
`hatchlings`. It is a designed extension of a built feature that was never
wired to a screen. Dropping it would throw that design away to save nothing.

If incubation tracking is ever wanted, the table is already there and already
scoped by RLS; what is missing is the UI under the Records tab's breeding
section.

`0008` refuses rather than dropping if the table holds a row or anything
references it. Both refusals were exercised against a local copy, along with a
re-run against an already-dropped table, before the file was committed.

## The export column — fixed, and the reason for deferring it was wrong

The Animals sheet exported `Weight (g)` from `animals.weight_grams`, so that
cell was blank for every animal not imported with one — while the Weight log
sheet in the same workbook carried the real figures.

This was deferred twice as "changing it changes a file format, which is a
decision rather than a fix". **That was wrong, and the mistake is worth
recording.** The column header does not move, the sheet structure does not
move, and the importer never reads this column back — it only moves
`weight_logs` rows. Nothing about the file's shape changes; a blank cell
becomes the figure that was always meant to be there. It was a fix, and
calling it a decision deferred it for no reason.

`lib/latestWeights.ts` builds the map, because the risk here is not the
arithmetic — `currentWeight` was already tested — but the wiring: one lookup
that forgets to filter by animal hands every row the heaviest snake in the
collection. That case is a test.

## Out of scope

- A service-worker update prompt, out of scope since the resilience plan.
- Runtime validation of database rows; `zod` covers user input and Postgres is
  trusted for its own rows.
- Extracting the remaining nine sections of `AnimalDetail`.
