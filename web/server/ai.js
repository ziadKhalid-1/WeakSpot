// ai.js: one small client for three AI providers. Server only.
//
// Picks the provider from the environment, preferring Gemini:
//   GEMINI_API_KEY    -> Google Gemini   (model: GEMINI_MODEL,    default gemini-3.8-flash)
//   OPENAI_API_KEY    -> OpenAI          (model: OPENAI_MODEL,    default gpt-4.1)
//   ANTHROPIC_API_KEY -> Anthropic Claude (model: ANTHROPIC_MODEL, default claude-sonnet-5-5)
// AI_MODEL overrides the model for whichever provider is picked.
//
// All three read PDFs natively (text + page images, page by page), so no PDF parser is needed.

export class AiError extends Error {
  constructor(code, message, details) {
    super(message || code);
    this.code = code; // 'not_configured' | 'http' | 'timeout' | 'empty' | 'parse' | 'truncated' | 'blocked'
    this.details = details;
  }
}

const DEFAULTS = {
  gemini: 'gemini-3.8-flash',
  openai: 'gpt-4.1',
  anthropic: 'claude-sonnet-5-5',
};

export function getProvider() {
  const env = process.env;
  const pick = (name, key, model) => ({
    name,
    key: key.trim(),
    model: (env.AI_MODEL || model || DEFAULTS[name]).trim(),
  });
  if (env.GEMINI_API_KEY?.trim()) return pick('gemini', env.GEMINI_API_KEY, env.GEMINI_MODEL);
  if (env.OPENAI_API_KEY?.trim()) return pick('openai', env.OPENAI_API_KEY, env.OPENAI_MODEL);
  if (env.ANTHROPIC_API_KEY?.trim()) return pick('anthropic', env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL);
  return null;
}

// ---- Public API ------------------------------------------------------------------------------

// Returns a parsed JSON object. `pdf` is an optional Buffer.
export async function askJson({ system, prompt, pdf, timeoutMs = 240_000, maxTokens = 16_000 }) {
  const text = await ask({ system, prompt, pdf, json: true, timeoutMs, maxTokens });
  return parseJson(text);
}

// Returns plain text.
export async function askText({ system, prompt, timeoutMs = 60_000, maxTokens = 1_200 }) {
  const text = await ask({ system, prompt, json: false, timeoutMs, maxTokens });
  return text.trim();
}

// ---- Internals -------------------------------------------------------------------------------

async function ask(opts) {
  const provider = getProvider();
  if (!provider) throw new AiError('not_configured', 'No AI key: set GEMINI_API_KEY, OPENAI_API_KEY or ANTHROPIC_API_KEY');
  const call = { gemini: callGemini, openai: callOpenAI, anthropic: callAnthropic }[provider.name];
  const text = await call(provider, opts);
  if (!text || !text.trim()) throw new AiError('empty', `${provider.name} returned no text`);
  return text;
}

async function post(url, headers, body, timeoutMs, providerName) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    console.error(`[ai] ${providerName} request failed`, e);
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') throw new AiError('timeout', `${providerName} timed out`);
    throw new AiError('http', `${providerName} request failed: ${e?.message}`);
  }
  const raw = await res.text();
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    const message = data?.error?.message || raw.slice(0, 300);
    console.error(`[ai] ${providerName} HTTP ${res.status}`, raw.slice(0, 2000));
    throw new AiError('http', `${providerName} HTTP ${res.status}: ${message}`, { status: res.status });
  }
  return data;
}

async function callGemini(p, { system, prompt, pdf, json, timeoutMs, maxTokens }) {
  const parts = [];
  if (pdf) parts.push({ inline_data: { mime_type: 'application/pdf', data: pdf.toString('base64') } });
  parts.push({ text: prompt });
  const data = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(p.model)}:generateContent`,
    { 'x-goog-api-key': p.key },
    {
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: Math.max(maxTokens, json ? 32_000 : 2_048), // thinking tokens count here too
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    },
    timeoutMs,
    'gemini',
  );
  if (data?.promptFeedback?.blockReason) throw new AiError('blocked', `gemini blocked: ${data.promptFeedback.blockReason}`);
  const candidate = data?.candidates?.[0];
  if (candidate?.finishReason === 'MAX_TOKENS') throw new AiError('truncated', 'gemini hit max tokens');
  return (candidate?.content?.parts ?? []).filter((x) => !x.thought).map((x) => x.text ?? '').join('');
}

async function callOpenAI(p, { system, prompt, pdf, json, timeoutMs, maxTokens }) {
  const content = [];
  if (pdf) {
    content.push({
      type: 'input_file',
      filename: 'slides.pdf',
      file_data: `data:application/pdf;base64,${pdf.toString('base64')}`,
    });
  }
  content.push({ type: 'input_text', text: prompt });
  const data = await post(
    'https://api.openai.com/v1/responses',
    { Authorization: `Bearer ${p.key}` },
    {
      model: p.model,
      instructions: system,
      input: [{ role: 'user', content }],
      max_output_tokens: maxTokens,
      ...(json ? { text: { format: { type: 'json_object' } } } : {}),
    },
    timeoutMs,
    'openai',
  );
  if (data?.status === 'incomplete') throw new AiError('truncated', `openai incomplete: ${data?.incomplete_details?.reason}`);
  if (typeof data?.output_text === 'string') return data.output_text;
  return (data?.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((c) => c.type === 'output_text')
    .map((c) => c.text)
    .join('');
}

async function callAnthropic(p, { system, prompt, pdf, json, timeoutMs, maxTokens }) {
  const content = [];
  if (pdf) {
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: pdf.toString('base64') },
    });
  }
  content.push({ type: 'text', text: json ? `${prompt}\n\nReply with the JSON object only.` : prompt });
  const data = await post(
    'https://api.anthropic.com/v1/messages',
    { 'x-api-key': p.key, 'anthropic-version': '2023-06-01' },
    { model: p.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content }] },
    timeoutMs,
    'anthropic',
  );
  if (data?.stop_reason === 'max_tokens') throw new AiError('truncated', 'anthropic hit max_tokens');
  return (data?.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

function parseJson(text) {
  const cleaned = text.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new AiError('parse', 'AI reply has no JSON object');
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (e) {
    throw new AiError('parse', `AI reply is not valid JSON: ${e.message}`);
  }
}
