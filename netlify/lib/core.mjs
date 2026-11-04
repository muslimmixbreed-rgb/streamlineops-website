// Business Analyser server logic: email gate, two free analyses per email,
// and a guarded call to Claude. The Netlify functions in netlify/functions/
// are thin wrappers around these handlers; the store and Claude client are
// passed in so the logic can be tested without Netlify or the real API.

import { createHash, randomUUID } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { PROMPTS } from './prompts.mjs';

const num = (name, fallback) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

export const settings = () => ({
  freeAnalyses: num('FREE_ANALYSES', 2),          // analyses per email address
  callsPerAnalysis: num('CALLS_PER_ANALYSIS', 5),  // one report per analysis, plus a few retries
  maxTokensCap: num('MAX_TOKENS_CAP', 1500),       // longest answer the page may ask for
  maxInputChars: num('MAX_INPUT_CHARS', 8000),     // longest text the page may send
  dailyCallLimit: num('DAILY_CALL_LIMIT', 600),    // site-wide safety cap on Claude calls per day
  ipDailyAnalyses: num('IP_DAILY_ANALYSES', 6),    // analyses started per visitor IP per day
  sessionHours: num('SESSION_HOURS', 24),
  model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
  effort: process.env.ANTHROPIC_EFFORT || 'medium',      // how much newer models think before answering
  thinkingRoom: num('THINKING_ROOM', 2000),           // extra tokens allowed for that thinking
});

// The 4.6 models answer straight away. Newer models (Haiku 5.5, Sonnet 5.5, ...) think first,
// and that thinking counts towards max_tokens, so they get an effort level and extra room.
const answersWithoutThinking = (model) => /-4-6$/.test(model);

export function requestParams(s, system, user, answerTokens) {
  const params = { model: s.model, system, messages: [{ role: 'user', content: user }] };
  if (answersWithoutThinking(s.model)) {
    params.max_tokens = answerTokens;
  } else {
    params.max_tokens = answerTokens + s.thinkingRoom;
    params.output_config = { effort: s.effort };
  }
  return params;
}

const sha = (s) => createHash('sha256').update(s).digest('hex');
const today = (now) => new Date(now).toISOString().slice(0, 10);
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

// "Jo.Smith+test@Gmail.com" and "jo.smith@gmail.com" count as the same person.
export function emailKey(email) {
  const [local, domain] = email.trim().toLowerCase().split('@');
  return sha(`${local.split('+')[0]}@${domain}`);
}

const reply = (status, body) => ({ status, body });
const clean = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function getJSON(store, key) {
  return (await store.get(key, { type: 'json' })) ?? null;
}

// POST /api/start — visitor gives name, email, consent. Returns a session token.
export async function handleStart({ body, store, now = Date.now() }) {
  const s = settings();
  const email = clean(body?.email, 320);
  const name = clean(body?.name, 100);
  if (!EMAIL_RE.test(email)) return reply(400, { error: 'Please enter a valid email address.' });
  if (body?.consent_terms !== true) return reply(400, { error: 'Please tick the box to agree to the privacy terms.' });

  const key = emailKey(email);
  const user = (await getJSON(store, `users/${key}`)) ?? { uses: 0, created: now };

  // Keep a record of the sign-up and their marketing choice (latest answer wins).
  await store.setJSON(`leads/${key}`, {
    name,
    email,
    business: clean(body?.business),
    marketingConsent: body?.consent_marketing === true,
    firstSeen: user.created,
    lastSeen: now,
  });
  await store.setJSON(`users/${key}`, user);

  const usesLeft = Math.max(0, s.freeAnalyses - user.uses);
  if (usesLeft === 0) return reply(403, { error: 'used_up', usesLeft: 0 });

  const token = randomUUID();
  await store.setJSON(`sessions/${token}`, { key, created: now });
  return reply(200, { token, usesLeft, freeAnalyses: s.freeAnalyses });
}

async function liveSession(store, token, now) {
  if (typeof token !== 'string' || token.length > 64) return null;
  const sess = await getJSON(store, `sessions/${token}`);
  if (!sess || now - sess.created > settings().sessionHours * 3600e3) return null;
  return sess;
}

