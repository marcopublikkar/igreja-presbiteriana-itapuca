export async function onRequestGet({ params, env }) {
  const key = decodeURIComponent(String(params.key || ''));
  if (!/^[a-z0-9][a-z0-9-]{0,180}\.(jpg|png|webp)$/i.test(key)) return new Response('Não encontrado', { status: 404 });
  const image = await env.IMAGES?.get(key);
  if (!image) return new Response('Não encontrado', { status: 404 });
  return new Response(image.body, { headers: { 'Content-Type': image.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
}