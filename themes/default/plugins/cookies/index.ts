import type { ThemePluginDefinition, ThemeShellContext } from '../../../../src/theme-api.ts';
import { renderPrivacyConsent } from '../../../../src/lib/privacy-consent.ts';
import { integrationAdapters } from './integrations.ts';

export { integrationAdapters };

/** Render the consent UI only when configured adapters actually need it. */
export function renderCookieConsent(context: ThemeShellContext): { markup: string; triggerMarkup: string } {
  return renderPrivacyConsent(context.privacy, context);
}

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/cookies/index.ts',
  resources: { styles: ['plugins/cookies/style.css', 'plugins/cookies/placeholder.css'], scripts: ['plugins/cookies/script.js'] },
  i18n: 'plugins/cookies/messages.yml',
  // Consent presentation has no mandatory instance settings. Provider
  // capabilities live in the trusted registry above; site integrations live
  // in config.yml.
  defaults: {},
  schema: {},
  integrations: integrationAdapters
};
