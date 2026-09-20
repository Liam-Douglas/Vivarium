#!/usr/bin/env node
// Fail a pull request that changes the database schema without regenerating
// src/lib/database.types.ts.
//
// docs/schema-types.md says the guarantee lapses quietly if a schema change
// lands without a regeneration, and a documented habit is not a guarantee. The
// lapse would be invisible in exactly the way the drift it guards against was.
//
// This needs no database access, and so no secret: a migration file changing
// while the generated types do not is either stale or deliberately exempt, and
// git can tell the difference.
//
//   node scripts/check-types-fresh.mjs <base-ref> [head-ref]

import { execFileSync, } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

const MIGRATIONS = 'supabase/migrations/'
const TYPES = 'src/lib/database.types.ts'

/**
 * A migration that changes no columns — a policy-only file such as 0001 — says
 * so in its body. Forcing a no-op regeneration for those would train people to
 * regenerate without looking, which is the habit this is trying to build, not
 * break.
 */
const EXEMPT_MARKER = 'no-schema-change'

const base = process.argv[2]
// head is only ever passed when exercising this script against past commits;
// CI leaves it at HEAD.
const head = process.argv[3] ?? 'HEAD'
if (!base) {
  console.error('Usage: node scripts/check-types-fresh.mjs <base-ref> [head-ref]')
  process.exit(2)
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

let changed
try {
  changed = git('diff', '--name-only', `${base}...${head}`).split('\n').filter(Boolean)
} catch (e) {
  console.error(`Could not diff against ${base}: ${e.message}`)
  process.exit(2)
}

const migrations = changed.filter((f) => f.startsWith(MIGRATIONS))
if (migrations.length === 0) {
  console.log('No migrations touched; nothing to check.')
  process.exit(0)
}

// A deleted migration cannot be read, and removing one does not change the
// live schema by itself.
const needingTypes = migrations.filter((f) => {
  if (!existsSync(f)) return false
  return !readFileSync(f, 'utf8').includes(EXEMPT_MARKER)
})

if (needingTypes.length === 0) {
  console.log(`Migrations touched, all marked "${EXEMPT_MARKER}":`)
  for (const f of migrations) console.log(`  ${f}`)
  process.exit(0)
}

if (changed.includes(TYPES)) {
  console.log('Migrations touched and the generated types were regenerated:')
  for (const f of needingTypes) console.log(`  ${f}`)
  process.exit(0)
}

console.error(`These migrations changed without regenerating ${TYPES}:\n`)
for (const f of needingTypes) console.error(`  ${f}`)
console.error(`
The generated types are a snapshot of the live schema. A migration that changes
columns leaves them stale, and src/lib/schema.ts then checks the interfaces
against a database that no longer looks like that — which is the drift it exists
to catch, one level up.

To fix, per docs/schema-types.md:

  1. Run scripts/schema-dump.sql in the Supabase SQL editor, after applying the
     migration
  2. Save the single JSON cell it returns as schema.json
  3. npm run types:generate

If the migration genuinely changes no columns — a policy-only file, say — add a
"${EXEMPT_MARKER}" comment to it and this check will pass.`)
process.exit(1)
