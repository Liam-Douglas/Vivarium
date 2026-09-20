# Applying the security migrations

> **Status — 20 September 2026.** `0001`, `0003` and `0004` are applied to the
> production project. `0002` is not, and should not be until the client moves to
> signed URLs (see *Before 0002*). Everything below still applies to any other
> environment, and to re-running these files after a schema change.
>
> `0001` and `0003` were verified against production as a signed-in user.
> `0004` was not: its check confirmed that eight policies exist with the right
> names and commands, which is a different claim. The SQL editor runs as
> `postgres` and bypasses RLS, so *existing* is all a policy listing can show.
> The `set local role authenticated` form under *Verifying* is what tests them.
>
> Applying them to a live database that already had hand-written policies
> surfaced three separate holes, none of which were visible from the repository.
> They are catalogued under *Before you apply* — read that section before
> running any of this anywhere else.

Everything here is applied by hand in the Supabase SQL editor. Run the files in
the order below — **it is not their numeric order**, and 0002 in particular will
break working photos if it goes early.

## Order

| Step | File | Safe to run now | Why |
|---|---|---|---|
| 1 | `migrations/0001_rls_policies.sql` | yes | Turns RLS on and scopes every table to active household members. |
| 2 | `migrations/0003_functions.sql` | yes | Purely additive: the `log_feeding` RPC and the `feeder_stock` view. The client already falls back when they are absent, so nothing breaks either way. |
| 3 | — | **not yet** | Ship the client change from "Before 0002" below. |
| 4 | `migrations/0002_storage_policies.sql` | after step 3 | Makes the photo bucket private. |

`migrations/0004_care_tasks.sql` sits outside this order: it creates two new
tables for the Reminders page and depends only on `app_is_household_member()`
from `0001`. Applied 20 September 2026; the policy listing returned the expected
eight rows and no ninth. Unlike `0001` it carries no legacy sweep, because the
tables it policies are created by the same file and nothing can predate them.

## Before 0002

`0002` sets `animal-photos` to private. The client still reads photos with
`getPublicUrl()`, and every `photo_url` already stored in the database is an
absolute public URL. Apply `0002` before changing that and every photo in the
app turns into a broken image — existing rows included, because the stored URLs
stop resolving.

The client has to move to `createSignedUrl()` first. It does not need a data
migration to do it: the storage path is recoverable from the stored URL, which
is everything after `/object/public/animal-photos/`.

Until then the bucket stays public, so anyone holding an object URL can read
that photo. EXIF GPS is already stripped before upload (`src/lib/image.ts`), so
the location leak that would make this urgent is already closed.

## Before you apply: see what is already there

These files were written from the client code, on the assumption of a clean
slate. That assumption was wrong once already and cost a live vulnerability, so
look first:

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;
```

Read the `with_check` column on every INSERT row. **Permissive policies on the
same command are OR'd**: a caller has to satisfy only one of them. So a single
loose policy defeats every careful one beside it, and a policy listing that
contains the careful one looks reassuring while the hole stays open.

Three shapes were found this way on the live database, none of them in any
migration. Each is worth recognising, because a policy listing shows the
correct policy present in every case:

**Constrains who, not what.** `members_insert_self`, whose entire check was
`user_id = auth.uid()`. Any user could insert themselves as
`role = 'owner', status = 'active'` into any household whose id they could
name — the approval flow bypassed completely.

**Reads `household_members` without reading `status`.** Eight policies named
`*_household_access`, on `animal_photos`, `enclosures`, `equipment`,
`incubations`, `medication_logs`, `medication_schedules`, `vet_contacts` and
`households`. Each used `household_id in (select household_id from
household_members where user_id = auth.uid())`, which treats *having* a
membership row as *being* a member. A pending request — someone who typed an
invite code and was never approved — had full read and write. This is the
shape that hides best: it mentions `household_id`, so a search for policies
that "aren't household-scoped" walks straight past it. Find it with:

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and (coalesce(qual,'') || ' ' || coalesce(with_check,'')) ~ 'household_members'
  and (coalesce(qual,'') || ' ' || coalesce(with_check,'')) !~ 'status';
```

**No constraint at all.** `Authenticated users can read profiles`, `using
(true)`, making every profile readable by every signed-in user.

`0001` now drops all of these before adding its own, and covers `equipment`
and `incubations`, which no client code touches — which is precisely why a
table list derived from the app missed them.

## Verifying 0001

**The SQL editor connects as `postgres`, which bypasses RLS, and `auth.uid()`
is null there.** A query run plainly in the editor tests nothing: it will
succeed whatever the policies say. Every check below therefore impersonates a
real user inside a transaction that is rolled back.

