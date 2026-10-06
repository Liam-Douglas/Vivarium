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
-- ── The two people this tests as ────────────────────────────────────────────
--
-- A stranger, first: a uuid that belongs to nothing. Every policy scopes
-- through app_is_household_member(household_id), which is false for them, so
-- every household-scoped relation must come back empty.
--
-- Then a member of a different household, which is the sentence a keeper
-- actually cares about — not "somebody with no account sees nothing" but "the
-- other person with an account cannot see my animals". There is no second
-- household in this database to borrow, so check 6 builds one: a user, a
-- household, a membership and one animal, inside the transaction that is
-- rolled back. Nothing survives it.
--
-- That check is generic and does not need to know what it inserted. For every
-- household-scoped relation, what the second member can see must equal what
-- their own household holds. Larger means they are reading somebody else, and
-- the row says so: "sees 3 but owns only 1 — reading another household".
--
-- ── And the photo bucket, which is not a table ──────────────────────────────
--
-- Checks 7 and 8 cover storage, which everything above does not: the rest of
-- this file walks public-schema relations and never reaches it, so the bucket
-- could have been flipped public and no check would have moved.
--
-- Two checks rather than one, because they fail apart. 0002 found the bucket
-- carrying three policies that tested bucket_id and nothing else — so every
-- signed-in user reached every household's folder — and recorded that making
-- the bucket private would have closed the anonymous-link hole, left that one
-- open, and looked like it had worked. breaks/06 and breaks/07 are those two
-- states, and each trips exactly one of the checks while the other passes.
--
-- Weaker than the rest of the file, and worth saying so: storage.objects
-- belongs to supabase_storage_admin, so its rows cannot be read here the way
-- animals can. Check 8 reads policy text out of pg_policies rather than
-- exercising a policy, which is why its row names what it inspected.
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

-- ── Run against production on 30 September 2026 ────────────────────────────
--
-- 41 checks, 0 leaks, 0 blind spots, 0 unresolved. Twenty-two relations
-- returned nothing to a stranger, fourteen returned their rows to a member,
-- and all three write probes were refused by a policy rather than by a grant
-- or a foreign key.
--
-- feeder_stock passed all three of its checks. The third is the one that had
-- never been observed: security_invoker is set on the live view, where every
-- previous claim about it came from reading 0003. Its SELECT grant is there
-- too — that check reported a count rather than CHECK — so the app is using
-- the grouped query rather than quietly falling back to the per-item one.
--
-- One limit, so the pass is not read as broader than it is: eight of the
-- twenty-two were empty (breeding_records, equipment, exit_records,
-- health_events, incubations, medication_schedules, vet_contacts,
-- weight_logs). A leak would still have shown, so the negative half holds for
-- them; the control could not run, so scoping is demonstrated on the fourteen
-- that hold rows.
--
-- ── Run against production on 1 October 2026, with check 6 ─────────────────
--
-- 62 checks, 0 leaks, 0 blind spots, 0 unresolved. Twenty-one relations this
-- time rather than twenty-two: equipment is gone, which is 0008 confirmed from
-- outside the migration that did it.
--
-- Check 6 is the one this run was for, and two of its twenty-one rows are the
-- ones carrying evidence:
--
--   other household reads animals             sees 1, owns 1
--   other household reads household_members   sees 1, owns 1
--
-- The real household holds thirteen animals and two members. The probe member
-- saw one of each — their own — and none of the rest. That is the sentence a
-- keeper cares about, observed rather than argued.
--
-- The other nineteen rows read "sees 0, owns 0", which is consistent with
-- correct scoping and proves nothing by itself: the probe household holds no
-- feeding logs, no enclosures, no expenses. They stay because the equality test
-- is generic — the day the probe is given one of those rows, that relation
-- starts carrying evidence too, with no change to this file.
--
-- Check 6's first attempt did not get as far as a verdict: the probe household
-- would not build, because households.created_by is NOT NULL with no default
-- and the insert did not supply it. The check reported CHECK rather than a
-- pass, which is the behaviour the CHECK verdict exists for, and the fixture
-- now carries the same column so scripts/check-rls-test.sh says so first.
--
-- ── Reading the result ──────────────────────────────────────────────────────
--
-- One row per check, with a verdict. The final statement raises an exception
-- if any verdict is FAIL, so a leak cannot be missed by skimming a long table.
-- ============================================================================

