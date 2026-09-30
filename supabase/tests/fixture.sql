-- ============================================================================
-- A miniature of the live database, for testing the test.
--
-- Not a migration and not a copy of the schema: just enough of Supabase's
-- shape — auth.uid(), the authenticated role, app_is_household_member and the
-- four policies 0001 generates — for negative_rls.sql to have something real
-- to run against. scripts/check-rls-test.sh builds it, runs the test, then
-- runs it again against the breaks/ files to check the test still notices.
--
-- Three tables rather than eighteen, chosen for what each proves: animals and
-- feeding_logs hold rows, vet_contacts is deliberately empty so the control
-- loop can be seen skipping it rather than reporting a member who cannot read
-- rows that do not exist.
-- ============================================================================

do $r$ begin create role anon nologin; exception when duplicate_object then null; end $r$;
do $r$ begin create role authenticated nologin; exception when duplicate_object then null; end $r$;
grant authenticated to postgres;

create schema if not exists auth;

-- Supabase's auth.uid(), in the form that reads the claims JSON.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create table auth.users (id uuid primary key);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null,
  status text not null,
  joined_at timestamptz
);

create table public.animals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  name text not null,
  species text not null,
  is_active boolean not null default true
);

create table public.feeding_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  animal_id uuid not null references public.animals(id) on delete cascade,
  fed_at timestamptz not null default now()
);

-- An empty household-scoped table, to prove the control skips it rather than
-- reporting a member who cannot see rows that do not exist.
create table public.vet_contacts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  name text not null
);

-- A view over a household-scoped table, matching feeder_stock: without
-- security_invoker it would run as its owner and bypass RLS on the base table
-- entirely, which is what breaks/05 removes to check the test notices.
create or replace view public.feeder_stock with (security_invoker = true) as
  select animal_id as feeder_item_id, household_id, count(*)::bigint as current_stock
  from public.feeding_logs group by animal_id, household_id;

create or replace function public.app_is_household_member(hid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = hid and hm.user_id = auth.uid() and hm.status = 'active'
  );
$$;

grant usage on schema public, auth to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.feeder_stock to authenticated;
grant execute on function public.app_is_household_member(uuid) to authenticated;
grant execute on function auth.uid() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['animals','feeding_logs','vet_contacts','household_members'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($f$create policy %I on public.%I for select to authenticated
      using (public.app_is_household_member(household_id));$f$, t || '_select', t);
    execute format($f$create policy %I on public.%I for insert to authenticated
      with check (public.app_is_household_member(household_id));$f$, t || '_insert', t);
    execute format($f$create policy %I on public.%I for update to authenticated
      using (public.app_is_household_member(household_id))
      with check (public.app_is_household_member(household_id));$f$, t || '_update', t);
    execute format($f$create policy %I on public.%I for delete to authenticated
      using (public.app_is_household_member(household_id));$f$, t || '_delete', t);
  end loop;
end $$;

-- Seed: one household, one active member, two animals, one feeding.
insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
insert into public.households (id, name) values ('22222222-2222-2222-2222-222222222222', 'Fixture');
insert into public.household_members (household_id, user_id, role, status, joined_at)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'owner', 'active', now());
insert into public.animals (id, household_id, user_id, name, species)
values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Suki', 'Ball python'),
       ('33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Benji', 'Ball python');
insert into public.feeding_logs (household_id, user_id, animal_id)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333');
