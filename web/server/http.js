// http.js: tiny helpers shared by the API handlers. Works with plain Node req/res, so the same
// handler runs in the Vite dev middleware and as a Vercel function.

export class HttpError extends Error {
  constructor(status, code, message) {
    super(code);
    this.status = status;
    this.code = code;
    this.userMessage = message; // Arabic, safe to show
  }
}

// Reads the raw request body, refusing anything bigger than `limit` bytes.
export function readRaw(req, limit) {
  // Some hosts parse the body before we see it.
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  if (typeof req.body === 'string') return Promise.resolve(Buffer.from(req.body));
  if (req.body && typeof req.body === 'object') return Promise.resolve(Buffer.from(JSON.stringify(req.body)));

  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) tooLarge = true;
      else if (!tooLarge) chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) reject(new HttpError(413, 'too_large'));
      else resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

export async function readJson(req, limit = 64 * 1024) {
  const raw = await readRaw(req, limit);
  try {
    return JSON.parse(raw.toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, 'bad_json');
  }
}

export function sendJson(res, status, body) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Arabic-Indic digits for numbers inside server messages (same locale as web/src/lib/format.js).
const number = new Intl.NumberFormat('ar-SA-u-ca-gregory');
export const arNumber = (n) => number.format(n);
