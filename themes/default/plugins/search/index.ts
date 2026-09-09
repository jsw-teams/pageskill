import type { ThemePluginDefinition, ThemeShellContext } from '../../../../src/theme-api.ts';

export function renderSearch(context: ThemeShellContext): string {
  const search = context.search;
  if (!search.enabled) return '';
  const inputId = `pagekiln-search-${String(context.doc.locale).replace(/[^a-z0-9]+/gi, '-')}-${String(context.doc.id).replace(/[^a-z0-9]+/gi, '-').slice(0, 32)}`;
  const escape = context.escapeHtml;
  return `<form class="site-search" data-local-search data-search-index="${escape(search.indexHref)}" data-search-max-results="${search.maxResults}" data-search-no-results="${escape(search.noResultsLabel)}" data-search-query-hint="${escape(search.queryHint)}" data-search-hit-title="${escape(search.hitTitleLabel)}" data-search-hit-description="${escape(search.hitDescriptionLabel)}" data-search-hit-heading="${escape(search.hitHeadingLabel)}" data-search-hit-content="${escape(search.hitContentLabel)}" data-search-hit-path="${escape(search.hitPathLabel)}" role="search"><label class="sr-only" for="${escape(inputId)}">${escape(search.label)}</label><div class="site-search-control"><input id="${escape(inputId)}" name="q" type="search" autocomplete="off" placeholder="${escape(search.placeholder)}" data-search-input><button type="submit" aria-label="${escape(search.submitLabel)}">⌕</button></div><div class="search-results" data-search-results hidden aria-live="polite" aria-label="${escape(search.resultLabel)}"></div><script type="module" src="${escape(search.scriptSrc)}"></script></form>`;
}

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/search/index.ts',
  resources: { styles: ['plugins/search/style.css'], scripts: ['plugins/search/script.js'] },
  i18n: 'plugins/search/messages.yml',
  defaults: { enabled: true, provider: 'Pageskill', maxResults: 8, shardSize: 500 },
  schema: {
    enabled: { type: 'boolean' },
    provider: { type: 'string' },
    maxResults: { type: 'number', min: 1, max: 50 },
    shardSize: { type: 'number', min: 50, max: 5000 }
  }
};
