// ============================================================================
// Hold the RLS test fixture to the real database's required columns.
//
// supabase/tests/fixture.sql is a hand-written miniature of production, built
// so scripts/check-rls-test.sh can run negative_rls.sql against something real
// and then break it on purpose to check the test notices. Hand-written means it
// can drift, and drift in one direction is invisible: a fixture with fewer NOT
// NULL columns than production accepts inserts production refuses, so the test
// passes locally and fails against the live database.
//
// That is not hypothetical. The fixture's households table had no created_by.
// negative_rls.sql's check 6 builds a second household to prove one member
// cannot read another's animals; its insert left created_by out, the fixture
// took it, check-rls-test.sh reported a clean run, and production answered
// "null value in column created_by of relation households violates not-null
// constraint". The check reported CHECK rather than a pass — inconclusive
// results are counted as failures there — but the round trip was spent on a
// column src/lib/database.types.ts had recorded all along.
//
// So: src/lib/database.types.ts is the record of what production requires. A
// column on a table's Insert type without `?` is NOT NULL with no default. For
// every table the fixture defines and the types describe, each of those columns
// must exist in the fixture, be NOT NULL, and have no default. A fixture that
// is stricter than production is only noted — it makes the test harder to pass,
// not easier, which is the safe direction.
// ============================================================================

import { readFileSync } from 'node:fs'

const TYPES = 'src/lib/database.types.ts'
const FIXTURE = 'supabase/tests/fixture.sql'

/** Required Insert columns per table: present in Insert without a `?`. */
function parseTypes(source) {
  const required = new Map()
  let table = null
  let section = null

  for (const line of source.split('\n')) {
    const tableStart = line.match(/^ {6}(\w+): \{$/)
    if (tableStart) {
      table = tableStart[1]
      section = null
      continue
    }
    const sectionStart = line.match(/^ {8}(\w+): \{$/)
    if (sectionStart) {
      section = sectionStart[1]
      continue
    }
    if (/^ {8}\}$/.test(line)) {
      section = null
      continue
    }
    if (table && section === 'Insert') {
      const column = line.match(/^ {10}(\w+)(\??): /)
      if (column && column[2] === '') {
        if (!required.has(table)) required.set(table, [])
        required.get(table).push(column[1])
      }
    }
  }
  return required
}

/** Columns per `create table public.X` in the fixture. */
function parseFixture(source) {
  const tables = new Map()
  const lines = source.split('\n')

  for (let i = 0; i < lines.length; i += 1) {
    const start = lines[i].match(/^create table (?:public\.)?(\w+) \($/)
    if (!start) continue

    const columns = new Map()
    for (let j = i + 1; j < lines.length && !/^\);/.test(lines[j]); j += 1) {
      const column = lines[j].match(/^ {2}(\w+) +(.*?),?$/)
      if (!column) continue
      const rest = column[2].toLowerCase()
      columns.set(column[1], {
        notNull: /\bnot null\b/.test(rest) || /\bprimary key\b/.test(rest),
        hasDefault: /\bdefault\b/.test(rest),
      })
    }
    tables.set(start[1], columns)
  }
  return tables
}

const required = parseTypes(readFileSync(TYPES, 'utf8'))
const fixture = parseFixture(readFileSync(FIXTURE, 'utf8'))

if (required.size === 0) {
  console.error(`Parsed no tables out of ${TYPES} — the shape of that file changed.`)
  process.exit(1)
}
if (fixture.size === 0) {
  console.error(`Parsed no tables out of ${FIXTURE} — the shape of that file changed.`)
  process.exit(1)
}

const problems = []
const notes = []
let checked = 0

for (const [table, columns] of fixture) {
  const productionRequired = required.get(table)
  // auth.users and anything the fixture invents are not production tables.
  if (!productionRequired) continue
  checked += 1

  for (const column of productionRequired) {
    const found = columns.get(column)
    if (!found) {
      problems.push(`${table}.${column} is NOT NULL with no default in production, and the fixture has no such column`)
    } else if (!found.notNull) {
      problems.push(`${table}.${column} is NOT NULL in production, but nullable in the fixture`)
    } else if (found.hasDefault) {
      problems.push(`${table}.${column} has no default in production, but the fixture gives it one — the fixture would accept an insert production refuses`)
    }
  }

  for (const [column, { notNull, hasDefault }] of columns) {
    if (!notNull || hasDefault) continue
    if (productionRequired.includes(column)) continue
    notes.push(`${table}.${column} is required by the fixture but not by production — stricter, so harmless`)
  }
}

if (checked === 0) {
  console.error(`No table in ${FIXTURE} matched a table in ${TYPES} — one of them was renamed.`)
  process.exit(1)
}

for (const note of notes) console.log(`note: ${note}`)

if (problems.length > 0) {
  console.error(`\n${FIXTURE} is laxer than production:`)
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error('\nnegative_rls.sql can pass against this fixture and still fail against')
  console.error('the live database. Add the column to the fixture, with the same')
  console.error('constraint, and give the seed inserts a value for it.')
  process.exit(1)
}

console.log(`${FIXTURE}: ${checked} table(s) carry every column production requires.`)
