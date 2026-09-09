import type { ThemePluginDefinition, ThemeShellContext } from '../../../../src/theme-api.ts';

export function renderLanguageNav(context: ThemeShellContext): string {
  if (context.doc.source.startsWith('generated:') || !context.languageLinks) return '';
  return `<nav class="languages" aria-label="${context.escapeHtml(context.languageLabel)}"><span class="languages-heading" aria-hidden="true">${context.escapeHtml(context.languageLabel)}</span><div class="languages-list">${context.languageLinks}</div></nav>`;
}

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/language/index.ts',
  resources: { styles: ['plugins/language/style.css'], scripts: ['plugins/language/script.js'] },
  i18n: 'plugins/language/messages.yml',
  defaults: { enabled: true },
  schema: { enabled: { type: 'boolean' } }
};
