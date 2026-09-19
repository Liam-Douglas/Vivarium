-- ============================================================================
-- Vivarium — Row-Level Security policies
-- ============================================================================
-- REVIEW BEFORE APPLYING. This file is authored from the client code's table
-- and column usage (there were no migrations in the repo). Confirm the column
-- names match your actual schema, then run it in the Supabase SQL editor.
--
-- Security model: every household-scoped table is readable/writable only by
-- ACTIVE members of the owning household. The membership check is a
-- SECURITY DEFINER function so it can read household_members without tripping
-- that table's own RLS (which would otherwise recurse).
-- ============================================================================

-- ── Membership helper ───────────────────────────────────────────────────────
create or replace function public.app_is_household_member(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = hid
      and hm.user_id = auth.uid()
      and hm.status = 'active'
  );
$$;

revoke all on function public.app_is_household_member(uuid) from public;
grant execute on function public.app_is_household_member(uuid) to authenticated;

-- ── Household-scoped tables ──────────────────────────────────────────────────
-- All of these carry a household_id column. One uniform policy set each:
--   SELECT / DELETE: row's household_id belongs to the caller.
--   INSERT / UPDATE: same, AND (via WITH CHECK) the row can't be assigned to a
--                    household the caller isn't a member of — blocking the
--                    cross-tenant reassignment (mass-assignment) risk.
do $$
declare
  t text;
  tables text[] := array[
    'animals', 'feeding_logs', 'shedding_logs', 'weight_logs', 'health_events',
    'acquisition_records', 'exit_records', 'breeding_records', 'expenses',
    'enclosures', 'animal_photos', 'medication_schedules', 'medication_logs',
    'vet_contacts', 'feeder_items', 'feeder_stock_events'
  ];
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

-- ── households ───────────────────────────────────────────────────────────────
-- Members may read their own household. Mutations go through SECURITY DEFINER
-- RPCs (create_household_for_user, set_member_role, …) which enforce ownership,
-- so no broad UPDATE/DELETE policy is granted here.
alter table public.households enable row level security;

drop policy if exists households_select on public.households;
create policy households_select on public.households for select to authenticated
  using (public.app_is_household_member(id));

-- ── household_members ────────────────────────────────────────────────────────
-- A user may read membership rows for households they belong to, and read their
-- own row. Owner-side changes (approve/deny/remove/set_member_role) go through
-- SECURITY DEFINER RPCs, which check that the caller is the owner.
--
-- Two operations are NOT owner-side and are done directly by the client, so
-- they need policies of their own or the feature stops working the moment this
-- file is applied: asking to join a household, and leaving one.
alter table public.household_members enable row level security;

drop policy if exists household_members_select on public.household_members;
create policy household_members_select on public.household_members for select to authenticated
  using (user_id = auth.uid() or public.app_is_household_member(household_id));

-- Asking to join (joinHouseholdByCode). The row must be the caller's own, and
-- it must be a REQUEST: pinning status and role here is the whole point of the
-- policy. Without those two clauses a tampered client could insert itself
-- straight in as an active owner of any household whose id it could name,
-- which would make the owner's approval step decorative.
--
-- Permissive policies on the same command are OR'd, so ANY other insert policy
-- on this table defeats the pins above — a caller only has to satisfy one of
-- them. This is not hypothetical: the live database carried a hand-written
-- `members_insert_self` whose only check was `user_id = auth.uid()`, which
-- constrained who the row was about and nothing about what it said. Adding the
-- policy below without removing that one would have left the escalation wide
-- open while looking, in a policy listing, as though it had been fixed.
--
-- So: clear out every competing insert policy first, by name or otherwise.
-- Only INSERT is swept. The update and delete policies on this table may be
-- load-bearing elsewhere and are left for a human to review.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'household_members'
      and cmd = 'INSERT'
      and policyname <> 'household_members_insert_self'
  loop
    raise notice 'dropping competing insert policy: %', p.policyname;
    execute format('drop policy %I on public.household_members;', p.policyname);
  end loop;
end $$;

drop policy if exists household_members_insert_self on public.household_members;
create policy household_members_insert_self on public.household_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and role = 'member'
  );

-- Leaving, or withdrawing a request (leaveHousehold). Only ever your own row —
-- removing somebody else stays with the owner-only RPC.
drop policy if exists household_members_delete_self on public.household_members;
create policy household_members_delete_self on public.household_members for delete to authenticated
  using (user_id = auth.uid());

-- A second request to the same household would otherwise stack up duplicate
-- pending rows, which the approve RPC then has to disambiguate.
create unique index if not exists household_members_household_user_key
  on public.household_members (household_id, user_id);

-- ── profiles ─────────────────────────────────────────────────────────────────
-- A user may read/update only their own profile, plus read profiles of people
-- who share a household (so "logged by <name>" works) — scoped, never global.
alter table public.profiles enable row level security;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.household_members me
      join public.household_members them
        on them.household_id = me.household_id
      where me.user_id = auth.uid()
        and me.status = 'active'
        and them.user_id = public.profiles.id
    )
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
