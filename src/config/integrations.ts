import type { PageskillTheme, ProviderAdapter, ComponentOptionSchema } from '../theme-api.ts';
import { isRecord } from './merge.ts';

export type ConfiguredIntegration = {
  id: string;
  settings: Record<string, any>;
  enabled: boolean;
  adapter: ProviderAdapter;
  purpose: string;
  consent: ProviderAdapter['privacy']['consent'];
  load: ProviderAdapter['privacy']['load'];
  loader: string;
};

function schemaValueMatches(value: unknown, schema: ComponentOptionSchema): boolean {
  if (schema.type === 'array') return Array.isArray(value);
  if (schema.type === 'object') return isRecord(value);
  if (schema.type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === schema.type;
}

function validateSchemaValue(value: unknown, schema: ComponentOptionSchema, label: string): void {
  if (!schemaValueMatches(value, schema)) throw new Error(`${label} must be ${schema.type}`);
  if (schema.enum && !schema.enum.some(candidate => JSON.stringify(candidate) === JSON.stringify(value))) {
    throw new Error(`${label} must be one of ${schema.enum.map(candidate => String(candidate)).join(', ')}`);
  }
  if (schema.type === 'number') {
    if (schema.min !== undefined && (value as number) < schema.min) throw new Error(`${label} must be at least ${schema.min}`);
    if (schema.max !== undefined && (value as number) > schema.max) throw new Error(`${label} must be at most ${schema.max}`);
  }
  if (schema.type === 'string' && schema.pattern) {
    let pattern: RegExp;
    try { pattern = new RegExp(schema.pattern); }
    catch { throw new Error(`${label} has an invalid adapter validation pattern`); }
    if (!pattern.test(value as string)) throw new Error(`${label} has an invalid format`);
  }
  if (schema.type === 'array' && schema.items) {
    (value as unknown[]).forEach((entry, index) => validateSchemaValue(entry, schema.items!, `${label}[${index}]`));
  }
  if (schema.type === 'object') {
    const properties = schema.properties || {};
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const child = properties[key];
      if (!child && schema.additionalProperties !== true) throw new Error(`${label}.${key} is not supported by the provider adapter`);
      if (child) validateSchemaValue(record[key], child, `${label}.${key}`);
    }
    for (const [key, child] of Object.entries(properties)) {
      if (child.required && record[key] === undefined) throw new Error(`${label}.${key} is required`);
    }
  }
}

function adapterEntries(theme: PageskillTheme): Array<[string, ProviderAdapter]> {
  const entries: Array<[string, ProviderAdapter]> = [];
  const owners = new Map<string, string>();
  for (const [componentName, component] of Object.entries(theme.components || {})) {
    for (const [id, adapter] of Object.entries(component.integrations || {})) {
      if (!isRecord(adapter)) throw new Error(`theme component ${componentName} integration ${id} must be a code-owned adapter`);
      if (owners.has(id)) throw new Error(`integration adapter ${id} is registered by both ${owners.get(id)} and ${componentName}`);
      if (adapter.id !== id) throw new Error(`theme component ${componentName} integration ${id} must declare the same id`);
      if (!adapter.loader || typeof adapter.loader !== 'string') throw new Error(`theme component ${componentName} integration ${id} must declare a browser loader`);
      if (!adapter.privacy || typeof adapter.privacy !== 'object') throw new Error(`theme component ${componentName} integration ${id} must declare privacy metadata`);
      if (!adapter.privacy.purpose || !['required', 'optional', 'none'].includes(adapter.privacy.consent)) throw new Error(`theme component ${componentName} integration ${id} has invalid privacy consent metadata`);
      if (!['immediate', 'consent', 'on-demand'].includes(adapter.privacy.load)) throw new Error(`theme component ${componentName} integration ${id} has invalid load policy`);
      for (const field of adapter.publicFields || []) if (!adapter.schema?.[field]) throw new Error(`theme component ${componentName} integration ${id} exposes unknown public field ${field}`);
      owners.set(id, componentName);
      entries.push([id, adapter]);
    }
  }
  return entries;
}

export function integrationAdapters(theme: PageskillTheme): Record<string, ProviderAdapter> {
  return Object.fromEntries(adapterEntries(theme));
}

