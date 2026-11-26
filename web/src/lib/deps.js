// deps.js: the real data + navigation functions the screens use. Screens take them as a `deps`
// prop (defaulting to this object) so the dev-only preview can swap in mock.json data.
import * as sessions from './sessions.js';
import * as api from './api.js';
import { go } from './nav.js';

export const realDeps = {
  go,
  getActiveSession: sessions.getActiveSession,
  createSession: sessions.createSession,
  deleteActiveSession: sessions.deleteActiveSession,
  setStatus: sessions.setStatus,
  markFailed: sessions.markFailed,
  loadParts: sessions.loadParts,
  loadQuestions: sessions.loadQuestions,
  answerQuestion: sessions.answerQuestion,
  loadExplanation: sessions.loadExplanation,
  explain: api.explain,
  getJob: api.getJob,
  subscribe: api.subscribe,
  getPendingFile: api.getPendingFile,
  startGeneration: api.startGeneration,
};
