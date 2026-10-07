'use strict';
const $ = selector => document.querySelector(selector);
const loginPanel = $('#login-panel'), dashboard = $('#dashboard'), notice = $('#notice');
const postForm = $('#post-form'), list = $('#post-list'), imageInput = postForm.elements.image;
let posts = [], currentId = null, previewUrl = null;

function message(text, error = false) {
  notice.hidden = false;
  notice.classList.toggle('error', error);
  notice.textContent = text;
  notice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
  return data;
}

function setLoggedIn(user) {
  loginPanel.hidden = !!user;
  dashboard.hidden = !user;
  if (user) { $('#welcome-user').textContent = `${user.username} · ${user.role === 'admin' ? 'Administrador' : 'Autor'}`; loadPosts(); }
}

async function loadPosts() {
  try { posts = (await api('/api/admin/posts')).posts; renderPosts(); }
  catch (error) { list.textContent = error.message; }
}

function makeButton(label, action, id) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', () => action(id));
  return button;
}

function renderPosts() {
  list.replaceChildren();
  if (!posts.length) { list.textContent = 'Nenhum artigo publicado ainda.'; return; }
  for (const post of posts) {
    const card = document.createElement('div'); card.className = 'managed-post';
    const title = document.createElement('h3'); title.textContent = post.title;
    const meta = document.createElement('div'); meta.className = 'meta';
    meta.textContent = `${post.author} · ${post.status === 'published' ? 'Publicado' : post.status === 'draft' ? 'Fora do ar' : 'Lixeira'}`;
    const actions = document.createElement('div'); actions.className = 'managed-actions';
    actions.append(makeButton('Editar', editPost, post.id));
    if (post.status === 'published') actions.append(makeButton('Tirar do ar', id => changeStatus(id, 'draft'), post.id));
    else actions.append(makeButton('Publicar novamente', id => changeStatus(id, 'published'), post.id));
    if (post.status !== 'trashed') actions.append(makeButton('Lixeira', id => changeStatus(id, 'trashed'), post.id));
    actions.append(makeButton('Desfazer última alteração', undoPost, post.id));
    if (post.status === 'published') {
      const link = document.createElement('a'); link.href = `/blog/artigos/${post.slug}`; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Ver artigo'; actions.append(link);
    }
    card.append(title, meta, actions); list.append(card);
  }
}

function resetEditor() {
  postForm.reset(); currentId = null; $('#text-preview').hidden = true;
  $('#editor-title').textContent = 'Novo artigo'; $('#save-button').textContent = 'Publicar artigo';
  $('#cancel-edit').hidden = true; imageInput.required = true; $('#image-required').textContent = '(obrigatória)';
  $('#image-preview').hidden = true; $('#image-info').textContent = 'Formatos aceitos: PNG, JPG ou WebP. O envio final terá no máximo 1.600 px de largura.';
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
}

async function editPost(id) {
  try {
    const { post } = await api(`/api/admin/posts/${id}`);
    currentId = id; $('#text-preview').hidden = true;
    postForm.elements.title.value = post.title; postForm.elements.summary.value = post.summary;
    postForm.elements.category.value = post.category; postForm.elements.body.value = post.body;
    imageInput.value = ''; imageInput.required = false; $('#image-required').textContent = '(opcional para manter a atual)';
    $('#editor-title').textContent = 'Editar artigo'; $('#save-button').textContent = 'Salvar alterações'; $('#cancel-edit').hidden = false;
    const preview = $('#image-preview'); preview.src = post.imageUrl; preview.hidden = false;
    $('#image-info').textContent = 'Se quiser trocar a capa, selecione outra imagem. Ela será reduzida e convertida para WebP.';
    postForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { message(error.message, true); }
}

async function changeStatus(id, status) {
  const description = status === 'draft' ? 'tirar este artigo do ar' : status === 'trashed' ? 'mover este artigo para a lixeira' : 'publicar este artigo';
  if (!confirm(`Deseja ${description}?`)) return;
  try {
    const { post } = await api(`/api/admin/posts/${id}`);
    const form = new FormData();
    for (const key of ['title','summary','body','category']) form.set(key, post[key]);
    form.set('status', status);
    await api(`/api/admin/posts/${id}`, { method: 'PUT', body: form });
    message('Artigo atualizado.'); await loadPosts();
  } catch (error) { message(error.message, true); }
}

async function undoPost(id) {
  try {
    const { revisions } = await api(`/api/admin/posts/${id}/revisions`);
    if (!revisions.length) return message('Ainda não há uma versão anterior para restaurar.', true);
    if (!confirm(`Restaurar a versão anterior de ${revisions[0].saved_at}?`)) return;
    await api(`/api/admin/posts/${id}/restore/${revisions[0].id}`, { method: 'POST' });
    message('Versão anterior restaurada.'); await loadPosts();
    if (currentId === id) resetEditor();
  } catch (error) { message(error.message, true); }
}

async function webpImage(file) {
  if (!file) return null;
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Escolha PNG, JPG ou WebP.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bitmap.width, 1000 / bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .82));
  if (!blob || blob.type !== 'image/webp') throw new Error('Este navegador não conseguiu converter a imagem para WebP. Tente outro navegador.');
  if (blob.size > 5 * 1024 * 1024) throw new Error('A imagem ainda passou de 5 MB. Escolha uma menor.');
  return new File([blob], 'capa.webp', { type: 'image/webp' });
}

