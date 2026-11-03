import assert from 'node:assert';
import { createDatabase, seedInitialUsers, SEEDED_ACCOUNTS } from '../server/db.mjs';
import { createServer } from '../server/standalone-server.mjs';
import { hashPassword, verifyPassword } from '../server/auth.mjs';

console.log('--- Starting Comprehensive SDRlab Auth & Permission Verification ---\n');

// 1. Test In-Memory Database Creation & Seeding
const db = createDatabase(':memory:');
await seedInitialUsers(db);

const profiles = (await db.prepare('SELECT * FROM training_profiles').all()).results;
console.log(`[PASS] Seeded ${profiles.length} profiles successfully.`);

// Verify Milton Matus accounts are owner
const milton1 = await db.prepare("SELECT * FROM training_profiles WHERE email = 'milton98matus@gmail.com'").first();
const milton2 = await db.prepare("SELECT * FROM training_profiles WHERE email = 'mmatus@osrmanage.com'").first();
assert.strictEqual(milton1.role, 'owner', 'milton98matus@gmail.com must have owner role');
assert.strictEqual(milton2.role, 'owner', 'mmatus@osrmanage.com must have owner role');
console.log('[PASS] Verified Owner accounts: milton98matus@gmail.com & mmatus@osrmanage.com have role=owner');

// Verify Admins
const adminEmails = [
  'atrisko@osrmanage.com',
  'tmcneil@osrmanage.com',
  'arogers@osrmanage.com',
  'rrogers@osrmanage.com',
  'salvarez@osrmanage.com'
];
for (const email of adminEmails) {
  const p = await db.prepare('SELECT * FROM training_profiles WHERE email = ?').bind(email).first();
  assert(p, `Profile for ${email} must exist`);
  assert.strictEqual(p.role, 'admin', `${email} must have admin role`);
}
console.log('[PASS] Verified all 5 specified Admins have role=admin');

// 2. Start HTTP server on test port
const TEST_PORT = 3899;
const app = createServer({ db });
await app.listen(TEST_PORT, '127.0.0.1');
const BASE = `http://127.0.0.1:${TEST_PORT}`;

