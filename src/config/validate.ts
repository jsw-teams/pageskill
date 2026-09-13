import { isRecord } from './merge.ts';
import { normalizeDeploymentTarget } from './deployment.ts';
import { validateSiteLink } from '../lib/site-links.ts';

const LOCALE_TAG = /^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/;
const FORBIDDEN_SURFACE_KEYS = new Set(['css', 'style', 'styles', 'script', 'scripts', 'gatedscripts', 'html', 'rawhtml', 'unsafehtml']);

export function validLocaleTag(value: unknown): value is string {
  return typeof value === 'string' && LOCALE_TAG.test(value);
}

export function configuredThemeName(config: Record<string, any>, source = 'config.yml'): string {
  const value = config.theme?.name;
  if (value === undefined || value === null || value === '') return 'default';
  if (typeof value !== 'string' || !value || value === '.' || value === '..' || /[\\/\u0000-\u001f\u007f-\u009f:]/.test(value) || /[. ]$/.test(value)) {
    throw new Error(`${source}: theme.name must name one safe theme directory`);
  }
  return value;
}

function assertForbidden(value: unknown, source: string, prefix = ''): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertForbidden(item, source, `${prefix}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (FORBIDDEN_SURFACE_KEYS.has(key.toLocaleLowerCase())) throw new Error(`${source}: ${field} is not allowed in site configuration`);
    assertForbidden(nested, source, field);
  }
}

export function assertConfigSurface(config: Record<string, any>, source = 'config.yml'): void {
  assertForbidden(config, source);
}

function validateLocales(config: Record<string, any>, source: string): void {
  if (!validLocaleTag(config.defaultLocale)) throw new Error(`${source}: defaultLocale must be a valid locale tag`);
  if (!Array.isArray(config.activeLocales) || !config.activeLocales.length || config.activeLocales.some(locale => !validLocaleTag(locale))) {
    throw new Error(`${source}: activeLocales must be a non-empty array of valid locale tags`);
  }
  const fallback = config.i18n?.fallbackLocale || config.defaultLocale;
  if (!validLocaleTag(fallback)) throw new Error(`${source}: i18n.fallbackLocale must be a valid locale tag`);
}

function validateLinkCollection(value: unknown, namespace: 'navigation' | 'footer', source: string): void {
  if (value === undefined || value === null) return;
  if (!Array.isArray(value)) throw new Error(`${source}: ${namespace}.links must be an array`);
  value.forEach((link, index) => validateSiteLink(link, `${source}: ${namespace}.links[${index}]`));
}

/** Validate link arrays before layers are merged so diagnostics retain the
 * project-relative file that actually supplied the invalid field. */
export function validateConfigLinks(config: Record<string, any>, source = 'config.yml'): void {
  validateLinkCollection(config.navigation?.links, 'navigation', source);
  validateLinkCollection(config.footer?.links, 'footer', source);
}

export function validateDeploymentConfig(config: Record<string, any>, source = 'config.yml'): void {
  const deployment = isRecord(config.deployment) ? config.deployment : {};
  if (deployment.targets !== undefined && deployment.targets !== null) {
    if (!Array.isArray(deployment.targets)) throw new Error(`${source}: deployment.targets must be an array of canonical target names`);
    deployment.targets.forEach((value, index) => {
      if (value === undefined || value === null || !String(value).trim()) return;
      normalizeDeploymentTarget(value, `${source}: deployment.targets[${index}]`);
    });
  }
  if (isRecord(deployment.openaiSites) && Object.prototype.hasOwnProperty.call(deployment.openaiSites, 'staticDirectory')) {
    throw new Error(`${source}: deployment.openaiSites.staticDirectory was removed; use deployment.staticDirectory`);
  }
  if (Object.prototype.hasOwnProperty.call(deployment, 'dynamicRoutes')) {
    throw new Error(`${source}: deployment.dynamicRoutes was removed; register runtime paths with backend/handler.ts`);
  }
}

function validatePrivacyConfig(config: Record<string, any>, source: string): void {
  const privacy = config.privacy;
  if (privacy === undefined || privacy === null) return;
  if (!isRecord(privacy)) throw new Error(`${source}: privacy must be a mapping`);
  if (Object.prototype.hasOwnProperty.call(privacy, 'cookieConsent')) {
    throw new Error(`${source}: privacy.cookieConsent was removed; use privacy.consent for the optional decision policy`);
  }
  for (const key of ['provider', 'storage', 'retentionDays', 'categories', 'integrations', 'gatedScripts', 'copy']) {
    if (Object.prototype.hasOwnProperty.call(privacy, key)) {
      throw new Error(`${source}: privacy.${key} was removed; configure providers under integrations and use privacy.consent for the optional decision policy`);
    }
  }
  const consent = privacy.consent;
  if (consent === undefined || consent === null) return;
  if (!isRecord(consent)) throw new Error(`${source}: privacy.consent must be a mapping`);
  const allowed = new Set(['enabled', 'decisionRetentionDays']);
  for (const key of Object.keys(consent)) if (!allowed.has(key)) {
    throw new Error(`${source}: privacy.consent.${key} is not supported; consent behavior is derived from configured integration adapters`);
  }
  if (consent.enabled !== undefined && typeof consent.enabled !== 'boolean') throw new Error(`${source}: privacy.consent.enabled must be boolean`);
  if (consent.decisionRetentionDays !== undefined && (!Number.isInteger(consent.decisionRetentionDays) || consent.decisionRetentionDays < 0 || consent.decisionRetentionDays > 3650)) {
    throw new Error(`${source}: privacy.consent.decisionRetentionDays must be an integer from 0 to 3650`);
  }
}

function validateIntegrationSurface(config: Record<string, any>, source: string): void {
  const integrations = config.integrations;
  if (integrations === undefined || integrations === null) return;
  if (!isRecord(integrations)) throw new Error(`${source}: integrations must be a mapping keyed by provider id`);
  for (const [id, value] of Object.entries(integrations)) {
    if (!id.trim()) throw new Error(`${source}: integrations contains an empty provider id`);
    if (!isRecord(value)) throw new Error(`${source}: integrations.${id} must be a mapping`);
  }
}

const REMOVED_CONFIG_KEYS: Record<string, string> = {
  branding: 'branding was removed; use footer.links or theme content',
  plugins: 'root plugins was removed; put plugin overrides in the file selected by theme.config',
  search: 'root search was removed; put search overrides in the file selected by theme.config',
  privacyConsent: 'root privacyConsent was removed; configure real providers under integrations and use privacy.consent only for the optional decision policy'
};

function validateRemovedConfig(config: Record<string, any>, source: string): void {
  for (const [key, replacement] of Object.entries(REMOVED_CONFIG_KEYS)) {
    if (Object.prototype.hasOwnProperty.call(config, key)) throw new Error(`${source}: ${replacement}`);
  }
  if (isRecord(config.theme) && Object.prototype.hasOwnProperty.call(config.theme, 'nav')) throw new Error(`${source}: theme.nav was removed; use navigation.links`);
}

export function validateConfigLayer(config: Record<string, any>, source = 'config.yml'): void {
  assertConfigSurface(config, source);
  validateRemovedConfig(config, source);
  validatePrivacyConfig(config, source);
  validateIntegrationSurface(config, source);
  validateConfigLinks(config, source);
  validateDeploymentConfig(config, source);
}

export function validateConfig(config: Record<string, any>, source = 'config.yml'): void {
  validateConfigLayer(config, source);
  validateLocales(config, source);
}

/**
 * A theme instance file is deliberately smaller than site configuration: it
 * may only contain plugin overrides.  Rejecting other top-level sections in
 * the loader keeps site data, provider settings, and presentation options
 * from growing a second undocumented configuration surface.
 */
export function validateThemeInstanceLayer(config: Record<string, any>, source = 'theme.config'): void {
  assertConfigSurface(config, source);
  for (const key of Object.keys(config)) if (key !== 'plugins') {
    throw new Error(`${source}: ${key} is not supported as a theme instance section; use plugin options under plugins`);
  }
  if (config.plugins !== undefined && config.plugins !== null && !isRecord(config.plugins)) {
    throw new Error(`${source}: plugins must be a mapping`);
  }
}
