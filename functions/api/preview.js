import { json, sameOrigin, currentUser, requireDb, readJson } from '../../lib/auth.js';
import { formatArticle } from '../../lib/format.js';

export async function onRequestPost({ request, env }) {
  const db = requireDb(env);
  if (!await currentUser(request, db)) return json({ error: 'Entre com sua senha para continuar.' }, 401);
  if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
  let input;
  try { input = await readJson(request, 65000); } catch { return json({ error: 'Texto inválido.' }, 400); }
  const body = String(input.body || '');
  if (body.length > 60000) return json({ error: 'Texto muito grande.' }, 400);
  return json({ html: formatArticle(body) });
}
