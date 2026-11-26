import { useEffect, useState } from 'react';
import Screen, { AppHeader, PageHeading } from '../components/Screen.jsx';
import Button from '../components/Button.jsx';
import FileCard from '../components/FileCard.jsx';
import Icon from '../components/Icon.jsx';
import { realDeps } from '../lib/deps.js';
import { useScreenSession, loadMessage } from '../lib/useScreenSession.js';
import { fmtCount } from '../lib/format.js';

export const QUESTIONS = {
  zero: 'ولا سؤال', one: 'سؤال واحد', two: 'سؤالين', few: '{n} أسئلة', many: '{n} سؤال', other: '{n} سؤال',
};
export const PARTS = {
  zero: 'ولا جزء', one: 'جزء واحد', two: 'جزأين', few: '{n} أجزاء', many: '{n} جزء', other: '{n} جزء',
};

// Screen 3: Ready «أسئلتك جاهزة». Question and part counts from Supabase, then start the quiz.
export default function Ready({ deps = realDeps }) {
  const [state, reload] = useScreenSession(deps, { allow: ['ready'] });
  const session = state.session;
  const [partCount, setPartCount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session?.id) return;
    deps.loadParts(session.id).then((p) => setPartCount(p.length)).catch(() => setPartCount(null));
  }, [deps, session?.id]);

  // RLS lets answers be saved only while the session is 'quiz', so flip it before the first question.
  const startQuiz = async () => {
    setBusy(true);
    setError(null);
    try {
      await deps.setStatus(session.id, 'quiz');
      deps.go('/quiz');
    } catch (err) {
      setError(loadMessage(err));
      setBusy(false);
    }
  };
  const chooseAnother = async () => {
    setBusy(true);
    try {
      await deps.deleteActiveSession();
    } catch {
      /* Upload replaces the old session anyway */
    }
    deps.go('/');
  };

  if (state.step === 'error') {
    return (
      <Screen header={<AppHeader />} actions={<Button onClick={() => reload()}>حاول مرة ثانية</Button>}>
        <PageHeading title="أسئلتك جاهزة" />
        <p role="alert" className="t-body">{state.message}</p>
      </Screen>
    );
  }

  const loading = !session;
  const helper = loading
    ? ' '
    : partCount
      ? `${fmtCount(session.questionCount, QUESTIONS)} من الفصل، مقسّمة على ${fmtCount(partCount, PARTS)}.`
      : `${fmtCount(session.questionCount, QUESTIONS)} من الفصل.`;

  return (
    <Screen
      header={<AppHeader />}
      actions={
        <>
          <Button onClick={startQuiz} disabled={loading || busy} aria-busy={busy}>ابدأ الأسئلة</Button>
          <Button variant="secondary" onClick={chooseAnother} disabled={loading || busy}>اختر ملف ثاني</Button>
        </>
      }
    >
      <span className="success-mark">
        <Icon name="check" size={28} />
      </span>
      <PageHeading title="أسئلتك جاهزة" helper={helper} />
      {error && <p role="alert" className="t-body">{error}</p>}
      {session && <FileCard fileName={session.fileName} />}
    </Screen>
  );
}
