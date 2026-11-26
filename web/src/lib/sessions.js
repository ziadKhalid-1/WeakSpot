// sessions.js: the Upload screen's link to the real Supabase `sessions` table.
//
// The screens keep the same session shape as store.js / mock.json:
//   { id, fileName, slideCount, status, questionCount, currentIndex }
// The database uses other names (file_name, slide_count...) and has no questionCount or
// currentIndex columns. toSession() below is the ONE place that maps between the two.
//
// There are no accounts, so the browser remembers which session is its own by keeping the
// session id in localStorage. Everything else lives in Supabase.

import { supabase } from './supabase.js';

const ID_KEY = 'bithra:sessionId:v1';

// Only the columns the anon role may read. questions(selected_index) gives the counts
// without ever asking for correct_index (the answer key never reaches the browser).
const COLUMNS = 'id, created_at, file_name, slide_count, status, error_message, questions(selected_index)';

// ---- Errors the screen can show ------------------------------------------------------------
// The screen gets one of these codes, never the raw Supabase error.
export class SessionError extends Error {
  constructor(code, cause) {
    super(code);
    this.code = code; // 'offline' | 'not-configured' | 'failed'
    this.cause = cause;
  }
}

function fail(cause) {
  // Full error in DevTools Console (for you); the screen only ever shows a friendly Arabic message.
  console.error('[sessions] Supabase request failed', {
    message: cause?.message,
    code: cause?.code,
    details: cause?.details,
    hint: cause?.hint,
  });
  if (!supabase) return new SessionError('not-configured', cause);
  const offline =
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    /fetch|network/i.test(cause?.message ?? '');
  return new SessionError(offline ? 'offline' : 'failed', cause);
}

function client() {
  if (!supabase) throw fail(new Error('Supabase env vars missing'));
  return supabase;
}

// ---- The one mapping: database row -> UI session shape -------------------------------------
function toSession(row) {
  const questions = row.questions ?? [];
  return {
    id: row.id,
    fileName: row.file_name,
    slideCount: row.slide_count ?? 0, // empty until generated
    status: row.status, // 'preparing' | 'ready' | 'quiz' | 'done' | 'failed'
    errorMessage: row.error_message ?? null, // Arabic, set by the server when status = 'failed'
    createdAt: row.created_at,
    questionCount: questions.length,
    currentIndex: questions.filter((q) => q.selected_index !== null).length,
  };
}

// ---- The remembered id ---------------------------------------------------------------------
function savedId() {
  try {
    return window.localStorage.getItem(ID_KEY);
  } catch {
    return null;
  }
}
function rememberId(id) {
  try {
    if (id) window.localStorage.setItem(ID_KEY, id);
    else window.localStorage.removeItem(ID_KEY);
  } catch {
    /* storage blocked: the session just won't be restored after a reload */
  }
}

// ---- Calls ---------------------------------------------------------------------------------

// Restore: this browser's session, or null when there is none (idle).
// A session that no longer exists, or whose generation failed, counts as none.
// With { includeFailed: true } a failed session is returned too (the Preparing screen shows its error).
export async function getActiveSession({ includeFailed = false } = {}) {
  const id = savedId();
  if (!id) return null;

  let result;
  try {
    result = await client().from('sessions').select(COLUMNS).eq('id', id).maybeSingle();
  } catch (e) {
    throw e instanceof SessionError ? e : fail(e);
  }
  const { data, error } = result;
  if (error) {
    if (error.code === '22P02') {
      rememberId(null); // not a valid id (old or edited value): forget it
      return null;
    }
    throw fail(error);
  }
  if (!data) {
    rememberId(null);
    return null;
  }
  const session = toSession(data);
  return session.status === 'failed' && !includeFailed ? null : session;
}

// Delete: removes this browser's session (its parts and questions go with it).
export async function deleteActiveSession() {
  const id = savedId();
  if (!id) return;
  const { error } = await client().from('sessions').delete().eq('id', id);
  if (error && error.code !== '22P02') throw fail(error);
  rememberId(null);
}

// Create: replaces any earlier session with a new one for this file (status 'preparing').
export async function createSession(fileName) {
  try {
    await deleteActiveSession();
    const { data, error } = await client()
      .from('sessions')
      .insert({ file_name: fileName })
      .select(COLUMNS)
      .single();
    if (error) throw fail(error);
    rememberId(data.id);
    return toSession(data);
  } catch (e) {
    throw e instanceof SessionError ? e : fail(e);
  }
}

// Run a Supabase call and turn any failure into a SessionError.
async function run(call) {
  let result;
  try {
    result = await call(client());
  } catch (e) {
    throw e instanceof SessionError ? e : fail(e);
  }
  if (result.error) throw fail(result.error);
  return result.data;
}

// Moves the session along the flow: 'quiz' (Ready «ابدأ الأسئلة») or 'done' (last answer).
export async function setStatus(id, status) {
  await run((db) => db.from('sessions').update({ status }).eq('id', id));
}

// Used when the generate request never reached the server (no network, file refused by the host).
export async function markFailed(id, message) {
  await run((db) =>
    db.from('sessions').update({ status: 'failed', error_message: message }).eq('id', id).eq('status', 'preparing'),
  );
}

// parts -> [{ id, position, title, slides }]
export async function loadParts(sessionId) {
  const rows = await run((db) =>
    db.from('parts').select('id, position, title, slides').eq('session_id', sessionId).order('position'),
  );
  return rows ?? [];
}

// Only the columns anon may read. correct_index is never asked for (it is not even granted).
const QUESTION_COLUMNS = 'id, part_id, position, source_slide, text, options, selected_index, is_correct';
const toQuestion = (r) => ({
  id: r.id,
  partId: r.part_id,
  position: r.position,
  sourceSlide: r.source_slide,
  text: r.text,
  options: r.options,
  selectedIndex: r.selected_index,
  isCorrect: r.is_correct,
});

export async function loadQuestions(sessionId) {
  const rows = await run((db) =>
    db.from('questions').select(QUESTION_COLUMNS).eq('session_id', sessionId).order('position'),
  );
  return (rows ?? []).map(toQuestion);
}

// Saves the student's answer once. Postgres computes is_correct; we read it back.
// RLS allows this only while the session's status is 'quiz' and the question is unanswered.
export async function answerQuestion(questionId, selectedIndex) {
  const row = await run((db) =>
    db
      .from('questions')
      .update({ selected_index: selectedIndex })
      .eq('id', questionId)
      .is('selected_index', null)
      .select(QUESTION_COLUMNS)
      .maybeSingle(),
  );
  if (row) return toQuestion(row);
  // Nothing updated: maybe it was already answered (double tap, another tab). Read what is saved.
  const saved = await run((db) => db.from('questions').select(QUESTION_COLUMNS).eq('id', questionId).maybeSingle());
  if (saved?.selected_index !== null && saved?.selected_index !== undefined) return toQuestion(saved);
  throw new SessionError('failed', new Error('answer was not saved (session not in quiz?)'));
}

// The stored explanation, read only after the question is answered.
// Returns null (never throws) when it is empty or the 002 migration has not run yet.
export async function loadExplanation(questionId) {
  try {
    const { data, error } = await client().from('questions').select('explanation').eq('id', questionId).maybeSingle();
    if (error) {
      console.warn('[sessions] explanation not available', error.message);
      return null;
    }
    return data?.explanation?.trim() || null;
  } catch {
    return null;
  }
}
