// Tests for the analyser's server rules. No network, no real API key:
// a Map stands in for Netlify Blobs and a stub stands in for Claude.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';
import { handleStart, handleBegin, handleClaude, emailKey } from '../netlify/lib/core.mjs';

function memoryStore() {
  const m = new Map();
  return {
    m,
    async get(k) { return m.has(k) ? structuredClone(m.get(k)) : null; },
    async setJSON(k, v) { m.set(k, structuredClone(v)); },
  };
}

function stubClient(reply = { stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] }) {
  const calls = [];
  return { calls, messages: { create: async (p) => { calls.push(p); return reply; } } };
}

const signup = { name: 'Jo', email: 'jo@example.co.uk', consent_terms: true, consent_marketing: false };

async function begun(store, ip = '1.1.1.1') {
  const s = await handleStart({ body: signup, store });
  const b = await handleBegin({ body: { token: s.body.token }, store, ip });
  return b.body.analysisId;
}

test('start needs a valid email and consent', async () => {
  const store = memoryStore();
  assert.equal((await handleStart({ body: { ...signup, email: 'nope' }, store })).status, 400);
  assert.equal((await handleStart({ body: { ...signup, consent_terms: false }, store })).status, 400);
  const ok = await handleStart({ body: signup, store });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.usesLeft, 2);
  assert.ok(store.m.get(`leads/${emailKey(signup.email)}`).email === signup.email);
});

test('each email gets two analyses, including +tag and case variants', async () => {
  const store = memoryStore();
  await begun(store);
  await begun(store);
  const again = await handleStart({ body: { ...signup, email: 'JO+again@Example.co.uk' }, store });
  assert.equal(again.status, 403);
  assert.equal(again.body.error, 'used_up');
});

test('begin rejects an unknown or expired session', async () => {
  const store = memoryStore();
  assert.equal((await handleBegin({ body: { token: 'made-up' }, store })).status, 401);
  const s = await handleStart({ body: signup, store, now: 0 });
  const late = await handleBegin({ body: { token: s.body.token }, store, now: 25 * 3600e3 });
  assert.equal(late.status, 401);
});

test('a token cannot be reused past the limit', async () => {
  const store = memoryStore();
  const s = await handleStart({ body: signup, store });
  assert.equal((await handleBegin({ body: { token: s.body.token }, store })).status, 200);
  assert.equal((await handleBegin({ body: { token: s.body.token }, store })).status, 200);
  assert.equal((await handleBegin({ body: { token: s.body.token }, store })).status, 403);
});

test('one IP can only start a few analyses a day', async () => {
  const store = memoryStore();
  let last;
  for (let i = 0; i < 7; i++) {
    const s = await handleStart({ body: { ...signup, email: `p${i}@example.com` }, store });
    last = await handleBegin({ body: { token: s.body.token }, store, ip: '9.9.9.9' });
  }
  assert.equal(last.status, 429);
});

test('claude call uses the server prompt, fixed model and capped tokens', async () => {
  const store = memoryStore();
  const id = await begun(store);
  const client = stubClient();
  const r = await handleClaude({ body: { analysisId: id, promptId: 'framework', user: 'Idea text', maxTokens: 99999 }, store, client });
  assert.equal(r.status, 200);
  assert.equal(r.body.text, 'ok');
  const p = client.calls[0];
  assert.equal(p.model, 'claude-haiku-5-5');
  assert.equal(p.max_tokens, 2000); // 1000 answer cap + 1000 room for thinking
  assert.deepEqual(p.output_config, { effort: 'low' });
  assert.equal('temperature' in p, false);
  assert.match(p.system, /valid JSON object/);
  assert.deepEqual(p.messages, [{ role: 'user', content: 'Idea text' }]);
});

test('claude call rejects unknown prompts, missing analysis and long input', async () => {
  const store = memoryStore();
  const id = await begun(store);
  const client = stubClient();
  assert.equal((await handleClaude({ body: { analysisId: id, promptId: 'anything', user: 'x' }, store, client })).status, 400);
  assert.equal((await handleClaude({ body: { analysisId: 'nope', promptId: 'summary', user: 'x' }, store, client })).status, 401);
  assert.equal((await handleClaude({ body: { analysisId: id, promptId: 'summary', user: 'x'.repeat(9000) }, store, client })).status, 413);
  assert.equal(client.calls.length, 0);
});

test('an analysis stops after its call budget', async () => {
  const store = memoryStore();
  const id = await begun(store);
  const client = stubClient();
  let r;
  for (let i = 0; i < 41; i++) r = await handleClaude({ body: { analysisId: id, promptId: 'summary', user: 'x' }, store, client });
  assert.equal(r.status, 429);
  assert.equal(client.calls.length, 40);
});

test('refusals and API errors become plain messages', async () => {
  const store = memoryStore();
  const id = await begun(store);
  const refused = await handleClaude({ body: { analysisId: id, promptId: 'summary', user: 'x' }, store, client: stubClient({ stop_reason: 'refusal', content: [] }) });
  assert.equal(refused.status, 422);
  const failing = { messages: { create: async () => { throw new Error('socket hang up'); } } };
  const err = await handleClaude({ body: { analysisId: id, promptId: 'summary', user: 'x' }, store, client: failing });
  assert.equal(err.status, 502);
  assert.ok(!JSON.stringify(err.body).includes('socket'));
  assert.ok(Anthropic.APIError);
});

test('older 4.6 models get the plain request with no thinking settings', async () => {
  const { requestParams, settings } = await import('../netlify/lib/core.mjs');
  process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-6';
  const p = requestParams(settings(), 'sys', 'hello', 900);
  delete process.env.ANTHROPIC_MODEL;
  assert.equal(p.model, 'claude-sonnet-4-6');
  assert.equal(p.max_tokens, 900);
  assert.equal(p.output_config, undefined);
});

test('answer text is read past thinking blocks, and a cut-off empty answer is an error', async () => {
  const store = memoryStore();
  const id = await begun(store);
  const withThinking = stubClient({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '', signature: 's' }, { type: 'text', text: 'answer' }] });
  const r = await handleClaude({ body: { analysisId: id, promptId: 'summary', user: 'x' }, store, client: withThinking });
  assert.equal(r.body.text, 'answer');
  const cut = stubClient({ stop_reason: 'max_tokens', content: [{ type: 'thinking', thinking: '', signature: 's' }] });
  const c = await handleClaude({ body: { analysisId: id, promptId: 'summary', user: 'x' }, store, client: cut });
  assert.equal(c.status, 502);
});
