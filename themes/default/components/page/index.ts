import type { ComponentDefinition } from '../../../../src/theme-api.ts';
import { automaticToc } from '../toc/index.ts';

/** General document layout. Document data is supplied by Core and Markdown. */
export const component: ComponentDefinition = {
  id: 'page',
  capabilities: ['render'],
  contexts: ['page'],
  renderDocument: (input, context) => {
    const content = input.slots.content || input.renderedContent;
    const toc = context.doc.data?.toc === true ? automaticToc(context) : '';
    const header = input.slots.header || '';
    const aside = input.slots.aside ? `<aside class="document-aside">${input.slots.aside}</aside>` : '';
    const footer = input.slots.footer || '';
    return `<div class="document-layout">${toc}${header}<article class="document-body">${content}</article>${aside}${footer}</div>`;
  }
};
