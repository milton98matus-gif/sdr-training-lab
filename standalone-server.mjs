import crypto from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = crypto;
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleTrainingRequest } from '../lib/training-service.mjs';
import { createDatabase, SEEDED_ACCOUNTS } from './db.mjs';
import { scheduleCloudSync } from './persistence.mjs';
import { 
  resolveIdentity, 
  createSessionCookie, 
  clearSessionCookie, 
  verifyPassword, 
  generateVerificationCode 
} from './auth.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public/lab');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const OWNER_EMAIL = process.env.TRAINING_OWNER_EMAIL || 'milton98matus@gmail.com';
const ADMIN_EMAILS = process.env.TRAINING_ADMIN_EMAILS || '["atrisko@osrmanage.com","tmcneil@osrmanage.com","arogers@osrmanage.com","rrogers@osrmanage.com","salvarez@osrmanage.com"]';
const DB_PATH = process.env.DATABASE_PATH || ':memory:';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'SDR Lab <onboarding@resend.dev>';

async function sendEmailViaResend({ to, subject, html, text }) {
  if (!RESEND_API_KEY) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text
      })
    });
    const result = await res.json();
    if (!res.ok) {
      console.error('[Resend Error]', result);
      return false;
    }
    console.log('[Resend Success] Email sent to', to, 'ID:', result.id);
    return true;
  } catch (err) {
    console.error('[Resend Exception]', err);
    return false;
  }
}


const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.TRAINING_AI_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.TRAINING_AI_MODEL || '';

const aiConfig = {
  apiKey: GEMINI_API_KEY || OPENAI_API_KEY,
  provider: GEMINI_API_KEY ? 'gemini' : (OPENAI_API_KEY ? 'openai' : undefined),
  model: GEMINI_API_KEY ? GEMINI_MODEL : OPENAI_MODEL
};

