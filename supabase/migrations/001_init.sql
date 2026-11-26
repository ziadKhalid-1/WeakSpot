-- 001_init.sql: the approved MVP schema for «اعرف نقاط ضعفك».
--
-- 3 tables: sessions, parts, questions. No user accounts: the app talks to Supabase as the
-- anon role (publishable key). Deleting a session deletes its parts and questions.
-- Rules that live elsewhere (see the schema notes):
--   * The Result (weak / known parts) is not stored. It is computed on read.
--     Weak = at least 1 wrong answer. Weakest first.
--   * idle = no session row. questionCount = number of questions, currentIndex = number answered.
--   * Generating parts + questions is server-only (service_role bypasses RLS). The browser never
--     inserts them.
--
-- Safe on a fresh database. Runs as one transaction: if any line fails, nothing is created.

begin;

-- ---------------------------------------------------------------------------------------------
-- sessions: one upload of one chapter and where it is in the flow
-- ---------------------------------------------------------------------------------------------
create table public.sessions (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null    default now(),
  file_name     text        not null    check (length(trim(file_name)) > 0),
  slide_count   integer                 check (slide_count > 0),          -- empty until generated
  status        text        not null    default 'preparing'
                check (status in ('preparing', 'ready', 'quiz', 'done', 'failed')),
  error_message text,
  -- error_message is filled exactly when status = 'failed'.
  constraint sessions_error_only_when_failed
    check ((status = 'failed') = (error_message is not null))
);

-- ---------------------------------------------------------------------------------------------
-- parts: the sections a chapter is split into, with their slide numbers
-- ---------------------------------------------------------------------------------------------
create table public.parts (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null    default now(),
  session_id  uuid        not null    references public.sessions (id) on delete cascade,
  position    integer     not null    check (position >= 0),
  title       text        not null    check (length(trim(title)) > 0),
  slides      integer[]   not null,
  -- at least 1 slide, a flat list, no empty items, every slide number >= 1 (Rule 7).
  constraint parts_slides_valid check (
    cardinality(slides) >= 1
    and array_ndims(slides) = 1
    and array_position(slides, null) is null
    and 1 <= all (slides)
  ),
  constraint parts_position_unique unique (session_id, position),
  -- lets questions point at (session_id, part_id) so a question can't use another session's part.
  constraint parts_session_id_unique unique (session_id, id)
);

-- ---------------------------------------------------------------------------------------------
-- questions: one multiple-choice question and the student's final answer to it
-- ---------------------------------------------------------------------------------------------
create table public.questions (
  id             uuid        primary key default gen_random_uuid(),
  created_at     timestamptz not null    default now(),
  session_id     uuid        not null    references public.sessions (id) on delete cascade,
  part_id        uuid        not null,
  position       integer     not null    check (position >= 0),
  source_slide   integer                 check (source_slide >= 1),
  text           text        not null    check (length(trim(text)) > 0),
  options        text[]      not null,
  correct_index  integer     not null    check (correct_index between 0 and 3),
  selected_index integer                 check (selected_index between 0 and 3),  -- empty until «التالي»
  -- Derived, never written by anyone. Lets the Result be computed without exposing
  -- correct_index to the browser (Rule 5). Empty until the question is answered.
  is_correct     boolean generated always as (selected_index = correct_index) stored,
  -- exactly 4 options, a flat list, none empty (Rule 2).
  constraint questions_options_valid check (
    cardinality(options) = 4
    and array_ndims(options) = 1
    and array_position(options, null) is null
    and '' <> all (options)
  ),
  constraint questions_position_unique unique (session_id, position),
  -- every question belongs to exactly one part of the same session (Rule 7).
  constraint questions_part_fk foreign key (session_id, part_id)
    references public.parts (session_id, id) on delete cascade
);

-- Index for the part foreign key (results group questions by part; cascades use it too).
-- (session_id, position) lookups are already covered by the unique constraints above.
create index questions_session_part_idx on public.questions (session_id, part_id);

-- ---------------------------------------------------------------------------------------------
-- Privileges: start from nothing, then grant only what the app needs.
-- (Supabase grants everything on new public tables to anon/authenticated by default.)
-- service_role keeps full access and bypasses RLS: it is for the server only, never web/.
-- ---------------------------------------------------------------------------------------------
revoke all on public.sessions, public.parts, public.questions from anon, authenticated;

grant select, insert, update, delete on public.sessions to anon;
grant select on public.parts to anon;
-- Every column except correct_index (Rule 5: the answer key never reaches the browser).
grant select (id, created_at, session_id, part_id, position, source_slide,
              text, options, selected_index, is_correct)
  on public.questions to anon;
-- The browser may only write the student's answer, nothing else on a question.
grant update (selected_index) on public.questions to anon;

-- ---------------------------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------------------------
alter table public.sessions  enable row level security;
alter table public.parts     enable row level security;
alter table public.questions enable row level security;

-- sessions: no accounts in the MVP, so any visitor can create, read, update and delete sessions.
create policy "anon can create sessions"
  on public.sessions for insert to anon
  with check (true);

create policy "anon can read sessions"
  on public.sessions for select to anon
  using (true);

create policy "anon can update sessions"
  on public.sessions for update to anon
  using (true) with check (true);

create policy "anon can delete sessions"
  on public.sessions for delete to anon
  using (true);

-- parts: read-only for visitors (the server writes them during generation).
create policy "anon can read parts"
  on public.parts for select to anon
  using (true);

-- questions: read-only for visitors, except saving an answer.
create policy "anon can read questions"
  on public.questions for select to anon
  using (true);

-- An answer can be saved only once (Rule 6) and only while that session's quiz is running.
create policy "anon can answer an unanswered question during the quiz"
  on public.questions for update to anon
  using (
    selected_index is null
    and exists (
      select 1 from public.sessions s
      where s.id = questions.session_id and s.status = 'quiz'
    )
  )
  with check (selected_index is not null);

commit;
