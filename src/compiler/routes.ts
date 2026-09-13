import { escapeHtml, safeUrl } from '../lib/safe-html.ts';
import { parseIsoTimestamp } from '../lib/content-dates.ts';
import type { BuildContext, Document } from './types.ts';

export function collectionKey(collection: string, locale: string): string {
  return `${collection}:${locale}`;
}

export function translationKey(collection: string, id: string): string {
  return `${collection}:${id}`;
}

export function documentKey(doc: Pick<Document, 'collection' | 'id' | 'locale'>): string {
  return `${doc.collection}:${doc.id}:${doc.locale}`;
}

export function postCategory(doc: Pick<Document, 'collection' | 'data'>): string {
  if (doc.collection !== 'posts') return '';
  const value = doc.data?.category ?? doc.data?.type ?? '';
  return String(value).trim().toLocaleLowerCase() || 'uncategorized';
}

export function contentViewSettings(ctx: BuildContext, name: string): Record<string, any> {
  const value = ctx.config.content?.views?.[name];
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function viewForDocument(ctx: BuildContext, doc: Pick<Document, 'collection' | 'data'>): { name: string; settings: Record<string, any> } | undefined {
  const views = ctx.config.content?.views;
  if (!views || typeof views !== 'object' || Array.isArray(views)) return undefined;
  for (const [name, raw] of Object.entries(views)) {
    const settings = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, any> : {};
    if (String(settings.collection || name) !== doc.collection) continue;
    if (settings.category !== undefined && postCategory(doc) !== String(settings.category).trim().toLocaleLowerCase()) continue;
    return { name, settings };
  }
  return undefined;
}

export function documentViewCollection(ctx: BuildContext, doc: Pick<Document, 'collection' | 'data'>): string {
  return viewForDocument(ctx, doc)?.name || doc.collection;
}

export function sourceDocuments(ctx: BuildContext): Document[] {
  return ctx.routes.size ? [...ctx.routes.values()] : ctx.docs;
}

export function documentsForCollection(ctx: BuildContext, collection: string, locale: string): Document[] {
  const viewSettings = contentViewSettings(ctx, collection);
  const sourceCollection = String(viewSettings.collection || collection);
  const viewCategory = viewSettings.category === undefined ? undefined : String(viewSettings.category).trim().toLocaleLowerCase();
  const documents = sourceDocuments(ctx).filter(doc => {
    if (doc.locale !== locale || doc.collection !== sourceCollection) return false;
    if (viewCategory !== undefined) return postCategory(doc) === viewCategory;
    if (collection === sourceCollection && sourceCollection === 'posts') return !viewForDocument(ctx, doc);
    return true;
  });
  return documents.sort(comparePublicationOrder);
}

export function routeFor(ctx: BuildContext, doc: Document): string {
  if (doc.data?.route) return String(doc.data.route).replace(':locale', doc.locale).replace(/\/+/g, '/').replace(/([^:])\/\//g, '$1/');
  const view = viewForDocument(ctx, doc);
  const routeConfig = view?.settings.route || ctx.config.content?.collections?.[doc.collection]?.route || '/:locale/:id/';
  return String(routeConfig).replace(':locale', doc.locale).replace(':id', doc.id === 'home' ? '' : doc.id).replace(/\/+/g, '/').replace(/([^:])\/\//g, '$1/');
}

export function blogRelationsFor(
  ctx: BuildContext,
  doc: Document,
  translate: (locale: string, key: string, fallback: string) => string
): string {
  const posts = documentsForCollection(ctx, documentViewCollection(ctx, doc), doc.locale);
  const index = posts.findIndex(candidate => candidate.id === doc.id && candidate.locale === doc.locale);
  const newer = index > 0 ? posts[index - 1] : undefined;
  const older = index >= 0 && index + 1 < posts.length ? posts[index + 1] : undefined;
  const tags = Array.isArray(doc.data.tags) ? doc.data.tags.map(String) : [];
  const related: Document[] = [];
  const candidates = tags.length
    ? tags.flatMap(tag => (ctx.tagIndex.get(`${doc.collection}:${doc.locale}:${tag}`) || []).filter(candidate => documentViewCollection(ctx, candidate) === documentViewCollection(ctx, doc)))
    : [posts[index - 1], posts[index + 1], posts[0], posts[1], posts[2], posts[3]];
  for (const candidate of candidates) if (candidate && candidate.id !== doc.id && !related.some(entry => entry.id === candidate.id)) {
    related.push(candidate);
    if (related.length === 3) break;
  }
  const relationLink = (label: string, candidate: Document | undefined) => candidate ? `<a class="post-pagination-link" href="${safeUrl(routeFor(ctx, candidate))}" aria-label="${escapeHtml(`${label}: ${candidate.title}`)}"><span class="post-pagination-label">${escapeHtml(label)}</span><strong>${escapeHtml(candidate.title)}</strong></a>` : '';
  const previousLabel = translate(doc.locale, 'previous', 'Previous post');
  const nextLabel = translate(doc.locale, 'next', 'Next post');
  const relatedLabel = translate(doc.locale, 'related', 'Related');
  return `<footer class="post-relations"><nav class="post-pagination">${relationLink(previousLabel, newer)}${relationLink(nextLabel, older)}</nav>${related.length ? `<section class="related-posts"><h2>${escapeHtml(relatedLabel)}</h2><ul>${related.map(candidate => `<li><a href="${safeUrl(routeFor(ctx, candidate))}">${escapeHtml(candidate.title)}</a></li>`).join('')}</ul></section>` : ''}</footer>`;
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
