-- ============================================================================
-- 0007 — Remove the 49 redundant policies 0001's sweep left behind
--
-- no-schema-change: policies only; no table columns change.
--
-- 0001 enabled RLS and gave every table four policies — <table>_select,
-- _insert, _update and _delete — each scoped by app_is_household_member().
-- It also swept away the legacy policies it knew about, BY NAME, from a list
-- written by looking at the live database at the time.
--
-- Forty-nine survived, across eleven tables, because they were not on that
-- list. They fall into two families:
--
--   41  inline `household_id in (select ... where user_id = auth.uid()
--       and status = 'active')`
--    8  `household <thing>`, ALL, {public}, calling is_household_member()
--
-- Every one of them was checked and every one is safe: all 49 scope by
-- household and check that the membership is active. This migration is not
-- fixing a hole. It is removing the conditions under which the next hole would
-- be invisible.
--
-- That matters here more than it usually would. Four times in this project a
-- policy listing has shown correct-sounding policies that granted more than
-- their names suggested — members_insert_self, eight *_household_access, the
-- profiles read-everything, and three on the storage bucket. A table showing
-- nine policies cannot be read at a glance; a table showing four can.
--
-- Sweeping BY SHAPE rather than by name is the actual fix. A name list is a
-- snapshot; "anything that is not one of the four this migration generates" is
-- a rule, and it will catch whatever gets added by hand next year.
--
-- ── Before running: see what it would drop ──────────────────────────────────
--
--   select tablename, policyname, cmd, roles
--   from pg_policies
--   where schemaname = 'public'
--     and tablename not in ('households', 'household_members', 'profiles')
--     and policyname not in (
--       tablename || '_select', tablename || '_insert',
--       tablename || '_update', tablename || '_delete')
--   order by tablename, policyname;
--
-- households, household_members and profiles are excluded throughout: 0001
-- gives them deliberately different policies, and sweeping them by this rule
-- would remove the ones that matter.
-- ============================================================================

do $$
declare
  p record;
  dropped int := 0;
begin
  for p in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename not in ('households', 'household_members', 'profiles')
      and policyname not in (
        tablename || '_select', tablename || '_insert',
        tablename || '_update', tablename || '_delete'
      )
  loop
    execute format('drop policy if exists %I on public.%I;', p.policyname, p.tablename);
    dropped := dropped + 1;
  end loop;

  raise notice 'dropped % redundant policies', dropped;
end $$;

-- ── The legacy helper ───────────────────────────────────────────────────────
-- Nothing references is_household_member once the eight policies above are
-- gone. It is left in place rather than dropped — something outside the public
-- schema may still call it — but it is hardened: unlike its replacement it had
-- no fixed search_path, which is the gap Supabase's own linter flags as
-- function_search_path_mutable. A SECURITY DEFINER function that resolves its
-- tables through a caller-controlled search_path is worth closing whether or
-- not a path to it exists today.
alter function public.is_household_member(uuid) set search_path = public;

-- ── Verification ────────────────────────────────────────────────────────────
-- Expect exactly four policies on every table except households (1),
-- household_members (5) and profiles (2). Anything else is a policy this
-- migration did not expect, and worth reading before assuming it is fine.
select tablename, count(*) as policies
from pg_policies
where schemaname = 'public'
group by tablename
order by policies desc, tablename;
