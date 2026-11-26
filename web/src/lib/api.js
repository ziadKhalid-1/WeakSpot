// api.js: the browser's only link to our own server (/api/*). No keys here: the server holds them.
//
//   startGeneration(sessionId, file)  sends the PDF to /api/generate and tracks its progress
//   getJob(sessionId) / subscribe(fn) let the Preparing screen read that progress
//   explain(questionId, question)     asks /api/explain about an answered question

import { markFailed } from './sessions.js';

// Vercel refuses bodies over 4.5 MB; the local dev server allows 20 MB (see web/server/generate.js).
export const MAX_UPLOAD_MB = import.meta.env.DEV ? 20 : 4;

const MESSAGES = {
  offline: 'ما قدرنا نتصل. تأكد إن النت شغّال وحاول مرة ثانية.',
  tooLarge: 'الملف كبير مرّة. اختر ملف أصغر.',
  failed: 'ما قدرنا نطلّع أسئلة من الملف هذا. حاول مرة ثانية.',
  explain: 'ما قدرنا نجهّز الشرح الحين. حاول مرة ثانية.',
};

// ---- Generation job (one at a time, kept in memory; lost on reload) ---------------------------
// job = { sessionId, file, stage, startedAt, stageAt, message, result }
//   stage: 'uploading' | 'reading' | 'saving' | 'done' | 'failed'
let job = null;
const listeners = new Set();

const emit = () => listeners.forEach((fn) => fn(job));
const setJob = (change) => {
  job = { ...job, ...change, stageAt: change.stage && change.stage !== job.stage ? Date.now() : job.stageAt };
  emit();
};

export const getJob = (sessionId) => (job?.sessionId === sessionId ? job : null);
// The PDF the student picked, while it is still in memory (used by «حاول مرة ثانية»).
export const getPendingFile = (sessionId) => getJob(sessionId)?.file ?? null;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function startGeneration(sessionId, file) {
  job = { sessionId, file, stage: 'uploading', startedAt: Date.now(), stageAt: Date.now(), message: null, result: null };
  emit();
  run(sessionId, file);
}

async function run(sessionId, file) {
  const mine = () => job?.sessionId === sessionId;
  const failWith = async (message, { serverMarked = false } = {}) => {
    if (!serverMarked) {
      try {
        await markFailed(sessionId, message);
      } catch {
        /* the screen still shows the message */
      }
    }
    if (mine()) setJob({ stage: 'failed', message });
  };

  let res;
  try {
    res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf', 'X-Session-Id': sessionId },
      body: file,
    });
  } catch {
    return failWith(MESSAGES.offline);
  }

  if (!res.ok || !res.body) {
    let body = null;
    try {
      body = await res.json();
    } catch {
      /* the host answered, not our code (e.g. 413 from Vercel) */
    }
    const message = body?.message ?? (res.status === 413 ? MESSAGES.tooLarge : MESSAGES.failed);
    // Our server marks the session failed itself for the errors it detects (it sends a message).
    return failWith(message, { serverMarked: !!body?.message && res.status !== 500 });
  }

  // Read the JSON-lines progress stream.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finished = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (!mine()) return; // the student started over: ignore this old stream
        if (msg.stage === 'reading' || msg.stage === 'saving') setJob({ stage: msg.stage });
        if (msg.stage === 'done') {
          finished = true;
          setJob({ stage: 'done', result: msg });
        }
        if (msg.stage === 'failed') {
          finished = true;
          return failWith(msg.message ?? MESSAGES.failed, { serverMarked: true });
        }
      }
    }
  } catch {
    if (!finished) return failWith(MESSAGES.offline);
  }
  // Stream closed without a final line: the server may still finish; Preparing keeps polling.
  if (!finished && mine()) setJob({ stage: 'lost' });
}

// ---- Explain ---------------------------------------------------------------------------------

export async function explain(questionId, question = '') {
  let res;
  try {
    res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, question }),
    });
  } catch {
    throw new Error(MESSAGES.offline);
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* not JSON */
  }
  if (!res.ok || !body?.answer) throw new Error(body?.message ?? MESSAGES.explain);
  return body.answer;
}
