-- ============================================================================
-- Vivarium — the negative RLS test
--
-- Everything the rollout has proved so far is that the policies do not lock
-- the owning member out. That is the easy half. This is the other half: that
-- they lock everybody else out, and that they do it by scoping rather than by
-- refusing everything.
--
-- Run the whole file in the Supabase SQL editor. It reads a result table and
-- then rolls back; it writes nothing that survives.
-- ============================================================================
--
-- no-schema-change: a test, not a migration. No columns change.
--
-- ── Why this is not the same as counting policies ───────────────────────────
--
-- The SQL editor connects as `postgres`, which owns these tables, so RLS is
-- bypassed for every statement it runs. A policy listing read as postgres
-- proves policies exist; it cannot prove one of them works. Every check below
-- therefore switches to the `authenticated` role and sets the JWT claims
-- PostgREST would have set, which is the only way `auth.uid()` returns
-- anything and the only way the policies are consulted at all.
--
-- ── Why there is no second account here ─────────────────────────────────────
--
-- Both users in auth.users are active members of the one household, so there
-- is no "other household" to read from. The stranger is therefore a uuid that
-- belongs to nothing — which tests the same predicate. Every policy scopes
-- through app_is_household_member(household_id), and that is false for a
-- non-member whether they belong to another household or to none at all.
--
-- That does leave one thing unproven, and it is worth being precise about:
-- this shows a stranger sees nothing, not that a member of household B sees
-- nothing of household A. Those go through the same function and the same
-- policy expression, so the case is strong, but it is an argument rather than
-- an observation. Proving it outright needs a second household with a real
-- member, which is a fixture this database does not have.
--
-- ── A note on formatting, so nobody tidies it back ──────────────────────────
--
-- Every statement below is on one line, however long, and that is deliberate.
--
-- The Supabase SQL editor cut this file at line breaks inside statements and
-- reported syntax errors at the continuation lines — first at a set_config
-- call written across two lines, then, once that was joined up, at the
-- `order by` of a multi-line FOR loop. The same file ran cleanly under psql
-- both times, so it is the editor splitting the text rather than the SQL.
--
-- Rewrapping anything here for readability would bring that straight back.
-- Comments are free to wrap: they are not statements, and the file got past
-- plenty of them before failing.

-- ── Reading the result ──────────────────────────────────────────────────────
--
-- One row per check, with a verdict. The final statement raises an exception
-- if any verdict is FAIL, so a leak cannot be missed by skimming a long table.
-- ============================================================================

begin;

create temp table rls_result (seq serial, check_name text, detail text, verdict text) on commit drop;

do $$
declare
  -- A signed-in user who is a member of nothing. Not in auth.users, which does
  -- not matter: nothing here inserts a row that would need the foreign key,
  -- and auth.uid() reads the claim rather than the table.
  stranger uuid := '00000000-0000-0000-0000-0000000000ff';
  -- The control: a real active member, and the household they are in. Read
  -- rather than pasted, so the test cannot be run against the wrong ids.
  member_id uuid;
  household uuid;
  tbl text;
  n bigint;
  leaked int := 0;
  blind int := 0;
  -- Checks that neither proved nor disproved anything. Counted separately and
  -- treated as a failure of the suite: the point of this file is that "no
  -- error" must never be read as "proven".
  unresolved int := 0;
  -- Whether the escalation check below can be conclusive. See check 4.
  stranger_exists boolean := false;
