-- ============================================================================
-- 0006 — household_id becomes NOT NULL where it already always is
--
-- Eight tables carry a nullable household_id, left over from the migration to
-- households. The app has set it on every write since, but the column never
-- got tightened, and "nullable in the database, always set by the client" is
-- precisely the gap that let the medication columns drift unnoticed.
--
-- A row with household_id IS NULL would be unreachable rather than merely
-- wrong: every policy scopes through app_is_household_member(household_id),
-- which is false for NULL, so nobody — including the owner — could read, edit
-- or delete it through the app. It would sit there, owned by a user, belonging
-- to no household, and nothing would ever surface it.
--
-- Verified empty before writing this: all eight tables, 0 rows with a null
-- household across 464 rows.
--
-- Apply in the Supabase SQL editor. Safe to re-run — set not null is
-- idempotent. NOT safe to run blind on another environment: check first with
-- the query at the bottom, because a single offending row fails the statement.
-- ============================================================================

do $$
declare
  t text;
  tables text[] := array[
    'animals', 'expenses', 'feeder_items', 'feeder_stock_events',
    'feeding_logs', 'health_events', 'shedding_logs', 'weight_logs'
  ];
  offending bigint;
begin
  foreach t in array tables loop
    -- Check before altering so the failure names the table, rather than
    -- leaving the reader to work out which of eight statements threw.
    execute format('select count(*) from public.%I where household_id is null', t)
      into offending;

    if offending > 0 then
      raise exception
        'public.% has % row(s) with a null household_id — assign them before running this',
        t, offending;
    end if;

    execute format('alter table public.%I alter column household_id set not null', t);
  end loop;
end $$;

-- ── Verification ────────────────────────────────────────────────────────────
-- Expect is_nullable = NO for all eight.
select table_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and column_name = 'household_id'
  and table_name in (
    'animals', 'expenses', 'feeder_items', 'feeder_stock_events',
    'feeding_logs', 'health_events', 'shedding_logs', 'weight_logs'
  )
order by table_name;
