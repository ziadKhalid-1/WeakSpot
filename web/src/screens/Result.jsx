import { useEffect, useMemo, useState } from 'react';
import Screen, { PageHeading } from '../components/Screen.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import IconButton from '../components/IconButton.jsx';
import { SlideBadges } from '../components/Badge.jsx';
import { realDeps } from '../lib/deps.js';
import { useScreenSession, loadMessage } from '../lib/useScreenSession.js';
import { fmtCount, fmtNumber } from '../lib/format.js';
import { PARTS } from './Ready.jsx';

const WEAK_TITLE = {
  one: 'جزء واحد تحتاج ترجع له',
  two: 'جزأين تحتاج ترجع لهم',
  few: '{n} أجزاء تحتاج ترجع لها',
  many: '{n} جزء تحتاج ترجع لها',
  other: '{n} جزء تحتاج ترجع لها',
};

// Weak = at least one wrong answer (001_init.sql). Weakest first: most wrong answers, then the
// highest share wrong, then lecture order.
export function scoreParts(parts, questions) {
  const scored = parts
    .map((part) => {
      const qs = questions.filter((q) => q.partId === part.id);
      return {
        ...part,
        total: qs.length,
        wrong: qs.filter((q) => q.isCorrect === false).length,
        right: qs.filter((q) => q.isCorrect === true).length,
      };
    })
    .filter((p) => p.total > 0);
  return {
    weak: scored
      .filter((p) => p.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong || b.wrong / b.total - a.wrong / a.total || a.position - b.position),
    known: scored.filter((p) => p.wrong === 0),
    right: questions.filter((q) => q.isCorrect === true).length,
    total: questions.length,
    partCount: scored.length,
  };
}

// Screen 5: Result. Real parts + is_correct from Supabase. Weak parts first with the slides to
// review. ✕ and «ابدأ فصل جديد» delete the session (its parts and questions go with it).
export default function Result({ deps = realDeps }) {
  const [state, reload] = useScreenSession(deps, { allow: ['done'] });
  const session = state.session;
  const [data, setData] = useState(null); // { parts, questions } | { error }
  const [open, setOpen] = useState(null); // known parts list; null = default
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session?.id) return undefined;
    let cancelled = false;
    Promise.all([deps.loadParts(session.id), deps.loadQuestions(session.id)])
      .then(([parts, questions]) => !cancelled && setData({ parts, questions }))
      .catch((err) => !cancelled && setData({ error: loadMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [deps, session?.id]);

  const result = useMemo(() => (data?.parts ? scoreParts(data.parts, data.questions) : null), [data]);

  const startOver = async () => {
    setBusy(true);
    try {
      await deps.deleteActiveSession();
    } catch {
      /* Upload replaces the old session anyway */
    }
    deps.go('/');
  };

  const header = (
    <div className="result-header">
      <p className="t-label c-stone">نتيجتك</p>
      <IconButton icon="close" label="إغلاق النتيجة" onClick={startOver} disabled={busy} />
    </div>
  );

  const failure = state.step === 'error' ? state.message : data?.error;
  if (failure) {
    const retry = () => {
      setData(null);
      reload();
    };
    return (
      <Screen header={header} actions={<Button onClick={retry}>حاول مرة ثانية</Button>}>
        <p role="alert" className="t-body">{failure}</p>
      </Screen>
    );
  }

  const actions = <Button onClick={startOver} disabled={busy}>ابدأ فصل جديد</Button>;
  if (!result) {
    return (
      <Screen header={header} actions={actions}>
        <p role="status" className="visually-hidden">نحسب نتيجتك</p>
      </Screen>
    );
  }

  const { weak, known, right, total, partCount } = result;
  const knownOpen = open ?? weak.length === 0; // nothing weak: show what they know
  const title = weak.length ? fmtCount(weak.length, WEAK_TITLE) : 'ما عندك أجزاء ضعيفة في هالفصل';
  const helper = `من أصل ${fmtCount(partCount, PARTS)} في الفصل، وجاوبت ${fmtNumber(right)} من ${fmtNumber(total)} صح.`;

  return (
    <Screen header={header} actions={actions}>
      <PageHeading title={title} helper={helper} />

      {weak.length > 0 && (
        <ul className="result-cards">
          {weak.map((part, i) => (
            <Card as="li" key={part.id} className="weak-card" style={{ animationDelay: `${120 + 80 * i}ms` }}>
              <div className="weak-card__row">
                <h2 className="t-action"><bdi>{part.title}</bdi></h2>
                <span className="weak-card__score t-label c-stone">
                  {fmtNumber(part.wrong)} من {fmtNumber(part.total)} غلط
                </span>
              </div>
              <SlideBadges slides={part.slides} />
            </Card>
          ))}
        </ul>
      )}

      {known.length > 0 && (
        <div className="known">
          <button
            type="button"
            className="known__toggle"
            aria-expanded={knownOpen}
            aria-controls="known-list"
            onClick={() => setOpen(!knownOpen)}
          >
            <span className="t-body">أجزاء تعرفها ({fmtNumber(known.length)})</span>
            <Icon name={knownOpen ? 'chevronUp' : 'chevronDown'} size={20} />
          </button>
          {knownOpen && (
            <ul id="known-list" className="known__list">
              {known.map((part) => (
                <li key={part.id} className="known__row">
                  <span className="t-body"><bdi>{part.title}</bdi></span>
                  <span className="t-label c-stone">
                    {fmtNumber(part.right)} من {fmtNumber(part.total)} صح
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Screen>
  );
}
