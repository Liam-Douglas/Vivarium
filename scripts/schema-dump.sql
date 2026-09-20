-- Dump the public schema as one JSON value, for scripts/generate-types.mjs.
--
-- This exists because the repository has no schema source of truth. Every table
-- was created in the Supabase UI, so nothing has ever compared the client's
-- assumptions against the database. That gap hid `equipment` and `incubations`
-- from the first RLS migration entirely, and let the whole medication feature
-- ship against columns that did not exist — `name` for `medication_name`,
-- `frequency_days` for a text `frequency`, `given_at` for `administered_at` —
-- failing silently on every read and write for five months.
--
-- Run this in the Supabase SQL editor, copy the single JSON cell it returns,
-- and save it as schema.json. Then: npm run types:generate
select json_agg(t order by t.table_name)
from (
  select
    c.table_name,
    json_agg(
      json_build_object(
        'column', c.column_name,
        'type', c.data_type,
        'udt', c.udt_name,
        'nullable', c.is_nullable = 'YES',
        'has_default', c.column_default is not null,
        'identity', c.is_identity = 'YES'
      )
      order by c.ordinal_position
    ) as columns
  from information_schema.columns c
  join information_schema.tables tb
    on tb.table_schema = c.table_schema
   and tb.table_name = c.table_name
   and tb.table_type = 'BASE TABLE'
  where c.table_schema = 'public'
  group by c.table_name
) t;