try {
  // 3. Test Gatekeeper: Unauthenticated GET / must redirect to /login
  const gateRes = await fetch(`${BASE}/`, { redirect: 'manual' });
  assert.strictEqual(gateRes.status, 302, 'Unauthenticated GET / must return 302');
  assert.strictEqual(gateRes.headers.get('location'), '/login', 'Must redirect to /login');
  console.log('[PASS] Gatekeeper: Unauthenticated request to / redirected to /login');

  // 4. Test GET /login renders login page
  const loginPageRes = await fetch(`${BASE}/login`);
  assert.strictEqual(loginPageRes.status, 200);
  const loginHtml = await loginPageRes.text();
  assert(loginHtml.includes('OSR Manage · Private Access'), 'Login page must have OSR Manage branding');
  assert(!loginHtml.includes('Sign in with ChatGPT'), 'Login page must NOT have Sign in with ChatGPT');
  assert(!loginHtml.includes('Quick Demo Access'), 'Login page must NOT have Quick Demo Access');
  console.log('[PASS] Login page renders cleanly without ChatGPT or Demo buttons');

  // 5. Test Password Login: Wrong password fails
  const failLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mmatus@osrmanage.com', password: 'wrongpassword' })
  });
  assert.strictEqual(failLoginRes.status, 401, 'Wrong password must return 401');
  console.log('[PASS] Wrong password rejected with 401');

  // 6. Test Password Login: Correct password succeeds and sets session cookie
  const successLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mmatus@osrmanage.com', password: 'OSRlab2026!' })
  });
  assert.strictEqual(successLoginRes.status, 200, 'Correct password must return 200');
  const cookie = successLoginRes.headers.get('set-cookie');
  assert(cookie && cookie.includes('sdr_session='), 'Must set sdr_session cookie');
  const loginData = await successLoginRes.json();
  assert.strictEqual(loginData.user.role, 'owner', 'Logged in user must have role=owner');
  console.log('[PASS] Owner password login succeeded with role=owner and session cookie');

  // 7. Test OTP Code Flow:
  // Request code for Allison Trisko
  const sendCodeRes = await fetch(`${BASE}/api/auth/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'atrisko@osrmanage.com' })
  });
  assert.strictEqual(sendCodeRes.status, 200);
  const creds = await db.prepare("SELECT verification_code FROM training_user_credentials WHERE email = 'atrisko@osrmanage.com'").first();
  assert(creds.verification_code && creds.verification_code.length === 6, 'Verification code must be 6 digits');
  
  // Verify OTP login
  const otpLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'atrisko@osrmanage.com', code: creds.verification_code })
  });
  assert.strictEqual(otpLoginRes.status, 200);
  const adminCookie = otpLoginRes.headers.get('set-cookie');
  const otpData = await otpLoginRes.json();
  assert.strictEqual(otpData.user.role, 'admin');
  console.log('[PASS] Admin OTP code request and login succeeded with role=admin');

  // 8. Test Password Reset Request:
  const resetReqRes = await fetch(`${BASE}/api/auth/request-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'salvarez@osrmanage.com' })
  });
  assert.strictEqual(resetReqRes.status, 200);
  const saraCreds = await db.prepare("SELECT reset_requested FROM training_user_credentials WHERE email = 'salvarez@osrmanage.com'").first();
  assert.strictEqual(saraCreds.reset_requested, 1, 'reset_requested must be 1');
  console.log('[PASS] Password reset request registered successfully');

  // 9. Test User Creation by Owner:
  const createUserRes = await fetch(`${BASE}/api/admin/users/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie, 'Origin': BASE },
    body: JSON.stringify({
      name: 'John Trainee',
      email: 'jtrainee@osrmanage.com',
      organization: 'OSR Manage',
      role: 'participant',
      password: 'Trainee2026!'
    })
  });
  assert.strictEqual(createUserRes.status, 200, 'Creating user must succeed');
  
  // Verify new trainee can login
  const traineeLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jtrainee@osrmanage.com', password: 'Trainee2026!' })
  });
  assert.strictEqual(traineeLoginRes.status, 200);
  const traineeCookie = traineeLoginRes.headers.get('set-cookie');
  const traineeData = await traineeLoginRes.json();
  assert.strictEqual(traineeData.user.role, 'participant');
  console.log('[PASS] New user created by Owner and logged in successfully as participant');

  // 10. Test Permissions: Learner cannot access admin endpoints
  const learnerAdminRes = await fetch(`${BASE}/api/admin/users`, {
    headers: { 'Cookie': traineeCookie, 'Origin': BASE }
  });
  assert.strictEqual(learnerAdminRes.status, 403, 'Learner must be forbidden from /api/admin/users');
  console.log('[PASS] Learner access to admin endpoint returned 403 Forbidden');

  // 11. Test Admin cannot demote or modify Owner role
  const adminTryDemoteOwner = await fetch(`${BASE}/api/admin/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': adminCookie, 'Origin': BASE },
    body: JSON.stringify({ userId: milton1.user_id, role: 'participant' })
  });
  assert.strictEqual(adminTryDemoteOwner.status, 403, 'Admin cannot change roles');
  console.log('[PASS] Admin blocked from changing Owner role (403 Forbidden)');

  // 12. Test Owner can promote Admin to Owner
  const timUser = await db.prepare("SELECT user_id FROM training_profiles WHERE email = 'tmcneil@osrmanage.com'").first();
  const promoteTimRes = await fetch(`${BASE}/api/admin/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie, 'Origin': BASE },
    body: JSON.stringify({ userId: timUser.user_id, role: 'owner' })
  });
  assert.strictEqual(promoteTimRes.status, 200);
  const updatedTim = await db.prepare("SELECT role FROM training_profiles WHERE user_id = ?").bind(timUser.user_id).first();
  assert.strictEqual(updatedTim.role, 'owner');
  console.log('[PASS] Owner promoted Tim McNeil to Owner successfully');

  // 13. Test Owner can demote Admin to Participant
  const allisonUser = await db.prepare("SELECT user_id FROM training_profiles WHERE email = 'atrisko@osrmanage.com'").first();
  const demoteAllisonRes = await fetch(`${BASE}/api/admin/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie, 'Origin': BASE },
    body: JSON.stringify({ userId: allisonUser.user_id, role: 'participant' })
  });
  assert.strictEqual(demoteAllisonRes.status, 200);
  const updatedAllison = await db.prepare("SELECT role FROM training_profiles WHERE user_id = ?").bind(allisonUser.user_id).first();
  assert.strictEqual(updatedAllison.role, 'participant');
  console.log('[PASS] Owner demoted Allison Trisko to participant successfully');

  // 14. Test Password Reset by Admin/Owner:
  const resetPassRes = await fetch(`${BASE}/api/admin/users/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie, 'Origin': BASE },
    body: JSON.stringify({ userId: traineeData.user.userId, newPassword: 'NewSecret2026!' })
  });
  assert.strictEqual(resetPassRes.status, 200);
  
  // Verify trainee logs in with new password
  const traineeNewPassLogin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jtrainee@osrmanage.com', password: 'NewSecret2026!' })
  });
  assert.strictEqual(traineeNewPassLogin.status, 200, 'Must login with new reset password');
  console.log('[PASS] Password reset by Owner verified: trainee logged in with new password');

  console.log('\n=======================================================');
  console.log('🎉 ALL 14 TESTS PASSED! 10 DE 10 CONFIRMADO.');
  console.log('=======================================================');
} finally {
  await app.close();
  db.close();
}
