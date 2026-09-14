import type { ComponentDefinition, ComponentRenderContext, ContentDocument } from '../../../../src/theme-api.ts';
import { postAuthor, postCover } from '../shared/index.ts';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/**
 * Archive presentation is a Component. Core supplies only the explicit
 * collection query result and archive context; titles, links, and records are
 * never embedded in this implementation.
 */
function renderArchive(input: Parameters<NonNullable<ComponentDefinition['renderDocument']>>[0], context: ComponentRenderContext): string {
  const props = record(input.props);
  const runtime = record(input.runtime);
  const collection = String(props.collection || runtime.collection || context.doc.data?.archiveCollection || 'posts');
  const category = typeof props.category === 'string' && props.category ? props.category : undefined;
  const archiveKey = String(props.archiveKey || context.doc.data?.archiveKey || collection);
  const entries = (Array.isArray(runtime.entries) ? runtime.entries : []) as ContentDocument[];
  const page = Math.max(1, Number(props.page || runtime.page || 1));
  const pages = Math.max(1, Number(props.pages || runtime.pages || 1));
  const title = String(props.title || context.doc.title);
  const description = String(props.description || context.doc.description || '');
  const pageSize = Math.max(1, Number(props.pageSize || entries.length || 1));
  const collectionLabel = category
    ? context.translate(`categories.${category}`, context.translate(`collections.${category}`, category === 'uncategorized' ? context.translate('collections.uncategorized', 'Uncategorized') : category))
    : context.translate(`collections.${archiveKey}`, archiveKey);
  const readLabel = context.translate(`archive.${collection}.continue`, context.translate('archive.continue', 'Read note'));
  const publishedLabel = context.translate('post.published', 'Published');
  const authorLabel = context.translate('post.author', 'Author');
  const pageCount = context.translate('archive.pageCount', 'Page {page} of {pages}')
    .replaceAll('{page}', String(page)).replaceAll('{pages}', String(pages));
  const listing = entries.map((entry, index) => `<article class="archive-entry">${postCover(entry, context, index, collection)}<p class="archive-entry-index"><span class="archive-entry-label">${context.escapeHtml(publishedLabel)}</span>${entry.date ? `<time datetime="${context.escapeHtml(entry.date)}">${context.escapeHtml(context.formatDate(entry.date))}</time>` : ''}</p><div class="archive-entry-main"><h2><a href="${context.safeUrl(context.url.forDocument(entry))}">${context.escapeHtml(entry.title)}</a></h2>${entry.description ? `<p class="archive-entry-summary">${context.escapeHtml(entry.description)}</p>` : ''}<p class="archive-entry-author"><span class="archive-entry-label">${context.escapeHtml(authorLabel)}</span> ${context.escapeHtml(postAuthor(entry, context))}</p><p class="archive-entry-action"><a href="${context.safeUrl(context.url.forDocument(entry))}">${context.escapeHtml(readLabel)} <span aria-hidden="true">↗</span></a></p></div></article>`).join('');
  const previous = page > 1 ? `<a href="${context.safeUrl(context.url.forArchive({ collection, category, locale: context.doc.locale, page: page - 1 }))}">${context.escapeHtml(context.translate('archive.previousPage', 'Previous page'))}</a>` : '<span aria-hidden="true"></span>';
  const next = page < pages ? `<a href="${context.safeUrl(context.url.forArchive({ collection, category, locale: context.doc.locale, page: page + 1 }))}">${context.escapeHtml(context.translate('archive.nextPage', 'Next page'))}</a>` : '<span aria-hidden="true"></span>';
  const extra = input.renderedContent || '';
  return `<div class="archive-layout"><header class="archive-header"><p class="eyebrow">${context.escapeHtml(collectionLabel)}</p><h1>${context.escapeHtml(title)}</h1>${description ? `<p>${context.escapeHtml(description)}</p>` : ''}</header><section class="archive-list">${listing}</section><nav class="archive-pagination" aria-label="${context.escapeHtml(title)}">${previous}<span class="archive-page-count">${context.escapeHtml(pageCount)}</span>${next}</nav>${extra}</div>`;
}

export const component: ComponentDefinition = {
  id: 'archive',
  capabilities: ['render'],
  contexts: ['archive'],
  renderDocument: renderArchive
};
