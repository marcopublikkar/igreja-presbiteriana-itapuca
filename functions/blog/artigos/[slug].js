import { requireDb } from '../../../lib/auth.js';
import { imageUrl } from '../../../lib/post.js';
import { formatArticle } from '../../../lib/format.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export async function onRequestGet({ params, env, request }) {
  const slug = String(params.slug || '');
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return new Response('Artigo não encontrado', { status: 404 });
  const db = requireDb(env);
  const post = await db.prepare("SELECT posts.*,users.username AS author FROM posts JOIN users ON users.id=posts.author_id WHERE posts.slug=? AND posts.status='published'").bind(slug).first();
  if (!post) return new Response('Artigo não encontrado', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const title = escape(post.title);
  const summary = escape(post.summary);
  const image = imageUrl(post.image_key);
  const canonical = new URL(request.url).origin + `/blog/artigos/${encodeURIComponent(slug)}`;
  const body = formatArticle(post.body);
  const date = new Date(post.published_at.replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', year: 'numeric' });
  const numericDate = new Date(post.published_at.replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const others = await db.prepare("SELECT slug,title,summary,category,image_key,published_at FROM posts WHERE status='published' AND id<>? ORDER BY published_at DESC LIMIT 3").bind(post.id).all();
  const related = others.results.map(item => `<article class="post-card"><a href="/blog/artigos/${encodeURIComponent(item.slug)}"><img src="${imageUrl(item.image_key)}" alt="Ilustração do artigo ${escape(item.title)}" width="1200" height="750" loading="lazy"></a><div class="post-body"><div class="post-meta"><span>${escape(item.category)}</span><time datetime="${escape(String(item.published_at).slice(0, 10))}">${escape(new Date(item.published_at.replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }))}</time></div><h3><a href="/blog/artigos/${encodeURIComponent(item.slug)}">${escape(item.title)}</a></h3><p>${escape(item.summary)}</p><a class="text-link" href="/blog/artigos/${encodeURIComponent(item.slug)}">Leia mais</a></div></article>`).join('');
  const author = escape(post.display_author || post.author || 'Igreja Presbiteriana de Itapuca');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Igreja Presbiteriana de Itapuca</title><meta name="description" content="${summary}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:type" content="article"><meta property="og:title" content="${title}"><meta property="og:description" content="${summary}"><meta property="og:image" content="${escape(new URL(image, request.url).href)}"><link rel="icon" href="/assets/images/favicon.png"><link rel="stylesheet" href="/assets/css/style.css"></head><body><a class="skip" href="#conteudo">Pular para o conteúdo</a><header><div class="container header-inner"><a class="brand" href="/"><img src="/assets/images/marca.png" width="450" height="150" alt="Igreja Presbiteriana de Itapuca"></a><nav id="nav" aria-label="Menu principal"><a href="/">Início</a><a href="/blog/">Blog</a><a href="/contato.html">Contato</a></nav></div></header><main id="conteudo"><section class="section"><div class="container" style="max-width:830px"><a class="text-link" href="/blog/">← Voltar ao blog</a><span class="eyebrow" style="margin-top:35px">${escape(post.category)} · ${escape(numericDate)}</span><h1>${title}</h1><p style="font-size:1.15rem">${summary}</p><img src="${image}" width="1200" height="750" alt="Ilustração do artigo ${title}" style="width:100%;height:auto;aspect-ratio:16/10;object-fit:cover;border-radius:16px;margin:32px 0"><article class="prose">${body}</article><p style="margin-top:45px">Publicado por ${author}.</p></div></section>${related ? `<section class="section soft"><div class="container"><div class="section-head"><div><span class="eyebrow">Continue a leitura</span><h2>Mais mensagens.</h2></div><a class="text-link" href="/blog/">Ver todas</a></div><div class="three-grid">${related}</div></div></section>` : ''}</main><footer><div class="container footer-bottom"><span>© Igreja Presbiteriana de Itapuca</span><a href="/">Voltar ao início</a></div></footer></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' } });
}
