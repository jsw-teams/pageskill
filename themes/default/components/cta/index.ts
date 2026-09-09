import type { ThemeBlockDefinition } from '../../../../src/theme-api.ts';
import { validateAttrs } from '../shared/index.ts';

export const block: ThemeBlockDefinition = {
  name: 'cta',
  schema: { href: 'string' },
  render: (node, context) => {
    validateAttrs(node, block);
    const href = node.attrs.href ? context.safeUrl(node.attrs.href) : '#';
    const label = context.translate('continue', 'Continue');
    return `<section class="block landing-cta">${context.renderNodes(node.children)}${node.attrs.href ? `<a class="button" href="${href}">${context.escapeHtml(label)}</a>` : ''}</section>`;
  }
};