function validateConfiguredIntegration(id: string, raw: unknown, adapter: ProviderAdapter, source: string): void {
  const label = `${source}: integrations.${id}`;
  if (!isRecord(raw)) throw new Error(`${label} must be a mapping`);
  const schema = adapter.schema || {};
  const enabled = raw.enabled === undefined ? true : raw.enabled;
  if (typeof enabled !== 'boolean') throw new Error(`${label}.enabled must be boolean`);
  for (const key of Object.keys(raw)) {
    if (key === 'enabled') continue;
    const option = schema[key];
    if (!option) throw new Error(`${label}.${key} is not supported by the ${id} provider adapter; purpose and script loading are code-owned`);
    validateSchemaValue(raw[key], option, `${label}.${key}`);
  }
  // An explicitly disabled integration may be kept in place without a valid
  // identifier, but an enabled node must satisfy every adapter requirement.
  if (enabled !== false) for (const [key, option] of Object.entries(schema) as Array<[string, ComponentOptionSchema]>) {
    if (option.required && raw[key] === undefined) throw new Error(`${label}.${key} is required`);
  }
}

export function validateConfiguredIntegrations(config: Record<string, any>, theme: PageskillTheme, source = 'config.yml'): void {
  const value = config.integrations;
  if (value === undefined || value === null) return;
  if (!isRecord(value)) throw new Error(`${source}: integrations must be a mapping keyed by registered provider id`);
  const adapters = integrationAdapters(theme);
  for (const [id, raw] of Object.entries(value)) {
    const adapter = adapters[id];
    if (!adapter) throw new Error(`${source}: integrations.${id} is not registered by the active theme; add a trusted Provider Adapter before configuring it`);
    validateConfiguredIntegration(id, raw, adapter, source);
  }
}

export function resolveConfiguredIntegrations(config: Record<string, any>, theme: PageskillTheme): ConfiguredIntegration[] {
  const value = isRecord(config.integrations) ? config.integrations : {};
  const adapters = integrationAdapters(theme);
  return Object.entries(value).map(([id, raw]) => {
    const adapter = adapters[id];
    if (!adapter || !isRecord(raw)) return null;
    const settings = { ...raw };
    const enabled = settings.enabled !== false;
    return {
      id,
      settings,
      enabled,
      adapter,
      purpose: adapter.privacy.purpose,
      consent: adapter.privacy.consent,
      load: adapter.privacy.load,
      loader: adapter.loader
    } satisfies ConfiguredIntegration;
  }).filter(Boolean) as ConfiguredIntegration[];
}

export type PrivacyPolicyDocument = {
  collection: string;
  id: string;
  locale: string;
  source: string;
  data: Record<string, any>;
};

/** Every active third-party Provider must be acknowledged by every localized
 * privacy-policy source. This makes a policy revision part of enabling the
 * integration instead of leaving it as an unenforced documentation reminder. */
export function integrationPrivacyPolicyDiagnostics(
  config: Record<string, any>,
  theme: PageskillTheme,
  documents: PrivacyPolicyDocument[]
): string[] {
  const active = resolveConfiguredIntegrations(config, theme).filter(item => item.enabled).map(item => item.id).sort();
  if (!active.length) return [];
  const diagnostics: string[] = [];
  for (const locale of config.activeLocales || [config.defaultLocale || 'en']) {
    const policy = documents.find(document => document.collection === 'pages' && document.id === 'privacy' && document.locale === locale);
    if (!policy) {
      diagnostics.push(`content/pages/privacy/${locale}.md:1:1: a localized privacy policy is required before enabling integrations: ${active.join(', ')}`);
      continue;
    }
    const declared = Array.isArray(policy.data.integrations) ? policy.data.integrations.map(String).sort() : [];
    const missing = active.filter(id => !declared.includes(id));
    const stale = declared.filter(id => !active.includes(id));
    if (missing.length) diagnostics.push(`${policy.source}:1:1: privacy policy frontmatter integrations must acknowledge enabled providers: ${missing.join(', ')}`);
    if (stale.length) diagnostics.push(`${policy.source}:1:1: privacy policy frontmatter integrations contains providers that are not enabled: ${stale.join(', ')}`);
  }
  return diagnostics;
}
