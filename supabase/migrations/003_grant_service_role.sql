-- 003_grant_service_role.sql
-- 001_init.sql assumed service_role keeps full access to new tables. Newer Supabase projects no
-- longer grant that by default, so the server (/api/generate, /api/explain) got
-- "permission denied for table sessions". service_role is server-only and bypasses RLS.

grant usage on schema public to service_role;
grant select, insert, update, delete on public.sessions, public.parts, public.questions to service_role;
grant usage, select on all sequences in schema public to service_role;
