import { useCallback, useEffect, useRef, useState } from 'react';
import Screen, { AppHeader, PageHeading } from '../components/Screen.jsx';
import UploadBox, { isPdf } from '../components/UploadBox.jsx';
import Button from '../components/Button.jsx';
import { createSession, getActiveSession } from '../lib/sessions.js';
import { supabaseProblems } from '../lib/supabase.js';
import { MAX_UPLOAD_MB, startGeneration } from '../lib/api.js';
import { fmtNumber } from '../lib/format.js';

// What the user reads when something goes wrong. Never the raw error.
const MESSAGES = {
  offline: 'ما قدرنا نتصل. تأكد إن النت شغّال وحاول مرة ثانية.',
  'not-configured': 'التطبيق مو جاهز الحين. جرّب بعد شوي.',
  load: 'صار خلل وما قدرنا نتأكد من ملفك السابق. حاول مرة ثانية.',
  create: 'صار خلل وما قدرنا نبدأ بهذا الملف. حاول مرة ثانية.',
  notPdf: 'الملف هذا مو PDF. اختر ملف السلايدات بصيغة PDF.',
  tooLarge: `الملف كبير مرّة. اختر ملف أصغر من ${fmtNumber(MAX_UPLOAD_MB)} ميجا.`,
};
const messageFor = (err, step) =>
  MESSAGES[err?.code] && err.code !== 'failed' ? MESSAGES[err.code] : MESSAGES[step];
// Dev only: the exact .env.local problem, so the developer knows what to fix.
const devHint = (err) =>
  import.meta.env.DEV && err?.code === 'not-configured' && supabaseProblems.length
    ? `[dev] web/.env.local: ${supabaseProblems.join(' ')}`
    : null;

// Screen 1: Upload. The box opens the phone's PDF picker; the attached file stays in state and its
// name shows in the box. «التالي» is disabled until a PDF is attached. Tapping it creates the
// session in Supabase, sends the PDF to /api/generate and moves to Preparing.
// Cancelling the picker changes nothing (U1).
//
// States:
//   checking -> looking for this browser's earlier session (restore)
//   idle     -> no active session: the ready-to-upload screen (the "empty" state)
//   creating -> saving the new session (replaces and deletes any earlier one)
//   error    -> a plain Arabic message + «حاول مرة ثانية»
export default function Upload({ onSession, onStarted }) {
  const inputRef = useRef(null);
  const openPicker = () => inputRef.current?.click();
  const [state, setState] = useState({ step: 'checking' });
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);

  const restore = useCallback(async (isCancelled = () => false) => {
    setState({ step: 'checking' });
    try {
      const session = await getActiveSession();
      if (isCancelled()) return;
      setState({ step: 'idle' });
      if (session) onSession(session);
    } catch (err) {
      if (!isCancelled()) setState({ step: 'error', retry: 'load', message: messageFor(err, 'load'), hint: devHint(err) });
    }
  }, [onSession]);

  useEffect(() => {
    let cancelled = false;
    restore(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [restore]);

  const start = async () => {
    if (!file) return;
    setState({ step: 'creating' });
    try {
      const session = await createSession(file.name);
      startGeneration(session.id, file);
      setState({ step: 'idle' });
      onStarted(session);
    } catch (err) {
      setState({ step: 'error', retry: 'create', message: messageFor(err, 'create'), hint: devHint(err) });
    }
  };

  // A file dropped anywhere outside the box would make the browser open or
  // download it and leave the app. Block that default on the whole window.
  useEffect(() => {
    const block = (e) => e.preventDefault();
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', block);
    };
  }, []);

  const busy = state.step === 'checking' || state.step === 'creating';
  // A failed restore must not block attaching a new file: «التالي» simply tries again.
  const boxDisabled = busy;

  // Attach (or replace) the file. Nothing is sent until «التالي».
  const onFile = (picked) => {
    if (boxDisabled) return;
    if (!isPdf(picked)) {
      setFileError(MESSAGES.notPdf);
      return;
    }
    if (picked.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setFileError(MESSAGES.tooLarge);
      return;
    }
    setFileError(null);
    setFile(picked);
    if (state.step === 'error') setState({ step: 'idle' });
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onFile(file);
  };

  // One primary button per screen (DESIGN.md):
  //   no file  -> bottom primary «اختر ملف الفصل» opens the picker
  //   file     -> bottom stack: primary «التالي» (create session + /api/generate), then secondary «اختر ملف ثاني»
  let action;
  if (file) {
    action = (
      <>
        {state.step === 'creating' ? (
          <Button disabled aria-busy="true">لحظة…</Button>
        ) : (
          <Button onClick={start} disabled={busy}>{state.step === 'error' ? 'حاول مرة ثانية' : 'التالي'}</Button>
        )}
        <Button variant="secondary" onClick={openPicker} disabled={busy}>
          اختر ملف ثاني
        </Button>
      </>
    );
  } else if (state.step === 'error' && state.retry === 'load') {
    action = <Button onClick={() => restore()}>حاول مرة ثانية</Button>;
  } else {
    action = (
      <Button onClick={openPicker} disabled={busy} aria-busy={busy}>
        {state.step === 'checking' ? 'لحظة…' : 'اختر ملف الفصل'}
      </Button>
    );
  }

  return (
    <Screen header={<AppHeader />} actions={action}>
      <PageHeading
        title="ارفع سلايدات الفصل"
        helper="نطلع لك أسئلة منها، ونقول لك وش الأجزاء اللي تحتاج ترجع لها."
      />
      {(state.step === 'error' || fileError) && (
        <p role="alert" className="t-body">
          {state.step === 'error' ? state.message : fileError}
        </p>
      )}
      {state.step === 'error' && state.hint && (
        <p className="t-label c-stone" dir="ltr">{state.hint}</p>
      )}
      <p role="status" className="visually-hidden">
        {state.step === 'checking' && 'نتأكد من ملفك السابق'}
        {state.step === 'creating' && 'نحفظ الملف'}
        {state.step === 'idle' && file && `اخترت الملف ${file.name}`}
      </p>
      <UploadBox onClick={openPicker} onFile={onFile} file={file} disabled={boxDisabled} />
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />
    </Screen>
  );
}
