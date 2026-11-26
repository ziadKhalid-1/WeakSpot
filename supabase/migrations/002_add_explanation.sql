-- 002_add_explanation.sql: a written explanation for every generated question.
--
-- The server (service_role) fills it during generation. The browser reads it only AFTER the
-- student has answered a question, to show why a wrong answer is wrong.
-- correct_index stays hidden from anon (Rule 5): this file never grants it.
--
-- Safe to run more than once. Runs as one transaction.

begin;

alter table public.questions add column if not exists explanation text;

-- Column-level read for visitors. Every other column grant from 001 stays as it was.
grant select (explanation) on public.questions to anon;

-- Belt and braces: the answer key is never readable by visitors.
revoke select (correct_index) on public.questions from anon, authenticated;

commit;

-- Tell the Supabase API about the new column right away.
notify pgrst, 'reload schema';
