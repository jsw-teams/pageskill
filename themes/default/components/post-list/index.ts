import type { ThemeBlockDefinition } from '../../../../src/theme-api.ts';
import { numberAttr, postAuthor, postCover, postExcerpt, validateAttrs } from '../shared/index.ts';

export const block: ThemeBlockDefinition = {
  name: 'post-list',
  schema: { limit: 'number' },
  defaults: { limit: '6' },
  dependencies: (_node, context) => [`collection:posts:${context.doc.locale}`],
  render: (node, context) => {
    validateAttrs(node, block);
    const limit = numberAttr(node, 'limit', 1, 50, 6);
    const posts = context.collection('posts').slice(0, limit);
    const heading = context.translate('latestPosts', 'Latest articles');
    const allPosts = context.translate('allPosts', 'View all articles');
    const publishedLabel = context.translate('post.published', 'Published');
    const authorLabel = context.translate('post.author', 'Author');
    const cards = posts.map((post, index) => {
      const excerpt = postExcerpt(post, context);
      const metadata = `<div class="post-card-meta">${post.date ? `<span class="post-meta-item"><span class="post-meta-label">${context.escapeHtml(publishedLabel)}</span><time datetime="${context.escapeHtml(post.date)}">${context.escapeHtml(context.formatDate(post.date))}</time></span>` : ''}<span class="post-meta-item"><span class="post-meta-label">${context.escapeHtml(authorLabel)}</span>${context.escapeHtml(postAuthor(post, context))}</span></div>`;
      return `<article class="post-card">${postCover(post, context, index)}<div class="post-card-body"><h3><a href="${context.safeUrl(context.routeFor(post))}">${context.escapeHtml(post.title)}</a></h3>${metadata}${excerpt ? `<p class="post-excerpt">${excerpt}</p>` : ''}</div></article>`;
    }).join('');
    return `<section class="block post-list"><div class="post-list-heading"><h2>${context.escapeHtml(heading)}</h2><a href="${context.safeUrl(`/${context.doc.locale}/posts/`)}">${context.escapeHtml(allPosts)}</a></div>${posts.length ? `<div class="post-list-grid">${cards}</div>` : `<p class="empty">${context.escapeHtml(context.translate('noPosts', 'No articles yet.'))}</p>`}</section>`;
  }
};