begin
  select hm.user_id, hm.household_id into member_id, household from public.household_members hm where hm.status = 'active' order by hm.joined_at nulls last limit 1;

  if member_id is null then
    insert into rls_result (check_name, detail, verdict) values ('setup', 'no active household member found — nothing to test against', 'FAIL');
    return;
  end if;

  -- ── 1. A stranger reads every household-scoped table ──────────────────────
  -- Derived from the schema rather than listed, so a table added later is
  -- covered by this test the day it appears instead of the day somebody
  -- remembers to add it here.
  for tbl in select c.relname from pg_class c join pg_namespace ns on ns.oid = c.relnamespace join pg_attribute a on a.attrelid = c.oid and a.attname = 'household_id' where ns.nspname = 'public' and c.relkind = 'r' and not a.attisdropped order by c.relname loop
    perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', stranger), true);
    perform set_config('request.jwt.claim.sub', stranger::text, true);
    execute 'set local role authenticated';

    begin
      execute format('select count(*) from public.%I', tbl) into n;
      execute 'reset role';

      if n = 0 then
        insert into rls_result (check_name, detail, verdict) values (format('stranger reads %s', tbl), format('%s rows visible', n), 'pass');
      else
        leaked := leaked + 1;
        insert into rls_result (check_name, detail, verdict) values (format('stranger reads %s', tbl), format('%s rows visible — expected 0', n), 'FAIL');
      end if;
    exception when insufficient_privilege then
      -- Zero rows because the policy scoped them out, and zero rows because
      -- the role was never granted SELECT, are different facts. The app needs
      -- the grant, so this is a finding rather than a pass.
      execute 'reset role';
      unresolved := unresolved + 1;
      insert into rls_result (check_name, detail, verdict) values (format('stranger reads %s', tbl), format('no SELECT grant for authenticated — the app cannot read this either: %s', sqlerrm), 'CHECK');
    end;
  end loop;

  -- ── 2. The control: the same tables, as a real member ────────────────────
  -- Without this the suite would pass just as happily against a database that
  -- denied everybody everything, which is not the property anyone wants.
  for tbl in select c.relname from pg_class c join pg_namespace ns on ns.oid = c.relnamespace join pg_attribute a on a.attrelid = c.oid and a.attname = 'household_id' where ns.nspname = 'public' and c.relkind = 'r' and not a.attisdropped order by c.relname loop
    -- Only tables that actually hold rows can demonstrate anything. An empty
    -- table returning nothing to its owner is not evidence of a broken policy.
    execute format('select count(*) from public.%I where household_id = %L', tbl, household) into n;
    continue when n = 0;

    perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', member_id), true);
    perform set_config('request.jwt.claim.sub', member_id::text, true);
    execute 'set local role authenticated';

    begin
      execute format('select count(*) from public.%I', tbl) into n;
      execute 'reset role';

      if n > 0 then
        insert into rls_result (check_name, detail, verdict) values (format('member reads %s', tbl), format('%s rows visible', n), 'pass');
      else
        blind := blind + 1;
        insert into rls_result (check_name, detail, verdict) values (format('member reads %s', tbl), 'no rows visible to a member of the household that owns them', 'FAIL');
      end if;
    exception when insufficient_privilege then
      execute 'reset role';
      unresolved := unresolved + 1;
      insert into rls_result (check_name, detail, verdict) values (format('member reads %s', tbl), format('no SELECT grant for authenticated — the app cannot read this either: %s', sqlerrm), 'CHECK');
    end;
  end loop;

  -- ── 3. A stranger writes into the household ──────────────────────────────
  begin
    perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', stranger), true);
    perform set_config('request.jwt.claim.sub', stranger::text, true);
    execute 'set local role authenticated';

    execute format( 'insert into public.animals (household_id, user_id, name, species, is_active) values (%L, %L, %L, %L, true)', household, stranger, 'RLS probe', 'Test');

    execute 'reset role';
    insert into rls_result (check_name, detail, verdict) values ('stranger inserts an animal', 'the insert was ACCEPTED — a policy is letting outsiders write', 'FAIL');
    leaked := leaked + 1;
  exception when insufficient_privilege or check_violation or foreign_key_violation then
    execute 'reset role';
    -- A rejection is only a pass when a policy did the rejecting. Both a
    -- failed WITH CHECK and a missing table grant report 42501, and a missing
    -- grant would make this test pass on a database with no policies at all —
    -- exactly the false comfort the rest of this file exists to avoid. The
    -- message is the only thing that tells them apart.
    if sqlerrm like '%row-level security%' then
      insert into rls_result (check_name, detail, verdict) values ('stranger inserts an animal', format('rejected by policy: %s', sqlerrm), 'pass');
    else
      unresolved := unresolved + 1;
      insert into rls_result (check_name, detail, verdict) values ('stranger inserts an animal', format('rejected, but not by a policy — inconclusive: %s', sqlerrm), 'CHECK');
    end if;
  end;

  -- ── 4. A stranger makes themselves an owner ──────────────────────────────
  -- The escalation the rollout calls the check that matters most: if this is
  -- accepted, every other policy in the database is decoration.
  --
  -- household_members.user_id references auth.users, and a stranger who does
  -- not exist there is stopped by the foreign key whatever the policies say.
  -- The first version of this file did exactly that and reported a pass
  -- against a database whose insert policy was `with check (true)`. So the
  -- stranger is given a row here — inside the transaction that is rolled back,
  -- so nothing survives — and the policy is left as the only thing that can
  -- refuse the insert.
  begin
    insert into auth.users (id) values (stranger);
    stranger_exists := true;
  exception when others then
    -- auth.users is not ours to understand in detail; if it will not take a
    -- bare id, the check below says so rather than guessing.
    stranger_exists := false;
  end;

  begin
    perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', stranger), true);
    perform set_config('request.jwt.claim.sub', stranger::text, true);
    execute 'set local role authenticated';

    execute format( 'insert into public.household_members (household_id, user_id, role, status) values (%L, %L, %L, %L)', household, stranger, 'owner', 'active');

    execute 'reset role';
    insert into rls_result (check_name, detail, verdict) values ('stranger joins as owner', 'the insert was ACCEPTED — anyone can grant themselves a household', 'FAIL');
    leaked := leaked + 1;
  exception when insufficient_privilege or check_violation or foreign_key_violation then
    execute 'reset role';
    -- Same distinction as above, plus one more: a foreign key failure means
    -- the policy let the row through and auth.users caught it instead. That
    -- is not the property being tested, and on a database where the stranger
    -- did exist it would have succeeded.
    if sqlstate = '23503' then
      unresolved := unresolved + 1;
      insert into rls_result (check_name, detail, verdict) values ('stranger joins as owner', 'blocked by the foreign key, not by a policy — inconclusive. ' || 'The stranger could not be given an auth.users row, so this ' || 'check cannot tell a working policy from a missing one.', 'CHECK');
    elsif sqlerrm like '%row-level security%' then
      insert into rls_result (check_name, detail, verdict) values ('stranger joins as owner', format('rejected by policy%s: %s', case when stranger_exists then ' (with the foreign key satisfied)' else '' end, sqlerrm), 'pass');
    else
      unresolved := unresolved + 1;
      insert into rls_result (check_name, detail, verdict) values ('stranger joins as owner', format('rejected, but not by a policy — inconclusive: %s', sqlerrm), 'CHECK');
    end if;
  end;

  -- ── 5. A member moves their own row into another household ───────────────
  -- Mass assignment. Zero rows affected is the pass: the row exists and is
  -- theirs, so a policy that allowed the reassignment would report one.
  declare other_household uuid := '00000000-0000-0000-0000-0000000000aa';
    moved bigint;
  begin
    perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', member_id), true);
    perform set_config('request.jwt.claim.sub', member_id::text, true);
    execute 'set local role authenticated';

    execute format( 'update public.animals set household_id = %L where household_id = %L', other_household, household);
    get diagnostics moved = row_count;

    execute 'reset role';
    if moved = 0 then
      insert into rls_result (check_name, detail, verdict) values ('member reassigns an animal to another household', '0 rows updated', 'pass');
    else
      leaked := leaked + 1;
      insert into rls_result (check_name, detail, verdict) values ('member reassigns an animal to another household', format('%s rows updated — expected 0', moved), 'FAIL');
    end if;
  exception when insufficient_privilege or check_violation or foreign_key_violation then
    execute 'reset role';
    if sqlerrm like '%row-level security%' then
      insert into rls_result (check_name, detail, verdict) values ('member reassigns an animal to another household', format('rejected by policy: %s', sqlerrm), 'pass');
    else
      unresolved := unresolved + 1;
      insert into rls_result (check_name, detail, verdict) values ('member reassigns an animal to another household', format('rejected, but not by a policy — inconclusive: %s', sqlerrm), 'CHECK');
    end if;
  end;

  insert into rls_result (check_name, detail, verdict) values ('SUMMARY', format('%s leak(s), %s blind spot(s), %s unresolved', leaked, blind, unresolved), case when leaked = 0 and blind = 0 and unresolved = 0 then 'pass' else 'FAIL' end);
end $$;

select seq, check_name, detail, verdict from rls_result order by seq;

-- The assertion. A long table is easy to skim past; this is not.
--
-- CHECK counts as a failure here, deliberately. An inconclusive escalation
-- check is not a clean bill of health: the first version of this file reported
-- exactly that against a database whose household_members insert policy said
-- `with check (true)`, and called the run a pass. A result that proves nothing
-- has to read as "not proven" rather than as "fine".
do $$
declare failed int; unresolved int;
begin
  select count(*) filter (where verdict = 'FAIL'), count(*) filter (where verdict = 'CHECK') into failed, unresolved from rls_result;

  if failed > 0 or unresolved > 0 then
    raise exception 'NEGATIVE RLS TEST NOT PASSED: % failure(s), % unresolved — read the table above', failed, unresolved;
  end if;
  raise notice 'Negative RLS test passed.';
end $$;

rollback;
