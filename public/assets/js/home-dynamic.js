'use strict';
fetch('/api/posts').then(response => response.ok ? response.json() : Promise.reject()).then(({ posts }) => {
  if (!posts?.length) return;
  const section = [...document.querySelectorAll('section')].find(node => node.querySelector('a[href="blog/index.html"]')?.textContent.includes('Explore o blog'));
  const grid = section?.querySelector('.three-grid');
  if (!grid) return;
  for (const post of posts.slice(0, 3).reverse()) {
    const card = document.createElement('article'); card.className = 'post-card';
    const imageLink = document.createElement('a'); imageLink.href = post.url;
    const image = document.createElement('img'); image.src = post.imageUrl; image.alt = `Ilustração do artigo ${post.title}`; image.loading = 'lazy'; image.width = 1200; image.height = 750; imageLink.append(image);
    const body = document.createElement('div'); body.className = 'post-body';
    const meta = document.createElement('div'); meta.className = 'post-meta';
    const category = document.createElement('span'); category.textContent = post.category;
    const date = document.createElement('time'); date.dateTime = post.published_at.slice(0, 10); date.textContent = new Date(post.published_at.replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR');
    meta.append(category, date);
    const title = document.createElement('h3'); const titleLink = document.createElement('a'); titleLink.href = post.url; titleLink.textContent = post.title; title.append(titleLink);
    const summary = document.createElement('p'); summary.textContent = post.summary;
    const more = document.createElement('a'); more.className = 'text-link'; more.href = post.url; more.textContent = 'Leia mais';
    body.append(meta, title, summary, more); card.append(imageLink, body); grid.prepend(card);
  }
  while (grid.children.length > 3) grid.lastElementChild.remove();
}).catch(() => {});
