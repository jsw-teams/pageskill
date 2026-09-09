import { type DirectiveNode } from '../../../../src/lib/markdown.ts';
import type { ThemeBlockDefinition } from '../../../../src/theme-api.ts';
import { enumAttr, validateAttrs } from '../shared/index.ts';

export const block: ThemeBlockDefinition = {
  name: 'hero',
  schema: { tone: 'string', align: 'string' },
  defaults: { tone: 'default', align: 'left' },
  render: (node: DirectiveNode, context) => {
    validateAttrs(node, block);
    const tone = enumAttr(node, 'tone', ['default', 'brand', 'muted'], 'default');
    const align = enumAttr(node, 'align', ['left', 'center', 'right'], 'left');
    const image = (name: string) => context.safeUrl(`/assets/${name}`);
    const artwork = `<div class="hero-art" aria-hidden="true"><span class="hero-art-dot"></span><img class="hero-art-image hero-art-book" src="${image('hero-book.png')}" alt="" width="300" height="300" fetchpriority="high" decoding="async"><img class="hero-art-image hero-art-backpack" src="${image('hero-backpack.png')}" alt="" width="300" height="300" loading="eager" decoding="async"><img class="hero-art-image hero-art-telescope" src="${image('hero-telescope.png')}" alt="" width="300" height="300" loading="eager" decoding="async"></div>`;
    return `<section class="block hero tone-${context.escapeHtml(tone)} align-${context.escapeHtml(align)}"><div class="hero-copy">${context.renderNodes(node.children)}</div>${artwork}</section>`;
  }
};
