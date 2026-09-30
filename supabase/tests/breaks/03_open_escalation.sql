-- The escalation hole: an insert policy on household_members that checks
-- nothing, so any signed-in user can grant themselves a household. This is
-- the shape 0001 found live, under the name members_insert_self.
--
-- The first version of negative_rls.sql reported a PASS against this, because
-- the stranger did not exist in auth.users and the foreign key refused the row
-- before the policy had to. That is why the test now gives the stranger a real
-- auth.users row inside its own rolled-back transaction.
drop policy household_members_insert on public.household_members;
create policy household_members_insert_self on public.household_members
  for insert to authenticated with check (true);
