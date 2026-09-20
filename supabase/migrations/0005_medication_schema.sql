-- ============================================================================
-- 0005 — Align medication tables with the client
--
-- The medication feature has never worked. The client reads and writes column
-- names that do not exist, so every insert and every select failed, and the
-- failures were swallowed: useMedicationLogs computed an error and the
-- Dashboard never read it. Surfacing load errors is what finally showed it as
-- "column medication_logs.given_at does not exist".
--
--   client wants                            database has
--   medication_schedules.name               medication_name
--   medication_schedules.frequency_days int frequency (text)
--   medication_schedules.updated_at         (missing)
--   medication_logs.given_at                administered_at
--
-- Both tables are empty — confirmed by count before writing this — which is
-- itself the evidence that nothing ever saved. So the columns are renamed and
-- retyped outright rather than converted.
--
-- Apply in the Supabase SQL editor. Safe to re-run: every step checks first.
-- ============================================================================

-- ── medication_schedules ────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'medication_schedules'
      and column_name = 'medication_name'
  ) then
    alter table public.medication_schedules rename column medication_name to name;
  end if;
end $$;

-- frequency was text ("twice daily"), and the client does arithmetic with it:
-- addDays(start, frequency_days * n). Dropped rather than converted because
-- the table is empty and there is nothing to parse.
alter table public.medication_schedules drop column if exists frequency;

alter table public.medication_schedules
  add column if not exists frequency_days integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'medication_schedules_frequency_days_check'
  ) then
    alter table public.medication_schedules
      add constraint medication_schedules_frequency_days_check
      check (frequency_days is null or frequency_days >= 1);
  end if;
end $$;

alter table public.medication_schedules
  add column if not exists updated_at timestamptz not null default now();

-- The form sends `start_date: medStartDate || null`, and getNextDose already
-- returns null without a start date. NOT NULL would reject a schedule the
-- client considers valid.
alter table public.medication_schedules alter column start_date drop not null;

-- is_active was nullable. The client treats it as a boolean and the Reminders
-- page filters on it, so a null would silently hide a schedule.
alter table public.medication_schedules alter column is_active set default true;
update public.medication_schedules set is_active = true where is_active is null;
alter table public.medication_schedules alter column is_active set not null;

-- ── medication_logs ─────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'medication_logs'
      and column_name = 'administered_at'
  ) then
    alter table public.medication_logs rename column administered_at to given_at;
  end if;
end $$;

-- ── Verification ────────────────────────────────────────────────────────────
-- Expect, on medication_schedules: name, dosage, frequency_days, start_date
-- (nullable), end_date, notes, is_active (not null), created_at, updated_at —
-- and no `frequency` or `medication_name`. On medication_logs: given_at, and
-- no `administered_at`.
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('medication_schedules', 'medication_logs')
order by table_name, ordinal_position;
