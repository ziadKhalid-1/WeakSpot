// store.js: the ONLY place the app saves or reads session data.
//
// Today it keeps everything in the browser's localStorage. Later a database/API can replace
// the bodies of these functions; the screens keep calling the same names and get the same
// shapes back. That is why every function is async even though localStorage is not.
//
// Shapes are exactly HANDOFF.md §4 and mock.json:
//   session   { id, fileName, slideCount, status, questionCount, currentIndex }
//             status: 'idle' | 'preparing' | 'ready' | 'quiz' | 'done'
//   parts     [{ id, title, slides: number[] }]
//   questions [{ id, partId, sourceSlide, text, options: string[4], correctIndex }]
//   answers   [{ questionId, selectedIndex, isCorrect }]
//   result    { totalParts, weakParts, knownParts }  (derived, never stored)

const KEY = 'bithra:session:v1';

const EMPTY = { session: null, parts: [], questions: [], answers: [] };

function read() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    return { ...EMPTY }; // corrupt JSON or storage blocked: start clean
  }
}

function write(data) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked (private mode): the app keeps working, it just won't survive a reload.
  }
  return data;
}

function update(change) {
  const data = read();
  if (!data.session) throw new Error('store: no session');
  return write({ ...data, ...change(data) });
}

const newId = () => `ses_${Date.now().toString(36)}`;

// ---- Reads ---------------------------------------------------------------------------------

// Everything saved, or { session: null, ... } when there is no session.
export async function load() {
  return read();
}

// Result screen data, derived from parts + questions + answers (mock.json "result" shape).
// Weak = at least one wrong answer (HANDOFF rule 8, provisional). Weakest first.
export async function getResult() {
  const { parts, questions, answers } = read();
  const byQuestion = new Map(answers.map((a) => [a.questionId, a]));

  const scored = parts.map((part) => {
    const qs = questions.filter((q) => q.partId === part.id);
    const correctCount = qs.filter((q) => byQuestion.get(q.id)?.isCorrect).length;
    return { part, questionCount: qs.length, correctCount, wrongCount: qs.length - correctCount };
  });

  return {
    totalParts: parts.length,
    weakParts: scored
      .filter((s) => s.wrongCount > 0)
      .sort((a, b) => b.wrongCount - a.wrongCount)
      .map(({ part, wrongCount, questionCount }) => ({
        partId: part.id, wrongCount, questionCount, slides: part.slides,
      })),
    knownParts: scored
      .filter((s) => s.wrongCount === 0 && s.questionCount > 0)
      .map(({ part, correctCount, questionCount }) => ({
        partId: part.id, correctCount, questionCount,
      })),
  };
}

// ---- Writes (one per action in HANDOFF.md §5) ----------------------------------------------

// Upload: choose file. Replaces any earlier session.
export async function startSession(fileName) {
  return write({
    ...EMPTY,
    session: {
      id: newId(),
      fileName,
      slideCount: 0,
      status: 'preparing',
      questionCount: 0,
      currentIndex: 0,
    },
  });
}

// Preparing: questions generated.
export async function saveGenerated({ parts, questions, slideCount }) {
  return update(({ session }) => ({
    parts,
    questions,
    answers: [],
    session: {
      ...session,
      slideCount: slideCount ?? session.slideCount,
      questionCount: questions.length,
      status: 'ready',
    },
  }));
}

// Ready: start quiz.
export async function startQuiz() {
  return update(({ session }) => ({
    answers: [],
    session: { ...session, status: 'quiz', currentIndex: 0 },
  }));
}

// Quiz: «التالي» / «شوف النتيجة». Saves the answer and moves on; on the last one, status → done.
export async function saveAnswer(questionId, selectedIndex) {
  return update(({ session, questions, answers }) => {
    const question = questions.find((q) => q.id === questionId);
    const answer = { questionId, selectedIndex, isCorrect: question?.correctIndex === selectedIndex };
    const nextAnswers = [...answers.filter((a) => a.questionId !== questionId), answer];
    const nextIndex = session.currentIndex + 1;
    const done = nextIndex >= session.questionCount;
    return {
      answers: nextAnswers,
      session: { ...session, currentIndex: done ? session.currentIndex : nextIndex, status: done ? 'done' : 'quiz' },
    };
  });
}

// Ready «اختر ملف ثاني», Quiz ✕, Result «ابدأ فصل جديد»: clear everything.
export async function clear() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
  return { ...EMPTY };
}

// Dev only: lets you drive the store from the browser console (window.bithraStore).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.bithraStore = { load, getResult, startSession, saveGenerated, startQuiz, saveAnswer, clear };
}
