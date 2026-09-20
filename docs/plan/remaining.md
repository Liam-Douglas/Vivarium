# Remaining work

Everything still outstanding after the hardening, feeding-log, resilience,
reminders, schema-types and follow-through plans. Ordered by exposure: the one
item with a live security dimension first, then the last unshipped phase of the
original build order, then the refactor that has been deferred twice on purpose.

| | Phase | Size | Needs Liam |
|---|---|---|---|
| | 1 — Signed photo URLs, then `0002` | M | **yes — applies `0002` by hand, after deploy** |
| | 2 — The quiet states | M | no |
| | 3 — AnimalDetail, slices 2 and 3 | L | no |

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
*and deployed* before `0002` is applied. Apply it first and every photo breaks
until the deploy lands. The phase therefore ends with a step only Liam can take,
and the migration must not be pasted early.

## Phase 2 — The quiet states

The last unshipped phase of the original build order
(`vivarium-build-order.html`, phase 6). Its dependencies — phases 1 and 5 of
that plan — are both long shipped, so nothing blocks it.

The reasoning still holds: the dashboard is built out of exceptions, and on a
well-run collection that is blank most days. Three items, and the current code
is further along than the original plan assumed.

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

Deferred twice now, both times for the same honest reason: it is JSX that cannot
be run in the build environment, `tsc` does not catch a section rendering in the
wrong place, and the defects it would prevent are hypothetical. It is third here
for the same reason.

If Phase 2 lands the shed-interval work, it touches this page's shedding
section — which would be the concrete reason to extract that section rather than
a speculative one. Worth revisiting after Phase 2 rather than before.

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

## Out of scope

- A service-worker update prompt, out of scope since the resilience plan.
- Runtime validation of database rows; `zod` covers user input and Postgres is
  trusted for its own rows.
- Extracting the remaining nine sections of `AnimalDetail`.
