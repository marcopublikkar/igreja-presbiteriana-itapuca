import { json, sameOrigin, currentUser, requireDb } from '../../../lib/auth.js';
import { slugify, validatePost, storeImage, imageUrl, accessible, saveRevision } from '../../../lib/post.js';

export async function onRequest({ request, env }) {
  const db = requireDb(env);
  const user = await currentUser(request, db);
  if (!user) return json({ error: 'Entre com sua senha para continuar.' }, 401);
  const path = new URL(request.url).pathname;
  const segments = path.replace(/^\/api\/admin\/?/, '').split('/').filter(Boolean);
  if (segments[0] !== 'posts') return json({ error: 'Rota não encontrada.' }, 404);
  if (request.method !== 'GET' && !sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
  if (segments.length === 1 && request.method === 'GET') {
    const results = user.role === 'admin'
      ? await db.prepare('SELECT posts.id,slug,title,summary,category,image_key,status,updated_at,published_at,users.username AS author FROM posts JOIN users ON users.id=posts.author_id ORDER BY updated_at DESC').all()
      : await db.prepare('SELECT posts.id,slug,title,summary,category,image_key,status,updated_at,published_at,users.username AS author FROM posts JOIN users ON users.id=posts.author_id WHERE posts.author_id=? ORDER BY updated_at DESC').bind(user.id).all();
    return json({ posts: results.results.map(post => ({ ...post, imageUrl: imageUrl(post.image_key) })) });
  }
  if (segments.length === 1 && request.method === 'POST') {
    if (Number(request.headers.get('content-length') || 0) > 6 * 1024 * 1024) return json({ error: 'Arquivo muito grande.' }, 413);
    try {
      const data = validatePost(await request.formData(), true);
      const key = await storeImage(data.image, env.IMAGES);
      const slug = `${slugify(data.title)}-${crypto.randomUUID().slice(0, 8)}`;
      const inserted = await db.prepare('INSERT INTO posts (slug,author_id,title,summary,body,category,image_key) VALUES (?,?,?,?,?,?,?)')
        .bind(slug, user.id, data.title, data.summary, data.body, data.category, key).run();
      return json({ id: inserted.meta.last_row_id, url: `/blog/artigos/${slug}` }, 201);
    } catch (error) { return json({ error: error.message || 'Não foi possível publicar.' }, 400); }
  }
  const id = Number(segments[1]);
  if (!Number.isSafeInteger(id) || id < 1) return json({ error: 'Artigo inválido.' }, 400);
  const post = await db.prepare('SELECT * FROM posts WHERE id=?').bind(id).first();
  if (!accessible(post, user)) return json({ error: 'Artigo não encontrado.' }, 404);
  if (segments.length === 2 && request.method === 'GET') return json({ post: { ...post, imageUrl: imageUrl(post.image_key) } });
  if (segments.length === 2 && request.method === 'PUT') {
    if (Number(request.headers.get('content-length') || 0) > 6 * 1024 * 1024) return json({ error: 'Arquivo muito grande.' }, 413);
    try {
      const form = await request.formData();
      const data = validatePost(form);
      const requestedStatus = String(form.get('status') || post.status);
      if (!['published','draft','trashed'].includes(requestedStatus)) throw new Error('Situação inválida.');
      const key = data.image ? await storeImage(data.image, env.IMAGES) : post.image_key;
      await saveRevision(db, post, user.id);
      await db.prepare('UPDATE posts SET title=?,summary=?,body=?,category=?,image_key=?,status=?,updated_at=CURRENT_TIMESTAMP,published_at=CASE WHEN ?=\'published\' AND status<>\'published\' THEN CURRENT_TIMESTAMP ELSE published_at END WHERE id=?')
        .bind(data.title, data.summary, data.body, data.category, key, requestedStatus, requestedStatus, id).run();
      return json({ ok: true, url: `/blog/artigos/${post.slug}` });
    } catch (error) { return json({ error: error.message || 'Não foi possível salvar.' }, 400); }
  }
  if (segments[2] === 'revisions' && segments.length === 3 && request.method === 'GET') {
    const rows = await db.prepare('SELECT id,title,status,saved_at FROM post_revisions WHERE post_id=? ORDER BY id DESC LIMIT 30').bind(id).all();
    return json({ revisions: rows.results });
  }
  if (segments[2] === 'restore' && segments.length === 4 && request.method === 'POST') {
    const revisionId = Number(segments[3]);
    if (!Number.isSafeInteger(revisionId)) return json({ error: 'Versão inválida.' }, 400);
    const revision = await db.prepare('SELECT * FROM post_revisions WHERE id=? AND post_id=?').bind(revisionId, id).first();
    if (!revision) return json({ error: 'Versão não encontrada.' }, 404);
    await saveRevision(db, post, user.id);
    await db.prepare('UPDATE posts SET title=?,summary=?,body=?,category=?,image_key=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .bind(revision.title, revision.summary, revision.body, revision.category, revision.image_key, revision.status, id).run();
    return json({ ok: true });
  }
  return json({ error: 'Rota não encontrada.' }, 404);
}
