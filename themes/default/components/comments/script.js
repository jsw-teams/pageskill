export function mount(root, runtime) {
  const text = (key, fallback) => root.dataset[key] || fallback;
  const list = root.querySelector('[data-comments-list]');
  const form = root.querySelector('[data-comments-form]');
  const status = root.querySelector('[data-comments-status]');

  const addText = (parent, value, className) => {
    const node = document.createElement('span');
    if (className) node.className = className;
    node.textContent = value;
    parent.append(node);
    return node;
  };

  const renderComment = item => {
    const article = document.createElement('article');
    article.className = 'comment';
    article.dataset.commentId = String(item.id || '');
    const header = document.createElement('header');
    header.className = 'comment-header';
    addText(header, item.authorName || text('labelAnonymous', 'Anonymous'), 'comment-author');
    const timestamp = new Date(item.createdAt);
    addText(header, Number.isNaN(timestamp.valueOf()) ? '' : timestamp.toLocaleString(), 'comment-date');
    article.append(header);
    const body = document.createElement('p');
    body.className = 'comment-body';
    body.textContent = String(item.body || '');
    article.append(body);
    const footer = document.createElement('footer');
    footer.className = 'comment-actions';
    const state = document.createElement('span');
    state.className = 'comment-translation-state';
    state.setAttribute('role', 'status');
    const setBody = (value, translated) => {
      body.textContent = String(value || '');
      state.textContent = translated ? text('labelTranslated', 'Translated') : '';
      if (translated) state.dataset.translated = 'true';
      else delete state.dataset.translated;
    };
    if (item.translated) setBody(item.body, true);
    if (item.canTranslate && root.dataset.translationEnabled === 'true') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'comment-translate';
      button.textContent = item.translated ? text('labelOriginal', 'Show original') : text('labelTranslate', 'Translate');
      button.addEventListener('click', async () => {
        if (button.dataset.mode === 'original') {
          setBody(item.originalBody || item.body, false);
          button.dataset.mode = 'translate';
          button.textContent = text('labelTranslate', 'Translate');
          return;
        }
        button.disabled = true;
        button.textContent = text('labelTranslating', 'Translating…');
        runtime.setBusy(article, true);
        try {
          const result = await runtime.apiJson(`${encodeURIComponent(item.id)}/translate`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ targetLocale: root.dataset.locale }), signal: runtime.signal
          });
          if (!result?.body) throw new runtime.ClientRequestError('The translation API returned no text.', 0, 'invalid_response');
          item.originalBody ||= item.body;
          item.body = result.body;
          item.translated = true;
          setBody(result.body, true);
          button.dataset.mode = 'original';
          button.textContent = text('labelOriginal', 'Show original');
        } catch {
          state.textContent = text('labelError', 'Comments are temporarily unavailable.');
          button.textContent = text('labelTranslate', 'Translate');
        } finally {
          button.disabled = false;
          runtime.setBusy(article, false);
        }
      }, { signal: runtime.signal });
      if (item.translated) button.dataset.mode = 'original';
      footer.append(button);
    }
    footer.append(state);
    article.append(footer);
    return article;
  };

  const unavailable = message => {
    list?.replaceChildren();
    const node = document.createElement('p');
    node.textContent = message;
    list?.append(node);
    root.dataset.runtimeState = 'unavailable';
    if (form) form.hidden = true;
  };

  const loadComments = async () => {
    runtime.setBusy(list, true);
    try {
      const query = new URLSearchParams({ content: root.dataset.contentKey || '', locale: root.dataset.locale || '' });
      const result = await runtime.apiJson(`?${query}`, { signal: runtime.signal });
      list?.replaceChildren();
      root.dataset.runtimeState = 'ready';
      if (form) form.hidden = false;
      if (!Array.isArray(result.comments) || !result.comments.length) {
        const empty = document.createElement('p');
        empty.textContent = text('labelEmpty', 'No comments yet.');
        list?.append(empty);
        return;
      }
      result.comments.forEach(item => list?.append(renderComment(item)));
    } catch {
      unavailable(text('labelError', 'Comments are temporarily unavailable.'));
    } finally {
      runtime.setBusy(list, false);
    }
  };

  const loadCapabilities = async () => {
    if (root.dataset.translationEnabled !== 'true') return;
    try {
      const result = await runtime.apiJson('capabilities', { signal: runtime.signal });
      root.dataset.translationEnabled = result.translation === true ? 'true' : 'false';
    } catch {
      root.dataset.translationEnabled = 'false';
    }
  };

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    if (button) button.disabled = true;
    runtime.setBusy(form, true);
    try {
      await runtime.apiJson('', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: runtime.signal,
        body: JSON.stringify({ contentKey: root.dataset.contentKey, sourceLocale: root.dataset.locale, authorName: data.get('authorName'), body: data.get('body') })
      });
      form.reset();
      if (status) status.textContent = '';
      await loadComments();
    } catch {
      if (status) status.textContent = text('labelError', 'Comments are temporarily unavailable.');
    } finally {
      if (button) button.disabled = false;
      runtime.setBusy(form, false);
    }
  }, { signal: runtime.signal });

  void (async () => {
    await loadCapabilities();
    await loadComments();
  })();
}
