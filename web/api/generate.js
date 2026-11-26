// Vercel function: POST /api/generate. The logic lives in ../server/generate.js
// (the same file the Vite dev server runs locally). Timeout is set in ../vercel.json.
import generateHandler from '../server/generate.js';

export default async function handler(req, res) {
  try {
    return await generateHandler(req, res);
  } catch (e) {
    // Anything the handler did not catch: log the exact error for the Vercel logs.
    console.error('[api/generate] unhandled error', e);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'server' }));
    } else if (!res.writableEnded) {
      res.end();
    }
  }
}
