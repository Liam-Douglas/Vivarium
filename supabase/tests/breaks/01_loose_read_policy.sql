-- The exact shape this project hit four times: a correct-sounding policy
-- beside the right ones. Permissive policies are OR'd, so this nullifies them.
create policy animals_read_everything on public.animals
  for select to authenticated using (true);
