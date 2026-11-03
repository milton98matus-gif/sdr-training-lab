import assert from 'node:assert';
import { createDatabase, seedInitialUsers } from '../server/db.mjs';
import { createServer } from '../server/standalone-server.mjs';
import callsData from '../content/calls.json' assert { type: 'json' };

console.log('================================================================');
console.log('🧪 ULTIMATE END-TO-END VERIFICATION OF ALL SDR LAB CAPABILITIES');
console.log('================================================================\n');

const db = createDatabase(':memory:');
await seedInitialUsers(db);
const app = createServer({ db });
await app.listen(4035, '127.0.0.1');

try {
  const BASE = 'http://127.0.0.1:4035';

  // 1. Gatekeeper check
  const unauthRes = await fetch(`${BASE}/`, { redirect: 'manual' });
  assert.strictEqual(unauthRes.status, 302);
  assert.strictEqual(unauthRes.headers.get('location'), '/login');
  console.log('✔ 1. Gatekeeper redirect to /login verified');

  // 2. Login
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mmatus@osrmanage.com', password: 'OSRlab2026!' })
  });
  assert.strictEqual(loginRes.status, 200);
  const cookie = loginRes.headers.get('set-cookie');
  console.log('✔ 2. Owner password login verified');

  const headers = {
    'Cookie': cookie,
    'x-forwarded-proto': 'https',
    'x-forwarded-host': 'sdr-training-lab.onrender.com',
    'host': 'sdr-training-lab.onrender.com',
    'origin': 'https://sdr-training-lab.onrender.com',
    'Content-Type': 'application/json'
  };

  // 3. Create User in Reporting
  const createRes = await fetch(`${BASE}/api/admin/users/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Natalia Gomez',
      email: 'ngomez@osrmanage.com',
      organization: 'OSR Manage',
      role: 'participant',
      password: 'NataliaPass2026!'
    })
  });
  assert.strictEqual(createRes.status, 200);
  console.log('✔ 3. User creation verified (Natalia Gomez)');

  // 4. Natalia logs in
  const nataliaLogin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ngomez@osrmanage.com', password: 'NataliaPass2026!' })
  });
  assert.strictEqual(nataliaLogin.status, 200);
  const nataliaHeaders = { ...headers, 'Cookie': nataliaLogin.headers.get('set-cookie') };
  console.log('✔ 4. Natalia logged in with password');

  // 5. Natalia records portal presence time
  const sessionId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  await fetch(`${BASE}/api/presence/beat`, {
    method: 'POST',
    headers: nataliaHeaders,
    body: JSON.stringify({ sessionId, sequence: 1, spanMs: 0, visibleMs: 0, interactionMs: 0, state: 'interaction', section: 'calllab' })
  });
  await new Promise(r => setTimeout(r, 1200));
  await fetch(`${BASE}/api/presence/beat`, {
    method: 'POST',
    headers: nataliaHeaders,
    body: JSON.stringify({ sessionId, sequence: 2, spanMs: 3000, visibleMs: 3000, interactionMs: 3000, state: 'interaction', section: 'calllab' })
  });
  console.log('✔ 5. Active portal session time recorded');

  // 6. Natalia practices a Case Decision
  const caseRes = await fetch(`${BASE}/api/events`, {
    method: 'POST',
    headers: nataliaHeaders,
    body: JSON.stringify({
      events: [{
        id: 'evt_nat_case_1',
        kind: 'decision',
        unitType: 'case',
        unitId: 'msp-001',
        mode: 'response',
        step: 0,
        choice: 0,
        at: Date.now()
      }]
    })
  });
  assert.strictEqual(caseRes.status, 200);
  console.log('✔ 6. Practice Lab case decision submitted');

  // 7. Natalia completes Call Lab roleplay
  const expCall = callsData.calls.find(c => c.id === 'expansion');
  let curr = expCall.start;
  const history = [];
  while (!expCall.nodes[curr].end) {
    history.push({ node: curr, option: 0 });
    curr = expCall.nodes[curr].options[0].next;
  }
  const callRes = await fetch(`${BASE}/api/events`, {
    method: 'POST',
    headers: nataliaHeaders,
    body: JSON.stringify({
      events: [{
        id: 'evt_nat_call_1',
        kind: 'call_complete',
        unitId: 'expansion',
        run: {
          node: curr,
          history,
          disposition: expCall.nodes[curr].outcome,
          note: 'Natalia roleplay summary',
          done: true,
          at: Date.now()
        }
      }]
    })
  });
  assert.strictEqual(callRes.status, 200);
  console.log('✔ 7. Call Lab roleplay completed and recorded');

  // 8. Verify Reporting
  const adminRes = await fetch(`${BASE}/api/admin/users`, { headers });
  assert.strictEqual(adminRes.status, 200);
  const adminData = await adminRes.json();
  const natalia = adminData.people.find(p => p.email === 'ngomez@osrmanage.com');
  assert(natalia, 'Natalia must exist in reporting');

  assert.strictEqual(natalia.report.casesCompleted, 1, 'Cases completed must be 1');
  assert.strictEqual(natalia.report.callsCompleted, 1, 'Calls completed must be 1');
  assert.strictEqual(natalia.report.callRuns, 1, 'Call runs must be 1');
  assert(natalia.report.presence?.connectedMs > 0, 'Portal time must be > 0');
  assert(natalia.report.activity?.submissions >= 2, 'Submissions must be >= 2');

  console.log('\n📊 Reporting Audit Result:');
  console.log(`   - Trainee Name: ${natalia.name}`);
  console.log(`   - Cases Practiced: ${natalia.report.casesCompleted} / 84`);
  console.log(`   - Roleplay Calls Completed: ${natalia.report.callsCompleted} / 3`);
  console.log(`   - Connected Time: ${natalia.report.presence.connectedMs} ms`);
  console.log(`   - Total Submissions: ${natalia.report.activity.submissions}`);

  console.log('\n================================================================');
  console.log('🎉 100% SUCCESS: GATEKEEPER, LOGIN, ROLEPLAY, TIME, USERS & REPORTING VERIFIED!');
  console.log('================================================================\n');

} finally {
  await app.close();
  db.close();
}
