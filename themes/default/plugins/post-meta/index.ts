import type { ThemePluginDefinition, ThemeRenderContext } from '../../../../src/theme-api.ts';
import { DEFAULT_CONTENT_METRICS_OPTIONS } from '../../../../src/lib/content-metrics.ts';

function setting(context: ThemeRenderContext): Record<string, any> {
  const value = context.themeConfig?.plugins?.postMeta;
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function isPostDocument(context: ThemeRenderContext): boolean {
  const collection = context.config?.content?.collections?.[context.doc.collection];
  return context.doc.collection === 'posts' || collection?.contentType === 'post';
}

function message(context: ThemeRenderContext, key: string, fallback: string, values: Record<string, string | number> = {}, namespace = 'post'): string {
  const template = context.pluginText('postMeta', key, context.translate(`${namespace}.${key}`, fallback));
  const escapedTemplate = context.escapeHtml(template);
  return escapedTemplate.replace(/\{([A-Za-z0-9_.-]+)\}/g, (_match, name: string) => {
    const value = values[name];
    return value === undefined ? '' : context.escapeHtml(value);
  });
}

export function renderPostMeta(context: ThemeRenderContext): string {
  const options = setting(context);
  if (options.enabled === false || !isPostDocument(context)) return '';
  const items: string[] = [];
  if (context.doc.date) items.push(`<span class="post-meta-item"><span class="post-meta-label">${context.escapeHtml(context.translate('post.published', 'Published'))}</span><time datetime="${context.escapeHtml(context.doc.date)}">${context.formatDate(context.doc.date)}</time></span>`);
  if (context.doc.update && options.updateDate !== false) items.push(`<span class="post-meta-item"><span class="post-meta-label">${context.escapeHtml(context.translate('post.updated', 'Updated'))}</span><time datetime="${context.escapeHtml(context.doc.update)}">${context.formatDate(context.doc.update)}</time></span>`);
  if (options.wordCount !== false) items.push(`<span class="post-meta-item">${message(context, 'wordCount', '{count} words', { count: context.doc.metrics.totalUnits.toLocaleString() })}</span>`);
  if (options.readingTime !== false) {
    const key = context.doc.metrics.readingMinutes === 1 ? 'readingMinute' : 'readingMinutes';
    items.push(`<span class="post-meta-item">${message(context, key, '{count} min read', { count: context.doc.metrics.readingMinutes })}</span>`);
  }
  if (context.doc.author) items.push(`<span class="post-meta-item"><span class="post-meta-label">${context.escapeHtml(context.translate('post.author', 'Author'))}</span>${context.escapeHtml(context.doc.author)}</span>`);
  return items.length ? `<div class="post-meta page-header-meta">${items.join('')}</div>` : '';
}

export function renderPostUpdateNotice(context: ThemeRenderContext): string {
  const options = setting(context);
  if (options.enabled === false || options.updateNotice === false || !context.doc.update || !isPostDocument(context)) return '';
  const title = message(context, 'title', 'Updated', {}, 'updateNotice');
  const description = message(context, 'description', 'This article was revised on {date}.', { date: context.formatDate(context.doc.update) }, 'updateNotice');
  return `<aside class="post-update-notice" role="note"><strong>${title}</strong><span>${description}</span></aside>`;
}

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/post-meta/index.ts',
  i18n: 'plugins/post-meta/messages.yml',
  defaults: {
    enabled: true,
    wordCount: true,
    readingTime: true,
    updateDate: true,
    updateNotice: true,
    wordsPerMinute: DEFAULT_CONTENT_METRICS_OPTIONS.wordsPerMinute,
    cjkCharactersPerMinute: DEFAULT_CONTENT_METRICS_OPTIONS.cjkCharactersPerMinute
  },
  schema: {
    enabled: { type: 'boolean' },
    wordCount: { type: 'boolean' },
    readingTime: { type: 'boolean' },
    updateDate: { type: 'boolean' },
    updateNotice: { type: 'boolean' },
    wordsPerMinute: { type: 'number', min: 50, max: 1000 },
    cjkCharactersPerMinute: { type: 'number', min: 100, max: 2000 },
    copy: { type: 'object', additionalProperties: true }
  }
};
