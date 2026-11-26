// POST /api/generate: PDF in, parts + questions saved to Supabase.
//
// Request:  body = the PDF bytes (Content-Type: application/pdf), header X-Session-Id: <uuid>
//           or JSON { sessionId, fileBase64 }.
// Response: a stream of JSON lines (application/x-ndjson) so the Preparing screen can show
//           real progress:  {"stage":"reading"} ... {"stage":"saving"} ... {"stage":"done",...}
//           or {"stage":"failed","message":"<Arabic>"}. Errors before the stream starts come back
//           as plain JSON { error, message } with a 4xx/5xx status.
//
// On any failure the session is marked status 'failed' with a clear Arabic error_message.

import { admin, isMissingExplanation, supabaseConfigProblem } from './supabaseAdmin.js';
import { AiError, askJson, getProvider } from './ai.js';
import { HttpError, UUID, arNumber, readRaw, sendJson } from './http.js';

// Vercel refuses request bodies over 4.5 MB before our code runs. Locally we allow more.
const MAX_BYTES = process.env.VERCEL ? 4.4 * 1024 * 1024 : 20 * 1024 * 1024;
const QUESTION_COUNT = Math.min(Math.max(Number(process.env.QUESTION_COUNT) || 10, 4), 20);

const MESSAGES = {
  not_configured: 'التطبيق مو جاهز الحين. جرّب بعد شوي.',
  not_pdf: 'الملف هذا مو PDF. اختر ملف السلايدات بصيغة PDF.',
  too_large: `الملف كبير مرّة. اختر ملف أصغر من ${arNumber(Math.floor(MAX_BYTES / 1024 / 1024))} ميجا.`,
  empty: 'الملف فاضي. اختر ملف السلايدات مرة ثانية.',
  no_content: 'ما لقينا كلام نقدر نطلّع منه أسئلة. تأكد إن السلايدات فيها نص مو صور بس.',
  ai: 'ما قدرنا نطلّع أسئلة من الملف هذا. حاول مرة ثانية.',
  timeout: 'تأخر تجهيز الأسئلة أكثر من اللازم. حاول مرة ثانية، أو جرّب ملف أصغر.',
  save: 'صار خلل وإحنا نحفظ الأسئلة. حاول مرة ثانية.',
};

const SYSTEM = `You are an expert university teaching assistant who writes revision quizzes in Arabic
for Saudi engineering students. You read lecture slides (a PDF where every page is one slide,
numbered from 1) and you return strict JSON only.`;

const prompt = (count) => `Read every page of the attached lecture PDF. Page N = slide N.

1. Split the lecture into 3 to 8 logical PARTS. Each part is one contiguous slide range that covers
   one topic. Skip title / agenda / references slides when choosing ranges. Part titles are short
   Arabic phrases; keep standard English technical terms in parentheses, e.g. "الذاكرة المخبئية (Cache)".
2. Write exactly ${count} multiple-choice QUESTIONS that test understanding (not trivia, not slide
   titles). Spread them over the parts; every part gets at least one question. Each question:
   - is answerable from the slides alone and points to the one slide it comes from (source_slide);
   - has exactly 4 options, one clearly correct, three plausible distractors built from common
     student mistakes; no "all of the above" / "none of the above";
   - is written in clear Modern Standard Arabic with a light friendly tone; keep English technical
     terms, formulas and code as they appear on the slide.
   - has an Arabic "explanation" (2 to 4 sentences): why the correct option is correct, and why
     each of the other three options is wrong. Refer to options by their text, never by letter or
     position (options will be shuffled).
3. If the PDF has no readable lecture content (blank, only images with no text, not slides),
   return {"status":"no_content"}.

Return JSON exactly in this shape:
{
  "status": "ok",
  "slide_count": <total number of pages>,
  "parts": [ { "title": "...", "slide_from": 2, "slide_to": 5 } ],
  "questions": [
    { "part": <0-based index into parts>, "source_slide": 3, "text": "...",
      "options": ["...", "...", "...", "..."], "correct_index": 0, "explanation": "..." }
  ]
}`;

