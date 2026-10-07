'use strict';
fetch('/api/posts').then(response => response.ok ? response.json() : Promise.reject()).then(({ posts }) => {
  const grid = document.querySelector('#posts');
  if (!grid || !posts?.length) return;
  const categorySelect = document.querySelector('#category');
  for (const post of posts) {
    if (![...categorySelect.options].some(option => option.value === post.category)) categorySelect.add(new Option(post.category, post.category));
    const article = document.createElement('article'); article.className = 'post-card';
    article.dataset.category = post.category; article.dataset.search = `${post.title} ${post.summary} ${post.category}`;
    const imageLink = document.createElement('a'); imageLink.href = post.url;
    const image = document.createElement('img'); image.src = post.imageUrl; image.alt = `Ilustração do artigo ${post.title}`; image.loading = 'lazy'; image.width = 1200; image.height = 750;
    imageLink.append(image);
    const body = document.createElement('div'); body.className = 'post-body';
    const meta = document.createElement('div'); meta.className = 'post-meta';
    const category = document.createElement('span'); category.textContent = post.category;
    const date = document.createElement('time'); date.dateTime = post.published_at.slice(0, 10); date.textContent = new Date(post.published_at.replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR');
    meta.append(category, date);
    const title = document.createElement('h3'); const titleLink = document.createElement('a'); titleLink.href = post.url; titleLink.textContent = post.title; title.append(titleLink);
    const summary = document.createElement('p'); summary.textContent = post.summary;
    body.append(meta, title, summary); article.append(imageLink, body); grid.prepend(article);
  }
  document.querySelector('#search').dispatchEvent(new Event('input'));
}).catch(() => {});
