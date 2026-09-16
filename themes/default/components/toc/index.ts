import type { MarkdownNode } from '../../../../src/lib/markdown.ts';
import type { ComponentDefinition, ComponentRenderContext } from '../../../../src/theme-api.ts';
import { BookOpen } from 'lucide';
import { iconSvg } from '../shared/index.ts';

export function tocEnabled(context: ComponentRenderContext): boolean {
  const setting = context.themeConfig?.components?.toc;
  return setting?.enabled !== false;
}

function tocMaxDepth(context: ComponentRenderContext): number {
  const value = Number(context.themeConfig?.components?.toc?.maxDepth || 3);
  return Math.max(2, Math.min(6, Number.isFinite(value) ? value : 3));
}

function headingsFor(context: ComponentRenderContext) {
  return context.doc.nodes.filter(node => node.kind === 'heading' && node.depth > 1 && node.depth <= tocMaxDepth(context)) as Extract<MarkdownNode, { kind: 'heading' }>[];
}

export function automaticToc(context: ComponentRenderContext): string {
  if (!tocEnabled(context)) return '';
  const headings = headingsFor(context);
  if (headings.length < 2) return '';
  const label = context.componentText('toc', 'title', context.translate('toc.title', 'Table of contents'));
  const onThisPage = context.componentText('toc', 'onThisPage', context.translate('toc.onThisPage', 'On this page'));
  return `<aside class="component-toc"><details class="toc-drawer" open><summary><span class="toc-summary-icon" aria-hidden="true">${iconSvg(BookOpen, 'toc-icon')}</span><span>${context.escapeHtml(label)}</span></summary><nav class="toc-panel" aria-label="${context.escapeHtml(label)}"><strong>${context.escapeHtml(onThisPage)}</strong><ol>${headings.map(heading => `<li class="toc-depth-${heading.depth}"><a href="#${context.escapeHtml(heading.id)}">${context.renderInline(heading.text)}</a></li>`).join('')}</ol></nav></details></aside>`;
}

export const component: ComponentDefinition = {
  id: 'toc',
  capabilities: ['render', 'client'],
  contexts: ['page', 'post'],
  resources: { styles: ['components/toc/style.css'] },
  client: { module: 'components/toc/script.js', selector: '.toc-drawer' },
  i18n: 'components/toc/messages.yml',
  defaults: { enabled: true, maxDepth: 3 },
  schema: { enabled: { type: 'boolean' }, maxDepth: { type: 'number', min: 2, max: 6 }, copy: { type: 'object', additionalProperties: true } },
  render: (input, context) => {
    if (!tocEnabled(context)) return '';
    const headings = headingsFor(context);
    const label = context.componentText('toc', 'title', context.translate('toc.title', 'Table of contents'));
    const onThisPage = context.componentText('toc', 'onThisPage', context.translate('toc.onThisPage', 'On this page'));
    return `<nav class="component toc" aria-label="${context.escapeHtml(label)}"><strong>${context.escapeHtml(onThisPage)}</strong><ul>${headings.map(heading => `<li><a href="#${context.escapeHtml(heading.id)}">${context.renderInline(heading.text)}</a></li>`).join('')}</ul></nav>`;
  }
};
