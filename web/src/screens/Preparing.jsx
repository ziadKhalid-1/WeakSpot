import { useEffect, useState } from 'react';
import Screen, { AppHeader, PageHeading } from '../components/Screen.jsx';
import Button from '../components/Button.jsx';
import FileCard from '../components/FileCard.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { realDeps } from '../lib/deps.js';
import { useScreenSession } from '../lib/useScreenSession.js';

// After this long with no answer from the server, the session counts as failed.
const GIVE_UP_MS = 6 * 60 * 1000;
const POLL_MS = 3000;

const STAGE_TEXT = {
  uploading: 'نرفع الملف…',
  reading: 'نقرأ السلايدات ونكتب الأسئلة…',
  saving: 'نحفظ الأسئلة…',
  done: 'خلصنا!',
};
const TIMEOUT_MESSAGE = 'تأخر تجهيز الأسئلة أكثر من اللازم. حاول مرة ثانية، أو جرّب ملف أصغر.';

// Eases toward `to` and never reaches it: the bar keeps moving while the AI works.
const creep = (from, to, ms, tau) => from + (to - from) * (1 - Math.exp(-ms / tau));

function progressFor(job, session, now) {
  if (job?.stage === 'uploading') return creep(3, 10, now - job.stageAt, 3000);
  if (job?.stage === 'reading') return creep(12, 88, now - job.stageAt, 40000);
  if (job?.stage === 'saving') return creep(90, 97, now - job.stageAt, 2000);
  if (job?.stage === 'done') return 100;
  // No live request (the page was reloaded): estimate from when the session was created.
  const since = session?.createdAt ? now - new Date(session.createdAt).getTime() : 0;
  return creep(12, 88, Math.max(0, since), 40000);
}

// Screen 2: Preparing «نجهّز أسئلتك…». Shows the live progress of /api/generate. If the page was
// reloaded mid-way, it polls the session status instead. On failure: the Arabic reason + retry.
export default function Preparing({ deps = realDeps }) {
  const [state, reload, setState] = useScreenSession(deps, { allow: ['preparing', 'failed'], includeFailed: true });
  const session = state.session;
  const sessionId = session?.id;

  const [job, setJob] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Live job for this session (kept in memory by lib/api.js).
  useEffect(() => {
    if (!sessionId) return undefined;
    setJob(deps.getJob(sessionId));
    return deps.subscribe((j) => setJob(j?.sessionId === sessionId ? { ...j } : null));
  }, [deps, sessionId]);

  // Ticks the creeping progress bar.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(t);
  }, []);

  const failedMessage =
    job?.stage === 'failed' ? job.message : session?.status === 'failed' ? session.errorMessage : null;

  // Done: go to Ready (a short pause so the full bar is seen).
  useEffect(() => {
    if (job?.stage !== 'done') return undefined;
    const t = setTimeout(() => deps.go('/ready'), 400);
    return () => clearTimeout(t);
  }, [deps, job?.stage]);

  // No live request (reload, or the stream dropped): poll the database.
  const live = job && job.stage !== 'lost';
  useEffect(() => {
    if (!sessionId || live || session?.status !== 'preparing') return undefined;
    let stopped = false;
    const tick = async () => {
      try {
        const fresh = await deps.getActiveSession({ includeFailed: true });
        if (stopped) return;
        if (!fresh) return deps.go('/');
        if (fresh.status === 'ready' || fresh.status === 'quiz') return deps.go(`/${fresh.status}`);
        if (fresh.status === 'preparing' && Date.now() - new Date(fresh.createdAt).getTime() > GIVE_UP_MS) {
          await deps.markFailed(fresh.id, TIMEOUT_MESSAGE).catch(() => {});
          return setState({ step: 'ready', session: { ...fresh, status: 'failed', errorMessage: TIMEOUT_MESSAGE } });
        }
        if (fresh.status === 'failed') setState({ step: 'ready', session: fresh });
      } catch {
        /* keep polling; a short network blip should not fail the screen */
      }
    };
    const t = setInterval(tick, POLL_MS);
    tick();
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [deps, sessionId, live, session?.status, setState]);

  // «حاول مرة ثانية»: same file if it is still in memory, otherwise back to Upload.
  const pendingFile = sessionId ? deps.getPendingFile(sessionId) : null;
  const retry = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const fresh = await deps.createSession(pendingFile.name);
      deps.startGeneration(fresh.id, pendingFile);
      await reload();
    } catch {
      setActionError('صار خلل وما قدرنا نبدأ من جديد. حاول مرة ثانية.');
    } finally {
      setBusy(false);
    }
  };
  const chooseAnother = async () => {
    setBusy(true);
    try {
      await deps.deleteActiveSession();
    } catch {
      /* going back to Upload is still right; it replaces the old session */
    }
    deps.go('/');
  };

  // ---- Render --------------------------------------------------------------------------------
  if (state.step === 'error') {
    return (
      <Screen header={<AppHeader />} actions={<Button onClick={() => reload()}>حاول مرة ثانية</Button>}>
        <PageHeading title="نجهّز أسئلتك…" />
        <p role="alert" className="t-body">{state.message}</p>
      </Screen>
    );
  }

  if (failedMessage) {
    const actions = pendingFile ? (
      <>
        <Button onClick={retry} disabled={busy}>حاول مرة ثانية</Button>
        <Button variant="secondary" onClick={chooseAnother} disabled={busy}>اختر ملف ثاني</Button>
      </>
    ) : (
      <Button onClick={chooseAnother} disabled={busy}>اختر ملف ثاني</Button>
    );
    return (
      <Screen header={<AppHeader />} actions={actions}>
        <PageHeading title="ما قدرنا نجهّز أسئلتك" />
        <p role="alert" className="t-body">{actionError ?? failedMessage}</p>
        {session?.fileName && <FileCard fileName={session.fileName} />}
      </Screen>
    );
  }

  const value = state.step === 'loading' && !session ? 3 : progressFor(job, session, now);
  const stageText = STAGE_TEXT[job?.stage] ?? STAGE_TEXT.reading;
  return (
    <Screen header={<AppHeader />}>
      <PageHeading title="نجهّز أسئلتك…" helper="نقرأ السلايدات ونطلّع الأسئلة منها." />
      <FileCard fileName={session?.fileName ?? ''}>
        <ProgressBar value={value} label="تجهيز الأسئلة" />
        <p className="t-label c-stone" aria-live="polite">{stageText}</p>
      </FileCard>
    </Screen>
  );
}
