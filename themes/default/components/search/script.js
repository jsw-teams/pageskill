// Search stays client-side and inserts result data with text/DOM APIs only.
const root = document.querySelector('[data-local-search]');
if (root) {
  const input = root.querySelector('[data-search-input]');
  const results = root.querySelector('[data-search-results]');
  const indexUrl = root.dataset.searchIndex;
  const maxResults = Math.max(1, Number(root.dataset.searchMaxResults || 8));
  const labels = {
    title: root.dataset.searchHitTitle || 'Title match',
    description: root.dataset.searchHitDescription || 'Summary match',
    heading: root.dataset.searchHitHeading || 'Section match',
    content: root.dataset.searchHitContent || 'Content match',
    path: root.dataset.searchHitPath || 'Path match'
  };
  const tokenPattern = /[\p{L}\p{N}]+/gu;
  const cjkPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
  const tokens = value => [...new Set(String(value || '').toLocaleLowerCase().match(tokenPattern) || [])];
  const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
  const fields = entry => [
    { key: 'title', label: labels.title, value: normalize(entry.title), weight: 120 },
    { key: 'description', label: labels.description, value: normalize(entry.description), weight: 50 },
    { key: 'heading', label: labels.heading, value: normalize(entry.headings), weight: 34 },
    { key: 'content', label: labels.content, value: normalize(entry.text), weight: 20 },
    { key: 'path', label: labels.path, value: normalize(entry.url), weight: 8 }
  ];
  const setState = (state, count) => {
    root.dataset.searchState = state;
    if (count === undefined) delete root.dataset.searchCount;
    else root.dataset.searchCount = String(count);
  };
  const firstPosition = (value, terms) => {
    const source = value.toLocaleLowerCase();
    return terms.reduce((best, term) => {
      const position = source.indexOf(term);
      return position >= 0 && (best < 0 || position < best) ? position : best;
    }, -1);
  };
  const scoreEntry = (entry, terms) => {
    const entryFields = fields(entry);
    const haystack = entryFields.map(field => field.value.toLocaleLowerCase()).join(' ');
    if (!terms.length || !terms.every(term => haystack.includes(term))) return null;
    let score = 0;
    for (const field of entryFields) {
      const lower = field.value.toLocaleLowerCase();
      for (const term of terms) {
        const position = lower.indexOf(term);
        if (position < 0) continue;
        score += field.weight + Math.min(term.length, 12);
        if (position === 0) score += 10;
        if (field.key === 'title' && lower === term) score += 90;
      }
    }
    return { entry, score, fields: entryFields };
  };
  const appendHighlighted = (parent, value, terms) => {
    const source = String(value || '');
    const lower = source.toLocaleLowerCase();
    const ranges = [];
    for (const term of terms) {
      let from = 0;
      while (from < lower.length) {
        const index = lower.indexOf(term, from);
        if (index < 0) break;
        ranges.push({ start: index, end: index + term.length });
        from = index + Math.max(term.length, 1);
      }
    }
    ranges.sort((left, right) => left.start - right.start || right.end - left.end);
    let cursor = 0;
    for (const range of ranges) {
      if (range.start < cursor) continue;
      if (range.start > cursor) parent.append(document.createTextNode(source.slice(cursor, range.start)));
      const mark = document.createElement('mark');
      mark.textContent = source.slice(range.start, range.end);
      parent.append(mark);
      cursor = range.end;
    }
    if (cursor < source.length) parent.append(document.createTextNode(source.slice(cursor)));
  };
  const makeSnippet = (field, terms) => {
    const source = normalize(field.value);
    const position = firstPosition(source, terms);
    if (source.length <= 150 || position < 0) return source.slice(0, 150);
    const start = Math.max(0, position - 58);
    const end = Math.min(source.length, position + 92);
    return `${start > 0 ? '…' : ''}${source.slice(start, end)}${end < source.length ? '…' : ''}`;
  };
  let entriesPromise;
  let requestId = 0;
  let inputTimer = 0;
  const load = () => {
    if (!entriesPromise) {
      entriesPromise = fetch(indexUrl, { headers: { accept: 'application/json' } })
        .then(response => { if (!response.ok) throw new Error(`Search index request failed: ${response.status}`); return response.json(); })
        .then(async data => {
          if (Array.isArray(data)) return data;
          if (!Array.isArray(data?.shards)) return [];
          const shards = await Promise.all(data.shards.map(async shard => {
            const response = await fetch(shard, { headers: { accept: 'application/json' } });
            if (!response.ok) throw new Error(`Search shard request failed: ${response.status}`);
            return response.json();
          }));
          return shards.flatMap(shard => Array.isArray(shard) ? shard : []);
        });
    }
    return entriesPromise;
  };
  const showMessage = (message, state) => {
    results.replaceChildren();
    const empty = document.createElement('p');
    empty.className = 'search-empty';
    empty.textContent = message;
    results.append(empty);
    setState(state);
  };
  const safeSearchUrl = value => {
    if (typeof value !== 'string' || !value.trim()) return null;
    let target;
    try { target = new URL(value, window.location.href); } catch { return null; }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') return null;
    let origin;
    try { origin = window.location.origin || new URL(window.location.href).origin; } catch { return null; }
    if (!origin || origin === 'null') return null;
    return `${origin}${target.pathname}${target.search}${target.hash}`;
  };
  const show = async query => {
    const currentRequest = ++requestId;
    const terms = tokens(query.trim());
    if (!terms.length) {
      results.hidden = true;
      results.replaceChildren();
      results.removeAttribute('aria-busy');
      setState('idle', 0);
      return;
    }
    results.hidden = false;
    results.setAttribute('aria-busy', 'true');
    results.textContent = '…';
    setState('loading');
    if (terms.length === 1 && terms[0].length < 2 && !cjkPattern.test(terms[0])) {
      results.removeAttribute('aria-busy');
      showMessage(root.dataset.searchQueryHint || 'Enter at least two letters or a meaningful word', 'hint');
      return;
    }
    try {
      const entries = await load();
      if (currentRequest !== requestId) return;
      const matches = entries.map(entry => scoreEntry(entry, terms)).filter(Boolean)
        .map(match => { const href = safeSearchUrl(match.entry.url); return href ? { ...match, href } : null; })
        .filter(Boolean)
        .sort((left, right) => right.score - left.score || String(left.entry.title || '').localeCompare(String(right.entry.title || '')))
        .slice(0, maxResults);
      results.removeAttribute('aria-busy');
      results.replaceChildren();
      if (!matches.length) { showMessage(root.dataset.searchNoResults || 'No matching content.', 'empty'); return; }
      const list = document.createElement('ul');
      for (const match of matches) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = match.href;
        appendHighlighted(link, match.entry.title || match.entry.id, terms);
        const hit = match.fields.find(field => firstPosition(field.value, terms) >= 0) || match.fields[0];
        const meta = document.createElement('small');
        meta.className = 'search-result-meta';
        meta.textContent = hit.label;
        const snippet = document.createElement('p');
        snippet.className = 'search-result-snippet';
        appendHighlighted(snippet, makeSnippet(hit, terms), terms);
        item.append(link, meta, snippet);
        list.append(item);
      }
      results.append(list);
      setState('results', matches.length);
    } catch {
      if (currentRequest !== requestId) return;
      results.removeAttribute('aria-busy');
      showMessage(root.dataset.searchError || 'Search is temporarily unavailable.', 'error');
    }
  };
  root.addEventListener('submit', event => { event.preventDefault(); show(input?.value || ''); });
  input?.addEventListener('input', () => { window.clearTimeout(inputTimer); inputTimer = window.setTimeout(() => show(input.value), 90); });
  input?.addEventListener('keydown', event => { if (event.key !== 'Escape') return; input.value = ''; show(''); input.focus(); });
  document.addEventListener('click', event => { if (root.contains(event.target)) return; results.hidden = true; });
  setState('idle', 0);
}
