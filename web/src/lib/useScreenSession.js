// useScreenSession: every screen after Upload starts the same way. It loads this browser's
// session; with none it goes back to Upload, and with another status it goes to that screen.
import { useCallback, useEffect, useState } from 'react';
import { routeFor } from './nav.js';

// What the user reads when loading fails. Never the raw error.
export const LOAD_MESSAGES = {
  offline: 'ما قدرنا نتصل. تأكد إن النت شغّال وحاول مرة ثانية.',
  'not-configured': 'التطبيق مو جاهز الحين. جرّب بعد شوي.',
  failed: 'صار خلل وما قدرنا نفتح جلستك. حاول مرة ثانية.',
};
export const loadMessage = (err) => LOAD_MESSAGES[err?.code] ?? LOAD_MESSAGES.failed;

export function useScreenSession(deps, { allow, includeFailed = false }) {
  const [state, setState] = useState({ step: 'loading', session: null });
  const allowKey = allow.join(',');

  const load = useCallback(async (isCancelled = () => false) => {
    setState((s) => ({ ...s, step: 'loading' }));
    try {
      const session = await deps.getActiveSession({ includeFailed });
      if (isCancelled()) return;
      if (!session) return deps.go('/');
      if (!allowKey.split(',').includes(session.status)) return deps.go(routeFor(session.status));
      setState({ step: 'ready', session });
    } catch (err) {
      if (!isCancelled()) setState({ step: 'error', session: null, message: loadMessage(err) });
    }
  }, [deps, includeFailed, allowKey]);

  useEffect(() => {
    let cancelled = false;
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  return [state, load, setState];
}
