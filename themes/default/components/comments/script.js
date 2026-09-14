const roots = document.querySelectorAll('[data-comments]');

const text = (root, key, fallback) => root.dataset[key] || fallback;

function addText(parent, value, className) {
  const node = document.createElement('span');
  if (className) node.className = className;
  node.textContent = value;
  parent.append(node);
  return node;
}

function renderComment(root, item) {
  const article = document.createElement('article');
  article.className = 'comment';
  article.dataset.commentId = item.id;
  const header = document.createElement('header');
  header.className = 'comment-header';
  addText(header, item.authorName || text(root, 'labelAnonymous', 'Anonymous'), 'comment-author');
  addText(header, new Date(item.createdAt).toLocaleString(), 'comment-date');
  article.append(header);
  const body = document.createElement('p');
  body.className = 'comment-body';
  body.textContent = item.body;
  article.append(body);
  const footer = document.createElement('footer');
  footer.className = 'comment-actions';
  const state = document.createElement('span');
  state.className = 'comment-translation-state';
  const setBody = (value, translated) => {
    body.textContent = value;
    state.textContent = translated ? text(root, 'labelTranslated', 'Translated') : '';
    if (translated) state.dataset.translated = 'true';
    else delete state.dataset.translated;
  };
  if (item.translated) setBody(item.body, true);
  if (item.canTranslate && root.dataset.translationEnabled === 'true') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'comment-translate';
    button.textContent = item.translated ? text(root, 'labelOriginal', 'Show original') : text(root, 'labelTranslate', 'Translate');
    button.addEventListener('click', async () => {
      if (button.dataset.mode === 'original') {
        setBody(item.originalBody || item.body, false);
        button.dataset.mode = 'translate';
        button.textContent = text(root, 'labelTranslate', 'Translate');
        return;
      }
      button.disabled = true;
      button.textContent = text(root, 'labelTranslating', 'Translating…');
      try {
        const response = await fetch(`${root.dataset.api}/${encodeURIComponent(item.id)}/translate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ targetLocale: root.dataset.locale }) });
        const result = await response.json();
        if (!response.ok || !result.body) throw new Error(result.error || 'translation failed');
        item.originalBody = item.originalBody || item.body;
        item.body = result.body;
        item.translated = true;
        setBody(result.body, true);
        button.dataset.mode = 'original';
        button.textContent = text(root, 'labelOriginal', 'Show original');
      } catch (error) {
        state.textContent = error instanceof Error ? error.message : text(root, 'labelError', 'Comments are temporarily unavailable.');
        button.textContent = text(root, 'labelTranslate', 'Translate');
      } finally { button.disabled = false; }
    });
    if (item.translated) button.dataset.mode = 'original';
    footer.append(button);
  }
  footer.append(state);
  article.append(footer);
  return article;
}

async function loadComments(root) {
  const list = root.querySelector('[data-comments-list]');
  try {
    const query = new URLSearchParams({ content: root.dataset.contentKey, locale: root.dataset.locale });
    const response = await fetch(`${root.dataset.api}?${query}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || text(root, 'labelError', 'Comments are temporarily unavailable.'));
    list.replaceChildren();
    if (!Array.isArray(result.comments) || !result.comments.length) {
      const empty = document.createElement('p');
      empty.textContent = text(root, 'labelEmpty', 'No comments yet.');
      list.append(empty);
      return;
    }
    result.comments.forEach(item => list.append(renderComment(root, item)));
  } catch (error) {
    list.replaceChildren();
    const message = document.createElement('p');
    message.textContent = error instanceof Error ? error.message : text(root, 'labelError', 'Comments are temporarily unavailable.');
    list.append(message);
  }
}

async function loadRuntimeCapabilities(root) {
  if (root.dataset.translationEnabled !== 'true') return;
  try {
    const response = await fetch(`${root.dataset.api}/capabilities`);
    const result = await response.json();
    root.dataset.translationEnabled = response.ok && result.translation === true ? 'true' : 'false';
  } catch {
    // A missing or unavailable capability endpoint means that translation is
    // not ready; comments themselves remain available.
    root.dataset.translationEnabled = 'false';
  }
}

for (const root of roots) {
  const form = root.querySelector('[data-comments-form]');
  const status = root.querySelector('[data-comments-status]');
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    button.disabled = true;
    try {
      const response = await fetch(root.dataset.api, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contentKey: root.dataset.contentKey, sourceLocale: root.dataset.locale, authorName: data.get('authorName'), body: data.get('body') }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || text(root, 'labelError', 'Comments are temporarily unavailable.'));
      form.reset();
      status.textContent = '';
      await loadComments(root);
    } catch (error) { status.textContent = error instanceof Error ? error.message : text(root, 'labelError', 'Comments are temporarily unavailable.'); }
    finally { button.disabled = false; }
  });
  void (async () => {
    await loadRuntimeCapabilities(root);
    await loadComments(root);
  })();
}
