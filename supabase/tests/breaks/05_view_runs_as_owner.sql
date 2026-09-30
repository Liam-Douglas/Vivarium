-- A view over a household-scoped table without security_invoker. It runs as
-- its owner — postgres, which owns the base table — so RLS on feeding_logs is
-- bypassed and a stranger reads every household's stock through it.
--
-- The reads in the test would fail here, and so would the declarative check
-- that asks the database whether the option is set. Both should fire.
create or replace view public.feeder_stock as
  select animal_id as feeder_item_id, household_id, count(*)::bigint as current_stock
  from public.feeding_logs group by animal_id, household_id;
grant select on public.feeder_stock to authenticated;
