# Hardening plan

Work arising from the September 2026 review of the app, ordered by how much damage
each defect does today rather than by how hard it is to fix. Each phase lands as its
own pull request and stands alone.

| | Phase | Size | Needs Liam |
|---|---|---|---|
| ✓ | Password reset, deep-link 404s, sign-up captcha, CI | M | shipped (`5c47414`) |
| ✓ | Pending household members | S | shipped (`2974799`) |
| 1 | Data integrity — row caps and a destructive repair | M | no |
| 2 | Accessibility | M | one colour sign-off |
| 3 | Security — RLS and storage | M | applying the SQL |
| 4 | Small correctness batch | S | no |

## Phase 1 — Data integrity

Two defects that lose or corrupt data without saying so.

**The 1000-row cap.** No query in `lib/queries.ts` paginates; PostgREST caps a response
at `db.max_rows` (1000 on hosted Supabase) and returns the truncated set without an
error. Three places where that silently loses data:

- `handleExport` in `pages/Settings.tsx` ships the first 1000 feedings and sheds and
  calls it the user's data. It also omits weight, health, breeding, acquisition, exit,
  medication, feeder and vet records entirely — most of what the app tracks.
- The importer's duplicate guard (`pages/Import.tsx`) builds its set of existing keys
  from an uncapped, unordered select. Past 1000 logs the guard is incomplete, so
  re-importing a file inserts duplicates — which is plausibly why the
  duplicate-removal tool exists at all.
- `detectDuplicateRecords` and `detectOrphanedFeedingLogs` scan a truncated set, so
  both under-report.

Fix: one `fetchAll` helper that pages with `.range()`, applied to the paths that must
be complete. Screens that only want recent rows get an explicit limit instead, so the
dashboard does not start fetching a decade of history.

**The repair tool that corrupts.** `detectOrphanedFeedingLogs` defines orphaned as
*not in the active animal set*, but archiving is a soft delete. So every log belonging
to an archived animal is classed as orphaned, and `repairOrphanedFeedingLogs`
reassigns any whose name matches an active animal. Archive "Monty", add a new "Monty",
press Repair, and the dead animal's whole feeding history moves onto the new one.

Fix (decision 1): a log is orphaned only when its animal row is genuinely absent, not
merely inactive.

## Phase 2 — Accessibility

- `Input`, `Textarea` and `Select` render a `<label>` with no `htmlFor` and a control
  with no `id`. Every form in the app announces as unlabelled and label clicks do not
  focus. Also no `aria-invalid` or `aria-describedby` on the error text.
- `Modal` has no `role="dialog"`, no `aria-modal`, no focus trap, no focus restore and
  no Escape to close — in an app where every logging action is a modal.
- `Toast` has no live region, so nothing announces success or failure.
- `index.html` sets `maximum-scale=1.0`, blocking pinch zoom (WCAG 1.4.4).
- `#6a6458` is 2.97:1 on the page background and 2.65:1 on cards, used 175 times at
  body size. Raising that one token to about `#8a8272` clears AA.

Decision 2: the colour change ships with before/after screenshots for sign-off; the
structural work does not wait on it.

## Phase 3 — Security

`supabase/migrations/` holds the entire security model and is still unapplied, so the
anon key remains a full read/write grant across households.

Applying `0001` as written would break two flows: `joinHouseholdByCode` inserts into
`household_members` directly and `leaveHousehold` deletes from it, and that table is
granted only a select policy.

Sequence (decision 3): add the missing own-row insert and delete policies, write a
verification checklist, hand over SQL to paste. Once applied, switch photo reads from
`getPublicUrl` to signed URLs and migrate the stored public URLs, since `0002` makes
the bucket private and existing rows would 401.

## Phase 4 — Small correctness batch

- `last_fed_at` disagrees with itself about refusals: the `log_feeding` RPC filters
  `refused = false`, both client recalculators do not, so a refusal can mark an animal
  fed. Related: `handleBatchFeed` in `pages/Animals.tsx` still uses the legacy write
  pair (already noted in `README.md`).
- `Expenses.tsx` reads `localStorage` outside a try/catch, and its lazy initialiser
  runs before `householdId` resolves, so budgets are saved under a `default` key and
  then never read back. `AnimalDetail.tsx` has the same unguarded read.
- Sign-in is the only auth entry point without captcha support; enabling captcha
  protection in Supabase would break `signInWithPassword` while sign-up and recovery
  keep working.
- `useOverdueNotification` asks for notification permission with no user gesture, and
  `new Notification()` throws on Android Chrome — the primary platform for a
  mobile-first PWA.

## Decisions taken

1. The orphan repair tool is fixed rather than removed; the recovery path is worth
   keeping once it stops firing on archived animals.
2. The muted-colour change ships with a preview for sign-off.
3. RLS is prepared here and applied by Liam in the SQL editor; the client-side signed
   URL switch follows once it is live.
4. Pull requests merge on green CI without waiting for review.

## Out of scope

The 600 kB bundle (`xlsx` is statically imported in `Import.tsx`, which defeats the
dynamic import in `Settings.tsx`), splitting the provider hooks out of their context
files to satisfy `react-refresh`, and the service worker's stale-bundle behaviour.
None of them lose data or block a user; all are worth revisiting after the above.
