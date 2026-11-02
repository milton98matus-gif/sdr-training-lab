import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleTrainingRequest } from '../lib/training-service.mjs';
import { createDatabase } from './db.mjs';
import { resolveIdentity, createSessionCookie, clearSessionCookie } from './auth.mjs';

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
  '.ico': 'image/x-icon'
};

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const OWNER_EMAIL = process.env.TRAINING_OWNER_EMAIL || 'owner@example.com';
const ADMIN_EMAILS = process.env.TRAINING_ADMIN_EMAILS || '["admin@example.com"]';
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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sign In · SDR Training Lab</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #0b1730; color: #f0f4f8; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: #132247; border: 1px solid #1e356d; border-radius: 12px; width: 100%; max-width: 440px; padding: 32px; box-shadow: 0 12px 32px rgba(0,0,0,0.4); }
    .header { text-align: center; margin-bottom: 24px; }
    .brand { font-size: 26px; font-weight: 700; color: #fff; letter-spacing: -0.5px; }
    .brand span { color: #bbf451; }
    .subtitle { font-size: 13px; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .error { background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; padding: 10px 14px; border-radius: 6px; font-size: 14px; margin-bottom: 18px; }
    .btn-group { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
    .btn { display: block; width: 100%; padding: 12px; border-radius: 6px; font-size: 15px; font-weight: 600; text-align: center; cursor: pointer; text-decoration: none; border: none; transition: background 0.15s; }
    .btn-primary { background: #bbf451; color: #0b1730; }
    .btn-primary:hover { background: #a8e03e; }
    .btn-outline { background: transparent; border: 1px solid #2d4a8e; color: #e2e8f0; }
    .btn-outline:hover { background: #1a2f60; }
    .divider { display: flex; align-items: center; text-align: center; color: #64748b; font-size: 12px; margin: 18px 0; }
    .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #1e356d; }
    .divider::before { margin-right: 10px; }
    .divider::after { margin-left: 10px; }
    .field { margin-bottom: 14px; text-align: left; }
    label { display: block; font-size: 13px; font-weight: 500; color: #cbd5e1; margin-bottom: 6px; }
    input[type="text"], input[type="email"] { width: 100%; padding: 10px 12px; background: #0b1730; border: 1px solid #243c78; border-radius: 6px; color: #fff; font-size: 14px; }
    input:focus { outline: none; border-color: #bbf451; }
    .demo-title { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; text-align: left; }
    .demo-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 18px; }
    .demo-btn { padding: 8px 6px; font-size: 12px; background: #1a2d5a; border: 1px solid #2a4585; color: #cbd5e1; border-radius: 6px; cursor: pointer; }
    .demo-btn:hover { background: #243c78; color: #fff; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand">SDR<span>lab</span></div>
      <div class="subtitle">Judgment in Action · Sign In</div>
    </div>
    ${error ? `<div class="error">${error}</div>` : ''}

    <div class="demo-title">Quick Demo Access</div>
    <div class="demo-grid">
      <form method="POST" action="/api/auth/login">
        <input type="hidden" name="email" value="learner@example.com">
        <input type="hidden" name="name" value="SDR Trainee">
        <button type="submit" class="demo-btn" style="width:100%">Learner</button>
      </form>
      <form method="POST" action="/api/auth/login">
        <input type="hidden" name="email" value="admin@example.com">
        <input type="hidden" name="name" value="Training Admin">
        <button type="submit" class="demo-btn" style="width:100%">Admin</button>
      </form>
      <form method="POST" action="/api/auth/login">
        <input type="hidden" name="email" value="owner@example.com">
        <input type="hidden" name="name" value="Site Owner">
        <button type="submit" class="demo-btn" style="width:100%">Owner</button>
      </form>
    </div>

    <div class="divider">OR SIGN IN WITH EMAIL</div>

    <form method="POST" action="/api/auth/login">
      <div class="field">
        <label for="name">Your Name</label>
        <input type="text" id="name" name="name" required placeholder="Alex Rivera">
      </div>
      <div class="field">
        <label for="email">Work Email</label>
        <input type="email" id="email" name="email" required placeholder="alex@company.com">
      </div>
      <button type="submit" class="btn btn-primary" style="margin-top:8px">Enter Training Lab</button>
    </form>
  </div>
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
      if (pathname === '/signin-with-chatgpt' || pathname === '/login') {
        if (req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(renderLoginPage());
          return;
        }
      }

      if (pathname === '/signout-with-chatgpt' || pathname === '/logout') {
        res.writeHead(302, {
          'Set-Cookie': clearSessionCookie(),
          'Location': '/'
        });
        res.end();
        return;
      }

      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const bodyText = await readBody(req);
        let email = '', name = '';
        if (req.headers['content-type']?.includes('application/json')) {
          try {
            const data = JSON.parse(bodyText);
            email = data.email;
            name = data.name || data.displayName;
          } catch (e) {}
        } else {
          const params = new URLSearchParams(bodyText);
          email = params.get('email') || '';
          name = params.get('name') || '';
        }

        if (!email || !email.includes('@')) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(renderLoginPage('Please provide a valid email address.'));
          return;
        }

        const user = {
          userId: `usr_${Buffer.from(email.toLowerCase()).toString('hex').slice(0, 24)}`,
          email: email.toLowerCase(),
          displayName: name || email.split('@')[0]
        };

        const cookie = createSessionCookie(user);

        if (req.headers['content-type']?.includes('application/json')) {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': cookie
          });
          res.end(JSON.stringify({ ok: true, user }));
        } else {
          res.writeHead(302, {
            'Set-Cookie': cookie,
            'Location': '/'
          });
          res.end();
        }
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

      // 3. Static assets from public/lab/
      let filePath = pathname === '/' ? '/index.html' : pathname;
      if (filePath.startsWith('/lab/')) {
        filePath = filePath.slice(4);
      }
      
      const safeRelative = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
      const fullPath = path.join(PUBLIC_DIR, safeRelative);

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

      // SPA Fallback: serve index.html for client routes
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
    db: database,
    start(port = PORT, host = HOST) {
      return new Promise((resolve) => {
        server.listen(port, host, () => {
          console.log(`SDR Training Lab running at http://${host}:${port}`);
          resolve(server);
        });
      });
    },
    stop() {
      return new Promise((resolve) => {
        server.close(() => {
          if (database && typeof database.close === 'function') database.close();
          resolve();
        });
      });
    }
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Only auto-start when invoked directly from command line
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const app = createServer();
  app.start();
}
