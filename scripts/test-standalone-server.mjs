import assert from 'node:assert/strict';
import { createServer } from '../server/standalone-server.mjs';

const TEST_PORT = 3849;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

const app = createServer({
  ownerEmail: 'owner@standalone.test',
  adminEmails: '["admin@standalone.test"]'
});

await app.start(TEST_PORT, '127.0.0.1');

try {
  // 1. Unauthenticated /api/session should return 401
  let res = await fetch(`${BASE_URL}/api/session`);
  assert.equal(res.status, 401);

  // 2. GET /login should return 200 HTML
  res = await fetch(`${BASE_URL}/login`);
  assert.equal(res.status, 200);
  const loginHtml = await res.text();
  assert(loginHtml.includes('Sign In'));
  assert(loginHtml.includes('Alex Rivera'));

  // 3. POST /api/auth/login as learner
  res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'learner@standalone.test', name: 'Learner Test' })
  });
  assert.equal(res.status, 200);
  const cookie = res.headers.get('set-cookie');
  assert(cookie && cookie.includes('sdr_session='));

  // 4. Authenticated /api/session using cookie
  res = await fetch(`${BASE_URL}/api/session`, {
    headers: { cookie }
  });
  assert.equal(res.status, 200);
  const sessionData = await res.json();
  assert.equal(sessionData.user.name, 'Learner Test');
  assert.equal(sessionData.user.role, 'participant');

  // 5. Test Admin Login
  res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@standalone.test', name: 'Admin Test' })
  });
  const adminCookie = res.headers.get('set-cookie');
  res = await fetch(`${BASE_URL}/api/session`, { headers: { cookie: adminCookie } });
  assert.equal(res.status, 200);
  const adminSession = await res.json();
  assert.equal(adminSession.user.role, 'admin');

  // 6. Test Owner Login
  res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@standalone.test', name: 'Owner Test' })
  });
  const ownerCookie = res.headers.get('set-cookie');
  res = await fetch(`${BASE_URL}/api/session`, { headers: { cookie: ownerCookie } });
  assert.equal(res.status, 200);
  const ownerSession = await res.json();
  assert.equal(ownerSession.user.role, 'owner');

  // 7. Static file delivery checks
  res = await fetch(`${BASE_URL}/`);
  assert.equal(res.status, 200);
  assert(res.headers.get('content-type').includes('text/html'));
  const html = await res.text();
  assert(html.includes('SDR Lab · Judgment in action'));
  assert(html.includes('MSP Foundations'));
  assert(html.includes('Practice lab'));
  assert(html.includes('Call Lab'));

  res = await fetch(`${BASE_URL}/styles.css`);
  assert.equal(res.status, 200);
  assert(res.headers.get('content-type').includes('text/css'));

  res = await fetch(`${BASE_URL}/onboarding.js`);
  assert.equal(res.status, 200);
  assert(res.headers.get('content-type').includes('javascript'));

  res = await fetch(`${BASE_URL}/lab/assets/portal-quick-guide.pdf`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/pdf');

  // 8. Test saving practice state (/api/state) with canonical caseId 'msp-001'
  res = await fetch(`${BASE_URL}/api/state`, {
    method: 'PUT',
    headers: {
      cookie,
      'Content-Type': 'application/json',
      origin: BASE_URL
    },
    body: JSON.stringify({
      scope: 'sdr-lab-msp-v2',
      payload: { firsts: {}, history: [], caseId: 'msp-001', mode: 'response' }
    })
  });
  assert.equal(res.status, 200);

  // 9. Test submitting training event (/api/events) with canonical caseId 'msp-001'
  res = await fetch(`${BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      cookie,
      'Content-Type': 'application/json',
      origin: BASE_URL
    },
    body: JSON.stringify({
      events: [{
        id: 'event-integration-test-0001',
        kind: 'view',
        unitType: 'case',
        unitId: 'msp-001',
        at: Date.now()
      }]
    })
  });
  assert.equal(res.status, 200);

  // 10. Test sign out
  res = await fetch(`${BASE_URL}/logout`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  const clearCookie = res.headers.get('set-cookie');
  assert(clearCookie && clearCookie.includes('Max-Age=0'));

  console.log('PASS: Standalone Server Integration — Decoupled Auth, Session Cookies, Role Resolution (Learner/Admin/Owner), Static Asset Serving, API Routing, and State Persistence.');
} finally {
  await app.stop();
}
