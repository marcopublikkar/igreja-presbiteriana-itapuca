import { requireDb } from '../../../lib/auth.js';
import { imageUrl } from '../../../lib/post.js';
import { formatArticle } from '../../../lib/format.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const dateValue = value => new Date(String(value).replace(' ', 'T') + 'Z');
const shortDate = value => dateValue(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const readTime = body => Math.max(1, Math.ceil(String(body || '').trim().split(/\s+/).filter(Boolean).length / 200));
const staticPosts = [
  { url: '/blog/a-unidade-do-corpo-de-cristo-na-luta-contra-o-mal.html', image: '/assets/images/comunidade.webp', category: 'Comunhão', date: '26/09/2026', title: 'A unidade do Corpo de Cristo na luta contra o mal', summary: 'Uma reflexão sobre a unidade do Corpo de Cristo.' },
  { url: '/blog/i-corintios-121-da-ignorancia-a-maturidade-espiritual.html', image: '/assets/images/biblia.webp', category: 'Vida cristã', date: '19/09/2026', title: 'Da ignorância à maturidade espiritual', summary: 'Paulo orienta a igreja sobre a maturidade espiritual.' },
  { url: '/blog/celebrando-a-unidade-no-corpo-de-cristo-2.html', image: '/assets/images/comunidade.webp', category: 'Comunhão', date: '12/09/2026', title: 'Celebrando a unidade no Corpo de Cristo', summary: 'Uma reflexão sobre comunhão e perseverança.' }
];
function card(item) {
  const href = item.url || '/blog/artigos/' + encodeURIComponent(item.slug);
  const image = item.image || imageUrl(item.image_key);
  const published = item.date || shortDate(item.published_at);
  return '<article class="post-card"><a href="' + href + '"><img src="' + escape(image) + '" alt="Ilustração do artigo ' + escape(item.title) + '" width="1200" height="750" loading="lazy"></a><div class="post-body"><div class="post-meta"><span>' + escape(item.category) + '</span><time>' + escape(published) + '</time></div><h3><a href="' + href + '">' + escape(item.title) + '</a></h3><p>' + escape(item.summary) + '</p><a class="text-link" href="' + href + '">Leia mais</a></div></article>';
}

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
  const numericDate = shortDate(post.published_at);
  const minutes = readTime(post.body);
  const others = await db.prepare("SELECT slug,title,summary,category,image_key,published_at FROM posts WHERE status='published' AND id<>? ORDER BY published_at DESC LIMIT 3").bind(post.id).all();
  const related = (others.results || []).concat(staticPosts).slice(0, 3).map(card).join('');
  const author = escape(post.display_author || post.author || 'Igreja Presbiteriana de Itapuca');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Igreja Presbiteriana de Itapuca</title><meta name="description" content="${summary}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:type" content="article"><meta property="og:title" content="${title}"><meta property="og:description" content="${summary}"><meta property="og:image" content="${escape(new URL(image, request.url).href)}"><link rel="icon" href="/assets/images/favicon.png"><link rel="stylesheet" href="/assets/css/style.css"><script defer src="/assets/js/main.js"></script></head><body><a class="skip" href="#conteudo">Pular para o conteúdo</a><div class="topbar"><div class="container"><span>Uma comunidade de fé em Itapuca</span><a href="/programacao.html">Domingo · culto às 18h30</a></div></div><header id="header"><div class="container header-inner"><a href="/" class="brand"><img src="/assets/images/marca.png" width="450" height="150" alt="Igreja Presbiteriana de Itapuca"></a><button class="menu-toggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button><nav id="nav" aria-label="Menu principal"><a href="/">Início</a><a href="/sobre.html">Nossa Igreja</a><a href="/programacao.html">Programação</a><a href="/ministerios.html">Ministérios</a><a href="/blog/" aria-current="page">Blog</a><a href="/index.html#estudos">Estudos</a><a href="/contribua.html">Contribua</a><a href="/contato.html">Contato</a><a class="btn btn-small" href="/contato.html">Visite-nos</a></nav></div></header><main id="conteudo"><section class="page-heading article-heading"><div class="container"><nav class="breadcrumb" aria-label="Caminho da página"><a href="/">Início</a><span>/</span><a href="/blog/">Blog</a><span>/</span><span>${title}</span></nav><span class="eyebrow">${escape(post.category)}</span><h1>${title}</h1><div class="article-meta"><time datetime="${escape(String(post.published_at).slice(0, 10))}">${escape(numericDate)}</time><span>${minutes} min de leitura</span><span>${author}</span></div></div></section><section class="section"><div class="container"><img class="article-image" src="${image}" width="1200" height="750" alt="Ilustração do artigo ${title}" loading="eager"><div class="article-layout"><article class="prose">${body}</article><aside class="article-sidebar"><h2>Nesta mensagem</h2><a href="#conteudo">Voltar ao início</a><a href="/blog/">Ver todas as mensagens</a></aside></div></div></section><section class="section soft"><div class="container"><div class="section-head"><div><span class="eyebrow">Continue a leitura</span><h2>Outras mensagens.</h2></div><a class="text-link" href="/blog/">Ver todas</a></div><div class="three-grid">${related}</div></div></section></main><footer><div class="container footer-bottom"><span>© Igreja Presbiteriana de Itapuca</span><a href="/">Voltar ao início</a></div></footer></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' } });
}
