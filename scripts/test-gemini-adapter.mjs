import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleTrainingRequest} from '../lib/training-service.mjs';
import {reviewInput, validateFeedback} from '../lib/ai-review-service.mjs';
import content from '../content/onboarding.json' with {type:'json'};

const sql = new DatabaseSync(':memory:');
for (const f of fs.readdirSync(new URL('../drizzle', import.meta.url)).filter(f => f.endsWith('.sql')).sort()) {
  sql.exec(fs.readFileSync(new URL('../drizzle/' + f, import.meta.url), 'utf8'));
}

function statement(query, args = []) {
  return {
    bind(...a) { return statement(query, a); },
    async run() { const r = sql.prepare(query).run(...args); return { meta: { changes: Number(r.changes) } }; },
    async first() { return sql.prepare(query).get(...args) || null; },
    async all() { return { results: sql.prepare(query).all(...args) }; }
  };
}

const db = {
  prepare: statement,
  async batch(ss) {
    sql.exec('BEGIN');
    try {
      const r = [];
      for (const s of ss) r.push(await s.run());
      sql.exec('COMMIT');
      return r;
    } catch (e) {
      sql.exec('ROLLBACK');
      throw e;
    }
  }
};

const owner = { userId: 'gemini-owner', email: 'owner@gemini.test' };
const person = { userId: 'gemini-learner', email: 'learner@gemini.test' };

let count = 0;
let capturedReq = null;
let mode = 'normal';

function makeFeedback(input, status = 'strong') {
  return {
    status,
    summary: 'Clear demonstration of MSP business outcomes.',
    strengths: [{ evidence: input.fields[0].answer.slice(0, 30), feedback: 'Direct support example.' }],
    adjustments: [],
    fields: input.fields.map(f => ({
      id: f.id,
      status: 'strong',
      feedback: 'Good positioning.'
    })),
    nextStep: 'Confirm customer support scope.',
    example: 'I would confirm agreed hours before discussing 24/7 SLA.',
    flags: []
  };
}

const geminiTransport = async (url, options) => {
  count++;
  assert(url.includes('generativelanguage.googleapis.com'));
  assert(url.includes('models/gemini-2.5-flash:generateContent'));
  assert(url.includes('key=test-gemini-key'));
  
  const b = JSON.parse(options.body);
  capturedReq = b;
  assert(b.systemInstruction?.parts?.[0]?.text);
  assert(b.contents?.[0]?.parts?.[0]?.text);
  assert.equal(b.generationConfig?.responseMimeType, 'application/json');
  assert(b.generationConfig?.responseSchema);
  
  if (mode === 'quota') return new Response('{}', { status: 429 });
  if (mode === 'auth') return new Response('{}', { status: 403 });
  if (mode === 'safety') {
    return Response.json({
      candidates: [{
        finishReason: 'SAFETY',
        content: { parts: [{ text: '' }] }
      }]
    });
  }

  const input = JSON.parse(b.contents[0].parts[0].text);
  const feedbackData = makeFeedback(input);
  
  return Response.json({
    candidates: [{
      content: {
        parts: [{ text: JSON.stringify(feedbackData) }]
      },
      finishReason: 'STOP'
    }],
    usageMetadata: {
      promptTokenCount: 150,
      candidatesTokenCount: 220
    }
  });
};

const geminiAiConfig = {
  apiKey: 'test-gemini-key',
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  fetch: geminiTransport
};

let serial = 0;
const eid = () => `gemini-test-event-${String(++serial).padStart(6, '0')}`;

async function req(path, who = person, body, config = geminiAiConfig) {
  const r = await handleTrainingRequest(
    new Request('https://lab.test' + path, {
      method: body ? 'POST' : 'GET',
      headers: { origin: 'https://lab.test', 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    }),
    { db, identity: who, ownerEmail: owner.email, ai: config }
  );
  return { status: r.status, data: await r.json() };
}

await req('/api/session', person);
assert((await req('/api/session')).data.ai.enabled);

// Create task attempt
const task = content.TASKS[0];
const answers = Object.fromEntries(task.fields.map(f => [f.id, ('An MSP proactively manages agreed IT services. ').repeat(3)]));
const event = eid();
await req('/api/onboarding/task', person, { id: event, taskId: task.id, answers });

// Call AI review using Gemini
const reviewBody = { source: 'onboarding', eventId: event };
let res = await req('/api/ai/review', person, reviewBody);
assert.equal(res.status, 200);
assert.equal(res.data.state, 'complete');
assert.equal(count, 1);
assert.equal(res.data.feedback.status, 'strong');
assert.equal(res.data.model, 'gemini-2.5-flash');

// Check that tokens were stored in database
const storedRow = sql.prepare("SELECT * FROM training_ai_reviews WHERE user_id=? AND event_id=?").get(person.userId, event);
assert.equal(storedRow.status, 'complete');
assert.equal(storedRow.input_tokens, 150);
assert.equal(storedRow.output_tokens, 220);

// Test Quota (429) error mapping
mode = 'quota';
const quotaEvent = eid();
await req('/api/onboarding/task', person, { id: quotaEvent, taskId: task.id, answers });
res = await req('/api/ai/review', person, { source: 'onboarding', eventId: quotaEvent });
assert.equal(res.data.state, 'failed');
assert.equal(res.data.error, 'provider_quota');

// Test Safety block mapping
mode = 'safety';
const safetyEvent = eid();
await req('/api/onboarding/task', person, { id: safetyEvent, taskId: task.id, answers });
res = await req('/api/ai/review', person, { source: 'onboarding', eventId: safetyEvent });
assert.equal(res.data.state, 'failed');
assert.equal(res.data.error, 'invalid_output');

sql.close();
console.log('PASS: Gemini AI Review Adapter — structured JSON schema, generationConfig, prompt token tracking, error mapping, and safety handling.');
