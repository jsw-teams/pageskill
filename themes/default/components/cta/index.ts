import type { ComponentDefinition } from '../../../../src/theme-api.ts';
import { validateAttrs } from '../shared/index.ts';

/** A content-authored call to action. The Component supplies markup only. */
export const component: ComponentDefinition = {
  id: 'cta',
  capabilities: ['render'],
  contexts: ['page', 'post'],
  schema: { href: { type: 'string' }, label: { type: 'string' } },
  render: (input, context) => {
    if (input.node) validateAttrs(input.node, component);
    const href = input.attrs.href ? context.safeUrl(input.attrs.href) : '';
    const label = input.attrs.label?.trim() || '';
    return `<section class="component cta">${input.renderedChildren}${href && label ? `<a class="button" href="${href}">${context.escapeHtml(label)}</a>` : ''}</section>`;
  },
  example: ':::cta{href="/guide/" label="Continue"}\nContent-authored call to action.\n:::'
};
