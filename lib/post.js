export function slugify(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || 'mensagem';
}

export function validatePost(input, requireImage = false) {
  const title = String(input.get('title') || '').trim();
  const summary = String(input.get('summary') || '').trim();
  const body = String(input.get('body') || '').trim();
  const category = String(input.get('category') || 'Reflexões').trim();
  const displayAuthor = String(input.get('display_author') || 'Rev. Elton de Campos').trim();
  const image = input.get('image');
  if (title.length < 5 || title.length > 160) throw new Error('O título deve ter entre 5 e 160 caracteres.');
  if (summary.length < 15 || summary.length > 350) throw new Error('O resumo deve ter entre 15 e 350 caracteres.');
  if (body.length < 80 || body.length > 60000) throw new Error('O texto deve ter entre 80 e 60.000 caracteres.');
  if (category.length < 2 || category.length > 50) throw new Error('Confira o tema do artigo.');
  if (displayAuthor.length < 3 || displayAuthor.length > 100) throw new Error('Confira o autor da mensagem.');
  if (requireImage && !(image instanceof File && image.size)) throw new Error('Escolha uma imagem para publicar.');
  return { title, summary, body, category, displayAuthor, image: image instanceof File && image.size ? image : null };
}

export async function storeImage(file, bucket, title = 'mensagem') {
  if (!bucket) throw new Error('Armazenamento de imagens não configurado.');
  if (file.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter até 5 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let ext, type;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) { ext = 'jpg'; type = 'image/jpeg'; }
  else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) { ext = 'png'; type = 'image/png'; }
  else if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') { ext = 'webp'; type = 'image/webp'; }
  else throw new Error('Envie uma imagem JPG, PNG ou WebP.');
  const key = `igreja-presbiteriana-de-itapuca-${slugify(title)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  await bucket.put(key, bytes, { httpMetadata: { contentType: type } });
  return key;
}

export function imageUrl(key) { return `/midia/${encodeURIComponent(key)}`; }
export function accessible(post, user) { return post && (user.role === 'admin' || post.author_id === user.id); }

export async function saveRevision(db, post, actorId) {
  await db.prepare('INSERT INTO post_revisions (post_id,actor_id,title,summary,body,category,display_author,image_key,status) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(post.id, actorId, post.title, post.summary, post.body, post.category, post.display_author || 'Rev. Elton de Campos', post.image_key, post.status).run();
}