export default async function generateHandler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });

  // 1) Config. Logged in detail for the developer, generic Arabic for the student.
  const configProblem = supabaseConfigProblem() || (getProvider() ? null : 'no AI key in env');
  if (configProblem) {
    console.error(`[api/generate] not configured: ${configProblem}`);
    return sendJson(res, 500, { error: 'not_configured', message: withDetail(MESSAGES.not_configured, configProblem) });
  }

  // 2) Body + session id.
  let sessionId = String(req.headers['x-session-id'] ?? new URL(req.url, 'http://x').searchParams.get('sessionId') ?? '');
  let pdf;
  try {
    const raw = await readRaw(req, MAX_BYTES * 1.4); // base64 JSON is ~33% bigger
    if (String(req.headers['content-type'] ?? '').includes('application/json')) {
      const body = JSON.parse(raw.toString('utf8'));
      sessionId = body.sessionId ?? sessionId;
      pdf = Buffer.from(String(body.fileBase64 ?? '').replace(/^data:[^,]*,/, ''), 'base64');
    } else {
      pdf = raw;
    }
  } catch (e) {
    console.error('[api/generate] could not read request body', e);
    const code = e instanceof HttpError ? e.code : 'bad_request';
    if (UUID.test(sessionId) && code === 'too_large') await markFailed(sessionId, MESSAGES.too_large);
    return sendJson(res, code === 'too_large' ? 413 : 400, { error: code, message: MESSAGES[code] ?? MESSAGES.ai });
  }
  if (!UUID.test(sessionId)) return sendJson(res, 400, { error: 'bad_session' });

  let db;
  try {
    db = admin();
  } catch (e) {
    console.error('[api/generate] could not create Supabase client', e);
    return sendJson(res, 500, { error: 'not_configured', message: withDetail(MESSAGES.not_configured, describeError(e)) });
  }
  const { data: session, error: sessionError } = await db
    .from('sessions').select('id, status').eq('id', sessionId).maybeSingle();
  if (sessionError) {
    console.error('[api/generate] session lookup failed', sessionError);
    return sendJson(res, 500, { error: 'db', message: withDetail(MESSAGES.save, describeError(sessionError)) });
  }
  if (!session) return sendJson(res, 404, { error: 'no_session' });
  if (session.status !== 'preparing') return sendJson(res, 409, { error: 'not_preparing', status: session.status });

  const early = !pdf?.length ? 'empty' : pdf.length > MAX_BYTES ? 'too_large' : !isPdf(pdf) ? 'not_pdf' : null;
  if (early) {
    await markFailed(sessionId, MESSAGES[early]);
    return sendJson(res, early === 'too_large' ? 413 : 400, { error: early, message: MESSAGES[early] });
  }

  // 3) Stream progress from here on.
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  const send = (obj) => {
    if (!res.writableEnded) res.write(`${JSON.stringify(obj)}\n`);
  };
  const keepAlive = setInterval(() => send({ stage: 'ping' }), 10_000);

  try {
    send({ stage: 'reading' });
    const raw = await askJson({ system: SYSTEM, prompt: prompt(QUESTION_COUNT), pdf });
    const quiz = normalize(raw, countPages(pdf));

    send({ stage: 'saving' });
    await save(db, sessionId, quiz);
    send({ stage: 'done', questionCount: quiz.questions.length, partCount: quiz.parts.length, slideCount: quiz.slideCount });
  } catch (e) {
    const code = e instanceof AiError ? (e.code === 'timeout' ? 'timeout' : 'ai') : e?.code in MESSAGES ? e.code : 'save';
    console.error(`[api/generate] failed (${code})`, e, e?.details ?? '');
    // The Arabic reason, then the exact technical cause on its own line (shown under it on screen).
    const message = withDetail(MESSAGES[code] ?? MESSAGES.ai, describeError(e));
    await cleanUp(db, sessionId);
    await markFailed(sessionId, message);
    send({ stage: 'failed', error: code, message });
  } finally {
    clearInterval(keepAlive);
    res.end();
  }
}

// ---- Helpers ---------------------------------------------------------------------------------

const isPdf = (buf) => buf.subarray(0, 1024).toString('latin1').includes('%PDF-');

// Rough page count from the raw bytes (misses pages inside compressed object streams).
function countPages(buf) {
  const matches = buf.toString('latin1').match(/\/Type\s*\/Page(?![a-z])/g);
  return matches ? matches.length : 0;
}

