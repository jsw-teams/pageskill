import { cloneConfig, mergeConfig } from './merge.ts';

/** Defaults that are part of the public config contract.  Theme/plugin
 * defaults remain owned by their definitions and are merged separately. */
export const BUILT_IN_CONFIG_DEFAULTS: Record<string, any> = {
  i18n: { contentFallback: true },
  privacy: { consent: { decisionRetentionDays: 365 } },
  theme: { name: 'default' },
  outputs: { markdownMirrors: false },
  archive: { pageSize: 50 },
  feed: { limit: 20 },
  agentDiscovery: {
    markdown: { enabled: true },
    apiCatalog: { enabled: false },
    ard: { enabled: true },
    skills: { enabled: true },
    auth: { enabled: false },
    mcp: { enabled: false },
    webmcp: { enabled: false },
    dnsAid: { enabled: false }
  },
  llms: { enabled: true, full: { enabled: true, shardSize: 250 } },
  robots: { rules: [{ userAgent: '*', allow: ['/'] }] },
  // PWA output is part of the existing renderer contract.  Its colour
  // fallbacks are renderer-owned, so do not invent a second set of values
  // here; site-specific colours remain in config.yml.
  pwa: {},
  deployment: {
    enabled: true,
    backend: true,
    targets: []
  }
};

export function applyConfigDefaults(config: Record<string, any>): Record<string, any> {
  const normalized = mergeConfig(cloneConfig(BUILT_IN_CONFIG_DEFAULTS), config);
  const defaultLocale = typeof normalized.defaultLocale === 'string' && normalized.defaultLocale ? normalized.defaultLocale : 'en';
  normalized.defaultLocale = defaultLocale;
  if (!Array.isArray(normalized.activeLocales) || !normalized.activeLocales.length) normalized.activeLocales = [defaultLocale];
  if (!normalized.i18n || typeof normalized.i18n !== 'object' || Array.isArray(normalized.i18n)) normalized.i18n = {};
  if (!normalized.i18n.fallbackLocale) normalized.i18n.fallbackLocale = defaultLocale;
  return normalized;
}
