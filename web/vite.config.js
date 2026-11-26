import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('.', import.meta.url));

// Runs the same handlers as the Vercel functions in web/api/, inside `npm run dev`.
// Server code is loaded through Vite, so edits to web/server/*.js apply without a restart.
const API_ROUTES = {
  '/api/generate': '/server/generate.js',
  '/api/explain': '/server/explain.js',
};

function localApi() {
  return {
    name: 'bithra-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const route = API_ROUTES[(req.url ?? '').split('?')[0]];
        if (!route) return next();
        try {
          const { default: handler } = await server.ssrLoadModule(route);
          await handler(req, res);
        } catch (e) {
          server.ssrFixStacktrace(e);
          console.error('[local api]', e);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'server', message: 'صار خلل في الخادم. حاول مرة ثانية.' }));
          } else {
            res.end();
          }
        }
      });
    },
  };
}

// open: true -> the browser opens by itself after `npm run dev`.
export default defineConfig(({ mode }) => {
  // Server-only secrets (SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY...) from web/.env.local go to
  // process.env for the API handlers. Only VITE_* variables ever reach the browser bundle.
  const env = loadEnv(mode, root, '');
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  return {
    root,
    envDir: root, // always web/.env.local, even when vite is started from another folder
    plugins: [react(), localApi()],
    server: { open: true },
  };
});
