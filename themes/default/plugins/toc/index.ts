import type { MarkdownNode } from '../../../../src/lib/markdown.ts';
import type { ThemeBlockDefinition, ThemePluginDefinition, ThemeRenderContext } from '../../../../src/theme-api.ts';
import { BookOpen } from 'lucide';
import { iconSvg } from '../../components/shared/index.ts';

export function tocEnabled(context: ThemeRenderContext): boolean {
  const setting = context.themeConfig?.plugins?.toc;
  return setting?.enabled !== false;
}

function tocMaxDepth(context: ThemeRenderContext): number {
  const value = Number(context.themeConfig?.plugins?.toc?.maxDepth || 3);
  return Math.max(2, Math.min(6, Number.isFinite(value) ? value : 3));
}

export function automaticToc(context: ThemeRenderContext): string {
  if (!tocEnabled(context)) return '';
  const headings = context.doc.nodes.filter(node => node.kind === 'heading' && node.depth > 1 && node.depth <= tocMaxDepth(context)) as Extract<MarkdownNode, { kind: 'heading' }>[];
  if (headings.length < 2) return '';
  const label = context.translate('toc.title', 'Table of contents');
  const onThisPage = context.translate('toc.onThisPage', 'On this page');
  return `<aside class="pattern-toc"><details class="toc-drawer" open><summary><span class="toc-summary-icon" aria-hidden="true">${iconSvg(BookOpen, 'toc-icon')}</span><span>${context.escapeHtml(label)}</span></summary><nav class="toc-panel" aria-label="${context.escapeHtml(label)}"><strong>${context.escapeHtml(onThisPage)}</strong><ol>${headings.map(heading => `<li class="toc-depth-${heading.depth}"><a href="#${context.escapeHtml(heading.id)}">${context.renderInline(heading.text)}</a></li>`).join('')}</ol></nav></details></aside>`;
}

export const tocBlock: ThemeBlockDefinition = {
  name: 'toc',
  schema: {},
  render: (_node, context) => {
    if (!tocEnabled(context)) return '';
    const headings = context.doc.nodes.filter(node => node.kind === 'heading' && node.depth > 1 && node.depth <= tocMaxDepth(context)) as Extract<MarkdownNode, { kind: 'heading' }>[];
    const label = context.translate('toc.title', 'Table of contents');
    const onThisPage = context.translate('toc.onThisPage', 'On this page');
    return `<nav class="block toc" aria-label="${context.escapeHtml(label)}"><strong>${context.escapeHtml(onThisPage)}</strong><ul>${headings.map(heading => `<li><a href="#${context.escapeHtml(heading.id)}">${context.renderInline(heading.text)}</a></li>`).join('')}</ul></nav>`;
  }
};

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/toc/index.ts',
  resources: { styles: ['plugins/toc/style.css'] },
  i18n: 'plugins/toc/messages.yml',
  defaults: { enabled: true, maxDepth: 3 },
  schema: {
    enabled: { type: 'boolean' },
    maxDepth: { type: 'number', min: 2, max: 6 }
  }
};
