import { json, requireDb } from '../../lib/auth.js';
import { imageUrl } from '../../lib/post.js';

export async function onRequestGet({ env }) {
  const db = requireDb(env);
  const rows = await db.prepare("SELECT slug,title,summary,category,image_key,published_at FROM posts WHERE status='published' ORDER BY published_at DESC LIMIT 100").all();
  return json({ posts: rows.results.map(post => ({ ...post, imageUrl: imageUrl(post.image_key), url: `/blog/artigos/${post.slug}` })) }, 200, { 'Cache-Control': 'public, max-age=60' });
}
