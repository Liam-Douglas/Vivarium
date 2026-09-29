-- RLS switched off on one table. The policies still exist and still read
-- correctly in a listing; none of them is consulted.
alter table public.feeding_logs disable row level security;
