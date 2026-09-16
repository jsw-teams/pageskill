import type { ComponentDefinition, ComponentShellContext } from '../../../../src/theme-api.ts';
import { Languages } from 'lucide';
import { iconSvg } from '../shared/index.ts';

export function renderLanguageNav(context: ComponentShellContext): string {
  if (!context.languageLinks) return '';
  const currentName = context.translate(`languageNames.${context.doc.locale}`, context.doc.locale);
  return `<div class="language-switcher"><details><summary>${iconSvg(Languages, 'language-switcher-icon')}<span>${context.escapeHtml(currentName)}</span></summary><nav class="languages" aria-label="${context.escapeHtml(context.languageLabel)}"><div class="languages-list">${context.languageLinks}</div></nav></details></div>`;
}

export const component: ComponentDefinition = {
  id: 'language',
  capabilities: ['render', 'client'],
  implementation: 'components/language/index.ts',
  resources: { styles: ['components/language/style.css'] },
  client: { module: 'components/language/script.js', selector: '[data-language-picker],[data-not-found-localized]' },
  i18n: 'components/language/messages.yml'
};
