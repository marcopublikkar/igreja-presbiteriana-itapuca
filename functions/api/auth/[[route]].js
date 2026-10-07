import { json, sameOrigin, verifyPassword, createSession, currentUser, removeSession, requireDb, readJson, sha256 } from '../../../lib/auth.js';

export async function onRequest({ request, env }) {
  const db = requireDb(env);
  const path = new URL(request.url).pathname;
  if (path === '/api/auth/me' && request.method === 'GET') {
    const user = await currentUser(request, db);
    return json({ user: user || null });
  }
  if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
  if (path === '/api/auth/logout' && request.method === 'POST') {
    return json({ ok: true }, 200, { 'Set-Cookie': await removeSession(request, db) });
  }
  if (path !== '/api/auth/login' || request.method !== 'POST') return json({ error: 'Rota não encontrada.' }, 404);
  let input;
  try { input = await readJson(request, 5000); } catch { return json({ error: 'Dados inválidos.' }, 400); }
  const username = String(input.username || '').trim().toLowerCase();
  const password = String(input.password || '');
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || password.length > 200) return json({ error: 'Usuário ou senha incorretos.' }, 401);
  const client = request.headers.get('CF-Connecting-IP') || 'unknown';
  const attemptKey = await sha256(`${client}:${username}`);
  const attempt = await db.prepare('SELECT failures,blocked_until FROM login_attempts WHERE key=?').bind(attemptKey).first();
  if (attempt?.blocked_until && attempt.blocked_until > new Date().toISOString()) return json({ error: 'Tente novamente em alguns minutos.' }, 429);
  const user = await db.prepare('SELECT * FROM users WHERE username=?').bind(username).first();
  const valid = user ? await verifyPassword(password, user) : false;
  if (!valid) {
    const failures = (attempt?.failures || 0) + 1;
    const blockedUntil = failures >= 5 ? new Date(Date.now() + 15 * 60000).toISOString() : null;
    await db.prepare('INSERT INTO login_attempts (key,failures,blocked_until) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET failures=excluded.failures,blocked_until=excluded.blocked_until')
      .bind(attemptKey, blockedUntil ? 0 : failures, blockedUntil).run();
    return json({ error: 'Usuário ou senha incorretos.' }, 401);
  }
  await db.prepare('DELETE FROM login_attempts WHERE key=?').bind(attemptKey).run();
  const cookie = await createSession(db, user.id);
  return json({ user: { id: user.id, username: user.username, role: user.role } }, 200, { 'Set-Cookie': cookie });
}
