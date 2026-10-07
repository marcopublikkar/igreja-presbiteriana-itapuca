import test from 'node:test';
import assert from 'node:assert/strict';
import { formatArticle } from '../lib/format.js';
import { slugify, validatePost, storeImage, accessible } from '../lib/post.js';
import { passwordHash, verifyPassword } from '../lib/auth.js';
import { onRequestGet as renderPost } from '../functions/blog/artigos/[slug].js';

test('formata texto sem alterar palavras e escapa HTML', () => {
  const html = formatArticle('Primeira frase. Segunda frase.\n\n## Esperança\n- Um item\n- Outro item\n\n<script>alert(1)</script>');
  assert.match(html, /<p>Primeira frase\. Segunda frase\.<\/p>/);
  assert.match(html, /<h2>Esperança<\/h2>/);
  assert.match(html, /<ul><li>Um item<\/li><li>Outro item<\/li><\/ul>/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('valida artigo e restringe autor aos próprios posts', () => {
  const form = new FormData();
  form.set('title', 'Uma reflexão'); form.set('summary', 'Uma reflexão sobre a esperança cristã.');
  form.set('body', 'Este é o texto da reflexão. '.repeat(6)); form.set('category', 'Fé e esperança');
  assert.equal(validatePost(form).title, 'Uma reflexão');
  assert.throws(() => validatePost(form, true), /imagem/);
  assert.equal(accessible({ author_id: 2 }, { id: 2, role: 'author' }), true);
  assert.equal(accessible({ author_id: 2 }, { id: 3, role: 'author' }), false);
  assert.equal(accessible({ author_id: 2 }, { id: 3, role: 'admin' }), true);
  assert.equal(slugify('Fé & Comunhão'), 'fe-comunhao');
});

test('senha tem hash verificável; imagem disfarçada é recusada', async () => {
  const salt = 'salt-for-test';
  const hash = await passwordHash('senha-forte-123', salt);
  assert.equal(await verifyPassword('senha-forte-123', { password_salt: salt, password_hash: hash }), true);
  assert.equal(await verifyPassword('outra-senha', { password_salt: salt, password_hash: hash }), false);
  const fake = new File(['<script>errado</script>'], 'falsa.png', { type: 'image/png' });
  await assert.rejects(storeImage(fake, { put() {} }), /JPG, PNG ou WebP/);
});

test('artigo publicado é renderizado com título seguro e listas legíveis', async () => {
  const db = { prepare() { return { bind() { return { first: async () => ({
    slug: 'exemplo', title: '<Esperança>', summary: 'Resumo do artigo', body: '## Caminho\n- Primeiro passo\n- Segundo passo',
    category: 'Reflexões', image_key: 'abc.webp', published_at: '2026-10-07 12:00:00', author: 'autor'
  }) }; } }; } };
  const response = await renderPost({ params: { slug: 'exemplo' }, env: { DB: db }, request: new Request('https://example.org/blog/artigos/exemplo') });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /&lt;Esperança&gt;/);
  assert.doesNotMatch(html, /<Esperança>/);
  assert.match(html, /<ul><li>Primeiro passo<\/li><li>Segundo passo<\/li><\/ul>/);
});
