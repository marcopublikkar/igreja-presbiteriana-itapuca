import { requireDb } from '../../../lib/auth.js';
import { imageUrl } from '../../../lib/post.js';
import { formatArticle } from '../../../lib/format.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const date = v => new Date(String(v).replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR', { timeZone:'America/Sao_Paulo' });
const minutes = body => Math.max(1, Math.ceil(String(body || '').trim().split(/\s+/).filter(Boolean).length / 200));
const SITE = 'https://presbiterianadeitapuca.com.br';
const iso = v => { const d = new Date(String(v || '').replace(' ', 'T') + 'Z'); return Number.isNaN(d.getTime()) ? undefined : d.toISOString(); };
function excerpt(text, max = 155) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:–-]+$/, '') + '…';
}
const ldJson = value => JSON.stringify(value).replace(/</g, '\\u003c');
const fixed = [{url:'/blog/a-unidade-do-corpo-de-cristo-na-luta-contra-o-mal',image:'/assets/images/comunidade.webp',category:'Comunhão',date:'26/09/2026',title:'A unidade do Corpo de Cristo na luta contra o mal',summary:'Uma reflexão sobre a unidade do Corpo de Cristo.'},{url:'/blog/i-corintios-121-da-ignorancia-a-maturidade-espiritual',image:'/assets/images/biblia.webp',category:'Vida cristã',date:'19/09/2026',title:'Da ignorância à maturidade espiritual',summary:'Paulo orienta a igreja sobre a maturidade espiritual.'},{url:'/blog/celebrando-a-unidade-no-corpo-de-cristo-2',image:'/assets/images/comunidade.webp',category:'Comunhão',date:'12/09/2026',title:'Celebrando a unidade no Corpo de Cristo',summary:'Uma reflexão sobre comunhão e perseverança.'}];
function card(p) { const href=p.url || '/blog/artigos/' + encodeURIComponent(p.slug); const image=p.image || imageUrl(p.image_key); const when=p.date || date(p.published_at); return '<article class="post-card"><a href="'+href+'"><img src="'+esc(image)+'" alt="Ilustração do artigo '+esc(p.title)+'" width="1200" height="750" loading="lazy"></a><div class="post-body"><div class="post-meta"><span>'+esc(p.category)+'</span><time>'+esc(when)+'</time></div><h3><a href="'+href+'">'+esc(p.title)+'</a></h3><p>'+esc(p.summary)+'</p><a class="text-link" href="'+href+'">Leia mais</a></div></article>'; }

