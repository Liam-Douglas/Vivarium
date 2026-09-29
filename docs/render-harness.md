# The render harness

```
npm run render                 every scenario
npm run render -- quiet        scenarios whose file name matches "quiet"
npm run render -- --no-build   reuse the existing dist/
npm run render -- --shots      also write a png per scenario
```

No credentials, no database, no sign-in. It builds the app with placeholder
values, serves it, and drives a real browser against fixture data.

## Why it exists

The test suite is pure modules — `vitest` over `src/lib/*`, no DOM. That is a
deliberate choice and it stays the primary suite. It does mean **nothing else
covers rendered output**, and the gap is not academic.

The "Worth a look" dashboard section shipped with fourteen passing tests behind
`lib/worthALook.ts`. Not one of them could say whether the section appeared on
the screen, whether its rows came out in the ranked order, or whether it
correctly stayed hidden when there were meals due — because none of that lives
in the module. The last one in particular *cannot* be unit tested: the module
returns four rows either way, and it is `Dashboard.tsx` that decides not to
draw them.

Before this, checking any of that meant signing in to production or a preview
deploy with real credentials.

## What it proves, and what it does not

It proves that **a screen, given known data, renders the text it should and
leaves out the text it should not** — and, via `expect.order`, that a ranked
list comes out ranked.

It proves nothing whatsoever about real records. Every row is invented in
`scripts/render/fixtures.mjs`. A screen that renders perfectly here can still be
wrong about your collection, because the question of whether the query asks for
the right rows is not one this harness asks.

It is also not a visual check. Assertions are on text, never on pixels —
screenshot diffing costs more maintenance than it returns on a project this
size. `--shots` exists for looking at, not for comparing.

## What it has found

Its fourth scenario found a live bug, which is the honest argument for it.

The dashboard filtered its restock list with `.filter(needsRestocking)`.
`Array.prototype.filter` passes the index as the second argument, and
`needsRestocking`'s second parameter is its horizon in days — so the first item
was judged against a nought-day horizon, the second against one day, and so on.
The projection flagged almost nothing and the card fell back to the threshold it
had just been written to replace.

Every unit test passed, because the defect was at the call site rather than in
the module. Nothing short of rendering the card would have shown it.

## Writing a scenario

A file in `scripts/render/scenarios/` default-exporting an object:

```js
import { animal, shedSeries, weightLog, daysAgo } from '../fixtures.mjs'

const suki = animal('Suki')

export default {
  name: 'Dashboard — a quiet day',
  path: '/',
  fixtures: {
    animals: [suki],
    weight_logs: [weightLog(suki.id, { logged_at: daysAgo(213) })],
  },
  expect: {
    contains: ['Worth a look', 'Not weighed in 213 days'],
    absent: ['undefined'],
    order: ['Nagini', 'Kobe'],
  },
}
```

- **`fixtures`** is keyed by table name. Anything not listed answers `[]`, so a
  scenario names only the tables it is about — the dashboard reads fourteen.
- **`contains`** is required. A scenario with only `absent` expectations would
  pass against a blank page, because nothing is present before the app renders;
  the runner refuses to load one.
- **`order`** checks relative position in the rendered text. This is the one
  worth reaching for on any ranked list: a wrong order passes every `contains`.
- **`absent`** is for things that must not be drawn. `'undefined'` is a good
  habit — row text is built by interpolation, so a null reaches the screen as
  that word rather than as an error anywhere.

The runner polls the assertions until they all pass or twenty seconds elapse.
There is no `waitFor` to set: the app renders from nine or so independent
queries and can drop back to its splash mid-load, so waiting on any one anchor
catches the screen on its way through. Polling the whole set means a passing
scenario is fast and only a real failure costs the timeout.

## How the stub works

`scripts/render/supabaseStub.mjs` replaces the network and nothing else. The
real bundle, the real contexts, the real queries in `lib/queries.ts` all run.

- A session is seeded into `localStorage` under `sb-placeholder-auth-token`, so
  `AuthContext` finds one and the app renders rather than redirecting to
  sign-in. The key is derived by supabase-js from the project ref, which is why
  the placeholder host must stay `placeholder.supabase.co`.
- Every request to that host is intercepted. `/rest/v1/<table>` answers from
  the scenario's fixtures, `/rest/v1/rpc/<name>` from a small set of canned
  replies — `get_household_for_user` is the one that matters, since
  `getMembershipForUser` calls it first and everything else is gated on the
  household it returns.
- Realtime is not stubbed. The websocket fails to connect and the app carries
  on, which is the same thing it does on a flaky connection.

## Why the build needs placeholder credentials

`lib/supabase.ts` throws at module scope when `VITE_SUPABASE_URL` or
`VITE_SUPABASE_ANON_KEY` is missing, and Vite inlines those at **build** time.
A build with neither does not fail: the bundler proves the throw is
unconditional, drops the entire application as unreachable, and emits about
600 kB of vendor code with an exit status of 0.

That is not hypothetical — CI's build job did exactly this for months behind a
comment asserting the opposite. `scripts/check-bundle.mjs` is the assertion
that catches it; always passing values is the other half.

The values here are placeholders and are not secret. Nothing calls them: the
module only has to finish initialising.

## Finding a browser

`playwright-core`, not `playwright` — the full package's postinstall downloads
browsers, which would add a few hundred megabytes to every `npm ci`, including
the jobs that never open one.

So the harness looks for a Chrome or Chromium that already exists: GitHub's
runner images ship Google Chrome, most machines have one, and
`RENDER_CHROMIUM=/path/to/chrome npm run render` overrides the search. If none
is found it says so and lists what it tried.

## In CI

Its own job (`Render`), not part of `Tests`. It builds the app and drives a
browser, so it is slower and has failure modes — a missing browser, a port in
use — that have nothing to do with the code under test. Mixed into the unit
suite those would read as test failures.
