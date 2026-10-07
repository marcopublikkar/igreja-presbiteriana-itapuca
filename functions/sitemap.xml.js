import { requireDb } from '../lib/auth.js';

export async function onRequestGet({ env, request }) {
  const db = requireDb(env);
  const baseResponse = await env.ASSETS.fetch(new URL('/sitemap-base.xml', request.url));
  if (!baseResponse.ok) return new Response('Sitemap indisponível', { status: 503 });
  const base = await baseResponse.text();
  const rows = await db.prepare("SELECT slug,updated_at FROM posts WHERE status='published' ORDER BY published_at DESC").all();
  const origin = new URL(request.url).origin;
  const extra = rows.results.map(post => `<url><loc>${origin}/blog/artigos/${post.slug}</loc><lastmod>${post.updated_at.slice(0, 10)}</lastmod></url>`).join('');
  return new Response(base.replace('</urlset>', `${extra}</urlset>`), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
