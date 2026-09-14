import type { ComponentDefinition } from '../../../../src/theme-api.ts';
import { BookOpen, ChartLine, FileText, Globe, Layers, Palette, Rocket } from 'lucide';
import { groupedContent, numberAttr, iconSvg, validateAttrs } from '../shared/index.ts';

const featureIcons = [FileText, BookOpen, Layers, Rocket, Palette, Globe, ChartLine] as const;

/** Layout for content-authored feature groups. It contains no site-specific items. */
export const component: ComponentDefinition = {
  id: 'feature-grid',
  capabilities: ['render'],
  contexts: ['page'],
  schema: { columns: { type: 'number' } },
  defaults: { columns: 3 },
  render: (input, context) => {
    if (input.node) validateAttrs(input.node, component);
    const columns = input.node ? numberAttr(input.node, 'columns', 1, 6, 3) : Number(input.attrs.columns || 3);
    const cards = groupedContent(input.children, context);
    return `<section class="component feature-grid" style="--columns:${Math.max(1, Math.min(6, columns))}">${cards.map((content, index) => `<article><span class="feature-icon" aria-hidden="true">${iconSvg(featureIcons[index % featureIcons.length], 'ui-icon')}</span>${content}</article>`).join('')}</section>`;
  },
  example: ':::feature-grid\n## A content-authored feature\nIts copy remains in Markdown.\n:::'
};
