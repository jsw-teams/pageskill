import type { ComponentDefinition } from '../../../../src/theme-api.ts';
import { numberAttr, postAuthor, postCover, postExcerpt, validateAttrs } from '../shared/index.ts';

/** Render a Core content query; it never knows document ids or route templates. */
export const component: ComponentDefinition = {
  id: 'post-list',
  capabilities: ['render'],
  contexts: ['page', 'post'],
  schema: { limit: { type: 'number' }, collection: { type: 'string' }, kind: { type: 'string' }, category: { type: 'string' } },
  defaults: { limit: 6, collection: 'posts' },
  dependencies: (input, context) => {
    const collection = String(input.attrs.collection || 'posts').trim() || 'posts';
    return [`collection:${collection}:${context.doc.locale}`];
  },
  render: (input, context) => {
    if (input.node) validateAttrs(input.node, component);
    const limit = input.node ? numberAttr(input.node, 'limit', 1, 50, 6) : Math.max(1, Math.min(50, Number(input.attrs.limit || 6)));
    const collection = String(input.attrs.collection || 'posts').trim() || 'posts';
    const kind = input.attrs.kind?.trim() || undefined;
    const category = input.attrs.category?.trim() || undefined;
    const documents = context.content.query({ collection, kind, category, locale: context.doc.locale, limit, orderBy: 'date:desc' });
    const isReleases = kind === 'release' || collection === 'updates';
    const heading = context.translate(isReleases ? 'latestUpdates' : 'latestPosts', isReleases ? 'Latest releases' : 'Latest posts');
    const allLabel = context.translate(isReleases ? 'allUpdates' : 'allPosts', isReleases ? 'View all releases' : 'View all posts');
    const publishedLabel = context.translate('post.published', 'Published');
    const authorLabel = context.translate('post.author', 'Author');
    const cards = documents.map((post, index) => {
      const excerpt = postExcerpt(post, context);
      const metadata = `<div class="post-card-meta">${post.date ? `<span class="post-meta-item"><span class="post-meta-label">${context.escapeHtml(publishedLabel)}</span><time datetime="${context.escapeHtml(post.date)}">${context.escapeHtml(context.formatDate(post.date))}</time></span>` : ''}<span class="post-meta-item"><span class="post-meta-label">${context.escapeHtml(authorLabel)}</span>${context.escapeHtml(postAuthor(post, context))}</span></div>`;
      return `<article class="post-card">${postCover(post, context, index, collection)}<div class="post-card-body"><h3><a href="${context.safeUrl(context.url.forDocument(post))}">${context.escapeHtml(post.title)}</a></h3>${metadata}${excerpt ? `<p class="post-excerpt">${excerpt}</p>` : ''}</div></article>`;
    }).join('');
    const empty = context.translate(isReleases ? 'noUpdates' : 'noPosts', isReleases ? 'No releases yet.' : 'No posts yet.');
    return `<section class="component post-list"><div class="post-list-heading"><h2>${context.escapeHtml(heading)}</h2><a href="${context.safeUrl(context.url.forArchive({ collection, category, locale: context.doc.locale }))}">${context.escapeHtml(allLabel)}</a></div>${documents.length ? `<div class="post-list-grid">${cards}</div>` : `<p class="empty">${context.escapeHtml(empty)}</p>`}</section>`;
  },
  example: ':::post-list{collection="posts" limit="6"}\n:::'
};