export function renderLoginPage(error = '') {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sign In · L&D-SDRlab · OSR Manage</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #0b1730; color: #f0f4f8; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: #132247; border: 1px solid #1e356d; border-radius: 14px; width: 100%; max-width: 440px; padding: 36px 32px; box-shadow: 0 16px 40px rgba(0,0,0,0.5); }
    .header { text-align: center; margin-bottom: 24px; }
    .brand { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .brand span { color: #bbf451; }
    .subtitle { font-size: 11px; color: #94a3b8; margin-top: 6px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
    
    .status-msg { display: none; padding: 12px 14px; border-radius: 8px; font-size: 13px; line-height: 1.4; margin-bottom: 18px; }
    .status-msg.error { background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; display: block; }
    .status-msg.success { background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; color: #86efac; display: block; }
    
    .field { margin-bottom: 16px; text-align: left; }
    label { display: block; font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    input[type="text"], input[type="email"], input[type="password"] { width: 100%; padding: 12px 14px; background: #0b1730; border: 1px solid #243c78; border-radius: 8px; color: #fff; font-size: 14px; transition: border-color 0.2s; }
    input:focus { outline: none; border-color: #bbf451; box-shadow: 0 0 0 2px rgba(187,244,81,0.2); }
    
    .btn { display: block; width: 100%; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 700; text-align: center; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-primary { background: #bbf451; color: #0b1730; margin-top: 10px; }
    .btn-primary:hover { background: #a8e03e; transform: translateY(-1px); }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    
    .footer-links { margin-top: 22px; text-align: center; font-size: 13px; }
    .text-link { color: #38bdf8; text-decoration: none; cursor: pointer; font-weight: 500; }
    .text-link:hover { text-decoration: underline; color: #7dd3fc; }
    
    .panel { display: none; }
    .panel.active { display: block; }
    
    .badge-secure { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; color: #64748b; margin-top: 24px; padding-top: 16px; border-top: 1px solid #1a2d5a; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="display:inline-flex;align-items:center;background:#ffffff;padding:6px 14px;border-radius:8px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,0.15);border:1px solid #cbd5e1;">
        <img src="/lab/assets/osr-navy.png" alt="OSR" style="height:22px;width:auto;display:block;">
      </div>
      <div class="brand">L&amp;D-SDR<span>lab</span></div>
      <div class="subtitle">OSR Manage · Private Access · Sales Development Learning &amp; Readiness</div>
    </div>

    <div id="status" class="status-msg ${error ? 'error' : ''}">${error}</div>

    <!-- PANEL 1: PASSWORD LOGIN -->
    <div id="panel-password" class="panel active">
      <form id="form-password" onsubmit="handlePasswordLogin(event)">
        <div class="field">
          <label for="pwd-email">Work Email</label>
          <input type="email" id="pwd-email" required placeholder="name@company.com" autocomplete="username">
        </div>
        <div class="field">
          <label for="pwd-password">Password</label>
          <input type="password" id="pwd-password" required placeholder="••••••••••••" autocomplete="current-password">
        </div>
        <button type="submit" id="btn-login-pwd" class="btn btn-primary">Sign In to SDR Lab</button>
      </form>
      <div class="footer-links">
        <a class="text-link" onclick="toggleResetForm(true)">Forgot your password? Request assistance</a>
      </div>
    </div>

    <!-- PANEL 2: RESET REQUEST -->
    <div id="panel-reset" class="panel">
      <p style="font-size:13px; color:#cbd5e1; margin-bottom:14px; line-height:1.4;">
        Enter your registered work email. Your administrator will receive your request and provide a temporary password.
      </p>
      <div class="field">
        <label for="reset-email">Work Email</label>
        <input type="email" id="reset-email" placeholder="name@company.com">
      </div>
      <button type="button" id="btn-submit-reset" class="btn btn-primary" onclick="handleRequestReset()">Send Reset Request</button>
      <div class="footer-links">
        <a class="text-link" onclick="toggleResetForm(false)">← Back to Sign In</a>
      </div>
    </div>

    <div class="badge-secure">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Authorized OSR Manage personnel only
    </div>
  </div>

  <script>
    function showMsg(text, isError) {
      const el = document.getElementById('status');
      el.textContent = text;
      el.className = 'status-msg ' + (isError ? 'error' : 'success');
      el.style.display = 'block';
    }

    function clearMsg() {
      const el = document.getElementById('status');
      el.style.display = 'none';
      el.textContent = '';
    }

    function toggleResetForm(show) {
      clearMsg();
      document.getElementById('panel-password').classList.toggle('active', !show);
      document.getElementById('panel-reset').classList.toggle('active', show);
    }

    async function handlePasswordLogin(e) {
      e.preventDefault();
      clearMsg();
      const btn = document.getElementById('btn-login-pwd');
      const email = document.getElementById('pwd-email').value.trim();
      const password = document.getElementById('pwd-password').value;
      
      btn.disabled = true;
      btn.textContent = 'Signing in…';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Invalid email or password.');
        }
        window.location.href = data.redirect || '/';
      } catch (err) {
        showMsg(err.message, true);
        btn.disabled = false;
        btn.textContent = 'Sign In to SDR Lab';
      }
    }

    async function handleRequestReset() {
      clearMsg();
      const btn = document.getElementById('btn-submit-reset');
      const email = document.getElementById('reset-email').value.trim();
      if (!email) {
        showMsg('Please enter your work email.', true);
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Sending request…';

      try {
        const res = await fetch('/api/auth/request-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        showMsg(data.message || 'Reset request sent to your administrator.', false);
      } catch (err) {
        showMsg(err.message, true);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Reset Request';
      }
    }
  </script>
</body>
</html>`;
}

export function createServer({ db, ownerEmail = OWNER_EMAIL, adminEmails = ADMIN_EMAILS, ai = aiConfig } = {}) {
  const database = db || createDatabase(DB_PATH);

  const server = http.createServer(async (req, res) => {
    try {
      const proto = req.headers['x-forwarded-proto'] || (req.socket?.encrypted ? 'https' : 'http');
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
      const url = new URL(req.url, `${proto}://${host}`);
      const pathname = url.pathname;

      // 1. Auth routes
      if (pathname === '/login' || pathname === '/signin-with-chatgpt') {
        if (req.method === 'GET') {
          // If already authenticated, redirect to /
          const identity = resolveIdentity(req.headers);
          if (identity) {
            res.writeHead(302, { 'Location': '/' });
            res.end();
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(renderLoginPage());
          return;
        }
      }

      if (pathname === '/logout' || pathname === '/signout' || pathname === '/signout-with-chatgpt') {
        res.writeHead(302, {
          'Set-Cookie': clearSessionCookie(),
          'Location': '/login'
        });
        res.end();
        return;
      }

      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const bodyText = await readBody(req);
        let email = '', password = '', code = '';
        if (req.headers['content-type']?.includes('application/json')) {
          try {
            const data = JSON.parse(bodyText);
            email = (data.email || '').trim().toLowerCase();
            password = data.password || '';
            code = (data.code || '').trim();
          } catch (e) {}
        } else {
          const params = new URLSearchParams(bodyText);
          email = (params.get('email') || '').trim().toLowerCase();
          password = params.get('password') || '';
          code = (params.get('code') || '').trim();
        }

        if (!email) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Ingresa tu usuario o correo corporativo.' }));
          return;
        }

        // Look up user in credentials
        const creds = await database.prepare('SELECT * FROM training_user_credentials WHERE email = ?').bind(email).first();
        if (!creds) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Account not found. Please contact your administrator for access.' }));
          return;
        }

        if (creds.is_active === 0) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'This account has been deactivated. Please contact your administrator.' }));
          return;
        }

        // Validate password OR OTP code
        let authenticated = false;
        if (password) {
          authenticated = verifyPassword(password, creds.password_hash, creds.salt);
        } else if (code) {
          if (creds.verification_code && creds.verification_code === code && Date.now() <= (creds.verification_code_expires || 0)) {
            authenticated = true;
            await database.prepare('UPDATE training_user_credentials SET verification_code = NULL, verification_code_expires = NULL WHERE user_id = ?').bind(creds.user_id).run();
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Código de verificación incorrecto o expirado.' }));
            return;
          }
        }

        if (!authenticated) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Incorrect password. Please try again or request a password reset.' }));
          return;
        }

        // Fetch profile and ensure Owner role
        const KNOWN_OWNERS = new Set(['milton98matus@gmail.com', 'mmatus@osrmanage.com', (ownerEmail||'').toLowerCase()].filter(Boolean));
        const isOwner = KNOWN_OWNERS.has(creds.email.toLowerCase());
        
        let profile = await database.prepare('SELECT * FROM training_profiles WHERE user_id = ?').bind(creds.user_id).first();
        if (isOwner && (!profile || profile.role !== 'owner')) {
          await database.prepare("UPDATE training_profiles SET role='owner' WHERE user_id=?").bind(creds.user_id).run();
        }
        const role = isOwner ? 'owner' : (profile?.role || 'participant');

        const user = {
          userId: creds.user_id,
          email: creds.email,
          displayName: creds.display_name,
          role: role,
          organization: creds.organization || 'OSR Manage'
        };

        await database.prepare('UPDATE training_profiles SET last_seen_at = ? WHERE user_id = ?').bind(Date.now(), creds.user_id).run();
        const cookie = createSessionCookie(user);

        if (req.headers['content-type']?.includes('application/json')) {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': cookie
          });
          res.end(JSON.stringify({ ok: true, user, redirect: '/' }));
        } else {
          res.writeHead(302, {
            'Set-Cookie': cookie,
            'Location': '/'
          });
          res.end();
        }
        return;
      }

      if (pathname === '/api/auth/send-code' && req.method === 'POST') {
        const bodyText = await readBody(req);
        let email = '';
        try {
          const data = JSON.parse(bodyText);
          email = (data.email || '').trim().toLowerCase();
        } catch (e) {
          const params = new URLSearchParams(bodyText);
          email = (params.get('email') || '').trim().toLowerCase();
        }

        if (!email) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Ingresa tu correo corporativo.' }));
          return;
        }

        const creds = await database.prepare('SELECT * FROM training_user_credentials WHERE email = ?').bind(email).first();
        if (!creds) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Usuario no encontrado. Solo los usuarios registrados pueden recibir código.' }));
          return;
        }

        const code = generateVerificationCode();
        const expires = Date.now() + 15 * 60 * 1000; // 15 mins

        await database.prepare('UPDATE training_user_credentials SET verification_code = ?, verification_code_expires = ? WHERE user_id = ?').bind(code, expires, creds.user_id).run();

        console.log(`\n==================================================`);
        console.log(`[SDRlab Auth] Código de acceso para ${email}: ${code}`);
        console.log(`Válido durante 15 minutos (Expira: ${new Date(expires).toLocaleTimeString()})`);
        console.log(`==================================================\n`);

        let sentEmail = false;
        if (RESEND_API_KEY) {
          sentEmail = await sendEmailViaResend({
            to: email,
            subject: 'Tu código de acceso a SDR Training Lab',
            html: `
              <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:10px;">
                <h2 style="color:#0b1730;margin-top:0;">SDR Lab · Código de Acceso</h2>
                <p style="color:#475569;font-size:15px;">Hola ${creds.display_name},</p>
                <p style="color:#475569;font-size:15px;">Tu código de verificación de 6 dígitos para acceder a la plataforma es:</p>
                <div style="text-align:center;padding:16px;background:#0b1730;border-radius:8px;margin:20px 0;">
                  <span style="color:#bbf451;font-size:32px;font-weight:bold;letter-spacing:6px;font-family:monospace;">${code}</span>
                </div>
                <p style="color:#64748b;font-size:13px;">Este código es válido durante 15 minutos. Si no solicitaste este acceso, puedes ignorar este mensaje.</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
                <p style="color:#94a3b8;font-size:12px;text-align:center;">OSR Manage · SDR Training Lab</p>
              </div>
            `,
            text: `Tu código de acceso a SDR Training Lab es: ${code}. Válido durante 15 minutos.`
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          message: sentEmail
            ? `Código enviado con éxito a tu correo (${email}). Revisa tu bandeja de entrada.`
            : `Código de verificación generado para ${email}. Ingrésalo a continuación para acceder.`
        }));
        return;
      }

      if (pathname === '/api/auth/request-reset' && req.method === 'POST') {
        const bodyText = await readBody(req);
        let email = '';
        try {
          const data = JSON.parse(bodyText);
          email = (data.email || '').trim().toLowerCase();
        } catch (e) {
          const params = new URLSearchParams(bodyText);
          email = (params.get('email') || '').trim().toLowerCase();
        }

        if (!email) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Ingresa tu correo.' }));
          return;
        }

        const creds = await database.prepare('SELECT * FROM training_user_credentials WHERE email = ?').bind(email).first();
        if (creds) {
          await database.prepare('UPDATE training_user_credentials SET reset_requested = 1, reset_requested_at = ? WHERE user_id = ?').bind(Date.now(), creds.user_id).run();
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          message: 'Reset request submitted. Your administrator has been notified in the Reporting portal.'
        }));
        return;
      }

      if (pathname === '/api/auth/me' && req.method === 'GET') {
        const identity = resolveIdentity(req.headers);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ authenticated: !!identity, user: identity }));
        return;
      }

      // 2. Training API endpoints (/api/*)
      if (pathname.startsWith('/api/')) {
        const identity = resolveIdentity(req.headers);
        const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : null;
        const origin = req.headers.origin || `${proto}://${host}`;

        const webRequest = new Request(url.href, {
          method: req.method,
          headers: {
            ...req.headers,
            'content-type': req.headers['content-type'] || 'application/json',
            origin
          },
          body: body ? body : undefined
        });

        const webResponse = await handleTrainingRequest(webRequest, {
          db: database,
          identity,
          ownerEmail,
          adminEmails,
          ai
        });

        const headers = {};
        for (const [k, v] of webResponse.headers.entries()) {
          headers[k] = v;
        }

        res.writeHead(webResponse.status, headers);
        const resText = await webResponse.text();
        res.end(resText);
        if (['POST', 'PUT', 'DELETE'].includes(req.method) && webResponse.status >= 200 && webResponse.status < 300) {
          scheduleCloudSync(database, 3000);
        }
        return;
      }

      // 3. Static assets & SPA Gatekeeper
      let filePath = pathname === '/' ? '/index.html' : pathname;
      if (filePath.startsWith('/lab/')) {
        filePath = filePath.slice(4);
      }
      
      const safeRelative = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
      const fullPath = path.join(PUBLIC_DIR, safeRelative);

      // Protect SPA routes and HTML pages
      if (filePath === '/index.html' || pathname === '/' || pathname.endsWith('.html') || filePath.endsWith('.html')) {
        const identity = resolveIdentity(req.headers);
        if (!identity) {
          res.writeHead(302, { 'Location': '/login' });
          res.end();
          return;
        }
      }

      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const ext = path.extname(fullPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': ext === '.html' ? 'private, no-store' : 'public, max-age=3600'
        });
        fs.createReadStream(fullPath).pipe(res);
        return;
      }

      // SPA Fallback: check authentication before serving index.html
      const identity = resolveIdentity(req.headers);
      if (!identity) {
        res.writeHead(302, { 'Location': '/login' });
        res.end();
        return;
      }

      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' });
        fs.createReadStream(indexPath).pipe(res);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } catch (err) {
      console.error('Server error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  });

  return {
    server,
    listen(port = PORT, host = HOST) {
      return new Promise((resolve) => {
        server.listen(port, host, () => {
          resolve(server);
        });
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  };
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 15000000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Auto-start when executed directly
if (process.argv[1] && process.argv[1].endsWith('standalone-server.mjs')) {
  const s = createServer();
  s.listen(PORT, HOST).then(() => {
    console.log(`\n==================================================`);
    console.log(`🚀 SDR Training Lab (Standalone Edition)`);
    console.log(`Listening on http://${HOST}:${PORT}`);
    console.log(`Owner: ${OWNER_EMAIL}`);
    console.log(`Mode: Private White-label (Credentials Protected)`);
    console.log(`==================================================\n`);
  });
}
