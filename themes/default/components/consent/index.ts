import type { ComponentDefinition, ComponentShellContext } from '../../../../src/theme-api.ts';
import { renderPrivacyConsent } from '../../../../src/lib/privacy-consent.ts';
import { integrationAdapters } from './integrations.ts';

export { integrationAdapters };

/** Render the consent UI only when configured adapters actually need it. */
export function renderCookieConsent(context: ComponentShellContext): { markup: string; triggerMarkup: string } {
  return renderPrivacyConsent(context.privacy, context);
}

export const component: ComponentDefinition = {
  id: 'privacyConsent',
  capabilities: ['render', 'client', 'integration'],
  implementation: 'components/consent/index.ts',
  resources: { styles: ['components/consent/style.css', 'components/consent/placeholder.css'], scripts: ['components/consent/script.js'] },
  i18n: 'components/consent/messages.yml',
  // Consent presentation has no mandatory instance settings. Provider
  // capabilities live in the trusted registry above; site integrations live
  // in config.yml.
  defaults: {},
  schema: {},
  integrations: integrationAdapters
};
