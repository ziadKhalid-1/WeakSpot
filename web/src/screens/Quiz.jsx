import { useCallback, useEffect, useRef, useState } from 'react';
import Screen from '../components/Screen.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import IconButton from '../components/IconButton.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { SlideBadges } from '../components/Badge.jsx';
import { realDeps } from '../lib/deps.js';
import { loadMessage } from '../lib/useScreenSession.js';
import { routeFor } from '../lib/nav.js';
import { fmtNumber } from '../lib/format.js';

const LETTERS = ['أ', 'ب', 'ج', 'د'];
const LEAVE_MS = 180; // DESIGN.md: old question fades out in 180ms
const SAVE_ERROR = 'ما قدرنا نحفظ إجابتك. حاول مرة ثانية.';
const FINISH_ERROR = 'ما قدرنا نفتح النتيجة. حاول مرة ثانية.';

// Screen 4: Quiz «سؤال ٣ من ١٠». Real questions from Supabase (never correct_index).
// Picking an option saves selected_index at once (Postgres computes is_correct) and shows
// right / wrong straight away. A wrong answer opens the explanation + «اسأل عن هذا السؤال».
export default function Quiz({ deps = realDeps }) {
  const [state, setState] = useState({ step: 'loading' });
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(null); // option index being saved
  const [error, setError] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [extras, setExtras] = useState({}); // per question: explanation + follow-up thread
  const askRef = useRef(null);

  const patchExtra = useCallback(
    (id, change) => setExtras((all) => ({ ...all, [id]: { ...all[id], ...change } })),
    [],
  );

  // ---- Load ---------------------------------------------------------------------------------
  const load = useCallback(async (isCancelled = () => false) => {
    setState({ step: 'loading' });
    try {
      const session = await deps.getActiveSession();
      if (isCancelled()) return;
      if (!session) return deps.go('/');
      if (session.status === 'ready') await deps.setStatus(session.id, 'quiz');
      else if (session.status !== 'quiz') return deps.go(routeFor(session.status));
      const questions = await deps.loadQuestions(session.id);
      if (isCancelled()) return;
      if (!questions.length) {
        setState({ step: 'error', message: 'ما لقينا أسئلة لهذا الملف. ارجع واختر ملف ثاني.' });
        return;
      }
      const firstOpen = questions.findIndex((q) => q.selectedIndex === null);
      setIndex(firstOpen === -1 ? questions.length - 1 : firstOpen);
      setState({ step: 'ready', session, questions });
    } catch (err) {
      if (!isCancelled()) setState({ step: 'error', message: loadMessage(err) });
    }
  }, [deps]);

  useEffect(() => {
    let cancelled = false;
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const questions = state.questions ?? [];
  const q = questions[index];
  const extra = (q && extras[q.id]) ?? {};
  const answered = q ? q.selectedIndex !== null : false;
  const isWrong = answered && q.isCorrect === false;
  const isLast = index === questions.length - 1;

  // ---- Explanation (only after a wrong answer) ------------------------------------------------
  const fetchExplanation = useCallback(async (question) => {
    patchExtra(question.id, { explaining: true, explainError: null });
    let text = await deps.loadExplanation(question.id);
    if (!text) {
      // Not stored (older session, or 002 migration not run): ask the AI for one.
      try {
        text = await deps.explain(question.id, '');
      } catch (e) {
        patchExtra(question.id, { explaining: false, explainError: e.message });
        return;
      }
    }
    patchExtra(question.id, { explaining: false, explanation: text });
  }, [deps, patchExtra]);

  // Restored mid-quiz on a question already answered wrong: load its explanation too.
  useEffect(() => {
    if (q && isWrong && extras[q.id] === undefined) fetchExplanation(q);
  }, [q, isWrong, extras, fetchExplanation]);

  // ---- Actions ------------------------------------------------------------------------------
  const pick = async (i) => {
    if (!q || answered || saving !== null) return;
    setSaving(i);
    setError(null);
    try {
      const saved = await deps.answerQuestion(q.id, i);
      setState((s) => ({ ...s, questions: s.questions.map((x) => (x.id === saved.id ? saved : x)) }));
      if (saved.isCorrect === false) fetchExplanation(saved);
    } catch {
      setError(SAVE_ERROR);
    } finally {
      setSaving(null);
    }
  };

  const next = async () => {
    if (!answered) return;
    setError(null);
    if (isLast) {
      setFinishing(true);
      try {
        await deps.setStatus(state.session.id, 'done');
        deps.go('/done');
      } catch {
        setError(FINISH_ERROR);
        setFinishing(false);
      }
      return;
    }
    setLeaving(true);
    setTimeout(() => {
      setIndex((n) => n + 1);
      setLeaving(false);
      window.scrollTo({ top: 0 });
    }, LEAVE_MS);
  };

  const close = async () => {
    try {
      await deps.deleteActiveSession();
    } catch {
      /* Upload replaces the old session anyway */
    }
    deps.go('/');
  };

  const ask = async (e) => {
    e.preventDefault();
    const text = (extra.draft ?? '').trim();
    if (!text || extra.sending) return;
    patchExtra(q.id, { sending: true, askError: null });
    try {
      const answer = await deps.explain(q.id, text);
      setExtras((all) => {
        const cur = all[q.id] ?? {};
        return { ...all, [q.id]: { ...cur, sending: false, draft: '', thread: [...(cur.thread ?? []), { q: text, a: answer }] } };
      });
      askRef.current?.focus();
    } catch (err) {
      patchExtra(q.id, { sending: false, askError: err.message });
    }
  };

  // ---- Render -------------------------------------------------------------------------------
  const header = (
    <div className="quiz-header">
      <div className="quiz-header__row">
        <p className="t-label c-stone">
          {q ? `سؤال ${fmtNumber(index + 1)} من ${fmtNumber(questions.length)}` : ' '}
        </p>
        <IconButton icon="close" label="إنهاء الأسئلة" onClick={close} />
      </div>
      <ProgressBar
        value={questions.length ? ((index + (answered ? 1 : 0)) / questions.length) * 100 : 0}
        label="تقدّم الأسئلة"
      />
    </div>
  );

  if (state.step !== 'ready') {
    return (
      <Screen
        header={header}
        actions={
          state.step === 'error'
            ? <Button onClick={() => load()}>حاول مرة ثانية</Button>
            : <Button disabled aria-busy="true">لحظة…</Button>
        }
      >
        {state.step === 'error' && <p role="alert" className="t-body">{state.message}</p>}
        <p role="status" className="visually-hidden">{state.step === 'loading' && 'نحمّل الأسئلة'}</p>
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      actions={
        <Button onClick={next} disabled={!answered || leaving || finishing} aria-busy={finishing}>
          {isLast ? 'شوف النتيجة' : 'التالي'}
        </Button>
      }
    >
      <div key={q.id} className={`question${leaving ? ' question--leaving' : ''}`}>
        <h1 id={`q-${q.id}`} className="t-title">{q.text}</h1>

        <div role="radiogroup" aria-labelledby={`q-${q.id}`} className="options">
          {q.options.map((option, i) => {
            const checked = answered ? q.selectedIndex === i : saving === i;
            const mark = answered && q.selectedIndex === i ? (q.isCorrect ? 'right' : 'wrong') : null;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-disabled={answered || saving !== null}
                className={`option${mark ? ` option--${mark}` : ''}`}
                onClick={() => pick(i)}
              >
                <span className="option__radio" aria-hidden="true" />
                <span className="option__text t-body">
                  <span className="visually-hidden">{LETTERS[i]}: </span>
                  {option}
                </span>
                {mark && (
                  <span className="option__mark t-label">
                    <Icon name={mark === 'right' ? 'check' : 'close'} size={20} />
                    {mark === 'right' ? 'صح' : 'غلط'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p role="status" className="visually-hidden">
          {saving !== null && 'نحفظ إجابتك'}
          {answered && (q.isCorrect ? 'إجابتك صح' : 'إجابتك غلط')}
        </p>
        {error && <p role="alert" className="t-body">{error}</p>}

        {isWrong && (
          <Card className="feedback">
            <div className="feedback__head">
              <h2 className="t-action">ليش إجابتك غلط؟</h2>
            </div>
            {extra.explaining && <p className="t-label c-stone" aria-live="polite">نجهّز لك الشرح…</p>}
            {extra.explanation && <p className="t-body">{extra.explanation}</p>}
            {extra.explainError && (
              <p className="t-body" role="alert">
                {extra.explainError}{' '}
                <button type="button" className="link-button t-body" onClick={() => fetchExplanation(q)}>
                  حاول مرة ثانية
                </button>
              </p>
            )}
            {q.sourceSlide && (
              <div className="feedback__head">
                <span className="t-label c-stone">ارجع لـ</span>
                <SlideBadges slides={[q.sourceSlide]} />
              </div>
            )}

            {(extra.thread ?? []).map((turn, n) => (
              <div key={n} className="feedback__reply">
                <p className="t-label c-stone" dir="auto">سؤالك: {turn.q}</p>
                <p className="t-body">{turn.a}</p>
              </div>
            ))}

            <form className="feedback__ask" onSubmit={ask}>
              <label htmlFor={`ask-${q.id}`} className="t-label c-stone">اسأل عن هذا السؤال</label>
              <div className="feedback__row">
                <input
                  id={`ask-${q.id}`}
                  ref={askRef}
                  className="input"
                  dir="auto"
                  maxLength={500}
                  placeholder="مثلًا: ليش مو الخيار اللي اخترته؟"
                  value={extra.draft ?? ''}
                  onChange={(e) => patchExtra(q.id, { draft: e.target.value })}
                  disabled={extra.sending}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  className="btn--inline"
                  disabled={extra.sending || !(extra.draft ?? '').trim()}
                  aria-busy={!!extra.sending}
                >
                  {extra.sending ? 'لحظة…' : 'اسأل'}
                </Button>
              </div>
              {extra.askError && <p role="alert" className="t-body">{extra.askError}</p>}
            </form>
          </Card>
        )}
      </div>
    </Screen>
  );
}
