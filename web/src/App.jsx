import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import Upload from './screens/Upload.jsx';
import Preparing from './screens/Preparing.jsx';
import Ready from './screens/Ready.jsx';
import Quiz from './screens/Quiz.jsx';
import Result from './screens/Result.jsx';
import { go, routeFor } from './lib/nav.js';

// One route per session status (HANDOFF.md §4): idle · preparing · ready · quiz · done.
function useHashPath() {
  const read = () => window.location.hash.replace(/^#/, '') || '/';
  const [path, setPath] = useState(read);
  useEffect(() => {
    const onChange = () => setPath(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return path;
}

// Upload hands over the saved (restored) session; go to the screen for its status.
const openSession = (session) => go(routeFor(session.status));
const onStarted = () => go('/preparing');

const SCREENS = { '/preparing': Preparing, '/ready': Ready, '/quiz': Quiz, '/done': Result };

// DEV ONLY: #/preview/<screen> renders a screen with mock.json data (see src/dev/preview.js).
const Preview = import.meta.env.DEV
  ? lazy(async () => {
      const { previewDeps } = await import('./dev/preview.js');
      return {
        default: function PreviewScreen({ name }) {
          const deps = useMemo(() => previewDeps(name), [name]);
          const Screen = SCREENS[`/${name === 'failed' ? 'preparing' : name}`];
          return Screen ? <Screen deps={deps} /> : null;
        },
      };
    })
  : null;

export default function App() {
  const path = useHashPath();

  if (Preview && path.startsWith('/preview/')) {
    const name = path.slice('/preview/'.length);
    return (
      <Suspense fallback={null}>
        <Preview key={name} name={name} />
      </Suspense>
    );
  }

  const Screen = SCREENS[path];
  if (Screen) return <Screen key={path} />;
  return <Upload onSession={openSession} onStarted={onStarted} />;
}
