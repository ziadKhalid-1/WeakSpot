// preview.js: DEV ONLY. Fake `deps` built from mock.json so every screen can be seen and
// screenshotted without Supabase or an AI key. Open  #/preview/<preparing|failed|ready|quiz|done>.
// Never imported in production builds (App.jsx loads it behind import.meta.env.DEV).
import mock from '../data/mock.json';
import { go } from '../lib/nav.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const EXPLANATION =
  'الإجابة الصحيحة هي «مكان واحد فقط»: في الربط المباشر كل بلوك له سطر واحد محدد يحسبه الـ index. ' +
  '«مكانين» وصف لـ 2-way set associative، و«أي مكان» وصف للربط الكامل (fully associative)، ' +
  'و«عدد يساوي عدد المجموعات» يخلط بين عدد المجموعات وعدد الأماكن داخل المجموعة.';

export function previewDeps(screen) {
  const answers = new Map(mock.answers.map((a) => [a.questionId, a]));
  const answeredAll = screen === 'done';
  const questions = mock.questions.map((q, position) => {
    const a = answeredAll ? answers.get(q.id) : null;
    return {
      id: q.id, partId: q.partId, position, sourceSlide: q.sourceSlide, text: q.text, options: q.options,
      selectedIndex: a ? a.selectedIndex : null, isCorrect: a ? a.isCorrect : null,
      _correct: q.correctIndex,
    };
  });
  const status = { preparing: 'preparing', failed: 'failed', ready: 'ready', quiz: 'quiz', done: 'done' }[screen];
  const session = {
    ...mock.session,
    status,
    questionCount: questions.length,
    createdAt: new Date(Date.now() - 8000).toISOString(),
    errorMessage: status === 'failed' ? 'ما لقينا كلام نقدر نطلّع منه أسئلة. تأكد إن السلايدات فيها نص مو صور بس.' : null,
  };

  return {
    go: (path) => go(path === '/' ? '/' : `/preview${path}`),
    getActiveSession: async () => session,
    createSession: async () => session,
    deleteActiveSession: async () => {},
    setStatus: async () => {},
    markFailed: async () => {},
    loadParts: async () => mock.parts.map((p, position) => ({ ...p, position })),
    loadQuestions: async () => questions.map(({ _correct, ...q }) => q),
    answerQuestion: async (id, selectedIndex) => {
      await wait(250);
      const q = questions.find((x) => x.id === id);
      Object.assign(q, { selectedIndex, isCorrect: q._correct === selectedIndex });
      const { _correct, ...out } = q;
      return out;
    },
    loadExplanation: async () => EXPLANATION,
    explain: async (id, question) => {
      await wait(600);
      return question
        ? 'لأن الخيار اللي اخترته يوصف نوع ثاني من الذاكرة المخبئية. في الربط المباشر ما فيه اختيار: الـ index يحدد السطر، فالبلوك له مكان واحد بس. ارجع لشريحة ٤ وشوف الرسمة.'
        : EXPLANATION;
    },
    getJob: () => null,
    subscribe: () => () => {},
    getPendingFile: () => (status === 'failed' ? new File([''], mock.session.fileName) : null),
    startGeneration: () => {},
  };
}
