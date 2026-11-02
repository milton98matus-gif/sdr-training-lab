import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleTrainingRequest } from '../lib/training-service.mjs';
import { createDatabase, SEEDED_ACCOUNTS } from './db.mjs';
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
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Acceso Privado · SDR Lab · OSR Manage</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #0b1730; color: #f0f4f8; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: #132247; border: 1px solid #1e356d; border-radius: 14px; width: 100%; max-width: 440px; padding: 36px 32px; box-shadow: 0 16px 40px rgba(0,0,0,0.5); }
    .header { text-align: center; margin-bottom: 24px; }
    .brand { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
    .brand span { color: #bbf451; }
    .subtitle { font-size: 11px; color: #94a3b8; margin-top: 6px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
    
    .tabs { display: flex; background: #0c1836; border-radius: 8px; padding: 4px; margin-bottom: 24px; border: 1px solid #1e356d; }
    .tab-btn { flex: 1; padding: 9px; font-size: 13px; font-weight: 600; text-align: center; border-radius: 6px; cursor: pointer; border: none; background: transparent; color: #94a3b8; transition: all 0.2s; }
    .tab-btn.active { background: #1e356d; color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
    
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
    .btn-secondary { background: #1e356d; color: #e2e8f0; margin-top: 8px; }
    .btn-secondary:hover { background: #264388; }
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
      <div class="brand">SDR<span>lab</span></div>
      <div class="subtitle">OSR Manage · Acceso Privado</div>
    </div>

    <div class="tabs">
      <button type="button" class="tab-btn active" id="tab-pwd" onclick="switchTab('password')">🔐 Contraseña</button>
      <button type="button" class="tab-btn" id="tab-otp" onclick="switchTab('otp')">✉️ Código de Acceso</button>
    </div>

    <div id="status" class="status-msg ${error ? 'error' : ''}">${error}</div>

    <!-- PANEL 1: CONTRASEÑA -->
    <div id="panel-password" class="panel active">
      <form id="form-password" onsubmit="handlePasswordLogin(event)">
        <div class="field">
          <label for="pwd-email">Usuario o Correo Corporativo</label>
          <input type="email" id="pwd-email" required placeholder="name@company.com" autocomplete="username">
        </div>
        <div class="field">
          <label for="pwd-password">Contraseña</label>
          <input type="password" id="pwd-password" required placeholder="••••••••••••" autocomplete="current-password">
        </div>
        <button type="submit" id="btn-login-pwd" class="btn btn-primary">Entrar a la Plataforma</button>
      </form>
      <div class="footer-links">
        <a class="text-link" onclick="toggleResetForm(true)">¿Olvidaste tu contraseña? Solicitar ayuda</a>
      </div>
    </div>

    <!-- PANEL 2: CÓDIGO OTP -->
    <div id="panel-otp" class="panel">
      <div id="otp-step-1">
        <div class="field">
          <label for="otp-email">Correo Corporativo</label>
          <input type="email" id="otp-email" placeholder="name@company.com">
        </div>
        <button type="button" id="btn-send-code" class="btn btn-primary" onclick="handleSendCode()">Solicitar Código de Acceso</button>
      </div>
      <div id="otp-step-2" style="display:none; margin-top:16px;">
        <div class="field">
          <label for="otp-code">Código de Verificación (6 dígitos)</label>
          <input type="text" id="otp-code" maxlength="6" placeholder="123456" style="letter-spacing: 4px; font-size: 18px; text-align: center;">
        </div>
        <button type="button" id="btn-verify-code" class="btn btn-primary" onclick="handleVerifyCode()">Verificar e Ingresar</button>
        <button type="button" class="btn btn-secondary" onclick="resetOtpStep()">Cambiar Correo</button>
      </div>
    </div>

    <!-- PANEL 3: RESET REQUEST -->
    <div id="panel-reset" class="panel">
      <p style="font-size:13px; color:#cbd5e1; margin-bottom:14px; line-height:1.4;">
        Introduce tu correo corporativo. Tu administrador recibirá tu solicitud y te asignará una nueva clave temporal.
      </p>
      <div class="field">
        <label for="reset-email">Correo Registrado</label>
        <input type="email" id="reset-email" placeholder="name@company.com">
      </div>
      <button type="button" id="btn-submit-reset" class="btn btn-primary" onclick="handleRequestReset()">Enviar Solicitud al Administrador</button>
      <div class="footer-links">
        <a class="text-link" onclick="toggleResetForm(false)">← Volver al inicio de sesión</a>
      </div>
    </div>

    <div class="badge-secure">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      Acceso exclusivo para personal autorizado de OSR Manage
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

    function switchTab(tab) {
      clearMsg();
      document.getElementById('panel-reset').classList.remove('active');
      document.getElementById('tab-pwd').classList.toggle('active', tab === 'password');
      document.getElementById('tab-otp').classList.toggle('active', tab === 'otp');
      document.getElementById('panel-password').classList.toggle('active', tab === 'password');
      document.getElementById('panel-otp').classList.toggle('active', tab === 'otp');
    }

    function toggleResetForm(show) {
      clearMsg();
      document.getElementById('panel-password').classList.toggle('active', !show);
      document.getElementById('panel-otp').classList.remove('active');
      document.getElementById('panel-reset').classList.toggle('active', show);
      document.getElementById('tab-pwd').classList.toggle('active', !show);
      document.getElementById('tab-otp').classList.remove('active');
    }

    function resetOtpStep() {
      document.getElementById('otp-step-1').style.display = 'block';
      document.getElementById('otp-step-2').style.display = 'none';
      document.getElementById('otp-code').value = '';
      clearMsg();
    }

    async function handlePasswordLogin(e) {
      e.preventDefault();
      clearMsg();
      const btn = document.getElementById('btn-login-pwd');
      const email = document.getElementById('pwd-email').value.trim();
      const password = document.getElementById('pwd-password').value;
      
      btn.disabled = true;
      btn.textContent = 'Verificando…';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Credenciales incorrectas.');
        }
        window.location.href = data.redirect || '/';
      } catch (err) {
        showMsg(err.message, true);
        btn.disabled = false;
        btn.textContent = 'Entrar a la Plataforma';
      }
    }

    async function handleSendCode() {
      clearMsg();
      const btn = document.getElementById('btn-send-code');
      const email = document.getElementById('otp-email').value.trim();
      if (!email) {
        showMsg('Ingresa tu correo corporativo.', true);
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Generando código…';

      try {
        const res = await fetch('/api/auth/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo enviar el código.');
        showMsg(data.message || 'Código generado con éxito. Ingrésalo abajo.', false);
        document.getElementById('otp-step-1').style.display = 'none';
        document.getElementById('otp-step-2').style.display = 'block';
        document.getElementById('otp-code').focus();
      } catch (err) {
        showMsg(err.message, true);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Solicitar Código de Acceso';
      }
    }

    async function handleVerifyCode() {
      clearMsg();
      const btn = document.getElementById('btn-verify-code');
      const email = document.getElementById('otp-email').value.trim();
      const code = document.getElementById('otp-code').value.trim();
      if (!code || code.length !== 6) {
        showMsg('Ingresa el código de 6 dígitos.', true);
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Verificando…';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Código incorrecto o expirado.');
        window.location.href = data.redirect || '/';
      } catch (err) {
        showMsg(err.message, true);
        btn.disabled = false;
        btn.textContent = 'Verificar e Ingresar';
      }
    }

    async function handleRequestReset() {
      clearMsg();
      const btn = document.getElementById('btn-submit-reset');
      const email = document.getElementById('reset-email').value.trim();
      if (!email) {
        showMsg('Ingresa tu correo.', true);
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Enviando solicitud…';

      try {
        const res = await fetch('/api/auth/request-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        showMsg(data.message || 'Solicitud enviada.', false);
      } catch (err) {
        showMsg(err.message, true);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar Solicitud al Administrador';
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
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
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
          res.end(JSON.stringify({ ok: false, error: 'Usuario no registrado. Solicita acceso a tu administrador.' }));
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
          res.end(JSON.stringify({ ok: false, error: 'Contraseña incorrecta. Verifica tus datos o solicita restablecimiento.' }));
          return;
        }

        // Fetch profile
        const profile = await database.prepare('SELECT * FROM training_profiles WHERE user_id = ?').bind(creds.user_id).first();
        const role = profile?.role || 'participant';

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

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          message: `Código de verificación generado para ${email}. Ingrésalo a continuación para acceder.`
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
          message: 'Solicitud enviada. Tu supervisor o administrador podrá restablecer tu clave desde el panel de control.'
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
        const origin = req.headers.origin || `http://${req.headers.host || 'localhost'}`;

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
      if (filePath === '/index.html' || pathname === '/') {
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
      if (data.length > 200000) {
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
