#!/usr/bin/env node
/**
 * Assert that `vite build` actually put the application in the bundle.
 *
 * Why this exists. `src/lib/supabase.ts` throws at module scope when
 * VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Vite inlines those
 * at build time, not runtime, so a build without them does not fail — the
 * bundler proves the throw is unconditional, concludes everything downstream
 * is unreachable, and emits the vendor libraries alone. 600 kB instead of
 * 1.7 MB, exit code 0, and a deployable `dist/` whose index.html loads a
 * bundle that mounts nothing.
 *
 * CI's build job carried a comment claiming the opposite ("the client reads
 * them at runtime ... so the bundle builds without secrets"). It was wrong for
 * as long as it was there, which means the build half of that job was proving
 * nothing. This is the assertion that would have caught it.
 *
 * The markers are the router's own route paths, read out of src/App.tsx rather
 * than listed here, so the check cannot drift as routes are added or renamed.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist/assets'
const APP = 'src/App.tsx'

const paths = [...readFileSync(APP, 'utf8').matchAll(/path="([^"]+)"/g)]
  .map((m) => m[1])
  // "/" and "/*" are too short to be evidence of anything.
  .filter((p) => p.length > 2)

if (paths.length === 0) {
  console.error(`No route paths found in ${APP} — this check has gone stale.`)
  process.exit(1)
}

const js = readdirSync(DIST)
  .filter((f) => f.endsWith('.js'))
  .map((f) => readFileSync(join(DIST, f), 'utf8'))
  .join('\n')

const missing = paths.filter((p) => !js.includes(p))

if (missing.length > 0) {
  console.error('The build did not include the application.\n')
  console.error(`${missing.length} of ${paths.length} route paths are absent from ${DIST}:`)
  for (const p of missing) console.error(`  ${p}`)
  console.error('\nThe usual cause is a missing VITE_SUPABASE_URL or')
  console.error('VITE_SUPABASE_ANON_KEY: lib/supabase.ts throws at module scope')
  console.error('without them, so the bundler drops the app as unreachable and')
  console.error('still exits 0. Any value will do for a build — it is never called.')
  process.exit(1)
}

console.log(`Bundle carries all ${paths.length} routes.`)
