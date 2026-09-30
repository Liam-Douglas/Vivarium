-- Not a policy hole at all: the authenticated role simply cannot read the
-- table. A stranger sees nothing, which looks exactly like a working policy
-- and is not one — and the app cannot read it either. The test has to report
-- this as unresolved rather than counting it as a pass.
revoke select on public.animals from authenticated;
