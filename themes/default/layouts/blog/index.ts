import type { ThemePatternDefinition } from '../../../../src/theme-api.ts';
import { automaticToc } from '../../plugins/toc/index.ts';
import { postRelations } from '../../components/post-relations/index.ts';
import { postCoverImage } from '../../components/shared/index.ts';
import { renderPostUpdateNotice } from '../../plugins/post-meta/index.ts';

export const pattern: ThemePatternDefinition = {
  name: 'blog',
  contexts: ['post', 'blog'],
  render: (content, context) => {
    return `<div class="document-layout post-layout">${automaticToc(context)}<article class="post">${postCoverImage(context.doc, context)}${renderPostUpdateNotice(context)}${content}${postRelations(context)}</article></div>`;
  }
};
