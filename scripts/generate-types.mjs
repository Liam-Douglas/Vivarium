#!/usr/bin/env node
// Turn the JSON from scripts/schema-dump.sql into src/lib/database.types.ts.
//
// The point is not the types themselves — it is that they are derived from the
// database rather than from what the client hopes is there. src/lib/schema.ts
// then asserts the hand-written interfaces against them, so a column that gets
// renamed in Postgres becomes a failed build instead of a feature that fails
// silently for five months.
//
//   1. Run scripts/schema-dump.sql in the Supabase SQL editor
//   2. Save the single JSON cell it returns as schema.json in the repo root
//   3. npm run types:generate

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const INPUT = process.argv[2] ?? 'schema.json'
const OUTPUT = resolve('src/lib/database.types.ts')

/** Postgres type → TypeScript. Anything unmapped becomes `unknown`, loudly. */
const SCALARS = {
  uuid: 'string',
  text: 'string',
  'character varying': 'string',
  character: 'string',
  citext: 'string',
  date: 'string',
  'timestamp with time zone': 'string',
  'timestamp without time zone': 'string',
  'time with time zone': 'string',
  'time without time zone': 'string',
  interval: 'string',
  inet: 'string',
  smallint: 'number',
  integer: 'number',
  bigint: 'number',
  numeric: 'number',
  real: 'number',
  'double precision': 'number',
  boolean: 'boolean',
  json: 'Json',
  jsonb: 'Json',
}

const unmapped = new Set()

function tsType({ type, udt }) {
  // PostgREST returns arrays as JSON arrays; their udt_name is the element
  // type prefixed with an underscore.
  if (type === 'ARRAY') {
    const element = SCALARS[udt.replace(/^_/, '')] ?? elementFromUdt(udt)
    return `${element}[]`
  }
  if (type === 'USER-DEFINED') return 'string' // enums arrive as their label
  const mapped = SCALARS[type]
  if (!mapped) {
    unmapped.add(type)
    return 'unknown'
  }
  return mapped
}

function elementFromUdt(udt) {
  const bare = udt.replace(/^_/, '')
  const byUdt = { int4: 'number', int8: 'number', int2: 'number', float4: 'number', float8: 'number', numeric: 'number', bool: 'boolean', text: 'string', uuid: 'string', varchar: 'string' }
  if (byUdt[bare]) return byUdt[bare]
  unmapped.add(udt)
  return 'unknown'
}

function field(col) {
  const base = tsType(col)
  return col.nullable ? `${base} | null` : base
}

const raw = readFileSync(resolve(INPUT), 'utf8').trim()
let tables
try {
  tables = JSON.parse(raw)
} catch {
  console.error(`Could not parse ${INPUT} as JSON. Paste the single cell the query returns, nothing else.`)
  process.exit(1)
}
if (!Array.isArray(tables) || tables.length === 0) {
  console.error(`${INPUT} held no tables. Did the query return a row?`)
  process.exit(1)
}

const lines = [
  '// GENERATED FILE — do not edit.',
  '//',
  '// Produced by scripts/generate-types.mjs from the output of',
  '// scripts/schema-dump.sql, which reads information_schema on the live',
  '// database. Regenerate after any schema change; src/lib/schema.ts turns a',
  '// mismatch between these types and the hand-written interfaces into a',
  '// failed build rather than a silent runtime failure.',
  '',
  'export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]',
  '',
  'export interface Database {',
  '  public: {',
  '    Tables: {',
]

for (const { table_name, columns } of tables) {
  lines.push(`      ${table_name}: {`)
  lines.push('        Row: {')
  for (const col of columns) lines.push(`          ${col.column}: ${field(col)}`)
  lines.push('        }')

  lines.push('        Insert: {')
  for (const col of columns) {
    // A column the database can fill itself is optional on insert.
    const optional = col.nullable || col.has_default || col.identity
    lines.push(`          ${col.column}${optional ? '?' : ''}: ${field(col)}`)
  }
  lines.push('        }')

  lines.push('        Update: {')
  for (const col of columns) lines.push(`          ${col.column}?: ${field(col)}`)
  lines.push('        }')
  lines.push('      }')
}

lines.push('    }')
lines.push('  }')
lines.push('}')
lines.push('')
lines.push('/** Convenience alias: TableRow<\'animals\'> is one row of public.animals. */')
lines.push("export type TableRow<T extends keyof Database['public']['Tables']> =")
lines.push("  Database['public']['Tables'][T]['Row']")
lines.push('')

writeFileSync(OUTPUT, lines.join('\n'))

console.log(`Wrote ${OUTPUT}`)
console.log(`${tables.length} tables, ${tables.reduce((n, t) => n + t.columns.length, 0)} columns`)
if (unmapped.size > 0) {
  // Not fatal, but `unknown` in a generated type is a hole in the guarantee.
  console.warn(`\nUnmapped Postgres types, emitted as unknown: ${[...unmapped].join(', ')}`)
  console.warn('Add them to SCALARS in this script.')
}
