import type { ThemePatternDefinition } from '../../../../src/theme-api.ts';
import { automaticToc } from '../../plugins/toc/index.ts';

export const pattern: ThemePatternDefinition = {
  name: 'docs',
  contexts: ['page', 'docs'],
  render: (content, context) => `<div class="document-layout docs-layout">${automaticToc(context)}<article class="document-body">${content}</article></div>`
};
