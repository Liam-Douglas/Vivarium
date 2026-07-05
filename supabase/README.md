# Supabase — security migrations & manual steps

These SQL files were authored during the security review. The repo had no
migrations checked in, so **they are inferred from the client code and must be
reviewed against your live schema before running.** Apply them in order in the
Supabase SQL editor (or via the CLI).

| File | What it does |
|------|--------------|
| `migrations/0001_rls_policies.sql` | Enables RLS and adds household-scoped read/write policies on every data table; scopes `households`, `household_members`, and `profiles`. Closes the cross-tenant data-access risk (review finding **C1**) and the mass-assignment risk via `WITH CHECK` (**H3**). |
| `migrations/0002_storage_policies.sql` | Makes the `animal-photos` bucket private and restricts every object operation to the owning household by path prefix (**C2**). |
| `migrations/0003_functions.sql` | `log_feeding` RPC (atomic feeding write, **M2**) and a `feeder_stock` aggregation view (kills the N+1, **M5**). |

## How to verify RLS after applying
With two test households H1 and H2, signed in as an H1 member:
- `select` / `update` / `delete` an H2 row by id → expect 0 rows / error.
- Request an `animal-photos` object under H2's prefix → expect denied.
- Try to `update` one of your animals setting `household_id` to H2 → blocked by `WITH CHECK`.

## Manual follow-ups NOT done in code (need your environment)

1. **Swap `xlsx` to the patched SheetJS CDN build (review finding H1).**
   The npm `xlsx` (0.18.5) has prototype-pollution + ReDoS advisories with **no
   fix on npm**. The CDN that hosts the patched build is blocked from the CI
   sandbox, so it could not be installed here. From a machine with access:
   ```
   npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
   ```
   Imports (`src/pages/Import.tsx`, `src/pages/Settings.tsx`) are unchanged.

2. ~~Switch the photo read path to signed URLs.~~ **Done (client-side).**
   All photo rendering now goes through `<StoragePhoto>`
   (`src/components/ui/StoragePhoto.tsx`), which resolves stored values via
   `getSignedPhotoUrl()` (`src/lib/storage.ts`) at read time. `createSignedUrl`
   works on both public and private buckets and falls back to the stored URL on
   error, so this is safe to ship BEFORE flipping the bucket: nothing breaks
   while it's public, and access keeps working after `0002_storage_policies.sql`
   makes it private — no re-migration of existing rows needed (the object path
   is derived from each stored public URL). EXIF GPS stripping
   (`src/lib/image.ts`) already mitigates the location-leak risk regardless.

   Remaining server action: apply `0002_storage_policies.sql` to actually make
   the bucket private.

3. ~~Adopt `log_feeding` in the client.~~ **Done.** The feeding form now calls
   `logFeeding()` (`src/lib/queries.ts`), which uses the RPC when available and
   transparently falls back to the legacy sequential writes until
   `0003_functions.sql` is applied — so the migration can be rolled out at any
   time with no coordinated deploy.

4. ~~Adopt the `feeder_stock` view in the client.~~ **Done.**
   `src/hooks/useFeederInventory.ts` queries the `feeder_stock` view in one
   grouped request and falls back to the per-item loop until the view exists.
