import type { ComponentDefinition, ComponentShellContext } from '../../../../src/theme-api.ts';

/** Render the search shell; the client script receives only escaped data attributes. */
export function renderSearch(context: ComponentShellContext): string {
  const search = context.search;
  if (!search.enabled) return '';
  const inputId = `pageskill-search-${String(context.doc.locale).replace(/[^a-z0-9]+/gi, '-')}-${String(context.doc.id).replace(/[^a-z0-9]+/gi, '-').slice(0, 32)}`;
  const escape = context.escapeHtml;
  return `<form class="site-search" data-local-search data-search-index="${escape(search.indexHref)}" data-search-max-results="${search.maxResults}" data-search-no-results="${escape(search.noResultsLabel)}" data-search-query-hint="${escape(search.queryHint)}" data-search-hit-title="${escape(search.hitTitleLabel)}" data-search-hit-description="${escape(search.hitDescriptionLabel)}" data-search-hit-heading="${escape(search.hitHeadingLabel)}" data-search-hit-content="${escape(search.hitContentLabel)}" data-search-hit-path="${escape(search.hitPathLabel)}" role="search"><label class="sr-only" for="${escape(inputId)}">${escape(search.label)}</label><div class="site-search-control"><input id="${escape(inputId)}" name="q" type="search" autocomplete="off" placeholder="${escape(search.placeholder)}" data-search-input><button type="submit" aria-label="${escape(search.submitLabel)}">⌕</button></div><div class="search-results" data-search-results hidden aria-live="polite" aria-label="${escape(search.resultLabel)}"></div><script type="module" src="${escape(search.scriptSrc)}"></script></form>`;
}

export const component: ComponentDefinition = {
  id: 'search',
  capabilities: ['render', 'client'],
  implementation: 'components/search/index.ts',
  resources: { styles: ['components/search/style.css'], scripts: ['components/search/script.js'] },
  i18n: 'components/search/messages.yml',
  // Search behaviour is code-owned while labels and safe limits are instance
  // data, so a site can reword the UI from theme.yml without editing JS.
  defaults: { enabled: true, maxResults: 8, shardSize: 500 },
  schema: {
    enabled: { type: 'boolean' },
    maxResults: { type: 'number', min: 1, max: 50 },
    shardSize: { type: 'number', min: 50, max: 5000 },
    // Copy is keyed by locale and may be partial; compiler fallback keeps
    // untranslated labels usable when a locale is added incrementally.
    copy: { type: 'object', additionalProperties: true }
  }
};
