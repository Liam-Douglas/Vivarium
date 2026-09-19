# Applying the security migrations

Until these run, the anon key shipped in the client is a full read/write grant
across every household. That is the single largest open risk in the app.

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

## Verifying 0001

Two accounts in two different households, H1 and H2. Signed in as H1:

- `select * from animals where household_id = '<H2>'` → 0 rows.
- `update animals set name = 'x' where id = '<an H2 animal>'` → 0 rows affected.
- `delete from feeding_logs where id = '<an H2 log>'` → 0 rows affected.
- `update animals set household_id = '<H2>' where id = '<an H1 animal>'` →
  rejected by the `WITH CHECK` clause. This is the mass-assignment case: a
  tampered client trying to push its own row into someone else's household.

Then the two flows that the policies added for this rollout exist to protect,
which are the ones most likely to regress:

- **Joining.** Sign up a third account, enter H1's invite code. The row should
  insert and land as `pending`, and the app should show the waiting screen.
- **Self-approval must fail.** As that pending user:
  `insert into household_members (household_id, user_id, role, status)
   values ('<H1>', auth.uid(), 'owner', 'active')` → rejected. If this
  succeeds, stop and re-check the insert policy: it means anyone with an
  invite code can let themselves in as an owner.
- **Leaving.** As an active member, leave the collection. The row should
  delete. As the same user, try to delete another member's row → 0 rows.

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
