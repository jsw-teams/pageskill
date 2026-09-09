import type { ThemePatternDefinition } from '../../../../src/theme-api.ts';
import { automaticToc } from '../../plugins/toc/index.ts';
import { postRelations } from '../../components/post-relations/index.ts';
import { postAuthor, postCoverImage } from '../../components/shared/index.ts';

export const pattern: ThemePatternDefinition = {
  name: 'blog',
  contexts: ['post', 'blog'],
  render: (content, context) => {
    const publishedLabel = context.translate('post.published', 'Published');
    const authorLabel = context.translate('post.author', 'Author');
    const metadata = `<div class="post-meta">${context.doc.date ? `<span class="post-meta-item"><span class="post-meta-label">${context.escapeHtml(publishedLabel)}</span><time datetime="${context.escapeHtml(context.doc.date)}">${context.escapeHtml(context.formatDate(context.doc.date))}</time></span>` : ''}<span class="post-meta-item"><span class="post-meta-label">${context.escapeHtml(authorLabel)}</span>${context.escapeHtml(postAuthor(context.doc, context))}</span></div>`;
    return `<div class="document-layout post-layout">${automaticToc(context)}<article class="post">${postCoverImage(context.doc, context)}${metadata}${content}${postRelations(context)}</article></div>`;
  }
};
