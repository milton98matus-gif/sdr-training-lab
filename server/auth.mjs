import crypto from 'node:crypto';

const SESSION_COOKIE_NAME = 'sdr_session';
const DEFAULT_SECRET = 'sdr-lab-standalone-secret-key-2026';

function signToken(payload, secret = DEFAULT_SECRET) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyToken(token, secret = DEFAULT_SECRET) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  }
  return cookies;
}

export function createSessionCookie(user, secret = DEFAULT_SECRET) {
  const payload = {
    userId: user.userId,
    email: user.email.toLowerCase(),
    displayName: user.displayName || user.email,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
  };
  const token = signToken(payload, secret);
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function resolveIdentity(headers, secret = DEFAULT_SECRET) {
  // 1. Check reverse-proxy custom headers
  const headerUserId = headers['x-user-id'] || headers['oai-authenticated-user-id'];
  const headerEmail = headers['x-user-email'] || headers['oai-authenticated-user-email'];
  const headerName = headers['x-user-name'] || headers['oai-authenticated-user-full-name'];
  if (headerUserId && headerEmail) {
    return {
      userId: headerUserId,
      email: headerEmail.toLowerCase(),
      displayName: headerName || headerEmail
    };
  }

  // 2. Check Authorization Bearer token
  const authHeader = headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const payload = verifyToken(token, secret);
    if (payload?.userId && payload?.email) {
      return {
        userId: payload.userId,
        email: payload.email.toLowerCase(),
        displayName: payload.displayName || payload.email
      };
    }
  }

  // 3. Check Session Cookie
  const cookieHeader = headers['cookie'];
  const cookies = parseCookies(cookieHeader);
  const sessionToken = cookies[SESSION_COOKIE_NAME];
  if (sessionToken) {
    const payload = verifyToken(sessionToken, secret);
    if (payload?.userId && payload?.email) {
      return {
        userId: payload.userId,
        email: payload.email.toLowerCase(),
        displayName: payload.displayName || payload.email
      };
    }
  }

  return null;
}

export async function verifyGoogleIdToken(idToken) {
  // In production with outbound access, call Google tokeninfo endpoint:
  // https://oauth2.googleapis.com/tokeninfo?id_token=...
  // Or decode JWT payload and verify signature.
  try {
    const parts = idToken.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!payload.email || !payload.sub) return null;
    return {
      userId: `google_${payload.sub}`,
      email: payload.email.toLowerCase(),
      displayName: payload.name || payload.email
    };
  } catch (e) {
    return null;
  }
}
