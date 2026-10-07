const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function paragraphs(text) {
  const sentences = text.trim().split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý“])/u);
  if (text.length < 650 || sentences.length < 3) return [text.trim()];
  const result = [];
  let current = '';
  for (const sentence of sentences) {
    if (current.length > 300 && current.length + sentence.length > 550) { result.push(current.trim()); current = ''; }
    current += (current ? ' ' : '') + sentence;
  }
  if (current) result.push(current.trim());
  return result;
}

export function formatArticle(source) {
  const lines = String(source || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [], list = [], ordered = false;
  function flushParagraph() {
    if (!paragraph.length) return;
    const text = paragraph.join(' ').trim();
    for (const part of paragraphs(text)) blocks.push(`<p>${escape(part)}</p>`);
    paragraph = [];
  }
  function flushList() {
    if (!list.length) return;
    blocks.push(`<${ordered ? 'ol' : 'ul'}>${list.map(item => `<li>${escape(item)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`);
    list = [];
  }
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    const number = line.match(/^\d+[.)]\s+(.+)$/);
    if (heading) { flushParagraph(); flushList(); blocks.push(`<h2>${escape(heading[1])}</h2>`); continue; }
    if (bullet || number) {
      flushParagraph();
      const nextOrdered = !!number;
      if (list.length && ordered !== nextOrdered) flushList();
      ordered = nextOrdered; list.push((bullet || number)[1]); continue;
    }
    flushList(); paragraph.push(line);
  }
  flushParagraph(); flushList();
  return blocks.join('');
}
