# Follow-through plan

Three things left over from the resilience, reminders and schema-types work.
None is urgent; all three are the difference between a fix that happened and a
fix that stays.

| | Phase | Size | Needs Liam |
|---|---|---|---|
| ✓ | 1 — Test what was only ever verified by hand | S | shipped |
| ✓ | 2 — Stop the generated types going stale | S | shipped |
| | 3 — AnimalDetail, slices 2 and 3 | L | no |

## Phase 1 — Test what was only ever verified by hand

Two behaviours shipped this session with no automated cover, because the parts
that mattered were tangled with code that cannot run here.

**The feeding editor's date round-trip.** `AnimalDetail`'s inline editor seeded
its picker with `log.fed_at.split('T')[0]`, which reads a stored ISO string as
UTC: in UTC+10 a 9pm feeding displayed as the following day, and saving anchored
it to noon. `FeedingEditForm` does it correctly with `format(new Date(iso),
"yyyy-MM-dd'T'HH:mm")` and `dateInputToISO`, but that correctness lives inline in
a component, so nothing guards it.

Extract the pair — ISO to picker value, picker value back to ISO — into
`lib/dateInputs.ts` and test the round-trip. The cases worth pinning are the ones
that produced the bug: a timestamp late in the evening at a positive UTC offset,
a value that survives a round-trip unchanged, and a date-only string still
anchoring to midday rather than midnight.

**Sign-out clearing the response cache.** `clearDataCaches` is tested; what is
not is that sign-out calls it. `signOutAndClearCaches` imports the Supabase
client, which throws without environment variables, so the composition cannot be
exercised. Take the sign-out call as a parameter, so the wiring — clear the cache
*after* the sign-out, clear it even when the sign-out rejects — is testable
without a client.

Both are small. Both cover a bug that actually happened rather than one imagined.

Making the sign-out wiring injectable turned up a third, introduced by the cache
work itself: `signOutAndClearCaches` let a failed sign-out request propagate
through its `finally`, so the `navigate` after it never ran. A keeper signing out
offline stayed on the settings page with no message and an unhandled rejection.
The sequence now reports the failure instead of throwing it, and both callers
navigate either way — the point of signing out is to leave, and the local session
and caches are cleared whether or not the request reached the server.

## Phase 2 — Stop the generated types going stale

`docs/schema-types.md` says the guarantee lapses quietly if a schema change lands
without regenerating the types, and a documented habit is not a guarantee. The
lapse is invisible in exactly the way the original drift was.

CI cannot reach the database — that would need a secret with database access, and
it is not obviously worth one. But it does not need to. A pull request that adds
or edits a file in `supabase/migrations/` and does not also change
`src/lib/database.types.ts` is either stale or deliberately exempt, and a plain
git diff can tell the difference. That check needs no credentials at all.

Add it as a CI job with an explicit escape hatch — a migration that genuinely
changes no columns (a policy-only file like `0001`) says so in its body, and the
check honours that rather than forcing a no-op regeneration.

Shipped and verified against all four outcomes: a non-exempt migration alone
fails; an exempt one alone passes; a non-exempt migration with regenerated types
passes; no migration touched passes. The first was checked against this
repository's own history — diffing the commit that added `0004` against its
parent fails, because the generated types did not exist yet.

## Phase 3 — AnimalDetail, slices 2 and 3

1908 lines holding weight, shedding, health, feeding, acquisition, exit,
breeding, photos, medications, QR, timeline and ROI. Slice 1 — adopting the
shared feeding editor — is done, and it closed two defects that had stayed open
precisely because the page was too risky to touch.

Next, smallest first, each its own pull request:

2. Extract the weight section, chart included.
3. Extract shedding, then health.

Stop when the page stops being the reason a fix is risky. Extracting all twelve
is not the goal, and a page of 900 lines that nobody fears editing is a better
outcome than twelve files nobody can hold in their head.

## For Liam, in the app

Not phases — three things that shipped and have never been looked at on a real
device:

- Sign out, then check DevTools → Application → Cache Storage. `supabase-cache`
  should be gone. Phase 1 tests the wiring; only this tests the browser.
- Edit a feeding and confirm the time of day survives the save.
- Add a care reminder, mark it done, pause and resume it. Marking done is the
  only path that writes `care_task_logs`, so it is the only one that exercises
  that table's policies.

## Decisions taken

- **Extract for testability, not for tidiness.** Both Phase 1 extractions exist
  because the logic cannot otherwise be reached from a test, not because a
  component is too long.
- **No database access in CI.** A staleness check built on a git diff catches the
  realistic failure — a migration landing without a regeneration — without a
  credential that would itself need managing.

## Out of scope

- Runtime validation of rows coming back from the database. The generated types
  describe shape; `zod` covers user input. Trusting Postgres for its own rows is
  a deliberate line.
- Extracting the remaining nine sections of `AnimalDetail`.
- A service-worker update prompt, still out of scope from the resilience plan.
