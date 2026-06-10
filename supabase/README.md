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

2. **Switch the photo read path to signed URLs.**
   `0002_storage_policies.sql` makes the bucket private. Once applied, the
   client must stop using `getPublicUrl()` and read via
   `supabase.storage.from('animal-photos').createSignedUrl(path, ttl)` (in
   `uploadAnimalPhoto` / `uploadAdditionalPhoto` and wherever `photo_url` is
   rendered). Existing rows store public URLs that will 401 once the bucket is
   private — plan a short migration to re-issue signed URLs on read. EXIF GPS
   stripping is already handled client-side (`src/lib/image.ts`), so the
   location-leak risk is mitigated even before this step.

3. **Adopt `log_feeding` in the client.**
   Replace the three sequential writes in
   `src/components/feeding/FeedingLogForm.tsx` with a single
   `supabase.rpc('log_feeding', …)` call once the function exists.

4. **Adopt the `feeder_stock` view in the client.**
   Replace the per-item `getFeederStock()` loop in
   `src/hooks/useFeederInventory.ts` with one query against `feeder_stock`.
