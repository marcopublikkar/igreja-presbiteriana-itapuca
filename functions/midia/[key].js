export async function onRequestGet({ params, env }) {
  const key = String(params.key || '');
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key)) return new Response('Não encontrado', { status: 404 });
  const image = await env.IMAGES?.get(key);
  if (!image) return new Response('Não encontrado', { status: 404 });
  return new Response(image.body, { headers: {
    'Content-Type': image.httpMetadata?.contentType || 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff'
  } });
}
