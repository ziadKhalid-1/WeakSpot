// Vercel function: POST /api/generate. The logic lives in ../server/generate.js
// (the same file the Vite dev server runs locally). Timeout is set in ../vercel.json.
export { default } from '../server/generate.js';
