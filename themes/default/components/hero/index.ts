import type { ComponentDefinition } from '../../../../src/theme-api.ts';
import { enumAttr, validateAttrs } from '../shared/index.ts';

/** Hero presentation; title, body, actions, and media come from content. */
export const component: ComponentDefinition = {
  id: 'hero',
  capabilities: ['render'],
  contexts: ['page'],
  schema: { tone: { type: 'string' }, align: { type: 'string' }, media: { type: 'string' }, mediaAlt: { type: 'string' } },
  defaults: { tone: 'default', align: 'left' },
  render: (input, context) => {
    if (input.node) validateAttrs(input.node, component);
    const tone = input.node ? enumAttr(input.node, 'tone', ['default', 'brand', 'muted'], 'default') : input.attrs.tone || 'default';
    const align = input.node ? enumAttr(input.node, 'align', ['left', 'center', 'right'], 'left') : input.attrs.align || 'left';
    const namedCopy = ['title', 'body', 'actions']
      .map(name => input.slots[name]?.length ? context.renderNodes(input.slots[name]) : '')
      .filter(Boolean)
      .join('');
    const copy = namedCopy ? `${namedCopy}${input.renderedChildren}` : input.renderedChildren;
    const namedMedia = input.slots.media?.length ? context.renderNodes(input.slots.media) : '';
    const media = namedMedia
      ? `<div class="hero-media">${namedMedia}</div>`
      : input.attrs.media
        ? `<div class="hero-media"><img src="${context.safeUrl(input.attrs.media)}" alt="${context.escapeHtml(input.attrs.mediaAlt || '')}" loading="eager" decoding="async"></div>`
        : '';
    return `<section class="component hero tone-${context.escapeHtml(tone)} align-${context.escapeHtml(align)}"><div class="hero-copy">${copy}</div>${media}</section>`;
  },
  example: ':::hero{tone="brand"}\n# A content-authored heading\nDescribe the page here.\n:::'
};
