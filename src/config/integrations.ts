import type { PageskillTheme, ThemeIntegrationAdapter, ThemeOptionSchema } from '../theme-api.ts';
import { isRecord } from './merge.ts';

export type ConfiguredIntegration = {
  id: string;
  settings: Record<string, any>;
  enabled: boolean;
  adapter: ThemeIntegrationAdapter;
  purpose: string;
  consent: ThemeIntegrationAdapter['privacy']['consent'];
  load: ThemeIntegrationAdapter['privacy']['load'];
  runtime: string;
};

function schemaValueMatches(value: unknown, schema: ThemeOptionSchema): boolean {
  if (schema.type === 'array') return Array.isArray(value);
  if (schema.type === 'object') return isRecord(value);
  if (schema.type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === schema.type;
}

function validateSchemaValue(value: unknown, schema: ThemeOptionSchema, label: string): void {
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

function adapterEntries(theme: PageskillTheme): Array<[string, ThemeIntegrationAdapter]> {
  const entries: Array<[string, ThemeIntegrationAdapter]> = [];
  const owners = new Map<string, string>();
  for (const [pluginName, plugin] of Object.entries(theme.plugins || {})) {
    for (const [id, adapter] of Object.entries(plugin.integrations || {})) {
      if (!isRecord(adapter)) throw new Error(`theme plugin ${pluginName} integration ${id} must be a code-owned adapter`);
      if (owners.has(id)) throw new Error(`integration adapter ${id} is registered by both ${owners.get(id)} and ${pluginName}`);
      if (adapter.id !== id) throw new Error(`theme plugin ${pluginName} integration ${id} must declare the same id`);
      if (!adapter.runtime || typeof adapter.runtime !== 'string') throw new Error(`theme plugin ${pluginName} integration ${id} must declare a runtime implementation`);
      if (!adapter.privacy || typeof adapter.privacy !== 'object') throw new Error(`theme plugin ${pluginName} integration ${id} must declare privacy metadata`);
      if (!adapter.privacy.purpose || !['required', 'optional', 'none'].includes(adapter.privacy.consent)) throw new Error(`theme plugin ${pluginName} integration ${id} has invalid privacy consent metadata`);
      if (!['immediate', 'consent', 'on-demand'].includes(adapter.privacy.load)) throw new Error(`theme plugin ${pluginName} integration ${id} has invalid load policy`);
      for (const field of adapter.publicFields || []) if (!adapter.schema?.[field]) throw new Error(`theme plugin ${pluginName} integration ${id} exposes unknown public field ${field}`);
      owners.set(id, pluginName);
      entries.push([id, adapter]);
    }
  }
  return entries;
}

export function integrationAdapters(theme: PageskillTheme): Record<string, ThemeIntegrationAdapter> {
  return Object.fromEntries(adapterEntries(theme));
}

function validateConfiguredIntegration(id: string, raw: unknown, adapter: ThemeIntegrationAdapter, source: string): void {
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
  if (enabled !== false) for (const [key, option] of Object.entries(schema)) {
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
      runtime: adapter.runtime
    } satisfies ConfiguredIntegration;
  }).filter(Boolean) as ConfiguredIntegration[];
}