// POST /api/begin — the visitor starts an analysis. This is what uses up a free go.
export async function handleBegin({ body, store, ip = '', now = Date.now() }) {
  const s = settings();
  const sess = await liveSession(store, body?.token, now);
  if (!sess) return reply(401, { error: 'session_expired' });

  const user = (await getJSON(store, `users/${sess.key}`)) ?? { uses: 0, created: now };
  if (user.uses >= s.freeAnalyses) return reply(403, { error: 'used_up', usesLeft: 0 });

  const ipKey = `ip/${today(now)}/${sha(ip || 'unknown')}`;
  const ipCount = (await getJSON(store, ipKey))?.count ?? 0;
  if (ipCount >= s.ipDailyAnalyses) return reply(429, { error: 'too_many_today' });

  user.uses += 1;
  user.lastUse = now;
  await store.setJSON(`users/${sess.key}`, user);
  await store.setJSON(ipKey, { count: ipCount + 1 });

  const analysisId = randomUUID();
  await store.setJSON(`analyses/${analysisId}`, { key: sess.key, created: now, calls: 0 });
  return reply(200, { analysisId, usesLeft: Math.max(0, s.freeAnalyses - user.uses) });
}

let defaultClient;
const claudeClient = () => (defaultClient ??= new Anthropic()); // reads ANTHROPIC_API_KEY

// POST /api/claude — one AI step inside an analysis that has already begun.
export async function handleClaude({ body, store, client = claudeClient(), now = Date.now() }) {
  const s = settings();
  const system = PROMPTS[body?.promptId];
  if (!system) return reply(400, { error: 'Unknown request type.' });

  const user = typeof body?.user === 'string' ? body.user.trim() : '';
  if (!user) return reply(400, { error: 'Nothing to analyse.' });
  if (user.length > s.maxInputChars) return reply(413, { error: 'That text is too long. Please shorten it and try again.' });

  const id = typeof body?.analysisId === 'string' ? body.analysisId : '';
  const analysis = id && (await getJSON(store, `analyses/${id}`));
  if (!analysis || now - analysis.created > s.sessionHours * 3600e3) return reply(401, { error: 'session_expired' });
  if (analysis.calls >= s.callsPerAnalysis) return reply(429, { error: 'This analysis has reached its limit of AI feedback.' });

  const dayKey = `daily/${today(now)}`;
  const dayCount = (await getJSON(store, dayKey))?.count ?? 0;
  if (dayCount >= s.dailyCallLimit) return reply(503, { error: 'The analyser is very busy today. Please try again tomorrow.' });

  analysis.calls += 1;
  await store.setJSON(`analyses/${id}`, analysis);
  await store.setJSON(dayKey, { count: dayCount + 1 });

  const requested = Number(body?.maxTokens);
  const max_tokens = Math.min(Number.isFinite(requested) && requested > 0 ? requested : 900, s.maxTokensCap);

  try {
    const response = await client.messages.create(requestParams(s, system, user, max_tokens));
    if (response.stop_reason === 'refusal') {
      return reply(422, { error: 'The AI could not answer this one. Try rewording your description.' });
    }
    // Read text blocks by type: newer models can return thinking blocks first.
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    if (response.stop_reason === 'max_tokens') {
      console.error('Claude answer cut off at max_tokens', s.model, max_tokens);
      if (!text) return reply(502, { error: 'The answer was cut short. Please try again.' });
    }
    return reply(200, { text, callsLeft: s.callsPerAnalysis - analysis.calls });
  } catch (err) {
    // Log the detail for you; show the visitor a plain message.
    console.error('Claude API error', err?.status, err?.message);
    if (err instanceof Anthropic.RateLimitError) return reply(503, { error: 'The analyser is busy. Please wait a minute and try again.' });
    if (err instanceof Anthropic.AuthenticationError) return reply(500, { error: 'The analyser is not set up correctly yet.' });
    if (err instanceof Anthropic.APIError) return reply(502, { error: 'The AI service had a problem. Please try again.' });
    return reply(502, { error: 'Could not reach the AI service. Please try again.' });
  }
}