export async function onRequestGet({ params, env, request }) {
  const slug=String(params.slug || ''); if (!/^[a-z0-9-]{1,100}$/.test(slug)) return new Response('Artigo não encontrado',{status:404});
  const db=requireDb(env); const post=await db.prepare("SELECT posts.*,users.username AS author FROM posts JOIN users ON users.id=posts.author_id WHERE posts.slug=? AND posts.status='published'").bind(slug).first();
  if (!post) return new Response('Artigo não encontrado',{status:404});
  const other=await db.prepare("SELECT slug,title,summary,category,image_key,published_at FROM posts WHERE status='published' AND id<>? ORDER BY published_at DESC LIMIT 3").bind(post.id).all();
  const title=esc(post.title), summary=esc(post.summary), image=imageUrl(post.image_key), author=esc(post.display_author || post.author || 'Igreja Presbiteriana de Itapuca');
  const related=(other.results || []).concat(fixed).slice(0,3).map(card).join(''); const when=date(post.published_at); const html=formatArticle(post.body);
  const canonical=SITE+'/blog/artigos/'+slug, description=excerpt(post.summary), imageAbs=new URL(image,SITE).href, authorName=post.display_author || post.author || 'Igreja Presbiteriana de Itapuca';
  const published=iso(post.published_at), modified=iso(post.updated_at) || published;
  const graph=[
    {'@context':'https://schema.org','@type':'Church','@id':SITE+'/#igreja','name':'Igreja Presbiteriana de Itapuca','url':SITE+'/','logo':SITE+'/assets/images/marca.png','telephone':'+55-24-99831-0337','address':{'@type':'PostalAddress','streetAddress':'Rua Padre José de Anchieta, 65','addressLocality':'Resende','addressRegion':'RJ','postalCode':'27500-000','addressCountry':'BR'},'sameAs':['https://www.facebook.com/ipbItapuca','https://www.youtube.com/@presbiterianadeitapuca','https://www.instagram.com/presbiterianadeitapuca/']},
    {'@context':'https://schema.org','@type':'BlogPosting','@id':canonical+'#artigo','mainEntityOfPage':canonical,'url':canonical,'headline':String(post.title).slice(0,110),'description':description,'image':imageAbs,'datePublished':published,'dateModified':modified,'inLanguage':'pt-BR','articleSection':post.category,'author':{'@type':'Person','name':authorName},'publisher':{'@id':SITE+'/#igreja'}},
    {'@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Início','item':SITE+'/'},{'@type':'ListItem','position':2,'name':'Blog','item':SITE+'/blog/'},{'@type':'ListItem','position':3,'name':post.title,'item':canonical}]}
  ];
  const meta='<meta name="description" content="'+esc(description)+'"><meta name="theme-color" content="#075440"><link rel="canonical" href="'+canonical+'"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="geo.region" content="BR-RJ"><meta name="geo.placename" content="Resende">'
    +'<meta property="og:type" content="article"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="Igreja Presbiteriana de Itapuca"><meta property="og:title" content="'+title+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+canonical+'"><meta property="og:image" content="'+esc(imageAbs)+'"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="750">'
    +(published ? '<meta property="article:published_time" content="'+published+'">' : '')+'<meta property="article:section" content="'+esc(post.category)+'">'
    +'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+title+'"><meta name="twitter:description" content="'+esc(description)+'"><meta name="twitter:image" content="'+esc(imageAbs)+'">'
    +'<link rel="icon" href="/favicon.ico" sizes="32x32"><link rel="icon" type="image/png" sizes="192x192" href="/assets/images/icon-192.png"><link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">'
    +'<script type="application/ld+json">'+ldJson(graph)+'</script>';
  const page='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+' | Igreja Presbiteriana de Itapuca</title>'+meta+'<link rel="stylesheet" href="/assets/css/style.css"><script defer src="/assets/js/main.js"></script></head><body><a class="skip" href="#conteudo">Pular para o conteúdo</a><div class="topbar"><div class="container"><span>Uma comunidade de fé em Itapuca</span><a href="/programacao">Domingo · culto às 18h30</a></div></div><header id="header"><div class="container header-inner"><a href="/" class="brand"><img src="/assets/images/marca.png" width="450" height="150" alt="Igreja Presbiteriana de Itapuca"></a><nav id="nav" aria-label="Menu principal"><a href="/">Início</a><a href="/blog/" aria-current="page">Blog</a><a href="/contato">Contato</a><a class="btn btn-small" href="/contato">Visite-nos</a></nav></div></header><main id="conteudo"><section class="page-heading article-heading"><div class="container"><nav class="breadcrumb"><a href="/">Início</a><span>/</span><a href="/blog/">Blog</a><span>/</span><span>'+title+'</span></nav><span class="eyebrow">'+esc(post.category)+'</span><h1>'+title+'</h1><div class="article-meta"><time>'+esc(when)+'</time><span>'+minutes(post.body)+' min de leitura</span><span>'+author+'</span></div></div></section><section class="section"><div class="container"><img class="article-image" src="'+esc(image)+'" alt="Ilustração do artigo '+title+'" width="1200" height="750"><div class="article-layout"><article class="prose">'+html+'</article><aside class="article-sidebar"><h2>Nesta mensagem</h2><a href="/blog/">Ver todas as mensagens</a></aside></div></div></section><section class="section soft"><div class="container"><div class="section-head"><div><span class="eyebrow">Continue a leitura</span><h2>Outras mensagens.</h2></div><a class="text-link" href="/blog/">Ver todas</a></div><div class="three-grid">'+related+'</div></div></section></main><footer><div class="container footer-bottom"><span>© Igreja Presbiteriana de Itapuca</span><a href="/">Voltar ao início</a></div></footer></body></html>';
  return new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=60'}});
}

export async function onRequestHead(context) {
  const res = await onRequestGet(context);
  return new Response(null, { status: res.status, headers: res.headers });
}
