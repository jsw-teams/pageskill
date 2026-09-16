import type { ComponentDefinition, ComponentRenderContext } from '../../../../src/theme-api.ts';

const MAX_COMMENT_LENGTH = 3000;

function setting(context: ComponentRenderContext, key: string, fallback: unknown): any {
  const value = context.themeConfig?.components?.comments;
  return value && typeof value === 'object' && !Array.isArray(value) && value[key] !== undefined ? value[key] : fallback;
}

function text(context: ComponentRenderContext, key: string, fallback: string): string {
  return context.componentText('comments', key, context.translate(`comments.${key}`, fallback));
}

function translationText(context: ComponentRenderContext, key: string, fallback: string): string {
  return context.componentText('comment-translation', key, context.translate(`commentTranslation.${key}`, fallback));
}

function translationEnabled(context: ComponentRenderContext): boolean {
  const value = context.themeConfig?.components?.['comment-translation'];
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && value.enabled === true);
}

function isCommentable(context: ComponentRenderContext): boolean {
  return ['posts', 'updates'].includes(context.doc.collection) && !context.doc.source.startsWith('generated:') && !context.doc.source.startsWith('fallback:');
}

/** The browser component owns only DOM and fetch calls; D1 and Workers AI stay server-side. */
export function renderComments(context: ComponentRenderContext): string {
  if (!setting(context, 'enabled', false) || !isCommentable(context)) return '';
  const headingId = `comments-${context.doc.locale}-${context.doc.id}`.replace(/[^A-Za-z0-9_-]/g, '-');
  const contentKey = context.escapeHtml(context.doc.contentKey);
  const locale = context.escapeHtml(context.doc.locale);
  const hasTranslation = translationEnabled(context);
  const label = text(context, 'title', 'Comments');
  return `<section class="comments" data-comments data-content-key="${contentKey}" data-locale="${locale}" data-translation-enabled="${hasTranslation}" aria-labelledby="${headingId}" data-label-loading="${context.escapeHtml(text(context, 'loading', 'Loading comments…'))}" data-label-empty="${context.escapeHtml(text(context, 'empty', 'No comments yet.'))}" data-label-error="${context.escapeHtml(text(context, 'error', 'Comments are temporarily unavailable.'))}" data-label-translate="${context.escapeHtml(translationText(context, 'translate', 'Translate'))}" data-label-original="${context.escapeHtml(translationText(context, 'showOriginal', 'Show original'))}" data-label-translated="${context.escapeHtml(translationText(context, 'translated', 'Translated'))}" data-label-translating="${context.escapeHtml(translationText(context, 'translating', 'Translating…'))}" data-label-anonymous="${context.escapeHtml(text(context, 'anonymous', 'Anonymous'))}"><h2 id="${headingId}">${context.escapeHtml(label)}</h2><div class="comments-list" data-comments-list aria-live="polite"><p>${context.escapeHtml(text(context, 'loading', 'Loading comments…'))}</p></div><form class="comments-form" data-comments-form><div class="comments-form-grid"><label>${context.escapeHtml(text(context, 'name', 'Name'))}<input name="authorName" maxlength="80" autocomplete="name" required></label><label>${context.escapeHtml(text(context, 'body', 'Comment'))}<textarea name="body" maxlength="${MAX_COMMENT_LENGTH}" rows="5" required></textarea></label></div><button type="submit">${context.escapeHtml(text(context, 'submit', 'Post comment'))}</button><p class="comments-status" data-comments-status role="status"></p></form></section>`;
}

export const component: ComponentDefinition = {
  id: 'comments',
  source: 'external',
  capabilities: ['render', 'client', 'server', 'storage', 'cache'],
  contexts: ['post', 'release', 'comment'],
  implementation: 'components/comments/index.ts',
  resources: { styles: ['components/comments/style.css'] },
  client: { module: 'components/comments/script.js', selector: '[data-comments]', api: 'comments' },
  i18n: 'components/comments/messages.yml',
  defaults: { enabled: false },
  schema: { enabled: { type: 'boolean' } },
  render: (_input, context) => renderComments(context)
};