Take a `(household, user)` pair where the user has **no existing row** for that
household — otherwise the unique index below fires first and you get a
constraint error that looks like an RLS rejection but is not:

```sql
select h.id as household_id, h.name, hm.user_id, hm.role, hm.status
from households h
left join household_members hm on hm.household_id = h.id
order by h.name;
```

**The escalation must be rejected.** This is the check that matters most:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"USER_UUID","role":"authenticated"}';
  insert into household_members (household_id, user_id, role, status)
  values ('HOUSEHOLD_UUID', 'USER_UUID', 'owner', 'active');
rollback;
```

Expect `ERROR: new row violates row-level security policy`.

**This is the one check where an error is the pass and success is the failure.**
The editor reports "Success. No rows returned" when the last statement is the
rollback, so that message means the escalation was *accepted* — go back to the
policy listing above and find the competing insert policy. Read the error text,
not the absence of one: every other check here reports a number precisely so
this is the only place that distinction matters.

**A genuine request must still succeed**, or joining is broken. This one ends
in a count rather than leaving you to read the absence of an error, because
"Success. No rows returned" is ambiguous enough to misread when tired:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"USER_UUID","role":"authenticated"}';

  insert into household_members (household_id, user_id, role, status)
  values ('HOUSEHOLD_UUID', 'USER_UUID', 'member', 'pending');

  select count(*) as should_be_one
  from household_members
  where user_id = 'USER_UUID'
    and household_id = 'HOUSEHOLD_UUID'
    and status = 'pending';
rollback;
```

Expect `should_be_one = 1`.

**Cross-household reads must come back empty, and their own must not** — the
second query is the control that proves the policy is scoping rather than
simply blocking everything:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"USER_UUID","role":"authenticated"}';
  select count(*) as must_be_zero from animals where household_id = 'A_HOUSEHOLD_THEY_ARE_NOT_IN';
  select count(*) as must_be_real from animals where household_id = 'THEIR_OWN_HOUSEHOLD';
rollback;
```

**Mass assignment must be refused** — a tampered client pushing its own row
into someone else's household:

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"USER_UUID","role":"authenticated"}';
  update animals set household_id = 'A_HOUSEHOLD_THEY_ARE_NOT_IN'
  where id = 'ONE_OF_THEIR_ANIMALS';
rollback;
```

Expect `UPDATE 0`. Zero rows affected is the pass: the row exists and is the
caller's, so a policy that let the reassignment through would report `UPDATE 1`.

Finally, exercise joining and leaving in the app itself. Those two are the
flows the added policies exist to protect and the ones most likely to regress.

## Coverage

Every table the client reads or writes directly is covered. The uniform loop in
`0001` handles the sixteen household-scoped tables; `household_members`,
`households` and `profiles` have their own policies; `feeder_stock` is a
`security_invoker` view, so it inherits the caller's access to the events table
underneath it.

## If something goes wrong

RLS can be lifted per table without dropping the policies:

```sql
alter table public.animals disable row level security;
```

That restores access immediately and keeps the policy definitions in place, so
re-enabling is one statement rather than a re-run. Prefer it to dropping
policies while debugging.

## What applying it to production actually found

Recorded because the pattern matters more than the individual policies: in all
three cases a policy listing showed the *correct* policy present, so nothing was
visibly wrong.

| Shape | Where | What it allowed |
|---|---|---|
| Constrains who, not what | `members_insert_self` | Any user could insert themselves as `role='owner', status='active'` into any household whose id they could name. Confirmed by doing it. |
| Consults membership, not status | 8× `*_household_access` | A pending request — never approved — had read and write on seven tables. |
| No constraint at all | `Authenticated users can read profiles` | `using (true)`: every profile readable by every signed-in user. |

Two tables, `equipment` and `incubations`, were missing from this file entirely.
No client code references either, and the original table list was written by
reading the client — so the app could not have revealed them. The database is
the only reliable source of truth about the database.

Verified afterwards, reporting numbers rather than the absence of an error:

```
membership_without_status = 0
unrestricted_using_true   = 0
equipment_policies        = 4
incubations_policies      = 4
```

## Housekeeping done at the same time

Seven households existed, all named "Our Collection", six of them empty.
`getHouseholdForUser` returns a single row and the client takes `data[0]` from
an unordered result, so which collection that account opened could vary between
sessions. The six empty ones were deleted with a guard that recomputed emptiness
across all eighteen household-scoped tables at delete time, rather than trusting
a pasted list of ids.

Worth knowing if it recurs: the first version of that guard covered sixteen
tables and would have reported a household holding `equipment` or `incubations`
rows as empty — and those foreign keys are `CASCADE`, so the rows would have
gone silently with it.
