import type { ComponentDefinition, ComponentShellContext } from '../../../../src/theme-api.ts';

export function renderLanguageNav(context: ComponentShellContext): string {
  if (context.doc.source.startsWith('generated:') || !context.languageLinks) return '';
  return `<nav class="languages" aria-label="${context.escapeHtml(context.languageLabel)}"><span class="languages-heading" aria-hidden="true">${context.escapeHtml(context.languageLabel)}</span><div class="languages-list">${context.languageLinks}</div></nav>`;
}

export const component: ComponentDefinition = {
  id: 'language',
  capabilities: ['render', 'client'],
  implementation: 'components/language/index.ts',
  resources: { styles: ['components/language/style.css'], scripts: ['components/language/script.js'] },
  i18n: 'components/language/messages.yml'
};
