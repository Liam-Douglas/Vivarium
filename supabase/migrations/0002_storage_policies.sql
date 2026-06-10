-- ============================================================================
-- Vivarium — Storage policies for the `animal-photos` bucket
-- ============================================================================
-- REVIEW BEFORE APPLYING.
--
-- Object paths are `<household_id>/<animal_id>/<file>`, so the first path
-- segment identifies the owning household. These policies restrict every
-- operation (read included) to active members of that household.
--
-- IMPORTANT follow-up (see supabase/README.md): the bucket is currently PUBLIC,
-- and the client reads photos via getPublicUrl(). For these read policies to
-- actually protect anything, the bucket must be set to PRIVATE and the client
-- switched to createSignedUrl(). Until then, anyone with an object URL can read
-- it regardless of the SELECT policy below.
-- ============================================================================

-- Make the bucket private (id must match the bucket name used in the client).
update storage.buckets set public = false where id = 'animal-photos';

alter table storage.objects enable row level security;

drop policy if exists animal_photos_select on storage.objects;
create policy animal_photos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'animal-photos'
    and public.app_is_household_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists animal_photos_insert on storage.objects;
create policy animal_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'animal-photos'
    and public.app_is_household_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists animal_photos_update on storage.objects;
create policy animal_photos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'animal-photos'
    and public.app_is_household_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists animal_photos_delete on storage.objects;
create policy animal_photos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'animal-photos'
    and public.app_is_household_member(((storage.foldername(name))[1])::uuid)
  );
