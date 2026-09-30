-- ============================================================================
-- 0008 — Drop the equipment table
--
-- Apply in the Supabase SQL editor. This one destroys a table, so read the
-- pre-check below before running it: it refuses rather than dropping data.
-- ============================================================================
--
-- ── Why this table and not the other one ────────────────────────────────────
--
-- The negative RLS test (supabase/tests/negative_rls.sql) surfaced two tables
-- that exist in the database and that nothing in src/ reads: equipment and
-- incubations. Neither is created by a migration in this repo — they predate
-- the migration history and appear in 0001 only as things to apply policies
-- to — so there was no record of what either was for.
--
-- equipment is superseded. Its columns are care_tasks under different names:
--
--   equipment                      care_tasks
--   ---------------------------    ---------------------------
--   name                           name
--   equipment_type                 kind
--   enclosure_id                   enclosure_id
--   replace_every_days             frequency_days
--   last_replaced_at               last_done_at
--   notes                          notes
--
-- 0004's header says care_tasks exists for "cleaning, weighing, and anything
-- else a keeper repeats on a schedule". Replacing a UV bulb every six months
-- is that, and care_tasks does it with an is_active flag, an animal_id and a
-- completion log behind it. Keeping both would mean two answers to one
-- question, which is the shape this project has spent a lot of effort removing
-- from its policies.
--
-- incubations is NOT dropped and is not dead. It carries a breeding_record_id
-- foreign key into breeding_records, which the app does use, and columns no
-- other table has: start_date, expected_hatch_date, actual_hatch_date,
-- temperature_c, humidity_percent, incubation_medium, hatchlings. It is a
-- designed extension of a built feature that was never wired to a screen.
-- Dropping it would throw away that design to save nothing.
--
-- ── What this cannot undo ───────────────────────────────────────────────────
--
-- A dropped table does not come back. The pre-check refuses if there is a
-- single row, and the foreign key check refuses if anything references it, so
-- the only way this runs is against a table that is genuinely empty and
-- genuinely unreferenced. Verified as both before writing this.
-- ============================================================================

-- ── Pre-check ───────────────────────────────────────────────────────────────
-- Same shape as 0006: refuse with a named exception rather than destroying
-- something on the assumption that a check done once still holds.
-- One statement per line, however long, and declare joined up with its
-- declarations. The Supabase SQL editor cuts statements at line breaks inside
-- them and reports a syntax error at the continuation; negative_rls.sql hit
-- that twice before it was written this way. Rewrapping this for readability
-- would bring it straight back.
do $$
declare n bigint; refs text;
begin
  if to_regclass('public.equipment') is null then
    raise notice 'public.equipment does not exist — nothing to drop.';
    return;
  end if;

  select count(*) into n from public.equipment;
  if n > 0 then
    raise exception 'REFUSING TO DROP: public.equipment holds % row(s). Move them to care_tasks first.', n;
  end if;

  -- Anything pointing at it would break, and a cascade would take that with
  -- it. Neither is acceptable without somebody deciding so first.
  select string_agg(format('%s.%s', c.conrelid::regclass, c.conname), ', ') into refs from pg_constraint c where c.contype = 'f' and c.confrelid = 'public.equipment'::regclass;

  if refs is not null then
    raise exception 'REFUSING TO DROP: public.equipment is referenced by %', refs;
  end if;

  execute 'drop table public.equipment';
  raise notice 'Dropped public.equipment (0 rows, no references).';
end $$;

-- ── Verification ────────────────────────────────────────────────────────────
-- Expect equipment absent and incubations present: the second row is the
-- point, since this migration is as much about what it leaves alone.
select t.name, case when to_regclass('public.' || t.name) is null then 'absent' else 'present' end as state from (values ('equipment'), ('incubations')) as t(name);
