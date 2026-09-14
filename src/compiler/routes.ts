import { escapeHtml, safeUrl } from '../lib/safe-html.ts';
import { parseIsoTimestamp } from '../lib/content-dates.ts';
import type { ContentQueryOptions } from '../theme-api.ts';
import type { BuildContext, Document } from './types.ts';

export function collectionKey(collection: string, locale: string): string {
  return `${collection}:${locale}`;
}

export function translationKey(collection: string, id: string): string {
  return `${collection}:${id}`;
}

/** Stable identity shared by every locale variant of one content item. */
export const contentKey = translationKey;

export function documentKey(doc: Pick<Document, 'collection' | 'id' | 'locale'>): string {
  return `${doc.collection}:${doc.id}:${doc.locale}`;
}

export function postCategory(doc: Pick<Document, 'collection' | 'data'>): string {
  if (doc.collection !== 'posts') return '';
  const value = doc.data?.category ?? '';
  return String(value).trim().toLocaleLowerCase() || 'uncategorized';
}

export function sourceDocuments(ctx: BuildContext): Document[] {
  return ctx.docs;
}

export function collectionContentKind(ctx: BuildContext, collection: string): string {
  const settings = ctx.config.content?.collections?.[collection];
  if (settings && typeof settings === 'object' && !Array.isArray(settings) && settings.contentType) return String(settings.contentType);
  if (collection === 'updates') return 'release';
  if (collection === 'posts') return 'post';
  return 'page';
}

function compareDocuments(left: Document, right: Document, orderBy: string): number {
  if (orderBy === 'title:asc') return left.title.localeCompare(right.title);
  if (orderBy === 'title:desc') return right.title.localeCompare(left.title);
  const publication = comparePublicationOrder(left, right);
  return orderBy === 'date:asc' ? -publication : publication;
}

/** Stable, renderer-owned query boundary for Components. */
export function queryDocuments(ctx: BuildContext, options: ContentQueryOptions = {}): Document[] {
  const locale = String(options.locale || ctx.config.defaultLocale || 'en');
  const category = options.category === undefined ? undefined : String(options.category).trim().toLocaleLowerCase() || 'uncategorized';
  const documents = sourceDocuments(ctx).filter(doc => {
    if (doc.locale !== locale) return false;
    if (options.collection && doc.collection !== options.collection) return false;
    if (options.kind && collectionContentKind(ctx, doc.collection) !== String(options.kind)) return false;
    if (category !== undefined && postCategory(doc) !== category) return false;
    return true;
  });
  const orderBy = String(options.orderBy || (options.collection ? ctx.config.content?.collections?.[options.collection]?.orderBy : '') || 'date:desc');
  documents.sort((left, right) => compareDocuments(left, right, orderBy));
  const offset = Number.isInteger(options.offset) && Number(options.offset) > 0 ? Number(options.offset) : 0;
  const limit = Number.isInteger(options.limit) && Number(options.limit) >= 0 ? Number(options.limit) : undefined;
  return limit === undefined ? documents.slice(offset) : documents.slice(offset, offset + limit);
}

export function documentsForCollection(ctx: BuildContext, collection: string, locale: string): Document[] {
  const category = collection.startsWith('category:') ? collection.slice('category:'.length).trim().toLocaleLowerCase() : undefined;
  return queryDocuments(ctx, category === undefined ? { collection, locale } : { collection: 'posts', category, locale });
}

