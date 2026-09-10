import type { ThemeBlockDefinition } from '../../../../src/theme-api.ts';
import { numberAttr, postAuthor, postCover, postExcerpt, validateAttrs } from '../shared/index.ts';

export const block: ThemeBlockDefinition = {
  name: 'post-list',
  schema: { limit: 'number', collection: 'string' },
  defaults: { limit: '6' },
  dependencies: (node, context) => {
    const collection = String(node.attrs.collection || 'posts');
    const sourceCollection = String(context.config.content?.views?.[collection]?.collection || collection);
    return [...new Set([collection, sourceCollection].map(name => `collection:${name}:${context.doc.locale}`))];
  },
  render: (node, context) => {
    validateAttrs(node, block);
    const limit = numberAttr(node, 'limit', 1, 50, 6);
    const collection = String(node.attrs.collection || 'posts').trim() || 'posts';
    const posts = context.collection(collection).slice(0, limit);
    const isUpdates = collection === 'updates';
    const heading = context.translate(isUpdates ? 'latestUpdates' : 'latestPosts', isUpdates ? 'Latest updates' : 'Latest posts');
    const allPosts = context.translate(isUpdates ? 'allUpdates' : 'allPosts', isUpdates ? 'View all updates' : 'View all posts');
    const publishedLabel = context.translate('post.published', 'Published');
    const authorLabel = context.translate('post.author', 'Author');
    const cards = posts.map((post, index) => {
      const excerpt = postExcerpt(post, context);
      const metadata = `<div class="post-card-meta">${post.date ? `<span class="post-meta-item"><span class="post-meta-label">${context.escapeHtml(publishedLabel)}</span><time datetime="${context.escapeHtml(post.date)}">${context.escapeHtml(context.formatDate(post.date))}</time></span>` : ''}<span class="post-meta-item"><span class="post-meta-label">${context.escapeHtml(authorLabel)}</span>${context.escapeHtml(postAuthor(post, context))}</span></div>`;
      return `<article class="post-card">${postCover(post, context, index, collection)}<div class="post-card-body"><h3><a href="${context.safeUrl(context.routeFor(post))}">${context.escapeHtml(post.title)}</a></h3>${metadata}${excerpt ? `<p class="post-excerpt">${excerpt}</p>` : ''}</div></article>`;
    }).join('');
    return `<section class="block post-list post-list-${context.escapeHtml(collection)}"><div class="post-list-heading"><h2>${context.escapeHtml(heading)}</h2><a href="${context.safeUrl(`/${context.doc.locale}/${collection}/`)}">${context.escapeHtml(allPosts)}</a></div>${posts.length ? `<div class="post-list-grid">${cards}</div>` : `<p class="empty">${context.escapeHtml(context.translate(isUpdates ? 'noUpdates' : 'noPosts', isUpdates ? 'No updates yet.' : 'No posts yet.'))}</p>`}</section>`;
  }
};
