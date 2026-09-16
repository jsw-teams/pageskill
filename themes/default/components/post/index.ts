import type { ComponentDefinition } from '../../../../src/theme-api.ts';
import { automaticToc } from '../toc/index.ts';
import { postRelations } from '../post-relations/index.ts';
import { postCoverImage } from '../shared/index.ts';
import { renderPostUpdateNotice } from '../post-meta/index.ts';

/** Dated-document layout. The document itself remains Content-owned. */
export const component: ComponentDefinition = {
  id: 'post',
  capabilities: ['render'],
  contexts: ['post', 'release'],
  renderDocument: (input, context) => {
    const content = input.slots.content || input.renderedContent;
    const toc = context.doc.data?.toc === false ? '' : automaticToc(context);
    const comments = input.slots.comments ?? (context.theme?.components?.comments ? context.renderComponent('comments') : '');
    const relations = input.slots.relations || postRelations(context);
    const header = input.slots.header || '';
    const footer = input.slots.footer || '';
    return `<div class="document-layout post-layout">${toc}${header}<article class="post">${postCoverImage(context.doc, context)}${renderPostUpdateNotice(context)}${content}${comments}${relations}</article>${footer}</div>`;
  },
  i18n: 'components/post/messages.yml'
};