export function routeFor(ctx: BuildContext, doc: Document): string {
  if (doc.data?.route) return String(doc.data.route).replace(':locale', doc.locale).replace(/\/+/g, '/').replace(/([^:])\/\//g, '$1/');
  const routeConfig = ctx.config.content?.collections?.[doc.collection]?.route || '/:locale/:id/';
  return String(routeConfig).replace(':locale', doc.locale).replace(':id', doc.id === 'home' ? '' : doc.id).replace(/\/+/g, '/').replace(/([^:])\/\//g, '$1/');
}

export function archiveRouteFor(ctx: BuildContext, options: { collection?: string; category?: string; locale?: string; page?: number } = {}): string {
  const collection = String(options.collection || 'posts');
  const locale = String(options.locale || ctx.config.defaultLocale || 'en');
  const settings = ctx.config.content?.collections?.[collection];
  const archive = settings && typeof settings === 'object' && !Array.isArray(settings) && settings.archive && typeof settings.archive === 'object' ? settings.archive : {};
  const rawBase = options.category
    ? (archive.categoryRoute || `${String(archive.route || `/:locale/${collection}/`).replace(/\/+$/, '')}/category/:category/`)
    : archive.route || `/:locale/${collection}/`;
  const base = String(rawBase)
    .replaceAll(':locale', locale)
    .replaceAll(':collection', collection)
    .replaceAll(':category', encodeURIComponent(String(options.category || '')))
    .replace(/\/{2,}/g, '/')
    .replace(/([^:])\/\//g, '$1/');
  const page = Math.max(1, Number(options.page || 1));
  return page === 1 ? `/${base.replace(/^\/+|\/+$/g, '')}/` : `/${base.replace(/^\/+|\/+$/g, '')}/page/${page}/`;
}

export function blogRelationsFor(
  ctx: BuildContext,
  doc: Document,
  translate: (locale: string, key: string, fallback: string) => string
): string {
  const posts = documentsForCollection(ctx, doc.collection, doc.locale);
  const index = posts.findIndex(candidate => candidate.id === doc.id && candidate.locale === doc.locale);
  const newer = index > 0 ? posts[index - 1] : undefined;
  const older = index >= 0 && index + 1 < posts.length ? posts[index + 1] : undefined;
  const tags = Array.isArray(doc.data.tags) ? doc.data.tags.map(String) : [];
  const related: Document[] = [];
  const candidates = tags.length
    ? tags.flatMap(tag => (ctx.tagIndex.get(`${doc.collection}:${doc.locale}:${tag}`) || []).filter(candidate => candidate.collection === doc.collection))
    : [posts[index - 1], posts[index + 1], posts[0], posts[1], posts[2], posts[3]];
  for (const candidate of candidates) if (candidate && candidate.id !== doc.id && !related.some(entry => entry.id === candidate.id)) {
    related.push(candidate);
    if (related.length === 3) break;
  }
  const relationLink = (label: string, candidate: Document | undefined) => candidate ? `<a class="post-pagination-link" href="${safeUrl(routeFor(ctx, candidate))}" aria-label="${escapeHtml(`${label}: ${candidate.title}`)}"><span class="post-pagination-label">${escapeHtml(label)}</span><strong>${escapeHtml(candidate.title)}</strong></a>` : '';
  const previousLabel = translate(doc.locale, 'previous', 'Previous post');
  const nextLabel = translate(doc.locale, 'next', 'Next post');
  const relatedLabel = translate(doc.locale, 'related', 'Related');
  const paginationLabel = translate(doc.locale, 'postPagination', 'Post navigation');
  return `<footer class="post-relations"><nav class="post-pagination" aria-label="${escapeHtml(paginationLabel)}">${relationLink(previousLabel, newer)}${relationLink(nextLabel, older)}</nav>${related.length ? `<section class="related-posts"><h2>${escapeHtml(relatedLabel)}</h2><ul>${related.map(candidate => `<li><a href="${safeUrl(routeFor(ctx, candidate))}">${escapeHtml(candidate.title)}</a></li>`).join('')}</ul></section>` : ''}</footer>`;
}

export function rebuildDocumentIndexes(ctx: BuildContext): void {
  ctx.collectionIndex.clear();
  ctx.translationIndex.clear();
  ctx.documentPositions.clear();
  ctx.tagIndex.clear();
  for (const doc of ctx.routes.values()) {
    if (doc.source.startsWith('fallback:')) continue;
    const key = translationKey(doc.collection, doc.id);
    const translations = ctx.translationIndex.get(key) || [];
    if (!translations.some(candidate => candidate.locale === doc.locale)) translations.push(doc);
    ctx.translationIndex.set(key, translations);
  }
  for (const translations of ctx.translationIndex.values()) translations.sort((left, right) => left.locale.localeCompare(right.locale));
  for (const doc of ctx.docs) {
    const key = collectionKey(doc.collection, doc.locale);
    ctx.collectionIndex.set(key, [...(ctx.collectionIndex.get(key) || []), doc]);
    for (const tag of Array.isArray(doc.data.tags) ? doc.data.tags.map(String) : []) {
      const tagKey = `${doc.collection}:${doc.locale}:${tag}`;
      ctx.tagIndex.set(tagKey, [...(ctx.tagIndex.get(tagKey) || []), doc]);
    }
  }
  for (const documents of ctx.collectionIndex.values()) {
    documents.sort((left, right) => comparePublicationOrder(left, right));
    documents.forEach((doc, index) => ctx.documentPositions.set(documentKey(doc), index));
  }
}

export function comparePublicationOrder(left: Pick<Document, 'id' | 'date'>, right: Pick<Document, 'id' | 'date'>): number {
  const leftTime = parseIsoTimestamp(left.date);
  const rightTime = parseIsoTimestamp(right.date);
  if (leftTime === undefined && rightTime !== undefined) return 1;
  if (leftTime !== undefined && rightTime === undefined) return -1;
  if (leftTime !== undefined && rightTime !== undefined && leftTime !== rightTime) return rightTime - leftTime;
  return left.id.localeCompare(right.id);
}

export function documentOutputs(ctx: BuildContext, doc: Document): string[] {
  const base = `${routeFor(ctx, doc).replace(/^\//, '')}index.html`;
  return ctx.config.outputs?.markdownMirrors === true ? [base, `${routeFor(ctx, doc).replace(/^\//, '').replace(/\/$/, '')}.md`] : [base];
}
