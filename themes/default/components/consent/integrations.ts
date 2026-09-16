import type { ProviderAdapter } from '../../../../src/theme-api.ts';

const publicIdentifier = {
  type: 'string' as const,
  required: true,
  pattern: '^[A-Za-z0-9._~-]{1,256}$'
};

/**
 * The default theme's trusted integration registry.  Configuration selects
 * one of these adapters; it cannot choose a purpose, URL, script, or loader.
 */
export const integrationAdapters: Record<string, ProviderAdapter> = {
  'google-analytics': {
    id: 'google-analytics',
    schema: { measurementId: { type: 'string', required: true, pattern: '^G-[A-Z0-9_-]+$' } },
    privacy: { purpose: 'measurement', consent: 'required', load: 'consent' },
    labelKey: 'privacyConsent.providers.google-analytics',
    loader: 'google-analytics',
    publicFields: ['measurementId']
  },
  'google-ads': {
    id: 'google-ads',
    schema: { tagId: { type: 'string', required: true, pattern: '^(AW|GT)-[A-Z0-9_-]+$' } },
    privacy: { purpose: 'advertising', consent: 'required', load: 'consent' },
    labelKey: 'privacyConsent.providers.google-ads',
    loader: 'google-ads',
    publicFields: ['tagId']
  },
  'cloudflare-web-analytics': {
    id: 'cloudflare-web-analytics',
    schema: { token: publicIdentifier },
    privacy: { purpose: 'measurement', consent: 'required', load: 'consent' },
    labelKey: 'privacyConsent.providers.cloudflare-web-analytics',
    loader: 'cloudflare-web-analytics',
    publicFields: ['token']
  },
  'baidu-tongji': {
    id: 'baidu-tongji',
    schema: { siteSignature: publicIdentifier },
    privacy: { purpose: 'measurement', consent: 'required', load: 'consent' },
    labelKey: 'privacyConsent.providers.baidu-tongji',
    loader: 'baidu-tongji',
    publicFields: ['siteSignature']
  },
  recaptcha: {
    id: 'recaptcha',
    schema: { siteKey: publicIdentifier },
    privacy: { purpose: 'fraud-prevention', consent: 'required', load: 'on-demand' },
    labelKey: 'privacyConsent.providers.recaptcha',
    loader: 'recaptcha',
    publicFields: ['siteKey']
  },
  hcaptcha: {
    id: 'hcaptcha',
    schema: { siteKey: publicIdentifier },
    privacy: { purpose: 'fraud-prevention', consent: 'required', load: 'on-demand' },
    labelKey: 'privacyConsent.providers.hcaptcha',
    loader: 'hcaptcha',
    publicFields: ['siteKey']
  },
  turnstile: {
    id: 'turnstile',
    schema: { siteKey: publicIdentifier },
    // Turnstile is loaded only when a form declares a Turnstile widget.  This
    // adapter deliberately models that on-demand, non-banner path separately
    // from analytics and embeds, without making a legal determination.
    privacy: { purpose: 'fraud-prevention', consent: 'none', load: 'on-demand' },
    labelKey: 'privacyConsent.providers.turnstile',
    loader: 'turnstile',
    publicFields: ['siteKey']
  },
  'x-for-websites': {
    id: 'x-for-websites',
    schema: {},
    privacy: { purpose: 'social-embedding', consent: 'required', load: 'on-demand' },
    labelKey: 'privacyConsent.providers.x-for-websites',
    loader: 'x-for-websites',
    publicFields: [],
    placeholder: true
  }
};
