import type { ComponentDefinition } from '../../../../src/theme-api.ts';

export const component: ComponentDefinition = {
  id: 'codeCopy',
  capabilities: ['render', 'client'],
  implementation: 'components/code-copy/index.ts',
  resources: {
    styles: ['components/code-copy/style.css'],
    scripts: ['components/code-copy/script.js']
  },
  i18n: 'components/code-copy/messages.yml',
  defaults: { enabled: true },
  schema: { enabled: { type: 'boolean' } },
  render: (input, context) => {
    const value = String(input.props.value || '');
    const rawLanguage = String(input.props.language || '');
    const language = /^[A-Za-z0-9_-]{1,32}$/.test(rawLanguage) ? rawLanguage : '';
    const languageLabel = language ? `<span class="code-language" data-code-language>${context.escapeHtml(language)}</span>` : '';
    const copy = context.componentText('codeCopy', 'copy', context.translate('codeCopy.copy', 'Copy code'));
    const copied = context.componentText('codeCopy', 'copied', context.translate('codeCopy.copied', 'Copied'));
    const failed = context.componentText('codeCopy', 'failed', context.translate('codeCopy.failed', 'Copy failed'));
    const button = `<button type="button" class="code-copy" data-code-copy data-copy-label="${context.escapeHtml(copy)}" data-copied-label="${context.escapeHtml(copied)}" data-failed-label="${context.escapeHtml(failed)}" aria-label="${context.escapeHtml(copy)}">${context.escapeHtml(copy)}</button>`;
    const className = language ? ` class="language-${context.escapeHtml(language)}"` : '';
    return `<div class="code-block" data-code-block><div class="code-block-toolbar">${languageLabel}${button}<span class="code-copy-status sr-only" data-code-copy-status aria-live="polite"></span></div><pre tabindex="0"><code${className}>${context.escapeHtml(value)}</code></pre></div>`;
  }
};