function insertAtCursor(prefix) {
  const field = $('#post-body');
  const start = field.selectionStart, end = field.selectionEnd;
  const selected = field.value.slice(start, end) || (prefix === '## ' ? 'Subtítulo' : 'Item da lista');
  const previous = start > 0 && field.value[start - 1] !== '\n' ? '\n' : '';
  const next = end < field.value.length && field.value[end] !== '\n' ? '\n' : '';
  field.setRangeText(`${previous}${prefix}${selected}${next}`, start, end, 'select');
  field.focus(); $('#text-preview').hidden = true;
}
$('#insert-heading').addEventListener('click', () => insertAtCursor('## '));
$('#insert-bullet').addEventListener('click', () => insertAtCursor('- '));
$('#post-body').addEventListener('input', () => { $('#text-preview').hidden = true; });
$('#preview-text').addEventListener('click', async () => {
  try {
    const { html } = await api('/api/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: $('#post-body').value }) });
    const preview = $('#text-preview'); preview.innerHTML = html; preview.hidden = false; preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) { message(error.message, true); }
});

imageInput.addEventListener('change', () => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  const file = imageInput.files[0];
  if (!file) return;
  previewUrl = URL.createObjectURL(file);
  $('#image-preview').src = previewUrl; $('#image-preview').hidden = false;
  $('#image-info').textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB. O formulário converterá para WebP antes de enviar.`;
});

postForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('#save-button'); button.disabled = true; button.textContent = 'Preparando imagem…';
  try {
    const form = new FormData(postForm);
    const file = imageInput.files[0];
    if (file) { const converted = await webpImage(file); form.set('image', converted); $('#image-info').textContent = `Imagem otimizada: ${(converted.size / 1024).toFixed(0)} KB, ${converted.type}.`; }
    else form.delete('image');
    if (currentId) {
      const current = posts.find(post => post.id === currentId);
      form.set('status', current?.status || 'published');
    }
    button.textContent = currentId ? 'Salvando…' : 'Publicando…';
    const result = await api(currentId ? `/api/admin/posts/${currentId}` : '/api/admin/posts', { method: currentId ? 'PUT' : 'POST', body: form });
    message(currentId ? 'Artigo atualizado.' : 'Artigo publicado!');
    resetEditor(); await loadPosts();
    if (result.url) { const link = document.createElement('a'); link.href = result.url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = ' Ver artigo publicado'; notice.append(link); }
  } catch (error) { message(error.message, true); }
  finally { button.disabled = false; button.textContent = currentId ? 'Salvar alterações' : 'Publicar artigo'; }
});

$('#cancel-edit').addEventListener('click', resetEditor);
$('#copy-prompt').addEventListener('click', async () => {
  const title = postForm.elements.title.value.trim() || '[TÍTULO DO ARTIGO]';
  const summary = postForm.elements.summary.value.trim() || '[RESUMO DO ARTIGO]';
  const prompt = `Crie uma imagem de capa horizontal, proporção 16:9, para um artigo da Igreja Presbiteriana de Itapuca. Título: “${title}”. Tema e resumo: “${summary}”. Estilo fotográfico elegante e sóbrio, luz natural, composição respeitosa e acolhedora, com espaço visual para cortes em telas menores. Não inclua palavras, letras, versículos escritos, marcas ou logotipos. Não represente Deus, Jesus ou o Espírito Santo como pessoa. Gere somente a imagem. Depois vou salvar o arquivo e enviá-lo pelo formulário do site.`;
  try { await navigator.clipboard.writeText(prompt); message('Instrução copiada. Cole no ChatGPT para gerar a imagem.'); }
  catch { message('Não foi possível copiar. Verifique a permissão de área de transferência.', true); }
});

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const { user } = await api('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(form)) });
    event.currentTarget.reset(); setLoggedIn(user); message(`Bem-vindo, ${user.username}.`);
  } catch (error) { message(error.message, true); }
});

$('#logout').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  setLoggedIn(null); resetEditor(); notice.hidden = true;
});

api('/api/auth/me').then(({ user }) => setLoggedIn(user)).catch(() => setLoggedIn(null));
if (location.hostname === '127.0.0.1' && location.port === '4174') message('Esta é uma prévia visual. O login e a publicação funcionarão depois da conexão com a Cloudflare.');
