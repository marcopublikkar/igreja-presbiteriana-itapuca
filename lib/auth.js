const encoder = new TextEncoder();

export function json(value, status = 200, extra = {}) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
}

export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  return origin === new URL(request.url).origin;
}

export async function sha256(value) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

export async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 210000, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('');
}

function equalHex(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

export async function verifyPassword(password, user) {
  return equalHex(await passwordHash(password, user.password_salt), user.password_hash);
}

export async function createSession(db, userId) {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  const tokenHash = await sha256(token);
  const expiry = new Date(Date.now() + 7 * 86400000).toISOString();
  await db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').bind(tokenHash, userId, expiry).run();
  return `ipi_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`;
}

export async function currentUser(request, db) {
  const token = request.headers.get('Cookie')?.match(/(?:^|;\s*)ipi_session=([0-9a-f]{64})(?:;|$)/)?.[1];
  if (!token) return null;
  return db.prepare('SELECT users.id,users.username,users.role FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?')
    .bind(await sha256(token), new Date().toISOString()).first();
}

export async function removeSession(request, db) {
  const token = request.headers.get('Cookie')?.match(/(?:^|;\s*)ipi_session=([0-9a-f]{64})(?:;|$)/)?.[1];
  if (token) await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha256(token)).run();
  return 'ipi_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}

export function requireDb(env) {
  if (!env.DB) throw new Error('D1 binding DB não configurado');
  return env.DB;
}

export async function readJson(request, maxBytes = 120000) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('Envie JSON.');
  if (Number(request.headers.get('content-length') || 0) > maxBytes) throw new Error('Texto muito grande.');
  const raw = await request.text();
  if (raw.length > maxBytes) throw new Error('Texto muito grande.');
  return JSON.parse(raw);
}
