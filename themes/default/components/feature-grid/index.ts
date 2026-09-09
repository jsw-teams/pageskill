import type { ThemeBlockDefinition } from '../../../../src/theme-api.ts';
import { BookOpen, ChartLine, FileText, Globe, Layers, Palette, Rocket } from 'lucide';
import { groupedContent, numberAttr, iconSvg, validateAttrs } from '../shared/index.ts';

const featureIcons = [FileText, BookOpen, Layers, Rocket, Palette, Globe, ChartLine] as const;
export const block: ThemeBlockDefinition = {
  name: 'feature-grid',
  schema: { columns: 'number' },
  defaults: { columns: '3' },
  render: (node, context) => {
    validateAttrs(node, block);
    const columns = numberAttr(node, 'columns', 1, 6, 3);
    return `<section class="block feature-grid" style="--columns:${columns}">${groupedContent(node.children, context).map((content, index) => `<article><span class="feature-icon" aria-hidden="true">${iconSvg(featureIcons[index % featureIcons.length], 'ui-icon')}</span>${content}</article>`).join('')}</section>`;
  }
};
