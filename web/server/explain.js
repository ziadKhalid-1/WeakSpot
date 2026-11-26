// POST /api/explain: a short Arabic explanation for a question the student got wrong.
//
// Request:  JSON { questionId, question? }   question = the student's follow-up (Arabic), optional.
//           With no follow-up it explains why the chosen answer is wrong (used when the stored
//           explanation is missing).
// Response: JSON { answer } or { error, message }.
//
// The question, the options, the right answer and the student's choice are all read here with
// service_role, by id. The browser never sends or receives correct_index, and nothing is
// explained before the question has been answered.

import { admin, isMissingExplanation, supabaseConfigProblem } from './supabaseAdmin.js';
import { askText, getProvider } from './ai.js';
import { HttpError, UUID, readJson, sendJson } from './http.js';

const MAX_QUESTION = 500;
const LETTERS = ['أ', 'ب', 'ج', 'د'];

const MESSAGES = {
  not_configured: 'الشرح مو متاح الحين. جرّب بعد شوي.',
  bad_request: 'ما فهمنا الطلب. حاول مرة ثانية.',
  too_long: 'سؤالك طويل شوي. اختصره وحاول مرة ثانية.',
  not_found: 'ما لقينا هذا السؤال. يمكن انحذفت الجلسة.',
  not_answered: 'جاوب على السؤال أول، بعدين نشرح لك.',
  ai: 'ما قدرنا نجهّز الشرح الحين. حاول مرة ثانية.',
};

const SYSTEM = `You are a patient Arabic-speaking university teaching assistant for Saudi engineering
students. Answer in clear, friendly Modern Standard Arabic, 2 to 5 short sentences, no headings,
no markdown, no emoji. Keep English technical terms as they are. Stay on the topic of the given
question; if the student asks something unrelated, gently bring them back to it.`;

export default async function explainHandler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' });

  const configProblem = supabaseConfigProblem() || (getProvider() ? null : 'no AI key in env');
  if (configProblem) {
    console.error(`[api/explain] not configured: ${configProblem}`);
    return sendJson(res, 500, { error: 'not_configured', message: MESSAGES.not_configured });
  }

  let body;
  try {
    body = await readJson(req);
  } catch (e) {
    return sendJson(res, e instanceof HttpError ? e.status : 400, { error: 'bad_request', message: MESSAGES.bad_request });
  }
  const questionId = String(body?.questionId ?? '');
  const followUp = typeof body?.question === 'string' ? body.question.trim() : '';
  if (!UUID.test(questionId)) return sendJson(res, 400, { error: 'bad_request', message: MESSAGES.bad_request });
  if (followUp.length > MAX_QUESTION) return sendJson(res, 400, { error: 'too_long', message: MESSAGES.too_long });

  const db = admin();
  const base = 'text, options, correct_index, selected_index, source_slide, part_id';
  let { data: q, error } = await db.from('questions').select(`${base}, explanation`).eq('id', questionId).maybeSingle();
  if (isMissingExplanation(error)) ({ data: q, error } = await db.from('questions').select(base).eq('id', questionId).maybeSingle());
  if (error) {
    console.error('[api/explain] lookup failed', error);
    return sendJson(res, 500, { error: 'db', message: MESSAGES.ai });
  }
  if (!q) return sendJson(res, 404, { error: 'not_found', message: MESSAGES.not_found });
  if (q.selected_index === null) return sendJson(res, 403, { error: 'not_answered', message: MESSAGES.not_answered });

  const { data: part } = await db.from('parts').select('title').eq('id', q.part_id).maybeSingle();

  const context = [
    part?.title && `Topic (lecture part): ${part.title}`,
    q.source_slide && `Source slide: ${q.source_slide}`,
    `Question: ${q.text}`,
    ...q.options.map((o, i) => `Option ${LETTERS[i]}: ${o}`),
    `Correct answer: ${q.options[q.correct_index]}`,
    `Student chose: ${q.options[q.selected_index]}${q.selected_index === q.correct_index ? ' (correct)' : ' (wrong)'}`,
    q.explanation && `Reference explanation: ${q.explanation}`,
  ].filter(Boolean).join('\n');

  const task = followUp
    ? `The student asks this follow-up question (answer it directly, using the context above):\n"""${followUp}"""`
    : 'Explain to the student why their choice is wrong, what the correct answer is and why, and the key idea from the slide to remember.';

  try {
    const answer = await askText({ system: SYSTEM, prompt: `${context}\n\n${task}` });
    return sendJson(res, 200, { answer });
  } catch (e) {
    console.error('[api/explain] AI failed', e?.message, e?.details ?? '');
    return sendJson(res, 502, { error: 'ai', message: MESSAGES.ai });
  }
}