begin;

create temp table rls_result (seq serial, check_name text, detail text, verdict text) on commit drop;

-- The variables the block below works with, and why they are what they are.
--
--   stranger        a signed-in user who is a member of nothing. Not in
--                   auth.users, which does not matter for the reads: nothing
--                   there needs the foreign key, and auth.uid() takes the
--                   claim rather than the table. Check 4 gives it a row.
--   member_id,      a real active member and the household they are in, read
--   household       from the database rather than pasted, so the test cannot
--                   be run against the wrong ids.
--   leaked          rows a stranger could see, or writes that were accepted.
--   blind           tables a member could NOT see their own rows in.
--   unresolved      checks that proved nothing either way. Counted apart and
--                   treated as a failure of the suite: the point of this file
--                   is that "no error" must never be read as "proven".
--   stranger_exists whether check 4 can be conclusive. See check 4.
--
-- declare is one line for the same reason every statement is. See the note
-- above about the editor.
do $$
declare stranger uuid := '00000000-0000-0000-0000-0000000000ff'; other_user uuid := '00000000-0000-0000-0000-0000000000bb'; probe_household uuid := '00000000-0000-0000-0000-0000000000cc'; theirs bigint; second_household_built boolean := false; member_id uuid; household uuid; tbl text; viewopts text; n bigint; leaked int := 0; blind int := 0; unresolved int := 0; stranger_exists boolean := false; bucket_public boolean; polqual text; storage_policies int := 0; storage_unscoped int := 0;
begin
  select hm.user_id, hm.household_id into member_id, household from public.household_members hm where hm.status = 'active' order by hm.joined_at nulls last limit 1;

  if member_id is null then
    insert into rls_result (check_name, detail, verdict) values ('setup', 'no active household member found — nothing to test against', 'FAIL');
    return;
  end if;

  -- ── 1. A stranger reads every household-scoped table and view ────────────
  -- Derived from the schema rather than listed, so a table added later is
  -- covered by this test the day it appears instead of the day somebody
  -- remembers to add it here.
  for tbl in select c.relname from pg_class c join pg_namespace ns on ns.oid = c.relnamespace join pg_attribute a on a.attrelid = c.oid and a.attname = 'household_id' where ns.nspname = 'public' and c.relkind in ('r','v') and not a.attisdropped order by c.relname loop
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

  -- ── 2. The control: the same relations, as a real member ─────────────────
  -- Without this the suite would pass just as happily against a database that
  -- denied everybody everything, which is not the property anyone wants.
  for tbl in select c.relname from pg_class c join pg_namespace ns on ns.oid = c.relnamespace join pg_attribute a on a.attrelid = c.oid and a.attname = 'household_id' where ns.nspname = 'public' and c.relkind in ('r','v') and not a.attisdropped order by c.relname loop
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

  -- ── 2b. Views must carry security_invoker ────────────────────────────────
  -- A view without it runs as its owner, which here is postgres, and postgres
  -- owns the base tables — so RLS on them is bypassed entirely and the reads
  -- above would pass for the wrong reason. feeder_stock is the only one today
  -- (0003 sets it); this asks the database rather than trusting the migration.
  --
  -- A materialised view cannot honour the caller's RLS at all, so one holding
  -- a household_id is reported whatever its options say.
  for tbl, viewopts in select c.relname, coalesce(array_to_string(c.reloptions, ','), '') || case when c.relkind = 'm' then ' MATERIALISED' else '' end from pg_class c join pg_namespace ns on ns.oid = c.relnamespace join pg_attribute a on a.attrelid = c.oid and a.attname = 'household_id' where ns.nspname = 'public' and c.relkind in ('v','m') and not a.attisdropped order by c.relname loop
    if viewopts like '%MATERIALISED%' then
      leaked := leaked + 1;
      insert into rls_result (check_name, detail, verdict) values (format('view %s honours the caller', tbl), 'materialised views cannot apply the caller RLS at all', 'FAIL');
    elsif lower(viewopts) like '%security_invoker=true%' or lower(viewopts) like '%security_invoker=on%' then
      insert into rls_result (check_name, detail, verdict) values (format('view %s honours the caller', tbl), format('security_invoker set (%s)', viewopts), 'pass');
    else
      leaked := leaked + 1;
      insert into rls_result (check_name, detail, verdict) values (format('view %s honours the caller', tbl), format('no security_invoker — runs as its owner and bypasses RLS on the base tables (options: %s)', case when viewopts = '' then 'none' else viewopts end), 'FAIL');
    end if;
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
  declare other_household uuid := '00000000-0000-0000-0000-0000000000aa'; moved bigint;
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

  -- ── 6. A member of ANOTHER household ─────────────────────────────────────
  -- The thing every earlier version of this file said it could not show. The
  -- stranger above belongs to nothing, which tests the same predicate but is
  -- not the same sentence: what a keeper wants to know is that the other
  -- person with an account cannot see their animals.
  --
  -- There is no second household to borrow, so one is built here — a user, a
  -- household, a membership and one animal — inside the transaction that is
  -- rolled back. Nothing survives.
  --
  -- The check is generic and does not need to know what was inserted: for
  -- every household-scoped relation, what this member can see must equal what
  -- their own household holds. Larger means they are reading somebody else.
  --
  -- households.created_by is NOT NULL with no default, so the insert has to
  -- supply it. The first version of this check did not, and production refused
  -- the fixture with "null value in column created_by" — reported honestly as
  -- CHECK rather than as a pass, but still a round trip spent on a column
  -- database.types.ts had recorded all along. scripts/check-fixture-shape.mjs
  -- now holds the test fixture to the same NOT NULL columns, so the next one
  -- of these fails locally instead.
  begin
    insert into auth.users (id) values (other_user);
    insert into public.households (id, name, created_by) values (probe_household, 'RLS probe household', other_user);
    insert into public.household_members (household_id, user_id, role, status) values (probe_household, other_user, 'owner', 'active');
    insert into public.animals (household_id, user_id, name, species, is_active) values (probe_household, other_user, 'RLS probe animal', 'Test', true);
    second_household_built := true;
  exception when others then
    -- auth.users and households are not ours to understand in detail. If the
    -- fixture cannot be built, say so rather than reporting a pass.
    second_household_built := false;
    insert into rls_result (check_name, detail, verdict) values ('member of another household', format('could not build a second household to test with — inconclusive: %s', sqlerrm), 'CHECK');
    unresolved := unresolved + 1;
  end;

  if second_household_built then
    for tbl in select c.relname from pg_class c join pg_namespace ns on ns.oid = c.relnamespace join pg_attribute a on a.attrelid = c.oid and a.attname = 'household_id' where ns.nspname = 'public' and c.relkind in ('r','v') and not a.attisdropped order by c.relname loop
      execute format('select count(*) from public.%I where household_id = %L', tbl, probe_household) into theirs;
      perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', other_user), true);
      perform set_config('request.jwt.claim.sub', other_user::text, true);
      execute 'set local role authenticated';
      begin
        execute format('select count(*) from public.%I', tbl) into n;
        execute 'reset role';
        if n = theirs then
          insert into rls_result (check_name, detail, verdict) values (format('other household reads %s', tbl), format('sees %s, owns %s', n, theirs), 'pass');
        else
          leaked := leaked + 1;
          insert into rls_result (check_name, detail, verdict) values (format('other household reads %s', tbl), format('sees %s but owns only %s — reading another household', n, theirs), 'FAIL');
        end if;
      exception when insufficient_privilege then
        execute 'reset role';
        unresolved := unresolved + 1;
        insert into rls_result (check_name, detail, verdict) values (format('other household reads %s', tbl), format('no SELECT grant for authenticated: %s', sqlerrm), 'CHECK');
      end;
    end loop;
  end if;

  -- ── 7. The photo bucket is private ───────────────────────────────────────
  -- The one claim about this app's storage that nothing watched. 0002 turned
  -- the bucket private on 21 September 2026 and recorded it; the flag was read
  -- back from the catalog on 2 October and was false. Neither of those is a
  -- test, so nothing would have noticed it being flipped back.
  --
  -- storage.objects belongs to supabase_storage_admin and the SQL editor
  -- cannot read its rows, but storage.buckets and pg_policies are both
  -- readable as postgres — which is all these two checks need.
  begin
    select b.public into bucket_public from storage.buckets b where b.id = 'animal-photos';

    if bucket_public is null then
      unresolved := unresolved + 1;
      insert into rls_result (check_name, detail, verdict) values ('photo bucket is private', 'no animal-photos bucket found — this test cannot say anything about it', 'CHECK');
    elsif bucket_public then
      leaked := leaked + 1;
      insert into rls_result (check_name, detail, verdict) values ('photo bucket is private', 'the bucket is PUBLIC — anyone holding an object URL reads that photo without signing in', 'FAIL');
    else
      insert into rls_result (check_name, detail, verdict) values ('photo bucket is private', 'public = false', 'pass');
    end if;
  exception when others then
    unresolved := unresolved + 1;
    insert into rls_result (check_name, detail, verdict) values ('photo bucket is private', format('could not read storage.buckets — inconclusive: %s', sqlerrm), 'CHECK');
  end;

  -- ── 8. Storage policies scope by household, not just by bucket ───────────
  -- The other half, and the one 0002 found the hard way. The bucket already
  -- carried three policies that checked bucket_id and nothing else, so every
  -- signed-in user could read, overwrite and upload into every household's
  -- folder. Making the bucket private would have closed the anonymous hole,
  -- left that one open, and looked like it had worked.
  --
  -- So: any policy that mentions the bucket must also consult
  -- app_is_household_member. Reading the policy text rather than exercising it
  -- because the rows are not ours to read, which is a weaker check than the
  -- rest of this file and is why it names what it inspected.
  begin
    for polqual in select coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') from pg_policies p where p.schemaname = 'storage' and p.tablename = 'objects' order by p.policyname loop
      continue when polqual not like '%animal-photos%';
      storage_policies := storage_policies + 1;

      if polqual not like '%app_is_household_member%' then
        leaked := leaked + 1;
        storage_unscoped := storage_unscoped + 1;
        insert into rls_result (check_name, detail, verdict) values ('storage policies scope by household', format('a policy on the bucket checks bucket_id and nothing else — every signed-in user reaches every household folder: %s', polqual), 'FAIL');
      end if;
    end loop;

    if storage_policies = 0 then
      unresolved := unresolved + 1;
      insert into rls_result (check_name, detail, verdict) values ('storage policies scope by household', 'no policy on storage.objects mentions the bucket — either they are named differently or the app cannot read photos at all', 'CHECK');
    elsif storage_unscoped = 0 then
      insert into rls_result (check_name, detail, verdict) values ('storage policies scope by household', format('%s policy expression(s) mention the bucket, all of them consulting app_is_household_member', storage_policies), 'pass');
    end if;
  exception when others then
    unresolved := unresolved + 1;
    insert into rls_result (check_name, detail, verdict) values ('storage policies scope by household', format('could not read pg_policies — inconclusive: %s', sqlerrm), 'CHECK');
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
declare failed int; unresolved int; detail text;
begin
  select count(*) filter (where verdict = 'FAIL'), count(*) filter (where verdict = 'CHECK') into failed, unresolved from rls_result;
  -- The message carries the failing rows, not just a count. An exception
  -- replaces the result table in the Supabase SQL editor rather than appearing
  -- beside it, so "read the table above" was advice nobody could take: the
  -- check that exists to stop a leak being skimmed past was hiding the leak.
  select string_agg(format('%s [%s] %s', r.verdict, r.check_name, r.detail), E'\n  ' order by r.seq) into detail from rls_result r where r.verdict in ('FAIL', 'CHECK');
  if failed > 0 or unresolved > 0 then
    raise exception E'NEGATIVE RLS TEST NOT PASSED: % failure(s), % unresolved\n  %', failed, unresolved, detail;
  end if;
  raise notice 'Negative RLS test passed.';
end $$;

rollback;
