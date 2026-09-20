# Keeping the client and the database in agreement

This repository has no schema source of truth. Every table was created in the
Supabase UI, so nothing has ever compared what the client believes about a table
against what Postgres actually holds. Two failures came out of that gap:

- **`equipment` and `incubations` were invisible.** The first RLS migration's
  table list was written by reading the client, and no client code touches those
  two tables — so they were left without the policies every other table got.
- **The medication feature never worked.** The client read and wrote `name`,
  `frequency_days` and `given_at`; the database had `medication_name`, a *text*
  `frequency`, and `administered_at`. Every insert and every select failed from
  May until September, silently, because the errors were swallowed before they
  reached a screen.

Neither was a hard bug to fix. Both were hard to *see*. This turns that class of
drift into a failed build.

## Regenerating the types

Three steps, after any schema change:

1. Run `scripts/schema-dump.sql` in the Supabase SQL editor. It returns a single
   JSON cell describing every table in `public`.
2. Save that cell as `schema.json` in the repository root. Paste the cell only —
   not the column header, not the surrounding table.
3. `npm run types:generate`

That writes `src/lib/database.types.ts`, which is generated and should never be
edited by hand. `schema.json` is a working file and is not committed; the
generated types are.

## How drift becomes a build failure

`src/lib/schema.ts` asserts each hand-written interface against the generated row
type for its table:

```ts
type Assert<T extends true> = T
type RowSatisfies<Row, Interface> = Row extends Interface ? true : false

export type _AnimalsMatch = Assert<RowSatisfies<TableRow<'animals'>, Animal>>
```

If the database stops providing something an interface requires — a renamed
column, a dropped one, a type change — `RowSatisfies` resolves to `false` and
`Assert` refuses it. `tsc` fails, so CI fails, so it cannot ship.

The assertion is deliberately one-directional. A table may hold columns the
client does not model, which is normal and not an error. What is an error is the
client expecting something that is not there.

## What this does not cover

- **Row-level security.** Types describe shape, not access. A column can exist,
  type-check, and still be unreadable because a policy says so. `ROLLOUT.md`
  covers that side.
- **Anything not regenerated.** These types are a snapshot. A schema change made
  in the Supabase UI without re-running the steps above leaves them stale and the
  guarantee silently lapses — which is the same failure mode they exist to
  prevent, one level up. Regenerate as part of applying a migration, not after
  something breaks.
- **Runtime validation.** Nothing here checks that a row coming back over the
  wire matches its declared type. `zod` schemas in `lib/validation.ts` do that
  for user input; the database is trusted for its own rows.
