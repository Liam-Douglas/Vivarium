-- A storage policy that checks the bucket and nothing else.
--
-- This is not hypothetical: it is what the bucket actually carried until 21
-- September 2026. Three policies, each named as though it scoped something,
-- each testing `bucket_id = 'animal-photos'` alone — so every signed-in user
-- could read, overwrite and upload into every household's folder.
--
-- The bucket stays private here, so check 7 passes and only check 8 fires.
-- That pairing is the point: 0002 recorded that making the bucket private
-- would have closed the anonymous hole, left this one open, and looked like it
-- had worked. One check cannot stand in for the other.
drop policy if exists animal_photos_select on storage.objects;
create policy animal_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'animal-photos');