const fail = (code) => Object.assign(new Error(code), { code });
const int = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : NaN);
const clean = (s) => (typeof s === 'string' ? s.trim().replace(/\s+/g, ' ') : '');
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// Validate the AI output and turn it into rows that pass every CHECK in 001_init.sql.
export function normalize(raw, pageHint) {
  if (raw?.status === 'no_content') throw fail('no_content');

  const modelCount = int(raw?.slide_count);
  const slideCount = modelCount >= 1 ? modelCount : pageHint >= 1 ? pageHint : NaN;
  const maxSlide = Math.max(modelCount || 0, pageHint || 0) || 10_000;
  const clamp = (n) => Math.min(Math.max(n, 1), maxSlide);

  const parts = (Array.isArray(raw?.parts) ? raw.parts : []).map((p) => {
    const a = clamp(int(p?.slide_from) || 1);
    const b = clamp(int(p?.slide_to) || a);
    return { title: clean(p?.title), from: Math.min(a, b), to: Math.max(a, b) };
  });

  const questions = [];
  for (const q of Array.isArray(raw?.questions) ? raw.questions : []) {
    const options = Array.isArray(q?.options) ? q.options.map(clean) : [];
    const correct = int(q?.correct_index);
    const partIndex = int(q?.part);
    const text = clean(q?.text);
    if (!text || options.length !== 4 || options.some((o) => !o) || new Set(options).size !== 4) continue;
    if (!(correct >= 0 && correct <= 3) || !parts[partIndex]?.title) continue;

    // Shuffle so the right answer is not always in the same place.
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const part = parts[partIndex];
    const slide = int(q?.source_slide);
    questions.push({
      partIndex,
      sourceSlide: slide >= 1 ? clamp(slide) : part.from,
      text,
      options: order.map((i) => options[i]),
      correctIndex: order.indexOf(correct),
      explanation: typeof q?.explanation === 'string' ? q.explanation.trim() || null : null,
    });
  }
  if (!questions.length) throw fail(raw?.questions?.length ? 'ai' : 'no_content');

  // Keep only parts that got at least one question (a part with no question can't be scored).
  const used = [...new Set(questions.map((q) => q.partIndex))].sort((a, b) => a - b);
  const newIndex = new Map(used.map((old, i) => [old, i]));
  return {
    slideCount: Number.isFinite(slideCount) ? slideCount : null,
    parts: used.map((old) => ({ title: parts[old].title, slides: range(parts[old].from, parts[old].to) })),
    questions: questions.map((q) => ({ ...q, partIndex: newIndex.get(q.partIndex) })),
  };
}

async function save(db, sessionId, quiz) {
  await cleanUp(db, sessionId); // idempotent: never two sets of parts for one session

  const { data: partRows, error: partError } = await db
    .from('parts')
    .insert(quiz.parts.map((p, position) => ({ session_id: sessionId, position, title: p.title, slides: p.slides })))
    .select('id, position');
  if (partError) throw Object.assign(fail('save'), { details: partError });
  const partId = new Map(partRows.map((r) => [r.position, r.id]));

  const rows = quiz.questions.map((q, position) => ({
    session_id: sessionId,
    part_id: partId.get(q.partIndex),
    position,
    source_slide: q.sourceSlide,
    text: q.text,
    options: q.options,
    correct_index: q.correctIndex,
    explanation: q.explanation,
  }));
  let { error } = await db.from('questions').insert(rows);
  if (isMissingExplanation(error)) {
    // 002_add_explanation.sql not run yet: save without explanations, the quiz still works.
    console.warn('[api/generate] questions.explanation column missing; run supabase/migrations/002_add_explanation.sql');
    ({ error } = await db.from('questions').insert(rows.map(({ explanation, ...r }) => r)));
  }
  if (error) throw Object.assign(fail('save'), { details: error });

  const update = { status: 'ready', error_message: null };
  if (quiz.slideCount) update.slide_count = quiz.slideCount;
  const { error: sessionError } = await db.from('sessions').update(update).eq('id', sessionId).eq('status', 'preparing');
  if (sessionError) throw Object.assign(fail('save'), { details: sessionError });
}

async function cleanUp(db, sessionId) {
  const { error } = await db.from('parts').delete().eq('session_id', sessionId); // questions cascade
  if (error) console.error('[api/generate] clean-up failed', error);
}

// The exact cause of a failure as one line of text, e.g.
//   "gemini HTTP 404: models/gemini-x is not found" or "save: 42501 permission denied for table parts".
// Anything that looks like a key is masked, because this text is saved and shown to the user.
function describeError(e) {
  if (!e) return '';
  const parts = [e.message || String(e)];
  const d = e.details;
  if (d && typeof d === 'object') parts.push([d.code, d.message, d.details, d.hint].filter(Boolean).join(' '));
  else if (d && typeof d !== 'object') parts.push(String(d));
  return parts
    .filter(Boolean)
    .join(' | ')
    .replace(/(AIza[0-9A-Za-z_-]{10,}|sb_secret_[0-9A-Za-z_-]+|sk-[0-9A-Za-z_-]{10,}|eyJ[0-9A-Za-z._-]{20,})/g, '[hidden]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[hidden]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

// Arabic message + "\n" + technical detail. The frontend shows the first line as the reason and
// the rest underneath, left-to-right.
const withDetail = (message, detail) => (detail ? `${message}\n${detail}` : message);

async function markFailed(sessionId, message) {
  try {
    const { error } = await admin()
      .from('sessions')
      .update({ status: 'failed', error_message: message })
      .eq('id', sessionId)
      .eq('status', 'preparing');
    if (error) console.error('[api/generate] could not mark session failed', error);
  } catch (e) {
    console.error('[api/generate] could not mark session failed', e?.message);
  }
}
