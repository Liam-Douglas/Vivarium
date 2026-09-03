# Screen check

`screen-check.html` — how to point the app at Supabase, seed a collection where
every state is reachable, and walk the responsive work at 390, 768 and 1440.
Published at https://claude.ai/code/artifact/3332e2a9-1dad-4b68-a405-d86659e72cd7

Phase 5 rebuilt every screen's layout and was verified by type-checking and
construction, never in a browser — the app throws on boot without Supabase
credentials, so nothing renders past sign-in in CI or a sandbox.

## Quick version

```bash
# .env.local in the repo root — *.local is gitignored, a bare .env is not
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>

npm install && npm run dev            # http://localhost:5173

node scripts/make-test-fixtures.mjs busy    # populates the Today queue
node scripts/make-test-fixtures.mjs quiet   # nothing due — Coming up / Worth a look
```

Then sign up, create a household, and import the workbook at `/import`. Sheets are
named to match the app's own template, so the wizard classifies them unaided.

Both fixtures deliberately include one animal with **no feeding schedule** and one
**never fed**, so the false all-clear is checkable on every pass: the Overdue tile
must never read green while those two exist.

## What the importer cannot set

Weights, quarantine flags and medication schedules have no import columns. Each is a
couple of clicks — log a weight to bring up the sparkline and growth chart, set a
quarantine start on an animal, and add a medication schedule with an interval and
start date to put a dose row in the queue.

## Known suspects

Two things worth extra attention, both flagged when Phase 5 shipped:

- **Select mode column alignment.** The 16px checkbox replaces a 10px dot, so queue
  rows may shift against their column header at ≥1024.
- **The profile's sticky rail on a short viewport.** At 1440×700 the rail is taller
  than the window, which leaves sticky nothing to hold.
