-- ============================================================================
-- 0004 — Care tasks
--
-- Recurring care the app could not record: cleaning, weighing, and anything
-- else a keeper repeats on a schedule. Feeding already has a cadence
-- (animals.feeding_frequency_days) and medication has one
-- (medication_schedules.frequency_days); everything else had nowhere to live.
--
-- Apply in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

-- ── care_tasks ──────────────────────────────────────────────────────────────
-- animal_id and enclosure_id are independent and both optional, so a task can
-- target an animal ("weigh Suki"), an enclosure ("clean the rack") or the
-- household itself ("order frozen rats"). Two nullable columns rather than one
-- polymorphic one, so each foreign key is enforced by the database.
create table if not exists public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  name text not null,
  -- Free text rather than an enum: a keeper's list of recurring jobs is not
  -- ours to enumerate, and an enum would need a migration to extend.
  kind text not null default 'custom',
  animal_id uuid references public.animals(id) on delete cascade,
  enclosure_id uuid references public.enclosures(id) on delete cascade,
  frequency_days integer not null check (frequency_days >= 1),
  -- Denormalised for the same reason animals.last_fed_at is: a due date should
  -- be one read rather than an aggregate over the log.
  last_done_at timestamptz,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists care_tasks_household_idx on public.care_tasks (household_id);
create index if not exists care_tasks_animal_idx on public.care_tasks (animal_id);
create index if not exists care_tasks_enclosure_idx on public.care_tasks (enclosure_id);

-- ── care_task_logs ──────────────────────────────────────────────────────────
-- One row per completion. last_done_at above is a cache of max(done_at) here;
-- this table is what lets it be rebuilt and what makes an accidental "done"
-- undoable. recalculateLastFedAt exists because the feeding side of the app
-- had the cache without the means to rebuild it.
create table if not exists public.care_task_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  task_id uuid not null references public.care_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  done_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists care_task_logs_task_idx on public.care_task_logs (task_id, done_at desc);
create index if not exists care_task_logs_household_idx on public.care_task_logs (household_id);

-- ── Policies ────────────────────────────────────────────────────────────────
-- Same four policies and the same helper as 0001. app_is_household_member()
-- checks status = 'active'; the *_household_access shape found on the live
-- database did not, which is how pending requests held read and write on seven
-- tables. Permissive policies are OR'd, so a loose one beside these would
-- nullify them — hence the drops.
do $$
declare
  t text;
  tables text[] := array['care_tasks', 'care_task_logs'];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t || '_select', t);
    execute format($f$create policy %I on public.%I for select to authenticated
      using (public.app_is_household_member(household_id));$f$, t || '_select', t);

    execute format('drop policy if exists %I on public.%I;', t || '_insert', t);
    execute format($f$create policy %I on public.%I for insert to authenticated
      with check (public.app_is_household_member(household_id));$f$, t || '_insert', t);

    execute format('drop policy if exists %I on public.%I;', t || '_update', t);
    execute format($f$create policy %I on public.%I for update to authenticated
      using (public.app_is_household_member(household_id))
      with check (public.app_is_household_member(household_id));$f$, t || '_update', t);

    execute format('drop policy if exists %I on public.%I;', t || '_delete', t);
    execute format($f$create policy %I on public.%I for delete to authenticated
      using (public.app_is_household_member(household_id));$f$, t || '_delete', t);

  end loop;
end $$;

-- ── Verification ────────────────────────────────────────────────────────────
-- Expect exactly four rows per table, named *_select, *_insert, *_update and
-- *_delete. A fifth policy on either table is the thing to look at: permissive
-- policies are OR'd, so one loose policy beside these four nullifies them —
-- which is exactly how the live database ended up with the holes 0001 closed.
--
-- No legacy sweep here, unlike 0001: these tables are created by this file, so
-- nothing can predate them. Names are listed rather than counted so the check
-- is something you read rather than a number you trust.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('care_tasks', 'care_task_logs')
order by tablename, policyname;

-- Counting policies is not testing them. Run as postgres, as the SQL editor
-- does, every policy is bypassed and this proves only that they exist.
-- supabase/ROLLOUT.md has the `set local role authenticated` form that
-- actually exercises them.
