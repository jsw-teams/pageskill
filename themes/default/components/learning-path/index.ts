import type { ComponentDefinition } from '../../../../src/theme-api.ts';
import { groupedContent, validateAttrs } from '../shared/index.ts';

/** A reusable sequence layout. The number and meaning of steps belong to Markdown. */
export const component: ComponentDefinition = {
  id: 'learning-path',
  capabilities: ['render'],
  contexts: ['page'],
  schema: {},
  resources: { styles: ['components/learning-path/style.css'] },
  render: (input, context) => {
    if (input.node) validateAttrs(input.node, component);
    const cards = groupedContent(input.children, context);
    return `<section class="component learning-path"><div class="learning-path-grid">${cards.map((content, index) => `<article class="learning-path-card"><div class="learning-path-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div><div class="learning-path-content">${content}</div></article>`).join('')}</div></section>`;
  },
  example: ':::learning-path\n### First step\nExplain the first step in Markdown.\n:::'
};
