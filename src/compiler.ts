import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { parseYaml, YamlError } from './lib/yaml.ts';
import { escapeHtml, safeUrl, html, unsafeHtml } from './lib/safe-html.ts';
import { flattenDirectives, MarkdownError, parseMarkdown, renderInline } from './lib/markdown.ts';
import { planThemeStyles } from './lib/theme-styles.ts';
import { calculateContentMetrics } from './lib/content-metrics.ts';
import { parseIsoTimestamp } from './lib/content-dates.ts';
import { resolveSiteLinks, renderSiteLink } from './lib/site-links.ts';
import { loadConfig, loadThemeConfig } from './config/load.ts';
import { isRecord, mergeConfig } from './config/merge.ts';
import { configuredThemeName } from './config/validate.ts';
import { integrationAdapters, integrationPrivacyPolicyDiagnostics, resolveConfiguredIntegrations, validateConfiguredIntegrations, type ConfiguredIntegration } from './config/integrations.ts';
import { resolveClientApis } from './config/apis.ts';
import { containedPath, normalizePath, pathIsWithin, safeRelativePath } from './config/paths.ts';
import { renderPrivacyConsent } from './lib/privacy-consent.ts';
import { contentMetricsOptions, defaultComponent, documentIdentity, documentSchemaDiagnostics, loadDocument } from './compiler/documents.ts';
import { archiveRouteFor, blogRelationsFor, collectionContentKind, documentKey, documentOutputs, documentsForCollection, postCategory, queryDocuments, rebuildDocumentIndexes, routeFor, sourceDocuments, translationKey } from './compiler/routes.ts';
import type { MarkdownNode, SourcePosition, DirectiveNode } from './lib/markdown.ts';
import type { PageskillTheme, ComponentDefinition, ComponentDocumentInput, ComponentInput, ComponentChromeConfig, ComponentChromeLink, I18nSource, ComponentOptionSchema, ComponentRenderContext, ComponentResources, ComponentShellContext, ContentQueryOptions } from './theme-api.ts';
import type { BuildContext, BuildProfile, CacheManifest, CachedDocument, CachedImage, Document, ImageDimensions, Locale } from './compiler/types.ts';
export type { BuildContext, BuildProfile, CachedDocument, CachedImage, Document, ImageDimensions, Locale } from './compiler/types.ts';
// Increment this whenever compiler output semantics change so an existing
// incremental cache cannot preserve a discovery file rendered by old code.
const RENDERER_VERSION = '1.0.0-beta.0-client-api-contract-1';
const MAX_MARKDOWN_CACHE = 32;
const MAX_SOURCE_PARSE_CACHE = 64;
const LOAD_CONCURRENCY = 32;
const RENDER_CONCURRENCY = 32;

export const SafeHtml = html;
export { unsafeHtml, escapeHtml, safeUrl, parseYaml, parseMarkdown, renderInline, MarkdownError, YamlError };

function duration(start: number) { return Math.round((performance.now() - start) * 100) / 100; }
function sha(value: string | Uint8Array) { return crypto.createHash('sha256').update(value).digest('hex'); }
function shortHash(value: string | Uint8Array) { return sha(value).slice(0, 20); }


function outputTarget(ctx: BuildContext, relative: unknown): { normalized: string; target: string } {
  const raw = typeof relative === 'string' ? relative : String(relative ?? '');
  const target = containedPath(ctx.out, raw, 'build output path');
  return { normalized: normalizePath(path.relative(path.resolve(ctx.out), target)), target };
}

function configuredNavigation(config: Record<string, any>): Record<string, any> {
  return isRecord(config.navigation) ? config.navigation : {};
}

function versionedThemeAsset(relative: string, fingerprint: string) {
  const normalized = normalizePath(relative).replace(/^\/+/, '');
  const extension = path.extname(normalized).toLowerCase();
  if (!['.css', '.js', '.mjs'].includes(extension)) return normalized;
  return `${normalized.slice(0, -extension.length)}.${fingerprint}${extension}`;
}
function themeAssetHref(themeBase: string, relative: string, fingerprint: string) {
  return `${themeBase}/${versionedThemeAsset(safeRelativePath(relative, 'theme asset path'), fingerprint)}`;
}
function themeResourceFingerprint(ctx: BuildContext, relative: string, fallback = ''): string {
  const normalized = safeRelativePath(relative, 'theme asset path');
  return String(fallback || ctx.themeAssetHashes[normalized] || ctx.themeHash || RENDERER_VERSION).slice(0, 12);
}
function themeResourceHref(ctx: BuildContext, themeBase: string, relative: string, fallback = ''): string {
  return themeAssetHref(themeBase, relative, themeResourceFingerprint(ctx, relative, fallback));
}
function minifyCss(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>+~])\s*/g, '$1').replace(/;}\s*/g, '}').trim();
}
function diagnostic(position: SourcePosition, message: string) { return `${position.file}:${position.line}:${position.column}: ${message}`; }
function localizedValue(value: unknown, locale: string, fallback: string): string {
  if (value && typeof value === 'object') {
    const map = value as Record<string, unknown>;
    return String(map[locale] ?? map.en ?? Object.values(map).find(entry => entry !== undefined && entry !== null) ?? fallback);
  }
  return value === undefined || value === null || value === '' ? fallback : String(value);
}

function nestedValue(value: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((current, part) => current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined, value);
}

function localeCandidates(locale: string, fallbackLocale: string): string[] {
  const values = [
    locale,
    locale.replaceAll('_', '-').split('-')[0],
    fallbackLocale,
    fallbackLocale.replaceAll('_', '-').split('-')[0],
    'en'
  ];
  return [...new Set(values.filter(Boolean))];
}

function mergeLocaleValue(base: unknown, overlay: unknown): any {
  if (Array.isArray(base) && Array.isArray(overlay)) {
    const keyed = [...base, ...overlay].every(value => isRecord(value) && typeof value.id === 'string');
    if (!keyed) return overlay;
    const result = base.map(value => cloneThemeValue(value));
    for (const value of overlay) {
      const index = result.findIndex(candidate => candidate && candidate.id === value.id);
      if (index < 0) result.push(cloneThemeValue(value));
      else result[index] = mergeLocaleValue(result[index], value);
    }
    return result;
  }
  if (isRecord(base) && isRecord(overlay)) {
    const result: Record<string, any> = { ...base };
    for (const [key, value] of Object.entries(overlay)) result[key] = key in result ? mergeLocaleValue(result[key], value) : cloneThemeValue(value);
    return result;
  }
  return overlay === undefined ? base : cloneThemeValue(overlay);
}

function fallbackLocaleFor(ctx: BuildContext): string {
  return String(ctx.config.i18n?.fallbackLocale || ctx.themeI18n?.fallbackLocale || ctx.config.defaultLocale || 'en');
}

function themeLocaleData(ctx: BuildContext, locale: string): Record<string, any> {
  const messages = ctx.themeI18n?.messages && typeof ctx.themeI18n.messages === 'object' ? ctx.themeI18n.messages : ctx.themeI18n;
  if (!messages || typeof messages !== 'object') return {};
  const fallbackLocale = fallbackLocaleFor(ctx);
  let merged: Record<string, any> = {};
  for (const candidate of [...localeCandidates(locale, fallbackLocale)].reverse()) {
    const value = messages[candidate];
    if (value && typeof value === 'object') merged = mergeLocaleValue(merged, value);
  }
  return merged;
}

function themeText(ctx: BuildContext, locale: string, key: string, fallback: string): string {
  const value = nestedValue(themeLocaleData(ctx, locale), key);
  return value === undefined || value === null || value === '' || typeof value === 'object' ? fallback : String(value);
}

function interpolateMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{([A-Za-z0-9_.-]+)\}/g, (_match, key: string) => values[key] === undefined ? '' : String(values[key]));
}

/**
 * Read a locale-keyed copy override from a component instance file.
 * Fallback values are merged first, so a new locale can override only the
 * labels it has translated while the remaining labels stay usable.
 */
function themeComponentCopy(ctx: BuildContext, componentName: string, locale: string): Record<string, any> {
  const configured = themeComponentSettings(ctx, componentName).copy;
  if (!isRecord(configured)) return {};
  let merged: Record<string, any> = {};
  for (const candidate of [...localeCandidates(locale, fallbackLocaleFor(ctx))].reverse()) {
    if (isRecord(configured[candidate])) merged = mergeLocaleValue(merged, configured[candidate]);
  }
  return merged;
}

/** Return one safe string override; renderers still escape the final value. */
function themeComponentText(ctx: BuildContext, componentName: string, locale: string, key: string): string | undefined {
  const value = nestedValue(themeComponentCopy(ctx, componentName, locale), key);
  return value === undefined || value === null || value === '' || typeof value === 'object' ? undefined : String(value);
}

function languageDisplayName(ctx: BuildContext, locale: string, candidate: string): string {
  const localeData = ctx.themeI18n?.locales && typeof ctx.themeI18n.locales === 'object' ? ctx.themeI18n.locales[candidate] : undefined;
  const ownLabel = localeData && typeof localeData === 'object' ? (localeData.label || localeData.name) : localeData;
  const translated = themeText(ctx, locale, `languageNames.${candidate}`, '');
  return translated || (ownLabel ? String(ownLabel) : candidate);
}

function formatDate(value: string | undefined, locale: string, dateLocale = locale): string {
  if (!value) return '';
  const raw = value.trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const date = new Date(raw);
  if (Number.isNaN(date.valueOf())) return escapeHtml(value);
  try {
    const options: Intl.DateTimeFormatOptions = dateOnly ? { dateStyle: 'long', timeZone: 'UTC' } : { dateStyle: 'long' };
    return escapeHtml(new Intl.DateTimeFormat(dateLocale, options).format(date));
  }
  catch { return escapeHtml(date.toISOString().slice(0, 10)); }
}

function dateLocaleFor(ctx: BuildContext, locale: string): string {
  const value = ctx.themeI18n.locales?.[locale]?.dateLocale;
  return typeof value === 'string' && value ? value : locale;
}

/** Sort and validate publication/modification timestamps consistently. */
const publicationTimestamp = parseIsoTimestamp;

/**
 * Resolve a cover or social image to a safe public URL. Bare asset paths are
 * source-friendly (`assets/cover.webp`), while unsafe schemes and traversal
 * are rejected instead of being turned into links or image requests.
 */
function publicImageUrl(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim().replaceAll('\\', '/') : '';
  if (!raw || raw.startsWith('//') || /(?:^|\/)\.\.(?:\/|$)/.test(raw)) return '';
  if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return '';
  const candidate = /^https?:\/\//i.test(raw) || raw.startsWith('/') ? raw : `/assets/${raw.replace(/^assets\//i, '')}`;
  const safe = safeUrl(candidate);
  return safe === '#' ? '' : safe;
}

function absoluteImageUrl(value: unknown, siteUrl: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  const safe = publicImageUrl(raw);
  if (!safe) return '';
  return /^https?:\/\//i.test(raw) ? safe : safeUrl(`${siteUrl}${safe.startsWith('/') ? safe : `/${safe}`}`);
}

async function walk(directory: string, extensions: string[] = []): Promise<string[]> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true, recursive: true });
    return entries.filter((entry: any) => entry.isFile() && (!extensions.length || extensions.includes(path.extname(entry.name))))
      .map((entry: any) => path.join(entry.parentPath || entry.path || directory, entry.name)).sort();
  } catch (error: any) {
    if (error.code === 'ENOENT') return [];
    if (error.code !== 'ERR_INVALID_ARG_VALUE' && error.code !== 'ERR_INVALID_ARG_TYPE') throw error;
  }
  const result: string[] = [];
  const visit = async (current: string): Promise<void> => {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (!extensions.length || extensions.includes(path.extname(entry.name))) result.push(file);
    }
  };
  await visit(directory);
  return result.sort();
}

function themeResourceValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const record = value as Record<string, unknown>;
  return typeof record.path === 'string' ? record.path : typeof record.src === 'string' ? record.src : '';
}

function themeResourceList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(themeResourceValue).filter(Boolean);
}

function normalizeThemeResources(value: unknown): ComponentResources {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    styles: themeResourceList(record.styles)
  };
}

function normalizeThemeComponent(value: unknown, id: string): ComponentDefinition & Record<string, any> {
  const source = isRecord(value) ? value : {};
  return {
    ...source,
    id: typeof source.id === 'string' && source.id ? source.id : id,
    ...(source.resources !== undefined ? { resources: normalizeThemeResources(source.resources) } : {})
  };
}

function normalizeThemeDefinition(value: PageskillTheme): PageskillTheme {
  const resources = value.resources === undefined ? undefined : normalizeThemeResources(value.resources);
  const componentDefinitions = isRecord(value.components) ? value.components : {};
  const components = Object.fromEntries(Object.keys(componentDefinitions).map(name => [name, normalizeThemeComponent(componentDefinitions[name], name)]));
  return {
    ...value,
    ...(resources ? { resources } : {}),
    components
  };
}

function themeOptionValueMatches(value: unknown, type: ComponentOptionSchema['type']): boolean {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return isRecord(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === type;
}

function validateThemeOption(value: unknown, schema: ComponentOptionSchema, label: string): void {
  if (!themeOptionValueMatches(value, schema.type)) throw new Error(`${label} must be ${schema.type}`);
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
    catch { throw new Error(`${label} has an invalid validation pattern`); }
    if (!pattern.test(value as string)) throw new Error(`${label} has an invalid format`);
  }
  if (schema.type === 'array' && schema.items) {
    (value as unknown[]).forEach((entry, index) => validateThemeOption(entry, schema.items!, `${label}[${index}]`));
  }
  if (schema.type === 'object') {
    const properties = schema.properties || {};
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const child = properties[key];
      if (!child && schema.additionalProperties !== true) throw new Error(`${label}.${key} is not a supported option`);
      if (child) validateThemeOption(record[key], child, `${label}.${key}`);
    }
    for (const [key, child] of Object.entries(properties)) {
      if (child.required && record[key] === undefined) throw new Error(`${label}.${key} is required`);
    }
  }
}

function validateThemeComponentSettings(settings: Record<string, any>, schema: Record<string, ComponentOptionSchema>, label: string): void {
  for (const [key, value] of Object.entries(settings)) {
    const option = schema[key];
    if (!option) throw new Error(`${label}.${key} is not a supported option`);
    validateThemeOption(value, option, `${label}.${key}`);
  }
  for (const [key, option] of Object.entries(schema)) if (option.required && settings[key] === undefined) {
    throw new Error(`${label}.${key} is required`);
  }
}

function normalizeThemeConfig(theme: Record<string, any>, definition: PageskillTheme, sourceLabel = 'theme.config'): Record<string, any> {
  for (const key of Object.keys(theme)) if (key !== 'components') {
    throw new Error(`${sourceLabel}: ${key} is not supported as a theme instance section; use component options under components`);
  }
  const configuredComponents = theme.components === undefined ? {} : theme.components;
  if (!isRecord(configuredComponents)) throw new Error(`${sourceLabel}: components must be a mapping`);
  const definitions = definition.components || {};
  for (const name of Object.keys(configuredComponents)) {
    if (name === 'language') continue;
    if (!definitions[name]) throw new Error(`${sourceLabel}: components.${name} is not declared by the theme entry`);
    if (!isRecord(configuredComponents[name])) throw new Error(`${sourceLabel}: components.${name} must be a mapping`);
  }
  const components: Record<string, any> = {};
  for (const [name, component] of Object.entries(definitions)) {
    const schema = component.schema || {};
    const defaults = isRecord(component.defaults) ? cloneThemeValue(component.defaults) : {};
    const configured = name === 'language' ? {} : isRecord(configuredComponents[name]) ? configuredComponents[name] : {};
    const mergedSettings = mergeConfig(defaults, configured);
    validateThemeComponentSettings(mergedSettings, schema, `${sourceLabel}: components.${name}`);
    components[name] = mergedSettings;
  }
  return { components };
}

function themeI18nSources(definition: PageskillTheme): Array<{ owner: string; source: I18nSource }> {
  const sources: Array<{ owner: string; source: I18nSource }> = [];
  if (definition.i18n !== undefined) {
    const values = Array.isArray(definition.i18n) ? definition.i18n : [definition.i18n];
    values.forEach((source, index) => sources.push({ owner: `theme.i18n[${index}]`, source }));
  }
  for (const [name, component] of Object.entries(definition.components || {})) {
    if (component.i18n === undefined) continue;
    const values = Array.isArray(component.i18n) ? component.i18n : [component.i18n];
    values.forEach((source, index) => sources.push({ owner: `theme.components.${name}.i18n[${index}]`, source }));
  }
  return sources;
}

function cloneThemeValue(value: any): any {
  if (Array.isArray(value)) return value.map(cloneThemeValue);
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cloneThemeValue(child)]));
  return value;
}

function mergeThemeTranslations(target: Record<string, any>, source: Record<string, any>, owner: string, trail = ''): void {
  for (const [key, value] of Object.entries(source)) {
    const nextTrail = trail ? `${trail}.${key}` : key;
    if (!(key in target)) {
      target[key] = cloneThemeValue(value);
      continue;
    }
    const existing = target[key];
    if (isRecord(existing) && isRecord(value)) {
      mergeThemeTranslations(existing, value, owner, nextTrail);
      continue;
    }
    if (JSON.stringify(existing) !== JSON.stringify(value)) {
      throw new Error(`theme translation conflict at ${nextTrail} while loading ${owner}`);
    }
  }
}

async function readThemeI18nSource(themeRoot: string, source: I18nSource, owner: string): Promise<Record<string, any>> {
  if (typeof source === 'string') {
    const file = containedPath(themeRoot, source, `${owner} path`);
    const raw = await fs.readFile(file, 'utf8');
    const parsed = parseYaml(raw);
    if (!isRecord(parsed)) throw new Error(`${owner} must contain a mapping`);
    return parsed;
  }
  if (isRecord(source) && typeof source.source === 'string' && !source.messages && !source.locales) {
    const loaded = await readThemeI18nSource(themeRoot, source.source, owner);
    return source.fallbackLocale && loaded.fallbackLocale === undefined
      ? { ...loaded, fallbackLocale: source.fallbackLocale }
      : loaded;
  }
  if (!isRecord(source)) throw new Error(`${owner} must be a path or mapping`);
  return source;
}

async function loadThemeI18n(themeRoot: string, definition: PageskillTheme, defaultLocale: string): Promise<Record<string, any>> {
  const merged: Record<string, any> = {};
  for (const { owner, source } of themeI18nSources(definition)) {
    mergeThemeTranslations(merged, await readThemeI18nSource(themeRoot, source, owner), owner);
  }
  if (!merged.fallbackLocale) merged.fallbackLocale = defaultLocale;
  return merged;
}

function validateThemeResourcePath(themeRoot: string, value: unknown, label: string): string {
  const relative = safeRelativePath(themeResourceValue(value), label);
  containedPath(themeRoot, relative, label);
  return relative;
}

function validateThemeResources(themeRoot: string, definition: PageskillTheme): void {
  const checkResources = (resources: ComponentResources | undefined, label: string) => {
    for (const pathValue of resources?.styles || []) validateThemeResourcePath(themeRoot, pathValue, label);
  };
  checkResources(definition.resources, 'theme resource path');
  for (const [name, component] of Object.entries(definition.components || {})) {
    checkResources(component.resources, `theme component ${name} resource path`);
    if (component.client) {
      validateThemeResourcePath(themeRoot, component.client.module, `theme component ${name} client module`);
      if (!component.client.selector.trim()) throw new Error(`theme component ${name} client selector must not be empty`);
      if (component.capabilities?.includes('integration') && !Object.keys(component.integrations || {}).length) throw new Error(`integration Component ${name} must declare at least one trusted Provider Adapter`);
    }
  }
  for (const { owner, source } of themeI18nSources(definition)) {
    if (typeof source === 'string') validateThemeResourcePath(themeRoot, source, `${owner} path`);
    else if (isRecord(source) && typeof source.source === 'string') validateThemeResourcePath(themeRoot, source.source, `${owner} path`);
  }
}

/**
 * Resource access stays behind the normalized, code-owned theme definition;
 * the renderer and asset copier do not maintain a second package registry.
 */
function themeResources(ctx: BuildContext): ComponentResources {
  return ctx.themeDefinition.resources || {};
}

function themeComponent(ctx: BuildContext, name: string): (ComponentDefinition & Record<string, any>) | undefined {
  const component = ctx.themeDefinition.components?.[name];
  return component as (ComponentDefinition & Record<string, any>) | undefined;
}

function resourcePaths(resources: ComponentResources | undefined, kind: 'styles'): string[] {
  return themeResourceList(resources?.styles);
}

function componentResourcePaths(ctx: BuildContext, names: string[], kind: 'styles'): string[] {
  for (const name of names) {
    const paths = resourcePaths(themeComponent(ctx, name)?.resources, kind);
    if (paths.length) return paths;
  }
  return [];
}

// Most components are data-driven capabilities: once their site instance is
// enabled, their declared resources are available to every rendered page.
// A few components own their markup and loading lifecycle (consent, search, the
// language picker, and the table-of-contents Component), so their resources are
// emitted by those renderers instead of this generic path.
function genericComponentResourcePaths(ctx: BuildContext, kind: 'styles'): string[] {
  const rendererOwned = new Set(['privacyConsent', 'consent', 'search', 'language', 'languagePicker', 'toc', 'comments']);
  const paths: string[] = [];
  for (const [name, component] of Object.entries(ctx.themeDefinition.components || {})) {
    if (rendererOwned.has(name) || !componentEnabled(ctx, name)) continue;
    paths.push(...resourcePaths(component.resources, kind));
  }
  return [...new Set(paths)];
}

function componentResourcePathsFor(ctx: BuildContext, name: string, kind: 'styles'): string[] {
  return resourcePaths(themeComponent(ctx, name)?.resources, kind);
}

function clientComponents(ctx: BuildContext) {
  return Object.entries(ctx.themeDefinition.components || {})
    .filter(([name, component]) => Boolean(component.client && componentEnabled(ctx, name)))
    .map(([name, component]) => ({ name, client: component.client! }));
}

function clientBootstrapHref(ctx: BuildContext): string {
  return `/assets/pageskill/client.js?v=${shortHash(`${ctx.themeHash}:${RENDERER_VERSION}`).slice(0, 12)}`;
}

function themeComponentSettings(ctx: BuildContext, name: string): Record<string, any> {
  const settings = ctx.themeConfig?.components?.[name];
  return isRecord(settings) ? settings : {};
}

const MAX_CHROME_LINKS = 8;
const MAX_CHROME_LABEL_LENGTH = 160;
const MAX_CHROME_HREF_LENGTH = 2048;

function emptyChromeSlot(): ComponentChromeConfig['navigation'] {
  return { enabled: false, before: [], after: [] };
}

function configuredChromeSlot(ctx: BuildContext, doc: Document, currentRoute: string, regionName: 'navigation' | 'footer'): ComponentChromeConfig['navigation'] {
  const settings = themeComponentSettings(ctx, 'shell');
  const region = isRecord(settings[regionName]) ? settings[regionName] : {};
  const enabled = settings.enabled !== false && region.enabled !== false;
  if (!enabled || !themeComponentFor(ctx, 'shell')) return emptyChromeSlot();
  const links = (slot: 'before' | 'after'): ComponentChromeLink[] => {
    const values = Array.isArray(region[slot]) ? region[slot] : [];
    return values.slice(0, MAX_CHROME_LINKS).map((item: unknown) => {
      if (!isRecord(item)) return null;
      try {
        return resolveSiteLinks([item], {
          locale: doc.locale,
          fallbackLocale: fallbackLocaleFor(ctx),
          currentPath: currentRoute,
          namespace: regionName,
          translate: (key, fallback) => themeText(ctx, doc.locale, key, fallback)
        })[0] || null;
      } catch {
        return null;
      }
    }).filter(Boolean).map(link => ({ ...link, label: link!.label.slice(0, MAX_CHROME_LABEL_LENGTH), href: link!.href.slice(0, MAX_CHROME_HREF_LENGTH) })) as ComponentChromeLink[];
  };
  return { enabled: true, before: links('before'), after: links('after') };
}

function configuredChrome(ctx: BuildContext, doc: Document, currentRoute: string, showSiteChrome: boolean): ComponentChromeConfig {
  if (!showSiteChrome) return { navigation: emptyChromeSlot(), footer: configuredChromeSlot(ctx, doc, currentRoute, 'footer') };
  return {
    navigation: configuredChromeSlot(ctx, doc, currentRoute, 'navigation'),
    footer: configuredChromeSlot(ctx, doc, currentRoute, 'footer')
  };
}

function moduleGenerationSpecifier(specifier: string, generation: string): string {
  const hash = specifier.indexOf('#');
  const query = hash >= 0 ? specifier.slice(0, hash) : specifier;
  const fragment = hash >= 0 ? specifier.slice(hash) : '';
  return `${query}${query.includes('?') ? '&' : '?'}pageskill=${generation}${fragment}`;
}

function rewriteThemeModuleImports(source: string, sourceFile: string, sourceRoot: string, generation: string): string {
  const rewrite = (full: string, prefix: string, quote: string, specifier: string) => {
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) return full;
    const clean = specifier.split(/[?#]/, 1)[0];
    const target = path.resolve(path.dirname(sourceFile), clean);
    const suffix = specifier.slice(clean.length);
    if (pathIsWithin(sourceRoot, target)) {
      return `${prefix}${quote}${moduleGenerationSpecifier(clean + suffix, generation)}${quote}`;
    }
    return `${prefix}${quote}${moduleGenerationSpecifier(`${pathToFileURL(target).href}${suffix}`, generation)}${quote}`;
  };
  let rewritten = source.replace(/(\bfrom\s*)(['"])([^'"]+)\2/g, rewrite);
  rewritten = rewritten.replace(/(\bimport\s*)(['"])([^'"]+)\2/g, rewrite);
  return rewritten.replace(/(\bimport\s*\(\s*)(['"])([^'"]+)\2/g, rewrite);
}

async function importThemeModule(candidate: string, root: string, themeRoot: string, themeName: string, generation: string): Promise<any> {
  const runtimeRoot = path.join(root, '.pageskill', 'theme-runtime');
  const runtimeThemeRoot = path.join(runtimeRoot, 'themes', themeName);
  // Preserve the compiled runtime tree inside the generation directory. This
  // matters for imports from themes/* into src/*: keeping only the theme
  // subtree would leave those nested ESM dependencies in the old cache root.
  const sourceRoot = pathIsWithin(runtimeThemeRoot, candidate) ? runtimeRoot : themeRoot;
  const generationRoot = path.join(root, '.pageskill', 'theme-generations', `${themeName}-${generation}`);
  const relativeCandidate = path.relative(sourceRoot, candidate);
  if (!relativeCandidate || relativeCandidate.startsWith('..') || path.isAbsolute(relativeCandidate)) {
    throw new Error(`theme module ${normalizePath(path.relative(root, candidate))} is outside its module root`);
  }
  const cachedCandidate = path.join(generationRoot, relativeCandidate);
  if (!(await fs.access(cachedCandidate).then(() => true).catch(() => false))) {
    const files = await walk(sourceRoot);
    for (const file of files) {
      const relative = path.relative(sourceRoot, file);
      const target = path.join(generationRoot, relative);
      await fs.mkdir(path.dirname(target), { recursive: true });
      const extension = path.extname(file).toLowerCase();
      if (extension === '.js' || extension === '.mjs' || extension === '.ts') {
        const source = await fs.readFile(file, 'utf8');
        await fs.writeFile(target, rewriteThemeModuleImports(source, file, sourceRoot, generation));
      } else {
        await fs.copyFile(file, target);
      }
    }
  }
  return import(`${pathToFileURL(cachedCandidate).href}?pageskill=${generation}`);
}

async function loadThemeDefinition(root: string, themeName: string, generation: string): Promise<PageskillTheme> {
  const themeRoot = containedPath(path.join(root, 'themes'), themeName, 'theme directory');
  const configuredEntry = 'index.ts';
  const compiledEntries = [
    configuredEntry.endsWith('.ts') ? configuredEntry.replace(/\.ts$/, '.js') : '',
    configuredEntry.endsWith('.ts') ? configuredEntry.replace(/\.ts$/, '.mjs') : ''
  ].filter(Boolean);
  const sourceCandidates = [
    containedPath(themeRoot, configuredEntry, 'theme module path'),
    ...compiledEntries.map(entry => containedPath(themeRoot, entry, 'compiled theme module path'))
  ];
  const runtimeCandidates = sourceCandidates
    .filter(file => file.endsWith('.ts'))
    .map(file => path.join(root, '.pageskill', 'theme-runtime', path.relative(root, file).replace(/\.ts$/, '.js')));
  const candidates = [...runtimeCandidates, ...sourceCandidates];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      const module = await importThemeModule(candidate, root, themeRoot, themeName, generation);
      const definition = module.default || module.theme;
      if (definition?.components && typeof definition.components === 'object') {
        const normalized = normalizeThemeDefinition(definition as PageskillTheme);
        validateThemeResources(themeRoot, normalized);
        return normalized;
      }
      throw new Error(`theme module ${normalizePath(path.relative(root, candidate))} must export a PageskillTheme as default`);
    } catch (error: any) {
      if (error.code === 'ENOENT') continue;
      if (error instanceof TypeError && /Cannot find module/.test(error.message)) continue;
      if (error.message?.startsWith('theme module ')) throw error;
      throw new Error(`failed to load theme module ${normalizePath(path.relative(root, candidate))}: ${error.message}`);
    }
  }
  throw new Error(`theme "${themeName}" has no module; add themes/${themeName}/index.ts exporting defineTheme(...)`);
}

function cloneMarkdownNodes(nodes: MarkdownNode[], file: string): MarkdownNode[] {
  return nodes.map(node => node.kind === 'directive'
    ? { ...node, attrs: { ...node.attrs }, children: cloneMarkdownNodes(node.children, file), position: { ...node.position, file } }
    : { ...node, position: { ...node.position, file } } as MarkdownNode);
}

function parseDocumentNodes(ctx: BuildContext, doc: Document) {
  if (doc.nodes.length || !doc.markdown) return;
  const key = shortHash(`${doc.bodyLine}\0${doc.markdown}`);
  const cached = ctx.markdownCache.get(key);
  if (cached) doc.nodes = cloneMarkdownNodes(cached, doc.source);
  else {
    doc.nodes = parseMarkdown(doc.markdown, doc.source, doc.bodyLine || 1);
    if (ctx.markdownCache.size >= MAX_MARKDOWN_CACHE) ctx.markdownCache.delete(ctx.markdownCache.keys().next().value as string);
    ctx.markdownCache.set(key, doc.nodes);
  }
  doc.directives = flattenDirectives(doc.nodes);
}

function dependenciesFor(ctx: BuildContext, doc: Document): string[] {
  const dependencies = new Set<string>([`translation:${doc.collection}:${doc.id}`]);
  const context = themeContextFor(ctx, doc);
  for (const directive of doc.directives) {
    if (directive.name === 'slot') continue;
    const definition = ctx.themeDefinition.components[directive.name];
    const children = directive.children.filter(child => child.kind !== 'directive' || child.name !== 'slot');
    const input: ComponentInput = { node: directive, attrs: directive.attrs, children, slots: { default: children }, props: {}, renderedChildren: '' };
    for (const dependency of definition?.dependencies?.(input, context) || []) dependencies.add(dependency);
  }
  return [...dependencies].sort();
}

function slug(value: string) { return value.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{Letter}\p{Number}\s-]/gu, '').trim().replace(/[\s_-]+/g, '-'); }
function addIntrinsicImageDimensions(ctx: BuildContext, markup: string): string {
  return markup.replace(/<img\b([^>]*?)>/g, (_match, attributes: string) => {
    if (/\bwidth\s*=|\bheight\s*=/i.test(attributes)) return `<img${attributes}>`;
    const source = attributes.match(/\bsrc="([^"\n]+)"/i)?.[1] || '';
    if (!source.startsWith('/') || source.startsWith('//')) return `<img${attributes}>`;
    const pathname = source.split(/[?#]/, 1)[0];
    const dimensions = ctx.imageDimensions[pathname];
    if (!dimensions) return `<img${attributes}>`;
    return `<img${attributes} width="${dimensions.width}" height="${dimensions.height}">`;
  });
}

function renderMarkdownNode(ctx: BuildContext, doc: Document, node: MarkdownNode, componentContext?: ComponentRenderContext): string {
  if (node.kind === 'directive') return '';
  if (node.kind !== 'code') return addIntrinsicImageDimensions(ctx, node.html);
  if (!componentEnabled(ctx, 'codeCopy') || !ctx.themeDefinition.components.codeCopy?.render || !componentContext) return node.html;
  return componentContext.renderComponent('codeCopy', { props: { value: node.value, language: node.language } });
}
function themeContextFor(ctx: BuildContext, doc: Document): ComponentRenderContext {
  let context!: ComponentRenderContext;
  const identity = { collection: doc.collection, id: doc.id, key: doc.contentKey, contentKey: doc.contentKey, locale: doc.locale };
  context = {
    doc,
    config: ctx.config,
    theme: ctx.theme,
    themeConfig: ctx.themeConfig,
    content: {
      identity,
      query: (options: ContentQueryOptions = {}) => queryDocuments(ctx, { ...options, locale: options.locale || doc.locale }),
      translations: (collection = doc.collection, id = doc.id) => ctx.translationIndex.get(translationKey(collection, id)) || [],
      label: value => themeText(ctx, doc.locale, `collections.${value}`, value),
      position: candidate => ctx.documentPositions.get(documentKey(candidate as Document)) ?? -1
    },
    url: {
      siteUrl: String(ctx.config.siteUrl || '').replace(/\/$/, ''),
      forDocument: candidate => routeFor(ctx, candidate as Document),
      forCollection: (collection, locale = doc.locale) => archiveRouteFor(ctx, { collection, locale }),
      forArchive: options => archiveRouteFor(ctx, { ...options, locale: options.locale || doc.locale }),
      asset: value => publicImageUrl(value),
      sitemap: String(ctx.config.routes?.sitemap || '/sitemap.xml')
    },
    renderNodes: nodes => nodes.map(node => node.kind === 'directive'
      ? node.name === 'slot' ? '' : context.renderComponent(node.name, { node, attrs: node.attrs, children: node.children })
      : renderMarkdownNode(ctx, doc, node, context)).join(''),
    renderComponent: (name, input = {}) => renderThemeComponent(ctx, name, input, context),
    renderInline,
    escapeHtml,
    safeUrl,
    localized: (value, fallback) => localizedValue(value, doc.locale, fallback),
    translate: (key, fallback) => themeText(ctx, doc.locale, key, fallback),
    componentText: (componentName, key, fallback) => themeComponentText(ctx, componentName, doc.locale, key) || fallback,
    formatDate: value => formatDate(value, doc.locale, dateLocaleFor(ctx, doc.locale)),
    blogRelations: () => blogRelationsFor(ctx, doc, (locale, key, fallback) => themeText(ctx, locale, key, fallback))
  };
  return context;
}

function renderThemeComponent(ctx: BuildContext, name: string, partial: Partial<ComponentInput>, context: ComponentRenderContext): string {
  const definition = ctx.themeDefinition.components[name];
  if (!definition?.render) throw new MarkdownError(`unknown Component "${name}"; use one of ${Object.keys(ctx.themeDefinition.components).join(', ')}`, partial.node?.position || { file: '<component>', line: 1, column: 1 });
  const rawChildren = partial.children || partial.node?.children || [];
  const children = rawChildren.filter(child => child.kind !== 'directive' || child.name !== 'slot');
  const namedSlots: Record<string, MarkdownNode[]> = {};
  for (const child of rawChildren) {
    if (child.kind !== 'directive' || child.name !== 'slot') continue;
    const slotName = child.attrs.name;
    if (!slotName || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(slotName)) {
      throw new MarkdownError('slot requires a valid name attribute', child.position);
    }
    for (const key of Object.keys(child.attrs)) if (key !== 'name') {
      throw new MarkdownError(`slot attribute "${key}" is not supported`, child.position);
    }
    if (namedSlots[slotName]) throw new MarkdownError(`slot "${slotName}" is declared more than once`, child.position);
    namedSlots[slotName] = child.children;
  }
  const input: ComponentInput = {
    node: partial.node,
    attrs: partial.attrs || partial.node?.attrs || {},
    children,
    slots: { default: children, ...namedSlots, ...(partial.slots || {}) },
    props: partial.props || {},
    renderedChildren: partial.renderedChildren === undefined ? context.renderNodes(children) : partial.renderedChildren,
    runtime: partial.runtime
  };
  return definition.render(input, context);
}

function validateComponentAttrs(node: DirectiveNode, definition: ComponentDefinition) {
  const schema = definition.schema || {};
  for (const key of Object.keys(node.attrs)) {
    if (!(key in schema)) throw new MarkdownError(`unknown attribute "${key}" on Component "${node.name}"; available attributes: ${Object.keys(schema).join(', ') || 'none'}`, node.position);
  }
}

function renderChromeLinks(context: ComponentShellContext, links: ComponentChromeLink[], className: string): string {
  return links.map(link => renderSiteLink(link, className, context.escapeHtml)).join('');
}

function fallbackShell(context: ComponentShellContext): string {
  const chrome = context.chrome || { navigation: { enabled: true, before: [], after: [] }, footer: { enabled: true, before: [], after: [] } };
  const pageLanguages = isPostCollectionConfig(context.config, context.doc.collection) ? context.languageLinks : '';
  const languageNav = pageLanguages ? `<nav class="languages" aria-label="${context.escapeHtml(context.languageLabel)}"><span class="languages-heading" aria-hidden="true">${context.escapeHtml(context.languageLabel)}</span><div class="languages-list">${pageLanguages}</div></nav>` : '';
  const collectionKeyName = context.doc.collection === 'archive' ? String(context.doc.data?.archiveCollection || 'posts') : context.doc.collection;
  const collectionLabel = context.translate(`collections.${collectionKeyName}`, collectionKeyName);
  const pageHeader = context.doc.source.startsWith('generated:') ? '' : `<header class="page-header"><p class="eyebrow">${context.escapeHtml(collectionLabel)}</p><h1>${context.escapeHtml(context.doc.title)}</h1>${context.doc.description ? `<p>${context.escapeHtml(context.doc.description)}</p>` : ''}${languageNav}</header>`;
  const navLinks = `${renderChromeLinks(context, chrome.navigation.before, 'primary-nav-link')}${context.navigationLinks}${renderChromeLinks(context, chrome.navigation.after, 'primary-nav-link')}`;
  const primaryNav = navLinks ? `<nav class="primary-nav" aria-label="${context.escapeHtml(context.navigationLabel)}">${navLinks}</nav>` : '';
  const headerActions = `${context.searchMarkup}${primaryNav}`;
  const siteMapLabel = context.translate('siteMap', 'Site map');
  const privacyPolicy = context.privacy.enabled ? `<a class="footer-tool-link" data-privacy-policy href="${context.safeUrl(context.privacy.policyHref)}">${context.escapeHtml(context.privacy.policyLabel)}</a>` : '';
  const footerTools = `<nav class="footer-tools" aria-label="${context.escapeHtml(siteMapLabel)}">${renderChromeLinks(context, chrome.footer.before, 'footer-tool-link')}${context.footerLinks}<a class="footer-tool-link" href="${context.safeUrl(context.url.sitemap)}" data-site-map>${context.escapeHtml(siteMapLabel)}</a>${privacyPolicy}${context.privacyTriggerMarkup || ''}${renderChromeLinks(context, chrome.footer.after, 'footer-tool-link')}</nav>`;
  return `<!doctype html><html lang="${context.escapeHtml(context.htmlLang || context.doc.locale)}"><head>${context.head}</head><body class="${context.bodyClass}" data-component="${context.escapeHtml(context.doc.component)}">${context.privacyMarkup}<a class="skip" href="#main">${context.escapeHtml(context.skipLabel)}</a><header class="site-header"><div class="header-inner"><a class="brand" href="${context.homeHref}"><img class="brand-mark" src="${context.brandIcon}" alt="" width="32" height="32"><span class="brand-copy"><strong>${context.escapeHtml(context.siteName)}</strong><small>${context.escapeHtml(context.headerNote)}</small></span></a>${headerActions ? `<div class="header-actions">${headerActions}</div>` : ''}</div></header><main id="main" tabindex="-1" class="${context.mainClass}">${pageHeader}${context.renderedContent}</main><footer class="site-footer"><div class="footer-grid">${footerTools}</div></footer></body></html>`;
}

function componentEnabled(ctx: BuildContext, name: string): boolean {
  const themeComponent = themeComponentFor(ctx, name);
  const settings = themeComponentSettings(ctx, name);
  // Theme code declares the capability and its schema; the theme instance file
  // owns the instance switch and all user-provided options.
  return Boolean(themeComponent) && settings.enabled !== false;
}

function themeComponentFor(ctx: BuildContext, name: string): (ComponentDefinition & Record<string, any>) | undefined {
  return themeComponent(ctx, name);
}

function numericComponentSetting(ctx: BuildContext, componentName: string, key: string, fallback: number): number {
  const configured = Number(themeComponentSettings(ctx, componentName)[key]);
  if (Number.isFinite(configured)) return configured;
  const defaultValue = Number(themeComponentFor(ctx, componentName)?.defaults?.[key]);
  return Number.isFinite(defaultValue) ? defaultValue : fallback;
}

const PRIVACY_PURPOSE_FALLBACKS: Record<string, { title: string; description: string }> = {
  measurement: { title: 'Audience measurement', description: 'Configured measurement services may measure visits after an affirmative choice.' },
  advertising: { title: 'Advertising', description: 'Configured advertising services may run after an affirmative choice.' },
  'fraud-prevention': { title: 'Fraud prevention', description: 'Configured human-verification services may run when their adapter needs them.' },
  'social-embedding': { title: 'Social content', description: 'Configured social embeds may load after an affirmative choice.' }
};

function privacyConsentSettings(ctx: BuildContext): Record<string, any> {
  const value = ctx.config.privacy?.consent;
  return isRecord(value) ? value : {};
}

function privacyPolicyRoute(ctx: BuildContext, locale: string): string {
  const configured = ctx.config.privacy?.policyRoute;
  const route = typeof configured === 'string' && configured.trim() ? configured.trim() : '/:locale/privacy/';
  return route.replaceAll(':locale', locale);
}

function privacyAgentRoute(ctx: BuildContext): string {
  const configured = ctx.config.privacy?.agentRoute;
  return typeof configured === 'string' && configured.trim() ? configured.trim() : '/.well-known/agent.json';
}

function configuredIntegrations(ctx: BuildContext, includeDisabled = false): ConfiguredIntegration[] {
  const values = resolveConfiguredIntegrations(ctx.config, ctx.themeDefinition);
  return includeDisabled ? values : values.filter(value => value.enabled);
}

function privacyConsentRequired(ctx: BuildContext): boolean {
  return configuredIntegrations(ctx).some(integration => integration.consent !== 'none');
}

function decisionRetentionDays(ctx: BuildContext): number {
  const value = Number(privacyConsentSettings(ctx).decisionRetentionDays ?? 365);
  return Number.isFinite(value) ? Math.max(0, Math.min(3650, Math.floor(value))) : 365;
}

function privacyPurposeCopy(ctx: BuildContext, locale: string, purpose: string, field: 'title' | 'description'): string {
  const fallback = PRIVACY_PURPOSE_FALLBACKS[purpose]?.[field] || (field === 'title' ? purpose : 'Optional processing declared by the provider adapter.');
  return themeText(ctx, locale, `privacyConsent.purposes.${purpose}.${field}`, fallback);
}

function privacyIntegrationLabel(ctx: BuildContext, integration: ConfiguredIntegration, locale: string): string {
  const key = integration.adapter.labelKey || `privacyConsent.providers.${integration.id}`;
  return themeText(ctx, locale, key, integration.id);
}

function browserIntegration(integration: ConfiguredIntegration): Record<string, any> {
  const fields = Object.fromEntries((integration.adapter.publicFields || []).flatMap(key => {
    const value = integration.settings[key];
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? [[key, value]] : [];
  }));
  return {
    id: integration.id,
    loader: integration.loader,
    purpose: integration.purpose,
    consent: integration.consent,
    load: integration.load,
    enabled: true,
    placeholder: Boolean(integration.adapter.placeholder),
    ...fields
  };
}

function publicPrivacyIntegration(integration: ConfiguredIntegration, enabled = true): Record<string, any> {
  return {
    id: integration.id,
    purpose: integration.purpose,
    consent: integration.consent,
    load: integration.load,
    enabled,
    ...(integration.adapter.labelKey ? { labelKey: integration.adapter.labelKey } : {})
  };
}

function privacyCategories(ctx: BuildContext, integrations: ConfiguredIntegration[], locale: string) {
  const grouped = new Map<string, ConfiguredIntegration[]>();
  for (const integration of integrations) {
    if (integration.consent === 'none') continue;
    grouped.set(integration.purpose, [...(grouped.get(integration.purpose) || []), integration]);
  }
  return [...grouped.entries()].map(([purpose, members]) => ({
    purpose,
    label: privacyPurposeCopy(ctx, locale, purpose, 'title'),
    description: privacyPurposeCopy(ctx, locale, purpose, 'description'),
    providers: members.map(member => privacyIntegrationLabel(ctx, member, locale))
  }));
}

function privacyShellData(ctx: BuildContext, doc: Document) {
  const all = configuredIntegrations(ctx);
  const gated = all.filter(integration => integration.consent !== 'none');
  const settings = privacyConsentSettings(ctx);
  const providerEnabled = all.length > 0;
  const enabled = gated.length > 0 && settings.enabled !== false && componentEnabled(ctx, 'privacyConsent');
  const text = (key: string, fallback: string) => themeText(ctx, doc.locale, `privacyConsent.${key}`, fallback);
  const privacy = {
    providerEnabled,
    enabled,
    decisionRetentionDays: decisionRetentionDays(ctx),
    policyHref: safeUrl(privacyPolicyRoute(ctx, doc.locale)),
    title: text('title', 'Privacy choices'),
    description: text('description', 'Choose which configured optional services may run.'),
    bannerLabel: text('bannerLabel', 'Privacy choices'),
    settingsLabel: text('settingsLabel', 'Privacy settings'),
    acceptLabel: text('acceptLabel', 'Accept all'),
    rejectLabel: text('rejectLabel', 'Essential only'),
    saveLabel: text('saveLabel', 'Save choices'),
    closeLabel: text('closeLabel', 'Close'),
    policyLabel: text('policyLabel', 'Privacy policy'),
    socialPlaceholderTitle: text('socialPlaceholder.title', 'Social content is paused'),
    socialPlaceholderDescription: text('socialPlaceholder.description', 'Allow social content to load this embed.'),
    socialPlaceholderAllowLabel: text('socialPlaceholder.allow', 'Allow social content'),
    categories: privacyCategories(ctx, gated, doc.locale),
    integrations: all.map(browserIntegration)
  };
  const rendered = renderPrivacyConsent(privacy, {
    escapeHtml,
    safeUrl,
    translate: (key, fallback) => themeText(ctx, doc.locale, key, fallback)
  });
  return { privacy, privacyMarkup: rendered.markup, privacyTriggerMarkup: rendered.triggerMarkup };
}

function localSearchData(ctx: BuildContext, doc: Document) {
  const settings = themeComponentSettings(ctx, 'search');
  const component = themeComponentFor(ctx, 'search');
  const hasComponent = Boolean(component);
  const enabled = !doc.source.startsWith('generated:') && hasComponent && settings.enabled !== false && componentEnabled(ctx, 'search');
  const text = (key: string, fallback: string) => themeComponentText(ctx, 'search', doc.locale, key) || themeText(ctx, doc.locale, `search.${key}`, fallback);
  const search = {
    enabled,
    indexHref: `/assets/search-index.${doc.locale}.json`,
    label: text('label', 'Search this site'),
    placeholder: text('placeholder', 'Search pages and posts'),
    submitLabel: text('submitLabel', 'Search'),
    noResultsLabel: text('noResultsLabel', 'No matching content.'),
    errorLabel: text('errorLabel', 'Search is temporarily unavailable.'),
    resultLabel: text('resultLabel', 'Search results'),
    hitTitleLabel: text('hitTitle', 'Title match'),
    hitDescriptionLabel: text('hitDescription', 'Summary match'),
    hitHeadingLabel: text('hitHeading', 'Section match'),
    hitContentLabel: text('hitContent', 'Content match'),
    hitPathLabel: text('hitPath', 'Path match'),
    queryHint: text('queryHint', 'Enter at least two letters or a meaningful word'),
    maxResults: Math.max(1, Math.min(50, numericComponentSetting(ctx, 'search', 'maxResults', 1)))
  };
  const inputId = `pageskill-search-${doc.locale.replace(/[^a-z0-9]+/gi, '-')}-${shortHash(doc.id).slice(0, 6)}`;
  const searchMarkup = search.enabled ? `<form class="site-search" data-local-search data-search-index="${escapeHtml(search.indexHref)}" data-search-max-results="${search.maxResults}" data-search-no-results="${escapeHtml(search.noResultsLabel)}" data-search-error="${escapeHtml(search.errorLabel)}" data-search-query-hint="${escapeHtml(search.queryHint)}" data-search-hit-title="${escapeHtml(search.hitTitleLabel)}" data-search-hit-description="${escapeHtml(search.hitDescriptionLabel)}" data-search-hit-heading="${escapeHtml(search.hitHeadingLabel)}" data-search-hit-content="${escapeHtml(search.hitContentLabel)}" data-search-hit-path="${escapeHtml(search.hitPathLabel)}" role="search" aria-label="${escapeHtml(search.label)}"><label class="sr-only" for="${inputId}">${escapeHtml(search.label)}</label><div class="site-search-control"><input id="${inputId}" name="q" type="search" autocomplete="off" placeholder="${escapeHtml(search.placeholder)}" data-search-input><button type="submit" aria-label="${escapeHtml(search.submitLabel)}">⌕</button></div><div class="search-results" data-search-results hidden aria-live="polite" aria-label="${escapeHtml(search.resultLabel)}"></div></form>` : '';
  return { search, searchMarkup };
}

function fallbackShellWithPrivacy(context: ComponentShellContext): string {
  return fallbackShell(context);
}

function generatedDocument(id: string, locale: string, title: string, description: string, route: string, component = 'page'): Document {
  return {
    id,
    collection: 'pages',
    contentKey: `pages:${id}`,
    locale,
    source: `generated:${id}`,
    title,
    description,
    component,
    data: { route },
    markdown: '',
    excerpt: '',
    nodes: [],
    directives: [],
    metrics: calculateContentMetrics(''),
    hash: shortHash(`${id}:${locale}:${title}:${description}:${route}`),
    bodyLine: 1,
    stat: { mtimeMs: 0, size: 0 },
    dependencyKeys: [],
    componentNames: []
  };
}

function homeRouteFor(ctx: BuildContext, locale: string): string {
  const home = ctx.docs.find(doc => doc.collection === 'pages' && doc.id === 'home' && doc.locale === locale);
  if (home) return routeFor(ctx, home);
  return routeFor(ctx, { ...generatedDocument('home', locale, '', '', ''), data: {} });
}

function languagePickerCopy(ctx: BuildContext, locale: string, themeBase: string) {
  const generated = generatedDocument('home', locale, '', '', '/');
  const privacy = privacyShellData(ctx, generated).privacy;
  return {
    title: themeText(ctx, locale, 'languagePicker.title', 'Choose a site language'),
    description: themeText(ctx, locale, 'languagePicker.description', 'Choose a language to open the matching site version.'),
    recommended: themeText(ctx, locale, 'languagePicker.recommended', 'Recommended'),
    siteName: localizedValue(ctx.config.siteName, locale, 'Site'),
    siteDescription: localizedValue(ctx.config.description, locale, ''),
    htmlLang: String(ctx.themeI18n.locales?.[locale]?.htmlLang || locale),
    headerNote: themeText(ctx, locale, 'shell.headerNote', 'Markdown-native · static-first'),
    skipToContent: themeText(ctx, locale, 'shell.skipToContent', 'Skip to content'),
    siteMap: themeText(ctx, locale, 'siteMap', 'Site map'),
    privacy: {
      title: privacy.title,
      description: privacy.description,
      bannerLabel: privacy.bannerLabel,
      settingsLabel: privacy.settingsLabel,
      acceptLabel: privacy.acceptLabel,
      rejectLabel: privacy.rejectLabel,
      saveLabel: privacy.saveLabel,
      closeLabel: privacy.closeLabel,
      policyLabel: privacy.policyLabel,
      socialPlaceholderTitle: privacy.socialPlaceholderTitle,
      socialPlaceholderDescription: privacy.socialPlaceholderDescription,
      socialPlaceholderAllowLabel: privacy.socialPlaceholderAllowLabel,
      policyHref: privacy.policyHref,
      categories: privacy.categories.map(category => ({
        purpose: category.purpose,
        label: category.label,
        description: category.description,
        providers: category.providers
      }))
    }
  };
}

function languagePickerMarkup(ctx: BuildContext, locale: string): string {
  const locales = ctx.config.activeLocales || [ctx.config.defaultLocale || locale];
  const themeName = configuredThemeName(ctx.config);
  const themeBase = `/assets/theme/${themeName}`;
  const copy = Object.fromEntries(locales.map((candidate: string) => [candidate, languagePickerCopy(ctx, candidate, themeBase)]));
  const languageData = JSON.stringify({
    defaultLocale: ctx.config.defaultLocale || locale,
    locales,
    localeAliases: Object.fromEntries(locales.map((candidate: string) => [candidate, Array.isArray(ctx.themeI18n.locales?.[candidate]?.aliases) ? ctx.themeI18n.locales[candidate].aliases : [candidate]])),
    storageKey: 'pageskill-locale',
    copy
  });
  const title = themeText(ctx, locale, 'languagePicker.title', 'Choose a site language');
  const description = themeText(ctx, locale, 'languagePicker.description', 'Choose a language to open the matching site version.');
  const cards = locales.map((candidate: string) => {
    const href = safeUrl(homeRouteFor(ctx, candidate));
    const name = languageDisplayName(ctx, locale, candidate);
    return `<li><a class="language-card" href="${href}" lang="${escapeHtml(candidate)}" data-locale="${escapeHtml(candidate)}"><span class="language-card-index" aria-hidden="true">${escapeHtml(String(locales.indexOf(candidate) + 1).padStart(2, '0'))}</span><strong>${escapeHtml(name)}</strong><span class="language-card-recommendation" data-language-recommended aria-hidden="true"></span><span class="language-card-arrow" aria-hidden="true">↗</span></a></li>`;
  }).join('');
  return `<section class="language-picker" data-language-picker data-language-copy="${escapeHtml(languageData)}" aria-labelledby="language-picker-title"><h1 id="language-picker-title">${escapeHtml(title)}</h1><p class="language-picker-description">${escapeHtml(description)}</p><ul class="language-picker-list">${cards}</ul></section>`;
}

function notFoundMarkup(ctx: BuildContext, locale: string): string {
  const title = themeText(ctx, locale, 'notFound.title', 'This page is not here');
  const description = themeText(ctx, locale, 'notFound.description', 'The address may have changed. Return home or continue through the guide.');
  const homeLabel = themeText(ctx, locale, 'notFound.home', 'Back to home');
  const guideLabel = themeText(ctx, locale, 'notFound.guide', 'Open the guide');
  const homeHref = safeUrl(homeRouteFor(ctx, locale));
  const guide = queryDocuments(ctx, { kind: 'post', locale, limit: 1, orderBy: 'date:desc' })[0];
  const guideLink = guide ? `<a class="button-secondary" href="${safeUrl(routeFor(ctx, guide))}">${escapeHtml(guideLabel)}</a>` : '';
  return `<section class="error-page" aria-labelledby="not-found-title"><p class="error-code" aria-hidden="true">404</p><h1 id="not-found-title">${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><div class="error-actions"><a class="button-primary" href="${homeHref}">${escapeHtml(homeLabel)}</a>${guideLink}</div></section>`;
}

async function writeGeneratedPages(ctx: BuildContext) {
  const locale = ctx.config.defaultLocale || 'en';
  const pickerTitle = themeText(ctx, locale, 'languagePicker.title', 'Choose a site language');
  const pickerDescription = themeText(ctx, locale, 'languagePicker.description', 'Choose a language to open the matching site version.');
  const picker = generatedDocument('home', locale, pickerTitle, pickerDescription, '/');
  await writeIfChanged(ctx, 'index.html', pageShell(ctx, picker, languagePickerMarkup(ctx, locale)));
  const notFoundTitle = themeText(ctx, locale, 'notFound.title', 'This page is not here');
  const notFoundDescription = themeText(ctx, locale, 'notFound.description', 'The address may have changed. Return home or continue through the guide.');
  const notFound = generatedDocument('not-found', locale, notFoundTitle, notFoundDescription, '/404.html', 'page');
  await writeIfChanged(ctx, '404.html', pageShell(ctx, notFound, notFoundMarkup(ctx, locale)));
}

type ThemeStyleBundle = { styleFile: string; styleFiles: string[]; bundled: Set<string>; fingerprint: string };

function themeResourcePaths(values: unknown[], label: string): string[] {
  return [...new Set(values.map(value => safeRelativePath(themeResourceValue(value), label)))];
}

/** The main stylesheet is the bundle for Theme-level resources and the shell. */
function themeStyleBundle(ctx: BuildContext): ThemeStyleBundle {
  const rawStyles = [
    ...resourcePaths(themeResources(ctx), 'styles'),
    ...resourcePaths(themeComponent(ctx, 'shell')?.resources, 'styles')
  ];
  const styleFiles = themeResourcePaths(rawStyles, 'theme stylesheet path');
  const styleFile = styleFiles[0] || 'style.css';
  const fingerprint = shortHash(minifyCss(styleFiles.map(relative => ctx.themeStyleSources.get(relative) || '').join('\n'))).slice(0, 12);
  return { styleFile, styleFiles, bundled: new Set(styleFiles), fingerprint };
}

function pageShell(ctx: BuildContext, doc: Document, content: string): string {
  const siteName = localizedValue(ctx.config.siteName, doc.locale, 'Site');
  const siteDescription = localizedValue(ctx.config.description, doc.locale, 'A content website.');
  const icons = ctx.config.icons || {};
  const headerNote = themeText(ctx, doc.locale, 'shell.headerNote', 'Markdown-native · static-first');
  const skipLabel = themeText(ctx, doc.locale, 'shell.skipToContent', 'Skip to content');
  const languageLabel = themeText(ctx, doc.locale, 'shell.languages', 'Languages');
  const navigationLabel = themeText(ctx, doc.locale, 'shell.navigation', 'Primary navigation');
  const footerNote = localizedValue(ctx.config.footer?.note, doc.locale, '');
  const footerKicker = localizedValue(ctx.config.footer?.kicker, doc.locale, '');
  const generatedPage = doc.source.startsWith('generated:');
  const showSiteChrome = !generatedPage || doc.collection === 'archive';
  const navigationConfig = configuredNavigation(ctx.config);
  const navigation = Array.isArray(navigationConfig.links) ? navigationConfig.links : [];
  const footerConfig = isRecord(ctx.config.footer) ? ctx.config.footer : {};
  const footer = Array.isArray(footerConfig.links) ? footerConfig.links : [];
  const currentRoute = routeFor(ctx, doc);
  const availableTranslations = ctx.translationIndex.get(translationKey(doc.collection, doc.id)) || [];
  const translatedDocuments = doc.collection === 'archive' && doc.data?.archiveCollection
    ? (ctx.config.activeLocales || [ctx.config.defaultLocale || doc.locale]).map((locale: string) => ({ ...doc, locale, data: { ...doc.data, route: String(doc.data.route || '').replace(`/${doc.locale}/`, `/${locale}/`) } }))
    : [...availableTranslations, ...(doc.source.startsWith('fallback:') ? [doc] : [])].sort((left, right) => left.locale.localeCompare(right.locale));
  const languageLinks = translatedDocuments.map((candidate: Document) => {
    const candidateRoute = routeFor(ctx, candidate);
    const current = candidate.locale === doc.locale ? ' aria-current="page"' : '';
    return `<a href="${safeUrl(candidateRoute)}" lang="${escapeHtml(candidate.locale)}" data-locale="${escapeHtml(candidate.locale)}"${current}>${escapeHtml(languageDisplayName(ctx, doc.locale, candidate.locale))}</a>`;
  }).join('');
  const defaultTranslation = availableTranslations.find((candidate: Document) => candidate.locale === (ctx.config.defaultLocale || 'en'));
  const alternates = `${availableTranslations.map((candidate: Document) => `<link rel="alternate" hreflang="${escapeHtml(candidate.locale)}" href="${safeUrl(`${String(ctx.config.siteUrl || '').replace(/\/$/, '')}${routeFor(ctx, candidate)}`)}">`).join('')}${defaultTranslation ? `<link rel="alternate" hreflang="x-default" href="${safeUrl(`${String(ctx.config.siteUrl || '').replace(/\/$/, '')}${routeFor(ctx, defaultTranslation)}`)}">` : ''}`;
  const linkOptions = (namespace: 'navigation' | 'footer') => ({
    locale: doc.locale,
    fallbackLocale: fallbackLocaleFor(ctx),
    currentPath: currentRoute,
    namespace,
    translate: (key: string, fallback: string) => themeText(ctx, doc.locale, key, fallback)
  });
  const navigationLinks = showSiteChrome
    ? resolveSiteLinks(navigation, linkOptions('navigation')).map(link => renderSiteLink(link, '', escapeHtml)).join('')
    : '';
  const footerLinks = showSiteChrome
    ? resolveSiteLinks(footer, linkOptions('footer')).map(link => renderSiteLink(link, 'footer-tool-link', escapeHtml)).join('')
    : '';
  const chrome = configuredChrome(ctx, doc, currentRoute, showSiteChrome);
  const headIconLinks = [
    icons.favicon ? `<link rel="icon" href="${safeUrl(icons.favicon)}">` : '',
    icons.icon32 ? `<link rel="icon" type="image/png" sizes="32x32" href="${safeUrl(icons.icon32)}">` : '',
    icons.appleTouchIcon ? `<link rel="apple-touch-icon" href="${safeUrl(icons.appleTouchIcon)}">` : '',
    icons.manifest ? `<link rel="manifest" href="${safeUrl(icons.manifest)}">` : ''
  ].join('');
  const documentFeedCollection = doc.collection === 'archive'
    ? String(doc.data?.archiveCollection || feedCollection(ctx) || '')
    : isPostCollection(ctx, doc.collection) ? doc.collection : String(feedCollection(ctx) || '');
  const documentFeedHref = documentFeedCollection && feedCollections(ctx).includes(documentFeedCollection)
    ? feedRouteFor(ctx, doc.locale, documentFeedCollection)
    : '';
  const documentFeedLabelKey = documentFeedCollection === 'updates' ? 'shell.updatesFeed' : 'shell.postsFeed';
  const documentFeedLabel = themeText(ctx, doc.locale, documentFeedLabelKey, documentFeedCollection === 'updates' ? 'Updates feed' : 'Posts feed');
  const postsFeedLink = documentFeedHref ? `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(siteName)} · ${escapeHtml(documentFeedLabel)}" href="${safeUrl(documentFeedHref)}">` : '';
  const brandIcon = safeUrl(icons.icon32 || icons.icon192 || '/assets/icon-192.png');
  const absoluteUrl = `${String(ctx.config.siteUrl || '').replace(/\/$/, '')}${currentRoute}`;
  const homeHref = safeUrl(routeFor(ctx, { ...doc, id: 'home', collection: 'pages', data: {} }));
  const themeName = configuredThemeName(ctx.config);
  const themeBase = `/assets/theme/${themeName}`;
  const styleBundle = themeStyleBundle(ctx);
  const componentStyles = themeResourcePaths([
    ...componentResourcePathsFor(ctx, doc.component, 'styles'),
    ...doc.directives.flatMap(node => componentResourcePathsFor(ctx, node.name, 'styles'))
  ], 'Component stylesheet path');
  const sharedComponentStyles = [
    ...genericComponentResourcePaths(ctx, 'styles'),
    ...(privacyConsentRequired(ctx) ? componentResourcePaths(ctx, ['privacyConsent'], 'styles') : []),
    ...(componentEnabled(ctx, 'search') ? componentResourcePaths(ctx, ['search'], 'styles') : []),
    ...(componentEnabled(ctx, 'toc') ? componentResourcePaths(ctx, ['toc'], 'styles') : []),
    ...(componentEnabled(ctx, 'comments') && isPostCollection(ctx, doc.collection) ? componentResourcePaths(ctx, ['comments'], 'styles') : []),
    ...(doc.source.startsWith('generated:') ? componentResourcePaths(ctx, ['language', 'languagePicker'], 'styles') : [])
  ];
  // Global Theme styles are already part of the fingerprinted main
  // bundle.  Remove them here so a page cannot inline them or link a file that
  // copyThemeAndAssets intentionally did not emit separately.
  const pageStyles = [styleBundle.styleFile, ...sharedComponentStyles, ...componentStyles]
    .filter(style => style === styleBundle.styleFile || !styleBundle.bundled.has(style));
  const styleTags = planThemeStyles(pageStyles, ctx.themeStyleSources, {
    inlineStyles: ctx.theme.inlineStyles !== false,
    alwaysExternal: [styleBundle.styleFile]
  });
  const stylesheets = styleTags.map(tag => tag.kind === 'inline'
    ? `<style>${tag.css}</style>`
    : `<link rel="stylesheet" href="${safeUrl(themeResourceHref(ctx, themeBase, tag.path, tag.path === styleBundle.styleFile ? styleBundle.fingerprint : ''))}">`).join('');
  const searchData = localSearchData(ctx, doc);
  const scriptTags = clientComponents(ctx).length ? `<script type="module" src="${safeUrl(clientBootstrapHref(ctx))}"></script>` : '';
  const socialImage = doc.data?.ogImage || doc.data?.cover || ctx.config.images?.social;
  const socialImageUrl = absoluteImageUrl(socialImage, String(ctx.config.siteUrl || '').replace(/\/$/, ''));
  const publishedMeta = isPostCollection(ctx, doc.collection) && doc.date && publicationTimestamp(doc.date) !== undefined ? `<meta property="article:published_time" content="${escapeHtml(new Date(publicationTimestamp(doc.date)!).toISOString())}">` : '';
  const modifiedMeta = isPostCollection(ctx, doc.collection) && doc.updated && publicationTimestamp(doc.updated) !== undefined ? `<meta property="article:modified_time" content="${escapeHtml(new Date(publicationTimestamp(doc.updated)!).toISOString())}">` : '';
  const sitemapHref = String(ctx.config.routes?.sitemap || '/sitemap.xml');
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(doc.title)} · ${escapeHtml(siteName)}</title><meta name="description" content="${escapeHtml(doc.description || siteDescription)}"><meta name="theme-color" content="${escapeHtml(ctx.config.pwa?.themeColor || '#d9563b')}"><meta property="og:title" content="${escapeHtml(doc.title)}"><meta property="og:description" content="${escapeHtml(doc.description || siteDescription)}"><meta property="og:type" content="${doc.date ? 'article' : 'website'}"><meta property="og:url" content="${safeUrl(absoluteUrl)}">${publishedMeta}${modifiedMeta}${socialImageUrl ? `<meta property="og:image" content="${safeUrl(socialImageUrl)}">` : ''}<link rel="canonical" href="${safeUrl(absoluteUrl)}"><link rel="sitemap" type="application/xml" href="${safeUrl(sitemapHref)}">${headIconLinks}${alternates}${stylesheets}${scriptTags}`;
  const headWithFeed = head.replace(`<link rel="sitemap" type="application/xml" href="${safeUrl(sitemapHref)}">`, `<link rel="sitemap" type="application/xml" href="${safeUrl(sitemapHref)}">${postsFeedLink}`);
  const privacyData = privacyShellData(ctx, doc);
  const bodyClass = `theme-${escapeHtml(configuredThemeName(ctx.config))}`;
  const localeInfo = isRecord(ctx.themeI18n.locales?.[doc.locale]) ? ctx.themeI18n.locales[doc.locale] : {};
  const shellContext = { ...themeContextFor(ctx, doc), renderedContent: content, head: headWithFeed, bodyClass, mainClass: `component-${escapeHtml(doc.component)}`, siteName, siteDescription, currentRoute, homeHref, brandIcon, navigationLinks, footerLinks, languageLinks, htmlLang: String(localeInfo.htmlLang || doc.locale), navigationLabel, languageLabel, skipLabel, headerNote, footerNote, footerKicker, chrome, ...searchData, searchMarkup: showSiteChrome ? searchData.searchMarkup : '', ...privacyData } as ComponentShellContext;
  const shell = themeComponent(ctx, 'shell')?.shell;
  if (shell) return shell(shellContext);
  return fallbackShellWithPrivacy(shellContext);
}

function contentNodes(doc: Document): MarkdownNode[] {
  const first = doc.nodes[0];
  if (first?.kind === 'heading' && first.depth === 1 && first.text.trim().replace(/\s+/g, ' ') === doc.title.trim().replace(/\s+/g, ' ')) return doc.nodes.slice(1);
  return doc.nodes;
}

/** Render document content while preserving top-level named layout slots. */
function documentComponentInput(ctx: BuildContext, doc: Document, context: ComponentRenderContext): ComponentDocumentInput {
  const nodes = contentNodes(doc);
  const bodyNodes: MarkdownNode[] = [];
  const slots: Record<string, string> = {};
  for (const node of nodes) {
    if (node.kind !== 'directive' || node.name !== 'slot') {
      bodyNodes.push(node);
      continue;
    }
    const slotName = node.attrs.name;
    if (!slotName || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(slotName) || slotName === 'content') {
      throw new MarkdownError('document slot requires a valid non-content name attribute', node.position);
    }
    for (const key of Object.keys(node.attrs)) if (key !== 'name') {
      throw new MarkdownError(`slot attribute "${key}" is not supported`, node.position);
    }
    if (slots[slotName] !== undefined) throw new MarkdownError(`slot "${slotName}" is declared more than once`, node.position);
    slots[slotName] = context.renderNodes(node.children);
  }
  const renderedContent = context.renderNodes(bodyNodes);
  return { renderedContent, slots: { content: renderedContent, ...slots }, props: { document: doc.data, contentKey: doc.contentKey }, runtime: undefined };
}

/** Describe generated discovery from the outputs this renderer plans to publish. */
function discoveryBoundaries(ctx: BuildContext) {
  const generated = publicDiscoveryResources(ctx).map(resource => resource.href);
  if (ctx.outputs.has('robots.txt') || !ctx.stagedOutput) generated.push('/robots.txt');
  const themeInstance = ctx.themeConfigFile
    ? normalizePath(path.relative(ctx.root, ctx.themeConfigFile))
    : 'theme.config (not configured; component defaults are active)';
  return {
    sourceOfTruth: ['config.yml', 'config/*.yml', themeInstance, 'content/', 'themes/'],
    generatedDiscovery: [...new Set(generated)],
    agentInstructions: ['AGENTS.md']
  };
}

/** The code-owned registry is the only capability list consumed by Agent output. */
function agentFunctionMap(ctx: BuildContext) {
  const themeInstance = ctx.themeConfigFile
    ? normalizePath(path.relative(ctx.root, ctx.themeConfigFile))
    : 'theme.config (not configured; component defaults are active)';
  const configSources = ['config.yml', 'config/*.yml'];
  return [
    { id: 'write-page', purpose: 'Write current site content for a page, guide, reference, or directory', paths: ['content/pages/<id>/<locale>.md'], commands: ['page g'] },
    { id: 'write-post', purpose: 'Record a dated post with kind: post; use category for ordinary taxonomy and omit it for uncategorized content', paths: ['content/posts/<id>/<locale>.md'], frontmatter: { kind: 'post', date: 'YYYY-MM-DD', updated: 'optional ISO date or datetime' }, commands: ['page g'] },
    { id: 'write-update', purpose: 'Record a release note or project update with kind: release in the dedicated updates collection', paths: ['content/updates/<version>/<locale>.md'], frontmatter: { kind: 'release', date: 'YYYY-MM-DD', updated: 'optional ISO date or datetime' }, commands: ['page g'] },
    { id: 'configure-integration', purpose: 'Enable a registered third-party integration with its adapter-owned public identifier, consent policy, and reviewed privacy disclosure', paths: [...configSources, 'config.yml:integrations.<provider-id>', 'content/pages/privacy/<locale>.md'], outputs: ['generated consent purposes and provider metadata'], prerequisites: ['Choose a provider from the generated catalog', 'Acknowledge every enabled Provider id in every active locale privacy policy', 'Keep secrets in the external service environment; site YAML only contains public adapter fields'], commands: ['page g --profile', 'page c'] },
    { id: 'change-component', purpose: 'Add, modify, or remove an existing Component or stylesheet', paths: ['themes/<name>/index.ts', 'themes/<name>/components/'], commands: ['page g --profile'] },
    { id: 'change-site', purpose: 'Change locales, routes, collections, SEO, privacy, discovery policy, Component copy/options, named APIs, or integrations', paths: [...configSources, themeInstance, 'content/pages/privacy/<locale>.md'], commands: ['page g --profile'] },
    { id: 'configure-component', purpose: 'Configure a declared Component from the theme instance file without editing its renderer', paths: [themeInstance, 'themes/<name>/components/<component>/index.ts'], commands: ['page g --profile'] },
    { id: 'discover-extension', purpose: 'Read active theme Components, collections, component switches, contexts, and resource dependencies', paths: ['themes/<name>/index.ts', themeInstance, ...configSources], commands: ['import { getCatalog, inspect } from "pageskill"'] },
    { id: 'discover-site', purpose: 'Read renderer-generated agent metadata, API links, Markdown negotiation, and content signals', paths: ['dist/public/.well-known/', 'dist/public/robots.txt', 'dist/public/llms.txt'], commands: ['page g'] },
    { id: 'develop-agent-skill', purpose: 'Develop Agent instructions from implemented Components, content, configuration, privacy declarations, and external service contracts', paths: ['docs/skill-development.md', 'content/posts/skill-development/', 'src/compiler.ts:generatedAgentSkill'], prerequisites: ['Use the unified Client Runtime and keep local Search on generated static indexes', 'Acknowledge every enabled Provider in each localized privacy policy', 'Never place secrets or invented endpoints in generated instructions'], outputs: ['/.well-known/agent-skills/index.json', `/.well-known/agent-skills/${agentSkillName(ctx)}/SKILL.md`], commands: ['page g --profile', 'page c'] },
    { id: 'accessibility-audit', purpose: 'Run the complete real-browser and axe accessibility audit with private reports and responsive screenshots', paths: ['src/accessibility/', 'src/bin/page.mjs'], commands: ['page c'] },
    // Conditional discovery entries describe the implementation boundary as
    // data. The generated Skill and catalog expose these fields without a
    // second hand-maintained instruction list.
    { id: 'configure-auth-discovery', purpose: 'Publish OAuth protected-resource metadata only for an implemented protected service and real authorization server', paths: [...configSources, 'config.yml:agentDiscovery.auth', 'backend/handler.ts or an external resource server', 'external OAuth/OIDC issuer'], prerequisites: ['Verify bearer tokens, issuer, audience, expiry, and scopes in the protected service', 'Use real resource and issuer URLs'], outputs: ['/.well-known/oauth-protected-resource', 'auth.md', 'optional /.well-known/oauth-authorization-server'], commands: ['page g --profile'] },
    { id: 'configure-mcp-discovery', purpose: 'Publish an MCP server card whose endpoint and tool schemas match a real MCP transport', paths: [...configSources, 'config.yml:agentDiscovery.mcp', 'backend/handler.ts or an external MCP server'], prerequisites: ['Deploy a working MCP endpoint before enabling the card', 'Keep card tool metadata aligned with the server tools/list response'], outputs: ['/.well-known/mcp/server-card.json'], commands: ['page g --profile'] },
    { id: 'register-webmcp-tools', purpose: 'Register browser tools from a theme component only when a real WebMCP module is loaded and tested', paths: [...configSources, 'config.yml:agentDiscovery.webmcp', themeInstance, 'themes/<name>/components/<id>/'], prerequisites: ['Register tools through document.modelContext with explicit JSON schemas', 'Validate inputs and confirm consequential actions in the page'], outputs: ['/.well-known/agent.json configured state; browser tools come from the theme script'], commands: ['npm run compile-theme', 'page s', 'page g --profile'] },
    { id: 'publish-dns-aid', purpose: 'Advertise DNS-AID only after an external DNS provider has published real SVCB/TXT or TLSA records with DNSSEC as required', paths: [...configSources, 'config.yml:agentDiscovery.dnsAid', 'external authoritative DNS zone'], prerequisites: ['Deploy the advertised agent endpoint', 'Verify the public DNS records and DNSSEC chain before enabling the flag'], outputs: ['/.well-known/agent.json configured state; DNS records are never generated here'], commands: ['Resolve-DnsName', 'page g --profile'] },
    { id: 'preview', purpose: 'Open the local static preview with a persistent incremental context', paths: ['src/bin/page.mjs', 'src/compiler.ts'], commands: ['page s'] },
    { id: 'external-api', purpose: 'Connect database, model, shared state, secrets, writes, or webhooks through a separately deployed named API', paths: [...configSources, 'config.yml:apis', 'backend/handler.ts or another external API service'], prerequisites: ['Declare client.api on the Component', 'Keep private credentials in the service environment'], commands: ['page g', 'npm run compile-backend'] }
  ];
}

function discoverySettings(ctx: BuildContext, name: string): Record<string, any> {
  // Discovery policy is data from config.yml; absent sections stay disabled
  // unless the renderer explicitly defines a safe default.
  const value = ctx.config.agentDiscovery?.[name];
  return isRecord(value) ? value : {};
}

function discoveryEnabled(ctx: BuildContext, name: string): boolean {
  // Config loading applies the one built-in default table before rendering;
  // this helper only reads the normalized value.
  return discoverySettings(ctx, name).enabled === true;
}

function absoluteDiscoveryUrl(siteUrl: string, value: unknown, locale: string): string {
  // Resolve only HTTP(S) links and expand the supported locale placeholder;
  // other schemes cannot become public discovery metadata.
  if (typeof value !== 'string' || !value.trim()) return '';
  const candidate = value.trim().replaceAll(':locale', locale);
  try {
    const url = new URL(candidate, `${siteUrl}/`);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return url.href;
  } catch {
    return '';
  }
}

type ApiCatalogEntry = {
  endpoint: string;
  anchor: string;
  title: string;
  description: string;
  serviceDesc?: string;
  serviceDoc?: string;
  status?: string;
};

function configuredApiCatalogEntries(ctx: BuildContext, siteUrl: string): ApiCatalogEntry[] {
  // Only configured endpoint records are emitted; the compiler never guesses
  // an API surface from private backend source or from a hand-written list.
  const settings = discoverySettings(ctx, 'apiCatalog');
  const locale = String(ctx.config.defaultLocale || 'en');
  const rawEntries = Array.isArray(settings.entries) ? settings.entries : [];
  const seen = new Set<string>();
  return rawEntries.map((raw: any, index: number) => {
    const source = typeof raw === 'string' ? { endpoint: raw } : isRecord(raw) ? raw : {};
    const endpoint = absoluteDiscoveryUrl(siteUrl, source.endpoint || source.href || source.url, locale);
    if (!endpoint || seen.has(endpoint)) return null;
    seen.add(endpoint);
    const title = localizedValue(source.title, locale, endpoint);
    const description = localizedValue(source.description, locale, 'Published API endpoint');
    const serviceDesc = source.serviceDesc === false ? '' : absoluteDiscoveryUrl(siteUrl, source.serviceDesc || source.openapi, locale);
    const serviceDoc = source.serviceDoc === false
      ? ''
      : absoluteDiscoveryUrl(siteUrl, source.serviceDoc || '/.well-known/api-catalog.md', locale);
    const status = source.status === false ? '' : absoluteDiscoveryUrl(siteUrl, source.status, locale);
    return {
      endpoint,
      anchor: absoluteDiscoveryUrl(siteUrl, source.anchor || endpoint, locale) || endpoint,
      title: String(title).slice(0, 200),
      description: String(description).replaceAll(/[\r\n]+/g, ' ').slice(0, 500),
      ...(serviceDesc ? { serviceDesc } : {}),
      ...(serviceDoc ? { serviceDoc } : {}),
      ...(status ? { status } : {})
    } as ApiCatalogEntry;
  }).filter(Boolean) as ApiCatalogEntry[];
}

function apiCatalogLinkset(entries: ApiCatalogEntry[]) {
  // Keep the JSON shape aligned with RFC 9727 Linkset relations while the
  // entry list remains owned by site configuration.
  return {
    linkset: entries.map(entry => ({
      anchor: entry.anchor,
      item: [{ href: entry.endpoint, title: entry.title }],
      ...(entry.serviceDesc ? { 'service-desc': [{ href: entry.serviceDesc }] } : {}),
      ...(entry.serviceDoc ? { 'service-doc': [{ href: entry.serviceDoc }] } : {}),
      ...(entry.status ? { status: [{ href: entry.status }] } : {})
    }))
  };
}

function apiCatalogMarkdown(entries: ApiCatalogEntry[]): string {
  // The Markdown mirror is generated from the same normalized entries as the
  // machine-readable Linkset so the two representations cannot drift.
  return [
    '# API catalog',
    '',
    'This catalog is generated from the site discovery configuration.',
    '',
    ...entries.flatMap(entry => [
      `## ${entry.title}`,
      '',
      entry.description,
      '',
      `- Endpoint: ${entry.endpoint}`,
      ...(entry.serviceDesc ? [`- Machine description: ${entry.serviceDesc}`] : []),
      ...(entry.status ? [`- Status: ${entry.status}`] : []),
      ''
    ])
  ].join('\n');
}

async function writeApiCatalog(ctx: BuildContext, siteUrl: string): Promise<void> {
  if (!discoveryEnabled(ctx, 'apiCatalog')) return;
  const entries = configuredApiCatalogEntries(ctx, siteUrl);
  if (!entries.length) return;
  // RFC 9727 requires the Linkset media type at the well-known location.
  await writeIfChanged(ctx, '.well-known/api-catalog', JSON.stringify(apiCatalogLinkset(entries), null, 2));
  await writeIfChanged(ctx, '.well-known/api-catalog.md', apiCatalogMarkdown(entries));
}

function authSettings(ctx: BuildContext): Record<string, any> {
  // OAuth metadata is conditional: this site must explicitly describe both
  // its protected resource and authorization server before files are emitted.
  return discoverySettings(ctx, 'auth');
}

async function writeAuthDiscovery(ctx: BuildContext, siteUrl: string): Promise<void> {
  // Never publish an OAuth claim for a site that has not configured its real
  // issuer and resource URLs.
  const settings = authSettings(ctx);
  if (settings.enabled !== true) return;
  const locale = String(ctx.config.defaultLocale || 'en');
  const resource = absoluteDiscoveryUrl(siteUrl, settings.resource || siteUrl, locale);
  const issuer = absoluteDiscoveryUrl(siteUrl, settings.authorizationServer || settings.issuer, locale);
  if (!resource || !issuer) throw new Error('config.yml: agentDiscovery.auth requires resource and authorizationServer URLs when enabled');
  const scopes = Array.isArray(settings.scopes) ? settings.scopes.map(String).filter(Boolean).slice(0, 100) : [];
  await writeIfChanged(ctx, '.well-known/oauth-protected-resource', JSON.stringify({
    resource,
    authorization_servers: [issuer],
    ...(scopes.length ? { scopes_supported: scopes } : {})
  }, null, 2));
  const authorizationEndpoint = absoluteDiscoveryUrl(siteUrl, settings.authorizationEndpoint, locale);
  const tokenEndpoint = absoluteDiscoveryUrl(siteUrl, settings.tokenEndpoint, locale);
  if (authorizationEndpoint && tokenEndpoint) {
    await writeIfChanged(ctx, '.well-known/oauth-authorization-server', JSON.stringify({
      issuer,
      authorization_endpoint: authorizationEndpoint,
      token_endpoint: tokenEndpoint,
      ...(scopes.length ? { scopes_supported: scopes } : {})
    }, null, 2));
  }
  const title = String(localizedValue(settings.title, locale, 'Authentication')).replaceAll(/[\r\n]+/g, ' ');
  const description = String(localizedValue(settings.description, locale, 'Authentication details for protected APIs.')).replaceAll(/[\r\n]+/g, ' ');
  await writeIfChanged(ctx, 'auth.md', `# ${title}\n\n${description}\n\n- Protected resource: ${resource}\n- Authorization server: ${issuer}\n${scopes.length ? `- Supported scopes: ${scopes.join(', ')}\n` : ''}`);
}

async function writeMcpServerCard(ctx: BuildContext, siteUrl: string): Promise<void> {
  // MCP is emitted only when an actual endpoint and validated tool metadata
  // are supplied by the site owner.
  const settings = discoverySettings(ctx, 'mcp');
  if (settings.enabled !== true) return;
  const locale = String(ctx.config.defaultLocale || 'en');
  const endpoint = absoluteDiscoveryUrl(siteUrl, settings.endpoint, locale);
  if (!endpoint) throw new Error('config.yml: agentDiscovery.mcp requires an endpoint URL when enabled');
  const rawTools = Array.isArray(settings.tools) ? settings.tools : [];
  const tools = rawTools.map((raw: any) => {
    if (!isRecord(raw) || !String(raw.name || '').trim() || !String(raw.description || '').trim()) return null;
    return {
      name: String(raw.name).trim().slice(0, 128),
      description: String(raw.description).replaceAll(/[\r\n]+/g, ' ').slice(0, 500),
      ...(isRecord(raw.inputSchema) ? { inputSchema: raw.inputSchema } : {})
    };
  }).filter(Boolean);
  await writeIfChanged(ctx, '.well-known/mcp/server-card.json', JSON.stringify({
    name: String(localizedValue(settings.name, locale, localizedValue(ctx.config.siteName, locale, 'Site'))),
    description: String(localizedValue(settings.description, locale, 'Model Context Protocol server')),
    version: String(settings.version || '1.0.0'),
    url: endpoint,
    capabilities: { tools }
  }, null, 2));
}

function agentSkillName(ctx: BuildContext): string {
  // The public skill name is constrained to the Agent Skills identifier form;
  // its fallback is derived from the configured localized site name.
  const configured = discoverySettings(ctx, 'skills').name;
  const fallback = `${slug(localizedValue(ctx.config.siteName, String(ctx.config.defaultLocale || 'en'), 'site')) || 'site'}-authoring`.slice(0, 64);
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(String(configured || '')) ? String(configured) : fallback;
}

function agentSkillDescription(ctx: BuildContext): string {
  // A configured description is allowed, but the default is derived from the
  // registered capability purposes so it has no second prose source.
  const configured = discoverySettings(ctx, 'skills').description;
  if (typeof configured === 'string' && configured.trim()) return configured.trim().replaceAll(/[\r\n]+/g, ' ').slice(0, 1024);
  // A missing description is derived from the registered capabilities instead
  // of introducing a second, hand-maintained description of the renderer.
  return agentFunctionMap(ctx).map((entry: any) => String(entry.purpose || '').trim()).filter(Boolean).join('; ').slice(0, 1024);
}

function agentSkillValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(agentSkillValue).join(', ');
  if (isRecord(value)) return JSON.stringify(value);
  return String(value ?? '').replaceAll(/[\r\n]+/g, ' ').trim();
}

function generatedAgentCapabilitySection(entry: Record<string, unknown>): string {
  // Render every registered field generically so new capability metadata is
  // visible without editing another list of labels in this generator.
  const fields = Object.entries(entry)
    .filter(([key]) => key !== 'id')
    .flatMap(([key, value]) => [`${key}: ${agentSkillValue(value)}`, '']);
  return [`## ${agentSkillValue(entry.id)}`, '', ...fields].join('\n');
}

function generatedAgentSkill(ctx: BuildContext): string {
  const settings = discoverySettings(ctx, 'skills');
  const title = String(settings.title || localizedValue(ctx.config.siteName, String(ctx.config.defaultLocale || 'en'), 'Site')).replaceAll(/[\r\n]+/g, ' ');
  const instructions = Array.isArray(settings.instructions)
    ? settings.instructions.map((value: unknown) => String(value).replaceAll(/[\r\n]+/g, ' ').trim()).filter(Boolean)
    : [];
  const sections = (agentFunctionMap(ctx) as Array<Record<string, unknown>>).map(generatedAgentCapabilitySection);
  return [
    '---',
    `name: ${JSON.stringify(agentSkillName(ctx))}`,
    `description: ${JSON.stringify(agentSkillDescription(ctx))}`,
    '---',
    '',
    `# ${title}`,
    '',
    ...instructions.map(value => `- ${value}`),
    ...(instructions.length ? [''] : []),
    ...sections
  ].join('\n');
}

async function writeAgentSkills(ctx: BuildContext): Promise<void> {
  // Write both the index and the content from the same generated skill text so
  // its integrity hash always describes what the renderer actually published.
  if (!discoveryEnabled(ctx, 'skills')) return;
  const skill = generatedAgentSkill(ctx);
  const skillPath = `.well-known/agent-skills/${agentSkillName(ctx)}/SKILL.md`;
  await writeIfChanged(ctx, skillPath, skill);
  await writeIfChanged(ctx, '.well-known/agent-skills/index.json', JSON.stringify({
    $schema: 'https://agentskills.io/specification',
    skills: [{
      name: agentSkillName(ctx),
      type: 'skill',
      description: agentSkillDescription(ctx),
      url: `/.well-known/agent-skills/${agentSkillName(ctx)}/SKILL.md`,
      sha256: sha(skill)
    }]
  }, null, 2));
}

/** Plan only discovery files whose feature is enabled and whose inputs exist. */
function plannedDiscoveryPaths(ctx: BuildContext): string[] {
  const paths = ['.well-known/agent.json'];
  if (discoveryEnabled(ctx, 'apiCatalog') && configuredApiCatalogEntries(ctx, String(ctx.config.siteUrl || '').replace(/\/$/, '')).length) paths.push('.well-known/api-catalog', '.well-known/api-catalog.md');
  if (discoveryEnabled(ctx, 'ard')) paths.push('.well-known/ai-catalog.json');
  if (discoveryEnabled(ctx, 'skills')) paths.push('.well-known/agent-skills/index.json', `.well-known/agent-skills/${agentSkillName(ctx)}/SKILL.md`);
  if (authSettings(ctx).enabled === true) paths.push('.well-known/oauth-protected-resource', 'auth.md');
  if (authSettings(ctx).enabled === true && authSettings(ctx).authorizationEndpoint && authSettings(ctx).tokenEndpoint) paths.push('.well-known/oauth-authorization-server');
  if (discoveryEnabled(ctx, 'mcp')) paths.push('.well-known/mcp/server-card.json');
  return paths;
}

function publicDiscoveryResources(ctx: BuildContext): Array<{ href: string; rel: string; type?: string }> {
  // Discoverability links are derived from existing/planned public outputs;
  // disabled optional services never appear as advertised resources.
  const paths = new Set([...ctx.outputs, ...plannedDiscoveryPaths(ctx)]);
  const resources: Array<{ href: string; rel: string; type?: string }> = [];
  const add = (pathName: string, rel: string, type?: string) => { if (paths.has(pathName)) resources.push({ href: `/${pathName}`, rel, ...(type ? { type } : {}) }); };
  add('.well-known/agent.json', 'describedby', 'application/json');
  add('.well-known/api-catalog', 'api-catalog', 'application/linkset+json');
  add('.well-known/api-catalog.md', 'describedby', 'text/markdown');
  add('.well-known/ai-catalog.json', 'describedby', 'application/json');
  add('.well-known/agent-skills/index.json', 'describedby', 'application/json');
  add(`.well-known/agent-skills/${agentSkillName(ctx)}/SKILL.md`, 'describedby', 'text/markdown');
  add('llms.txt', 'describedby', 'text/plain');
  add('auth.md', 'describedby', 'text/markdown');
  add('.well-known/oauth-protected-resource', 'describedby', 'application/json');
  add('.well-known/mcp/server-card.json', 'describedby', 'application/json');
  return resources;
}

function contentSignalHeader(ctx: BuildContext): string {
  // Content-Signal is a small allow-list so arbitrary configuration cannot
  // inject response-header syntax.
  const configured = ctx.config.robots?.contentSignals;
  if (!isRecord(configured)) return '';
  return ['ai-train', 'search', 'ai-input'].map(key => {
    const value = String(configured[key] ?? '').trim().toLowerCase();
    return value === 'yes' || value === 'no' ? `${key}=${value}` : '';
  }).filter(Boolean).join(', ');
}

/** Runtime metadata is derived from outputs so every adapter shares one list. */
export function siteDiscoveryOptions(ctx: BuildContext): { links: Array<{ href: string; rel: string; type?: string }>; markdown: boolean; contentTypes: Record<string, string>; contentSignal?: string } {
  const resources = publicDiscoveryResources(ctx);
  const contentTypes: Record<string, string> = {};
  if (ctx.outputs.has('.well-known/api-catalog') || plannedDiscoveryPaths(ctx).includes('.well-known/api-catalog')) contentTypes['/.well-known/api-catalog'] = 'application/linkset+json; charset=utf-8';
  if (ctx.outputs.has('.well-known/oauth-protected-resource') || plannedDiscoveryPaths(ctx).includes('.well-known/oauth-protected-resource')) contentTypes['/.well-known/oauth-protected-resource'] = 'application/json; charset=utf-8';
  if (ctx.outputs.has('.well-known/oauth-authorization-server') || plannedDiscoveryPaths(ctx).includes('.well-known/oauth-authorization-server')) contentTypes['/.well-known/oauth-authorization-server'] = 'application/json; charset=utf-8';
  const signal = contentSignalHeader(ctx);
  return {
    links: resources,
    markdown: ctx.config.outputs?.markdownMirrors === true && discoverySettings(ctx, 'markdown').enabled !== false,
    contentTypes,
    ...(signal ? { contentSignal: signal } : {})
  };
}

/** Read optional ARD queries from config instead of maintaining generated prose in code. */
function ardQueries(ctx: BuildContext, identifier: string): string[] {
  const configured = discoverySettings(ctx, 'ard').queries;
  const queries = isRecord(configured) ? configured[identifier] : undefined;
  return Array.isArray(queries) ? queries.map(value => String(value).replaceAll(/[\r\n]+/g, ' ').trim()).filter(Boolean).slice(0, 5) : [];
}

/** Build one ARD entry from the active site name, generated path, and config queries. */
function ardEntry(host: string, siteUrl: string, pathName: string, identifier: string, displayName: string, type: string, queries: string[]) {
  return {
    identifier: `urn:air:${host}:pageskill:${identifier}`,
    displayName,
    type,
    url: `${siteUrl}${pathName}`,
    ...(queries.length ? { representativeQueries: queries } : {})
  };
}

async function writeArdManifest(ctx: BuildContext, siteUrl: string): Promise<void> {
  // ARD entries point only at public files generated in this build; optional
  // representative queries come from config rather than embedded copy.
  if (!discoveryEnabled(ctx, 'ard')) return;
  let host = siteUrl;
  try { host = new URL(siteUrl).host; } catch { /* siteUrl validation is handled by the publishing host */ }
  const siteName = localizedValue(ctx.config.siteName, String(ctx.config.defaultLocale || 'en'), 'Site');
  const entries: Array<Record<string, any>> = [];
  entries.push(ardEntry(host, siteUrl, '/.well-known/agent.json', 'agent', `${siteName} agent guidance`, 'application/json', ardQueries(ctx, 'agent')));
  const paths = new Set([...ctx.outputs, ...plannedDiscoveryPaths(ctx)]);
  if (paths.has('.well-known/api-catalog')) entries.push(ardEntry(host, siteUrl, '/.well-known/api-catalog', 'api-catalog', `${siteName} API catalog`, 'application/linkset+json', ardQueries(ctx, 'api-catalog')));
  if (paths.has('.well-known/agent-skills/index.json')) entries.push(ardEntry(host, siteUrl, '/.well-known/agent-skills/index.json', 'skills', `${siteName} agent skills`, 'application/json', ardQueries(ctx, 'skills')));
  if (paths.has('llms.txt')) entries.push(ardEntry(host, siteUrl, '/llms.txt', 'llms', `${siteName} content index`, 'text/plain', ardQueries(ctx, 'llms')));
  if (paths.has('.well-known/oauth-protected-resource')) entries.push(ardEntry(host, siteUrl, '/.well-known/oauth-protected-resource', 'oauth', `${siteName} OAuth metadata`, 'application/json', ardQueries(ctx, 'oauth')));
  if (paths.has('.well-known/mcp/server-card.json')) entries.push(ardEntry(host, siteUrl, '/.well-known/mcp/server-card.json', 'mcp', `${siteName} MCP server card`, 'application/json', ardQueries(ctx, 'mcp')));
  await writeIfChanged(ctx, '.well-known/ai-catalog.json', JSON.stringify({
    specVersion: '0.1',
    host,
    entries
  }, null, 2));
}

function catalog(ctx: BuildContext) {
  const locale = ctx.config.defaultLocale || 'en';
  const privacySettings = privacyConsentSettings(ctx);
  const allIntegrations = configuredIntegrations(ctx, true);
  const activeIntegrations = allIntegrations.filter(integration => integration.enabled);
  const privacyPurposeCategories = privacyCategories(ctx, activeIntegrations, locale);
  const providers = Object.entries(integrationAdapters(ctx.themeDefinition)).map(([id, adapter]) => ({
    id,
    schema: adapter.schema,
    privacy: adapter.privacy,
    ...(adapter.labelKey ? { labelKey: adapter.labelKey } : {})
  }));
  return {
    version: 2,
     theme: {
      name: String(ctx.theme.name || ctx.config.theme?.name || 'default'),
      fingerprint: String(ctx.theme.__fingerprint || ctx.themeHash).slice(0, 20),
      resources: {
        styles: resourcePaths(themeResources(ctx), 'styles')
      },
       components: Object.fromEntries(Object.entries(ctx.themeDefinition.components || {}).map(([name, value]: [string, any]) => [name, {
         id: value.id || name,
         source: value.source || 'built-in',
         capabilities: value.capabilities || [],
         contexts: value.contexts || [],
         implementation: value.implementation,
        enabled: componentEnabled(ctx, name),
        resources: value?.resources || {},
        client: value?.client ? { selector: value.client.selector, ...(value.client.api ? { api: value.client.api } : {}) } : undefined,
        defaults: value?.defaults || {},
        schema: value?.schema || {},
        settings: themeComponentSettings(ctx, name)
      }]))
    },
     compiler: { runtime: 'node22-esm', renderer: 'typescript-safe-html', markdown: 'commonmark-gfm', yaml: 'yaml-1.2', directives: 'component-directive' },
    integrations: {
      providers,
      configured: allIntegrations.map(integration => publicPrivacyIntegration(integration, integration.enabled))
    },
    collections: Object.entries(ctx.config.content?.collections || {}).map(([name, value]) => {
      const settings = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
      return {
        name,
        ...settings,
         contentType: String(settings.contentType || (name === 'updates' ? 'release' : name === 'posts' ? 'post' : 'page')),
        route: String(settings.route || '/:locale/:id/'),
        component: String(settings.component || defaultComponent(ctx.config, name)),
        schema: settings.schema && typeof settings.schema === 'object' ? settings.schema : {},
        feed: Boolean(settings.feed),
        archive: Boolean(settings.archive)
      };
    }),
    languages: ctx.config.activeLocales || [ctx.config.defaultLocale || 'en'],
    agent: {
      optional: true,
      role: 'assistive',
      defaultCommands: ['npm install', 'page g', 'page c', 'page s'],
      ...discoveryBoundaries(ctx),
      functionMap: agentFunctionMap(ctx)
    },
    privacy: {
      consent: {
        enabled: privacyConsentRequired(ctx) && privacySettings.enabled !== false && componentEnabled(ctx, 'privacyConsent'),
        decisionRetentionDays: decisionRetentionDays(ctx),
        purposes: privacyPurposeCategories,
        choices: { optionalDefault: false, rejectAvailable: true, withdrawAvailable: true }
      },
      integrations: activeIntegrations.map(integration => publicPrivacyIntegration(integration)),
      policyRoute: privacyPolicyRoute(ctx, locale),
      agentRoute: privacyAgentRoute(ctx),
      machineReadable: { agent: '/.well-known/agent.json', catalog: '/.pageskill/catalog.json', sitemap: '/sitemap.xml', llms: '/llms.txt' }
    },
    routes: ctx.routes.size
      ? [...ctx.routes.entries()].map(([route, candidate]) => ({ route, id: candidate.id, collection: candidate.collection, locale: candidate.locale }))
      : ctx.docs.map(candidate => ({ route: routeFor(ctx, candidate), id: candidate.id, collection: candidate.collection, locale: candidate.locale }))
  };
}

async function readJson<T>(file: string, fallback: T): Promise<T> { try { return JSON.parse(await fs.readFile(file, 'utf8')) as T; } catch { return fallback; } }
function retainOutput(ctx: BuildContext, relative: string) {
  const { normalized } = outputTarget(ctx, relative);
  ctx.outputs.add(normalized);
  const hash = ctx.cache.outputHashes?.[normalized];
  if (hash) ctx.outputHashes[normalized] = hash;
}
async function writeIfChanged(ctx: BuildContext, relative: string, data: string | Uint8Array) {
  const { normalized, target } = outputTarget(ctx, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const incoming = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
  const incomingHash = shortHash(incoming);
  if (ctx.stagedOutput) {
    await fs.writeFile(target, incoming);
    ctx.profile.changedOutputs += 1;
    ctx.outputs.add(normalized);
    ctx.outputHashes[normalized] = incomingHash;
    return;
  }
  const cachedHash = ctx.cache.outputHashes?.[normalized];
  if (cachedHash === incomingHash) {
    try {
      await fs.access(target);
      ctx.outputs.add(normalized);
      ctx.outputHashes[normalized] = incomingHash;
      return;
    } catch { /* regenerate a missing cached output */ }
  }
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(temporary, incoming);
  await fs.rename(temporary, target);
  ctx.profile.changedOutputs += 1;
  ctx.outputs.add(normalized);
  ctx.outputHashes[normalized] = incomingHash;
}

async function writePrivateIfChanged(ctx: BuildContext, relative: string, data: string | Uint8Array) {
  const root = path.join(ctx.root, '.pageskill');
  const target = containedPath(root, relative, 'private report path');
  await fs.mkdir(path.dirname(target), { recursive: true });
  const incoming = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(temporary, incoming);
  await fs.rename(temporary, target);
}

async function parallelFor<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await worker(item);
    }
  };
  const results = await Promise.allSettled(Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, run));
  const failure = results.find(result => result.status === 'rejected') as PromiseRejectedResult | undefined;
  if (failure) throw failure.reason;
}

async function parallelMap<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const result: R[] = new Array(items.length);
  let cursor = 0;
  const run = async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      result[index] = await worker(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, run));
  return result;
}

async function processImageVariants(ctx: BuildContext, assetRoot: string) {
  const variants = Array.isArray(ctx.config.images?.variants) ? ctx.config.images.variants : [];
  if (!variants.length) { ctx.imageCache = {}; return; }
  const { default: sharp } = await import('sharp');
  const previous = ctx.cache.images || {};
  const next: Record<string, CachedImage> = {};
  await parallelFor(variants, 4, async (variant: any) => {
    const sourceRelative = safeRelativePath(variant.source || '', 'image source path');
    const output = safeRelativePath(variant.output || '', 'image output path');
    const source = containedPath(assetRoot, sourceRelative, 'image source path');
    const input = await fs.readFile(source);
    const params = {
      width: variant.width ? Number(variant.width) : undefined,
      height: variant.height ? Number(variant.height) : undefined,
      fit: String(variant.fit || 'inside'),
      format: String(variant.format || path.extname(output).slice(1) || 'webp').toLowerCase(),
      quality: Number(variant.quality || 82),
      implementation: `sharp-${sharp.versions.sharp}`
    };
    const key = `${sourceRelative}:${output}`;
    const hash = shortHash(Buffer.concat([input, Buffer.from(JSON.stringify(params))]));
    const cached = previous[key];
    if (cached?.hash === hash) {
      try {
        await fs.access(outputTarget(ctx, output).target);
        retainOutput(ctx, output);
        next[key] = cached;
        ctx.profile.imageCacheHits += 1;
        return;
      } catch { /* regenerate a missing cached output */ }
    }
    let pipeline = sharp(input).rotate();
    if (params.width || params.height) pipeline = pipeline.resize({ width: params.width, height: params.height, fit: params.fit as any, withoutEnlargement: true });
    if (params.format === 'png') pipeline = pipeline.png({ quality: params.quality });
    else if (params.format === 'jpg' || params.format === 'jpeg') pipeline = pipeline.jpeg({ quality: params.quality, mozjpeg: true });
    else if (params.format === 'avif') pipeline = pipeline.avif({ quality: params.quality });
    else pipeline = pipeline.webp({ quality: params.quality });
    await writeIfChanged(ctx, output, await pipeline.toBuffer());
    ctx.profile.imagesProcessed += 1;
    next[key] = { hash, output };
  });
  ctx.imageCache = next;
}

async function readImageDimensions(assetRoot: string): Promise<Record<string, ImageDimensions>> {
  const dimensions: Record<string, ImageDimensions> = {};
  let sharp: any;
  try { ({ default: sharp } = await import('sharp')); } catch { return dimensions; }
  for (const file of await walk(assetRoot)) {
    const relative = normalizePath(path.relative(assetRoot, file));
    try {
      const metadata = await sharp(file).metadata();
      if (!metadata.width || !metadata.height) continue;
      const publicPath = ['favicon.ico', 'favicon-32x32.png', 'apple-touch-icon.png', 'favicon-v2.ico'].includes(relative)
        ? `/${relative}`
        : `/assets/${relative}`;
      dimensions[publicPath] = { width: metadata.width, height: metadata.height };
    } catch { /* unsupported or malformed assets remain without intrinsic dimensions */ }
  }
  return dimensions;
}

async function copyThemeAndAssets(ctx: BuildContext) {
  const assetRoot = path.join(ctx.root, 'content', 'assets');
  const rootAssets = new Set(['favicon.ico', 'favicon-32x32.png', 'apple-touch-icon.png', 'favicon-v2.ico']);
  const variantSources = new Set((Array.isArray(ctx.config.images?.variants) ? ctx.config.images.variants : []).map((variant: any) => normalizePath(String(variant?.source || '')).replace(/^\/+/, '')).filter(Boolean));
  for (const file of await walk(assetRoot)) {
    const relative = normalizePath(path.relative(assetRoot, file));
    if (variantSources.has(relative)) continue;
    const output = rootAssets.has(relative) ? relative : `assets/${relative}`;
    await writeIfChanged(ctx, output, await fs.readFile(file));
  }
  await processImageVariants(ctx, assetRoot);
  const themeName = configuredThemeName(ctx.config);
  const themeRoot = containedPath(path.join(ctx.root, 'themes'), themeName, 'theme directory');
  const themeOutputRoot = `assets/theme/${themeName}`;
  await fs.rm(outputTarget(ctx, themeOutputRoot).target, { recursive: true, force: true });
  const styleBundle = themeStyleBundle(ctx);
  const styleParts: string[] = [];
  for (const relative of styleBundle.styleFiles) {
    try {
      styleParts.push(ctx.themeStyleSources.get(relative) ?? await fs.readFile(containedPath(themeRoot, relative, 'theme stylesheet path'), 'utf8'));
    } catch { /* optional theme style */ }
  }
  if (styleParts.length) await writeIfChanged(ctx, `${themeOutputRoot}/${versionedThemeAsset(styleBundle.styleFile, styleBundle.fingerprint)}`, minifyCss(styleParts.join('\n')));
  const usedComponents = new Set(ctx.docs.map(doc => doc.component));
  const dependencyFiles = new Set<string>();
  for (const file of [
    ...genericComponentResourcePaths(ctx, 'styles'),
    ...(componentEnabled(ctx, 'privacyConsent') ? componentResourcePaths(ctx, ['privacyConsent'], 'styles') : []),
    ...(componentEnabled(ctx, 'search') ? componentResourcePaths(ctx, ['search'], 'styles') : []),
    ...(componentEnabled(ctx, 'toc') ? componentResourcePaths(ctx, ['toc'], 'styles') : []),
    ...(componentEnabled(ctx, 'comments') ? componentResourcePaths(ctx, ['comments'], 'styles') : []),
    // The root language selector is generated by the compiler itself, so its
    // small enhancement script is copied whenever the theme declares it. It
    // is not an optional site integration and has no config switch.
    ...componentResourcePaths(ctx, ['language', 'languagePicker'], 'styles'),
    ...clientComponents(ctx).map(({ client }) => client.module)
  ]) dependencyFiles.add(safeRelativePath(file, 'theme resource path'));
  for (const component of usedComponents) {
    for (const file of componentResourcePathsFor(ctx, component, 'styles')) dependencyFiles.add(safeRelativePath(file, 'Component resource path'));
  }
  for (const doc of ctx.docs) for (const component of doc.componentNames.length ? doc.componentNames : ctx.cache.documents[doc.source]?.components || []) {
    for (const file of componentResourcePathsFor(ctx, component, 'styles')) dependencyFiles.add(safeRelativePath(file, 'Component resource path'));
  }
  for (const relative of dependencyFiles) {
    if (styleBundle.bundled.has(relative)) continue;
    const extension = path.extname(relative).toLowerCase();
    const source = extension === '.css'
      ? (ctx.themeStyleSources.get(relative) ?? await fs.readFile(containedPath(themeRoot, relative, 'theme resource path'), 'utf8'))
      : await fs.readFile(containedPath(themeRoot, relative, 'theme resource path'), 'utf8');
    const output = `${themeOutputRoot}/${versionedThemeAsset(relative, themeResourceFingerprint(ctx, relative))}`;
    await writeIfChanged(ctx, output, extension === '.css' ? minifyCss(source) : source);
  }
  const clients = clientComponents(ctx);
  if (clients.length) {
    const imports = clients.map(({ client }, index) => `import { mount as mount${index} } from ${JSON.stringify(themeResourceHref(ctx, `/assets/theme/${themeName}`, client.module))};`).join('\n');
  const registrations = clients.map(({ name, client }, index) => `{id:${JSON.stringify(name)},selector:${JSON.stringify(client.selector)},api:${JSON.stringify(client.api || '')},mount:mount${index}}`).join(',\n');
    const allApis = resolveClientApis(ctx.config);
    const apiIds = new Set(clients.map(({ client }) => client.api).filter(Boolean));
  for (const id of apiIds) if (!allApis[id!]) throw new Error(`config.yml: apis.${id} is required by an enabled Component that declares client.api`);
    const browserApis = Object.fromEntries(Object.entries(allApis).filter(([id]) => apiIds.has(id)));
    const bootstrap = `${imports}\n\nclass ClientRequestError extends Error { constructor(message, status = 0, code = 'request_failed') { super(message); this.name = 'ClientRequestError'; this.status = status; this.code = code; } }\nconst lifecycle = new AbortController();\nconst apiDefinitions = Object.freeze(${JSON.stringify(browserApis)});\nwindow.addEventListener('pagehide', () => lifecycle.abort(), { once: true });\nfunction sameOrigin(value) { const target = new URL(value, window.location.href); if (target.origin !== window.location.origin) throw new ClientRequestError('The local asset must use the site origin.', 0, 'cross_origin_blocked'); return target; }\nfunction apiTarget(definition, value = '') { if (!definition) throw new ClientRequestError('This Component API is not configured.', 0, 'api_not_configured'); const base = new URL(definition.url); const raw = String(value || ''); const target = raw === '' || raw.startsWith('?') ? new URL(raw || base.href, base.href) : new URL(raw.replace(/^\\/+/, ''), base.href.endsWith('/') ? base.href : base.href + '/'); const prefix = base.pathname.endsWith('/') ? base.pathname : base.pathname + '/'; if (target.origin !== base.origin || (target.pathname !== base.pathname && !target.pathname.startsWith(prefix))) throw new ClientRequestError('The API request escaped its configured URL scope.', 0, 'api_scope_blocked'); return target; }\nasync function fetchJson(target, options = {}, definition) { const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 12000); const abort = () => controller.abort(); lifecycle.signal.addEventListener('abort', abort, { once: true }); options.signal?.addEventListener?.('abort', abort, { once: true }); const headers = new Headers({ accept: 'application/json', ...(options.headers || {}) }); if (definition?.token) { if (definition.auth === 'x-api-key') headers.set('x-api-key', definition.token); else headers.set('authorization', 'Bearer ' + definition.token); } try { const response = await fetch(target, { ...options, credentials: target.origin === window.location.origin ? 'same-origin' : 'omit', signal: controller.signal, headers }); const type = response.headers.get('content-type') || ''; const data = type.includes('application/json') ? await response.json() : null; if (!response.ok) throw new ClientRequestError(data?.error || 'The API request failed.', response.status, data?.code || 'request_failed'); if (!type.includes('application/json')) throw new ClientRequestError('Expected a JSON response.', response.status, 'invalid_response'); return data; } catch (error) { if (error instanceof ClientRequestError) throw error; if (controller.signal.aborted) throw new ClientRequestError('The request timed out.', 0, 'request_timeout'); throw new ClientRequestError('The request could not be completed.'); } finally { window.clearTimeout(timeout); lifecycle.signal.removeEventListener('abort', abort); options.signal?.removeEventListener?.('abort', abort); } }\nfunction assetJson(value, options = {}) { return fetchJson(sameOrigin(value), options); }\nfunction runtimeFor(component) { const runtime = { signal: lifecycle.signal, ClientRequestError, apiId: component.api || undefined, assetJson, setBusy(element, busy) { if (!element) return; if (busy) element.setAttribute('aria-busy', 'true'); else element.removeAttribute('aria-busy'); } }; if (component.api) { const definition = apiDefinitions[component.api]; runtime.apiJson = (value, options) => fetchJson(apiTarget(definition, value), options, definition); } return Object.freeze(runtime); }\nconst components = [\n${registrations}\n];\nfor (const component of components) { for (const root of document.querySelectorAll(component.selector)) { try { component.mount(root, runtimeFor(component)); } catch (error) { root.dataset.clientState = 'failed'; console.error('Pageskill Client Component failed:', component.id, error); } } }\n`;
    await writeIfChanged(ctx, 'assets/pageskill/client.js', bootstrap);
  }
  await writeIfChanged(ctx, 'AGENTS.md', await fs.readFile(path.join(ctx.root, 'AGENTS.md'), 'utf8').catch(() => ''));
  const locale = ctx.config.defaultLocale || 'en';
  const siteName = localizedValue(ctx.config.siteName, locale, 'Site');
  const manifestIcons = [
    ctx.config.icons?.icon192 ? { src: String(ctx.config.icons.icon192), sizes: '192x192', type: 'image/png' } : null,
    ctx.config.icons?.icon512 ? { src: String(ctx.config.icons.icon512), sizes: '512x512', type: 'image/png' } : null
  ].filter(Boolean);
  await writeIfChanged(ctx, 'site.webmanifest', JSON.stringify({ name: siteName, short_name: siteName, start_url: '/', display: 'minimal-ui', background_color: ctx.config.pwa?.backgroundColor || '#ffffff', theme_color: ctx.config.pwa?.themeColor || '#000000', icons: manifestIcons }, null, 2));
}

function xml(value: string) { return escapeHtml(value).replaceAll('&quot;', '&quot;'); }
function collectionSettings(ctx: BuildContext, collection: string): Record<string, any> {
  const value = ctx.config.content?.collections?.[collection];
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function isPostCollectionConfig(config: Record<string, any>, collection: string): boolean {
  const settings = config.content?.collections?.[collection];
  return collection === 'posts' || collection === 'updates' || Boolean(settings && typeof settings === 'object' && !Array.isArray(settings) && ['post', 'release'].includes(String(settings.contentType)));
}

function isPostCollection(ctx: BuildContext, collection: string): boolean {
  return isPostCollectionConfig(ctx.config, collection);
}

async function writeAgentInfo(ctx: BuildContext, siteUrl: string) {
  // Agent metadata describes configured adapters and active consent purposes;
  // it does not expose provider identifiers or claim disabled services.
  const settings = privacyConsentSettings(ctx);
  const locale = ctx.config.defaultLocale || 'en';
  const policyRoute = privacyPolicyRoute(ctx, ':locale');
  const policyRoutes = Object.fromEntries((ctx.config.activeLocales || [locale]).map((candidate: string) => [candidate, policyRoute.replace(':locale', candidate)]));
  const allIntegrations = configuredIntegrations(ctx, true);
  const activeIntegrations = allIntegrations.filter(integration => integration.enabled);
  const purposes = privacyCategories(ctx, activeIntegrations, locale);
  await writeIfChanged(ctx, '.well-known/agent.json', JSON.stringify({
    version: 1,
    site: { name: localizedValue(ctx.config.siteName, locale, 'Site'), defaultLocale: locale, locales: ctx.config.activeLocales || [locale] },
    crawl: { robots: '/robots.txt', sitemap: '/sitemap.xml', llms: '/llms.txt', catalog: '/.well-known/ai-catalog.json' },
    discovery: {
      resources: publicDiscoveryResources(ctx),
      markdown: ctx.config.outputs?.markdownMirrors === true && discoverySettings(ctx, 'markdown').enabled !== false,
      contentSignal: contentSignalHeader(ctx) || undefined,
      authentication: authSettings(ctx).enabled === true ? {
        protectedResource: '/.well-known/oauth-protected-resource',
        authorizationServer: authSettings(ctx).authorizationServer || authSettings(ctx).issuer,
        documentation: '/auth.md'
      } : { enabled: false },
      mcp: discoverySettings(ctx, 'mcp').enabled === true ? { serverCard: '/.well-known/mcp/server-card.json' } : { enabled: false },
      webmcp: discoverySettings(ctx, 'webmcp').enabled === true
        ? { configured: true, note: 'Browser tools are theme-owned and must use the supported browser API with explicit safe schemas.' }
        : { configured: false },
      dnsAid: discoverySettings(ctx, 'dnsAid').enabled === true
        ? { configured: true, note: 'Publish the generated domain records through a DNS provider with DNSSEC; the static renderer cannot change DNS.' }
        : { configured: false }
    },
    privacy: {
      audience: 'agent',
      format: 'application/json',
      humanSelector: 'HTML dialog on localized pages',
      consent: {
        enabled: privacyConsentRequired(ctx) && settings.enabled !== false && componentEnabled(ctx, 'privacyConsent'),
        decisionRetentionDays: decisionRetentionDays(ctx),
        purposes,
        optionalDefault: false
      },
      integrations: activeIntegrations.map(integration => publicPrivacyIntegration(integration)),
      policyRoute,
      policyRoutes,
      agentRoute: privacyAgentRoute(ctx),
      note: 'Generated behavior disclosure; provider purpose and load policy come from the active theme adapter registry.'
    },
    agentGuidance: {
      optional: true,
      role: 'assistive',
      ...discoveryBoundaries(ctx),
      functionMap: agentFunctionMap(ctx)
    },
    generatedBy: { name: 'Pageskill', version: '1.0.0-beta.0', static: true, siteUrl }
  }, null, 2));
}
function feedCollections(ctx: BuildContext): string[] {
  return Object.entries(ctx.config.content?.collections || {})
    .filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value) && (value as any).feed && typeof (value as any).feed === 'object')
    .map(([name]) => name);
}
function feedCollection(ctx: BuildContext): string | undefined { return feedCollections(ctx)[0]; }
function feedRouteFor(ctx: BuildContext, locale: string, collection: string): string {
  const settings = collectionSettings(ctx, collection);
  const feed = settings.feed && typeof settings.feed === 'object' && !Array.isArray(settings.feed) ? settings.feed : {};
  const configured = feed.route || `/:locale/${collection}/feed.xml`;
  return String(configured).replace(':locale', locale).replace(':collection', collection).replace(/\/{2,}/g, '/').replace(/([^:])\/\//g, '$1/');
}
function archiveCollections(ctx: BuildContext): string[] {
  return Object.entries(ctx.config.content?.collections || {})
    .filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value) && (value as any).archive && typeof (value as any).archive === 'object')
    .map(([name]) => name);
}
function feedXml(ctx: BuildContext, locale: string, collection: string) {
  const settings = collectionSettings(ctx, collection);
  const feed = settings.feed && typeof settings.feed === 'object' && !Array.isArray(settings.feed) ? settings.feed : {};
  const entries = documentsForCollection(ctx, collection, locale).slice(0, Math.max(1, Number(feed.limit || 20)));
  const site = String(ctx.config.siteUrl || '').replace(/\/$/, '');
  return `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>${xml(localizedValue(feed.title, locale, localizedValue(ctx.config.siteName, locale, 'Site')))}</title><link>${xml(site)}</link><description>${xml(localizedValue(feed.description, locale, localizedValue(ctx.config.description, locale, '')))}</description>${entries.map(entry => { const parsed = entry.date ? new Date(entry.date) : null; const published = parsed && !Number.isNaN(parsed.valueOf()) ? parsed.toUTCString() : entry.date || ''; return `<item><title>${xml(entry.title)}</title><link>${xml(`${site}${routeFor(ctx, entry)}`)}</link><guid>${xml(`${site}${routeFor(ctx, entry)}`)}</guid><pubDate>${xml(published)}</pubDate><description>${xml(entry.description)}</description></item>`; }).join('')}</channel></rss>`;
}

function searchIndex(ctx: BuildContext, locale: string) {
  return sourceDocuments(ctx).filter(doc => doc.locale === locale).sort((left, right) => routeFor(ctx, left).localeCompare(routeFor(ctx, right))).map(doc => ({
    id: doc.id,
    collection: doc.collection,
    category: postCategory(doc),
    title: doc.title,
    description: doc.description,
    url: routeFor(ctx, doc),
    date: doc.date || '',
    updated: doc.updated || '',
    headings: doc.nodes.filter(node => node.kind === 'heading').map(node => node.text).join(' '),
    text: doc.markdown.replaceAll(/[`*_>#]/g, ' ').replaceAll(/:::.*$/gm, ' ').replaceAll(/\s+/g, ' ').trim()
  }));
}

async function writeSearch(ctx: BuildContext, locale: string) {
  const settings = themeComponentSettings(ctx, 'search');
  if (!componentEnabled(ctx, 'search')) return;
  const entries = searchIndex(ctx, locale);
  const shardSize = Math.max(50, numericComponentSetting(ctx, 'search', 'shardSize', 50));
  if (entries.length <= shardSize) {
    await writeIfChanged(ctx, `assets/search-index.${locale}.json`, JSON.stringify(entries));
    return;
  }
  const shards: string[] = [];
  for (let index = 0; index < entries.length; index += shardSize) {
    const file = `assets/search/${locale}/${String(shards.length + 1).padStart(4, '0')}.json`;
    await writeIfChanged(ctx, file, JSON.stringify(entries.slice(index, index + shardSize)));
    shards.push(`/${file}`);
  }
  await writeIfChanged(ctx, `assets/search-index.${locale}.json`, JSON.stringify({ version: 1, locale, count: entries.length, shards }));
}

async function writeLlms(ctx: BuildContext, siteUrl: string) {
  if (ctx.config.llms?.enabled === false) return;
  const entries = [...ctx.routes.entries()].sort(([left], [right]) => left.localeCompare(right));
  await writeIfChanged(ctx, 'llms.txt', `${localizedValue(ctx.config.llms?.title, ctx.config.defaultLocale || 'en', 'Site')}\n\n${localizedValue(ctx.config.llms?.description, ctx.config.defaultLocale || 'en', '')}\n\n${entries.map(([route, doc]) => `- [${doc.title}](${siteUrl}${route}): ${doc.description}`).join('\n')}\n`);
  if (ctx.config.llms?.full?.enabled === false) return;
  const documents = [...ctx.docs].sort((left, right) => left.source.localeCompare(right.source));
  const shardSize = Math.max(50, Number(ctx.config.llms?.full?.shardSize));
  const renderDocuments = (items: Document[]) => items.map(doc => `# ${doc.title}\n\nSource: ${normalizePath(path.relative(ctx.root, doc.source))}\nRoute: ${routeFor(ctx, doc)}\n\n${doc.markdown.trim()}`).join('\n\n');
  if (documents.length <= shardSize) {
    await writeIfChanged(ctx, 'llms-full.txt', `${localizedValue(ctx.config.llms?.title, ctx.config.defaultLocale || 'en', 'Site')}\n\n${renderDocuments(documents)}\n`);
    return;
  }
  const shards: string[] = [];
  for (let index = 0; index < documents.length; index += shardSize) {
    const file = `llms-full/${String(shards.length + 1).padStart(4, '0')}.txt`;
    await writeIfChanged(ctx, file, `${renderDocuments(documents.slice(index, index + shardSize))}\n`);
    shards.push(file);
  }
  await writeIfChanged(ctx, 'llms-full.txt', `${localizedValue(ctx.config.llms?.title, ctx.config.defaultLocale || 'en', 'Site')} full-content shards\n\n${shards.map(file => `- /${file}`).join('\n')}\n`);
}

function robotsValue(value: unknown, fallback: string): string {
  // Keep user-provided robots values single-line and bounded before they reach
  // a public text file or the generated Content-Signal header.
  const text = String(value ?? fallback).replaceAll(/[\r\n]+/g, ' ').trim();
  return text.slice(0, 200);
}

function robotsText(ctx: BuildContext, siteUrl: string): string {
  // Generate robots.txt from the same signal settings advertised by responses
  // so crawler policy has one configuration source.
  const configuredRules = Array.isArray(ctx.config.robots?.rules) ? ctx.config.robots.rules : [];
  const rules = configuredRules.length ? configuredRules : [{ userAgent: '*' , allow: ['/'] }];
  const lines: string[] = [];
  for (const raw of rules) {
    if (!isRecord(raw)) continue;
    lines.push(`User-agent: ${robotsValue(raw.userAgent, '*')}`);
    const allow = Array.isArray(raw.allow) ? raw.allow : raw.allow ? [raw.allow] : [];
    const disallow = Array.isArray(raw.disallow) ? raw.disallow : raw.disallow ? [raw.disallow] : [];
    for (const value of allow) lines.push(`Allow: ${robotsValue(value, '/')}`);
    for (const value of disallow) lines.push(`Disallow: ${robotsValue(value, '/')}`);
    lines.push('');
  }
  const signal = contentSignalHeader(ctx);
  if (signal) lines.push(`Content-Signal: ${signal}`);
  lines.push(`Sitemap: ${siteUrl}/sitemap.xml`, '');
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}`;
}

async function writeArchives(ctx: BuildContext): Promise<string[]> {
  const routes: string[] = [];
  const defaultPageSize = 50;
  for (const collection of archiveCollections(ctx)) for (const locale of ctx.config.activeLocales || [ctx.config.defaultLocale || 'en']) {
    const archive = collectionSettings(ctx, collection).archive && typeof collectionSettings(ctx, collection).archive === 'object' ? collectionSettings(ctx, collection).archive : {};
    const pageSize = Math.max(10, Number(archive.pageSize || defaultPageSize));
    const definitions: Array<{ key: string; category?: string; entries: Document[] }> = [];
    const kind = collectionContentKind(ctx, collection);
    definitions.push({ key: collection, entries: queryDocuments(ctx, { collection, kind, locale, orderBy: 'date:desc' }) });
    if (collection === 'posts') {
      const categories = [...new Set(queryDocuments(ctx, { collection, kind: 'post', locale, orderBy: 'date:desc' }).map(postCategory))].sort();
      for (const category of categories) {
        definitions.push({ key: `category.${category}`, category, entries: queryDocuments(ctx, { collection, kind: 'post', category, locale, orderBy: 'date:desc' }) });
      }
    }
    for (const definition of definitions) {
      const entries = definition.entries;
      if (!entries.length) continue;
      const pages = Math.ceil(entries.length / pageSize);
      for (let page = 1; page <= pages; page += 1) {
        const route = archiveRouteFor(ctx, { collection, category: definition.category, locale, page });
        const title = localizedValue(archive.title, locale, themeText(ctx, locale, `archive.${definition.key}.title`, themeText(ctx, locale, `archive.${collection}.title`, themeText(ctx, locale, 'archive.title', definition.key))));
        const archiveDescription = localizedValue(archive.description, locale, themeText(ctx, locale, `archive.${definition.key}.description`, themeText(ctx, locale, `archive.${collection}.description`, themeText(ctx, locale, 'archive.description', `Published ${collection}`))));
        const document: Document = { id: `archive-${definition.key}-${page}`, collection: 'archive', contentKey: `archive:${definition.key}:${locale}:${page}`, locale, source: `generated:archive:${definition.key}:${locale}:${page}`, title, description: archiveDescription, component: 'archive', date: undefined, data: { route, archiveCollection: collection, archiveKey: definition.key, ...(definition.category ? { category: definition.category } : {}) }, markdown: '', excerpt: '', bodyLine: 1, nodes: [], directives: [], metrics: calculateContentMetrics(''), dependencyKeys: [], componentNames: [], hash: '', stat: { mtimeMs: 0, size: 0 } };
        const archiveComponent = themeComponent(ctx, 'archive');
        if (!archiveComponent?.renderDocument) throw new Error('active theme must register the archive Component before generating collection archives');
        const archiveContext = themeContextFor(ctx, document);
        const renderedArchive = archiveComponent.renderDocument({
          renderedContent: '',
          slots: {},
          props: { title, description: archiveDescription, archiveKey: definition.key, collection, category: definition.category, page, pages, pageSize },
          runtime: { entries: entries.slice((page - 1) * pageSize, page * pageSize), collection, category: definition.category, page, pages }
        }, archiveContext);
        await writeIfChanged(ctx, `${route.replace(/^\//, '')}index.html`, pageShell(ctx, document, renderedArchive));
        routes.push(route);
      }
    }
  }
  return routes;
}

export async function createContext(root = process.cwd()): Promise<BuildContext> {
  root = await fs.realpath(root);
  const discoverStart = performance.now();
  let cache = await readJson<CacheManifest>(path.join(root, '.pageskill', 'manifest.json'), { version: 4, documents: {}, outputs: [] });
  if (cache.rendererVersion !== RENDERER_VERSION || cache.version !== 4) cache = { ...cache, version: 4, documents: {} };
  const loadedConfig = await loadConfig(root);
  const config = loadedConfig.config;
  const themeName = configuredThemeName(config);
  const themeRoot = containedPath(path.join(root, 'themes'), themeName, 'theme directory');
  const loadedThemeConfig = await loadThemeConfig(root, config);
  const theme: Record<string, any> = {};
  const themeFiles = await walk(themeRoot, ['.yml', '.css', '.js', '.mjs', '.ts']);
  const themeReads = await parallelMap(themeFiles, 16, async file => ({
    relative: normalizePath(path.relative(themeRoot, file)),
    source: await fs.readFile(file, 'utf8')
  }));
  const themeChunks = themeReads.map(({ relative, source }) => `${relative}\0${source}`);
  if (loadedThemeConfig.file && !themeReads.some(entry => path.resolve(path.join(themeRoot, entry.relative)) === path.resolve(loadedThemeConfig.file!))) {
    themeChunks.push(`@instance/${normalizePath(path.relative(root, loadedThemeConfig.file))}\0${loadedThemeConfig.source}`);
  }
  const themeStyleSources = new Map(themeReads
    .filter(({ relative }) => path.extname(relative).toLowerCase() === '.css')
    .map(({ relative, source }) => [relative, source] as const));
  const themeAssetHashes = Object.fromEntries(themeReads
    .filter(({ relative }) => ['.css', '.js', '.mjs'].includes(path.extname(relative).toLowerCase()))
    .map(({ relative, source }) => {
      const extension = path.extname(relative).toLowerCase();
      return [relative, shortHash(extension === '.css' ? minifyCss(source) : source).slice(0, 12)];
    }));
  const themeHash = shortHash(themeChunks.join('\0'));
  // The public asset fingerprint remains content based.  Theme module imports
  // use a per-context generation so a long-lived preview process cannot keep
  // an old nested layout/component module from Node's ESM cache.
  const generation = `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}`;
  const themeDefinition = await loadThemeDefinition(root, themeName, generation);
  validateConfiguredIntegrations(config, themeDefinition);
  const configuredAdapters = resolveConfiguredIntegrations(config, themeDefinition).filter(integration => integration.enabled);
  if (configuredAdapters.some(integration => integration.consent !== 'none') && config.privacy?.consent?.enabled === false) {
    throw new Error('config.yml: privacy.consent.enabled is false, but a configured integration requires consent; keep the provider gated or remove the integration');
  }
  if (configuredAdapters.some(integration => integration.consent !== 'none') && !themeDefinition.components?.privacyConsent) {
    throw new Error('active theme must register the privacyConsent UI component before configuring an integration that requires consent');
  }
  const themeConfig = normalizeThemeConfig(loadedThemeConfig.config, themeDefinition, loadedThemeConfig.file ? normalizePath(path.relative(root, loadedThemeConfig.file)) : 'theme.config');
  const themeI18n = await loadThemeI18n(themeRoot, themeDefinition, String(config.i18n?.fallbackLocale || config.defaultLocale || 'en'));
  // The theme entry is code-owned; the instance file contributes only
  // schema-validated component overrides. Resource discovery is owned by the
  // defineTheme export, not by a second package configuration registry.
  const runtimeTheme = { ...theme, ...themeDefinition, __fingerprint: themeHash } as Record<string, any>;
  const assetRoot = path.join(root, 'content', 'assets');
  const assetFiles = await walk(assetRoot);
  const assetStats = await parallelMap(assetFiles, 32, async file => { const stat = await fs.stat(file); return `${normalizePath(path.relative(assetRoot, file))}\0${stat.mtimeMs}\0${stat.size}`; });
  const agentFile = path.join(root, 'AGENTS.md');
  try { const stat = await fs.stat(agentFile); assetStats.push(`AGENTS.md\0${stat.mtimeMs}\0${stat.size}`); } catch { /* optional generated guide */ }
  const assetHash = shortHash(assetStats.join('\0'));
  const contentRoot = path.join(root, 'content');
  const contentRoots: Record<string, number> = {};
  try {
    for (const entry of await fs.readdir(contentRoot, { withFileTypes: true })) if (entry.isDirectory() && entry.name !== 'assets') {
      contentRoots[entry.name] = (await fs.stat(path.join(contentRoot, entry.name))).mtimeMs;
    }
  } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
  const cachedRootKeys = Object.keys(cache.contentRoots || {}).sort();
  const currentRootKeys = Object.keys(contentRoots).sort();
  const rootsUnchanged = cachedRootKeys.length === currentRootKeys.length && currentRootKeys.every(key => cache.contentRoots?.[key] === contentRoots[key]);
  const discoveredSourceFiles = await walk(contentRoot, ['.md']);
  const cachedSourceFiles = Object.keys(cache.documents || {}).filter(file => path.resolve(file).startsWith(`${path.resolve(contentRoot)}${path.sep}`));
  let sourceFiles = rootsUnchanged && cachedSourceFiles.length === discoveredSourceFiles.length && discoveredSourceFiles.every(file => cachedSourceFiles.includes(file))
    ? cachedSourceFiles
    : discoveredSourceFiles;
  if (rootsUnchanged && sourceFiles.length) {
    const activeLocales = config.activeLocales || [config.defaultLocale || 'en'];
    const groups = new Map<string, Set<string>>();
    for (const cached of Object.values(cache.documents)) {
      const key = `${cached.collection}:${cached.id}`;
      groups.set(key, new Set([...(groups.get(key) || []), cached.locale]));
    }
    const candidates: string[] = [];
    for (const [key, present] of groups) {
      const separator = key.indexOf(':');
      const collection = key.slice(0, separator);
      const id = key.slice(separator + 1);
      for (const locale of activeLocales) if (!present.has(locale)) candidates.push(path.join(contentRoot, collection, id, `${locale}.md`));
    }
    await parallelFor(candidates, 32, async candidate => { try { await fs.access(candidate); sourceFiles.push(candidate); } catch { /* fallback remains active */ } });
  }
  sourceFiles = [...new Set(sourceFiles)].sort();
  const profile: BuildProfile = { discover: duration(discoverStart), load: 0, validate: 0, parse: 0, route: 0, render: 0, assets: 0, write: 0, total: 0, documents: 0, changedOutputs: 0, imagesProcessed: 0, imageCacheHits: 0 };
  const loadStart = performance.now();
  const sourceParseCache = new Map<string, { data: Record<string, any>; body: string; excerpt: string; bodyLine: number }>();
  const loadedDocs = await parallelMap(sourceFiles, LOAD_CONCURRENCY, async source => {
    let stat: any;
    try { stat = await fs.stat(source); } catch (error: any) { if (error.code === 'ENOENT') return null; throw error; }
    const cached = cache.documents[source];
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size && typeof cached.markdown === 'string') {
      const identity = documentIdentity(root, source);
      // Metrics depend on the effective postMeta reading speeds as well as on
      // Markdown. Recalculate from cached Markdown so changing the instance
      // configuration cannot leave stale reading times in an incremental build.
      const metrics = calculateContentMetrics(cached.markdown, contentMetricsOptions(themeConfig));
      return {
        ...cached,
        ...identity,
         component: String(cached.data?.component || defaultComponent(config, identity.collection, identity.id)),
        updated: cached.updated ?? (cached.data?.updated ? String(cached.data.updated).trim() : undefined),
        contentKey: cached.contentKey || `${identity.collection}:${identity.id}`,
        author: cached.data?.author ? String(cached.data.author) : localizedValue(config.author, identity.locale, 'Site Owner'),
        cover: cached.cover || (cached.data?.cover ? String(cached.data.cover) : undefined),
        excerpt: typeof cached.excerpt === 'string' ? cached.excerpt : cached.markdown,
        source,
        bodyLine: cached.bodyLine || 1,
        stat: { mtimeMs: stat.mtimeMs, size: stat.size },
        nodes: [],
        directives: [],
        metrics,
        dependencyKeys: cached.dependencies || [],
         componentNames: cached.components || []
       } as Document;
     }
     return loadDocument(root, source, config, sourceParseCache, themeConfig);
  });
  const docs = loadedDocs.filter((doc): doc is Document => doc !== null);
  profile.load = duration(loadStart);
  profile.documents = docs.length;
  const byKey = new Map(docs.map(doc => [`${doc.collection}:${doc.id}:${doc.locale}`, doc]));
  return { root, out: path.join(root, 'dist', 'public'), config, configFiles: loadedConfig.configFiles, theme: runtimeTheme, themeConfig, themeConfigFile: loadedThemeConfig.file, themeI18n, themeDefinition, docs, byKey, routes: new Map(), cache, profile, outputs: new Set(), diagnostics: [], configHash: loadedConfig.configHash, themeHash, assetHash, contentRoots, imageCache: {}, imageDimensions: {}, outputHashes: {}, collectionIndex: new Map(), translationIndex: new Map(), documentPositions: new Map(), tagIndex: new Map(), markdownCache: new Map(), sourceParseCache, themeStyleSources, themeAssetHashes, componentWarnings: [] };
}

export async function refreshContext(ctx: BuildContext, changedFiles: string[] = []): Promise<BuildContext> {
  const absoluteChanges = [...new Set(changedFiles.map(file => path.resolve(ctx.root, file)))];
  if (!absoluteChanges.length) {
    const fresh = await createContext(ctx.root);
    Object.assign(ctx, fresh);
    return ctx;
  }

  const normalizedRoot = normalizePath(path.resolve(ctx.root)).toLocaleLowerCase();
  const configFiles = new Set(ctx.configFiles.map(file => normalizePath(path.resolve(file)).toLocaleLowerCase()));
  const configPath = `${normalizedRoot}/config.yml`;
  const configPrefix = `${normalizedRoot}/config/`;
  const themeConfigPath = ctx.themeConfigFile ? normalizePath(path.resolve(ctx.themeConfigFile)).toLocaleLowerCase() : '';
  const themePrefix = `${normalizedRoot}/themes/`;
  const contentPrefix = `${normalizedRoot}/content/`;
  const agentPath = `${normalizedRoot}/agents.md`;
  const requiresGlobalReload = absoluteChanges.some(file => {
    const normalized = normalizePath(file).toLocaleLowerCase();
    return normalized === configPath || configFiles.has(normalized) || normalized.startsWith(configPrefix) || normalized === themeConfigPath || normalized === agentPath || normalized.startsWith(themePrefix) || (normalized.startsWith(contentPrefix) && path.extname(normalized) !== '.md');
  });
  if (requiresGlobalReload) {
    const fresh = await createContext(ctx.root);
    Object.assign(ctx, fresh);
    return ctx;
  }

  const started = performance.now();
  const contentRoot = path.resolve(ctx.root, 'content');
  for (const file of absoluteChanges) {
    if (path.extname(file).toLocaleLowerCase() !== '.md') continue;
    if (file !== contentRoot && !file.startsWith(`${contentRoot}${path.sep}`)) continue;
    const existing = ctx.docs.findIndex(doc => path.resolve(doc.source) === file);
    try {
      const loaded = await loadDocument(ctx.root, file, ctx.config, ctx.sourceParseCache, ctx.themeConfig);
      if (existing >= 0) ctx.docs[existing] = loaded;
      else ctx.docs.push(loaded);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        if (existing >= 0) ctx.docs.splice(existing, 1);
      } else throw error;
    }
  }
  ctx.docs.sort((left, right) => left.source.localeCompare(right.source));
  ctx.byKey = new Map(ctx.docs.map(doc => [`${doc.collection}:${doc.id}:${doc.locale}`, doc]));
  ctx.profile = { discover: 0, load: duration(started), validate: 0, parse: 0, route: 0, render: 0, assets: 0, write: 0, total: 0, documents: ctx.docs.length, changedOutputs: 0, imagesProcessed: 0, imageCacheHits: 0 };
  return ctx;
}

export async function build(ctx: BuildContext): Promise<BuildContext> {
  const totalStart = performance.now();
  const finalOutput = ctx.out;
  let outputDirectoryExists = true;
  try { await fs.access(finalOutput); } catch { outputDirectoryExists = false; }
  ctx.outputs.clear();
  ctx.routes.clear();
  ctx.diagnostics.length = 0;
  ctx.imageCache = {};
  ctx.outputHashes = {};
  ctx.profile.changedOutputs = 0;
  ctx.profile.imagesProcessed = 0;
  ctx.profile.imageCacheHits = 0;
  ctx.profile.discover = 0;
  ctx.profile.load = 0;
  ctx.profile.validate = 0;
  ctx.profile.parse = 0;
  ctx.profile.route = 0;
  ctx.profile.render = 0;
  ctx.profile.assets = 0;
  ctx.profile.write = 0;
  // Runtime preparation is adapter-owned. Static Core builds have no host
  // configuration or runtime files to emit.
  if (!outputDirectoryExists) {
    const stageRoot = path.join(ctx.root, '.pageskill');
    await fs.mkdir(stageRoot, { recursive: true });
    for (const entry of await fs.readdir(stageRoot, { withFileTypes: true })) if (entry.isDirectory() && entry.name.startsWith('output-stage-')) {
      await fs.rm(path.join(stageRoot, entry.name), { recursive: true, force: true });
    }
    const temporary = path.join(stageRoot, `output-stage-${process.pid}-${Date.now()}`);
    await fs.mkdir(temporary, { recursive: true });
    ctx.stagedOutput = { final: finalOutput, temporary };
    ctx.out = temporary;
  }

  const globalChanged = !outputDirectoryExists || ctx.cache.rendererVersion !== RENDERER_VERSION || ctx.cache.configHash !== ctx.configHash || ctx.cache.themeHash !== ctx.themeHash;
  const assetChanged = ctx.cache.assetHash !== ctx.assetHash;
  ctx.imageDimensions = await readImageDimensions(path.join(ctx.root, 'content', 'assets'));
  const currentSources = new Set(ctx.docs.map(doc => doc.source));
  const dependencyChanges = new Set<string>();
  const directlyChanged = new Set<string>();
  for (const doc of ctx.docs) {
    const cached = ctx.cache.documents[doc.source];
    if (!cached || cached.hash !== doc.hash) {
      directlyChanged.add(doc.source);
      dependencyChanges.add(`translation:${doc.collection}:${doc.id}`);
      dependencyChanges.add(`collection:${doc.collection}:${doc.locale}`);
    }
  }
  for (const [source, cached] of Object.entries(ctx.cache.documents || {})) if (!currentSources.has(source)) {
    dependencyChanges.add(`translation:${cached.collection}:${cached.id}`);
    dependencyChanges.add(`collection:${cached.collection}:${cached.locale}`);
  }

  const fastUnchanged = outputDirectoryExists && !globalChanged && !assetChanged && directlyChanged.size === 0 && dependencyChanges.size === 0;
  if (fastUnchanged) {
    for (const output of ctx.cache.outputs || []) retainOutput(ctx, output);
    ctx.profile.total = duration(totalStart);
    await writePrivateIfChanged(ctx, 'build-profile.json', JSON.stringify(ctx.profile, null, 2));
    return ctx;
  }

  const affected = new Set<string>();
  for (const doc of ctx.docs) {
    const cached = ctx.cache.documents[doc.source];
    const dependent = (cached?.dependencies || []).some(key => dependencyChanges.has(key));
    if (globalChanged || assetChanged || directlyChanged.has(doc.source) || !cached || dependent) affected.add(doc.source);
    else for (const output of cached.outputs || documentOutputs(ctx, doc)) retainOutput(ctx, output);
  }

  ctx.profile.parse = 0;

  const validateStart = performance.now();
  for (const doc of ctx.docs) {
    ctx.diagnostics.push(...documentSchemaDiagnostics(ctx.config, doc));
    const component = ctx.themeDefinition.components[doc.component];
    if (!component?.renderDocument) ctx.diagnostics.push(`${doc.source}:1:1: Component "${doc.component}" cannot render a document; choose a Component with renderDocument`);
  }
  ctx.diagnostics.push(...integrationPrivacyPolicyDiagnostics(ctx.config, ctx.themeDefinition, ctx.docs));
  if (ctx.diagnostics.length) throw new Error(ctx.diagnostics.join('\n'));
  ctx.profile.validate = duration(validateStart);

  const routeStart = performance.now();
  for (const doc of ctx.docs) {
    const route = routeFor(ctx, doc);
    const existing = ctx.routes.get(route);
    if (existing) ctx.diagnostics.push(`${doc.source}:1:1: route collision at ${route}; already produced by ${existing.source}`);
    else ctx.routes.set(route, doc);
  }
  if (ctx.diagnostics.length) throw new Error(ctx.diagnostics.join('\n'));
  const activeLocales = ctx.config.activeLocales || [ctx.config.defaultLocale || 'en'];
  const defaultLocale = fallbackLocaleFor(ctx);
  const fallbackDocuments: Document[] = [];
  const groups = new Map<string, Document[]>();
  for (const doc of ctx.docs) {
    const key = `${doc.collection}:${doc.id}`;
    groups.set(key, [...(groups.get(key) || []), doc]);
  }
  if (ctx.config.i18n?.contentFallback !== false) {
    for (const documents of groups.values()) {
      const source = documents.find(candidate => candidate.locale === defaultLocale) || documents[0];
      for (const locale of activeLocales) {
        if (documents.some(candidate => candidate.locale === locale)) continue;
        if (!source.nodes.length && source.markdown) {
          parseDocumentNodes(ctx, source);
        }
        const fallback = { ...source, locale, data: { ...source.data, fallbackFrom: source.locale }, source: `fallback:${locale}:${source.collection}:${source.id}` };
        const route = routeFor(ctx, fallback);
        if (ctx.routes.has(route)) continue;
        ctx.routes.set(route, fallback);
        fallbackDocuments.push(fallback);
      }
    }
  }
  rebuildDocumentIndexes(ctx);
  ctx.profile.route = duration(routeStart);

  const renderStart = performance.now();
  const renderDocuments = [...ctx.docs.filter(doc => affected.has(doc.source)), ...fallbackDocuments];
  let parseWork = 0;
  await parallelFor(renderDocuments, RENDER_CONCURRENCY, async doc => {
    if (!doc.nodes.length && doc.markdown) {
      const started = performance.now();
      parseDocumentNodes(ctx, doc);
      parseWork += performance.now() - started;
    }
    for (const node of doc.directives) {
      if (node.name === 'slot') continue;
      const component = ctx.themeDefinition.components[node.name];
      if (!component?.render) throw new MarkdownError(`unknown Component "${node.name}"; use one of ${Object.keys(ctx.themeDefinition.components).join(', ')}`, node.position);
      validateComponentAttrs(node, component);
    }
    doc.dependencyKeys = dependenciesFor(ctx, doc);
    doc.componentNames = [...new Set(doc.directives.filter(directive => directive.name !== 'slot').map(directive => directive.name))].sort();
    const context = themeContextFor(ctx, doc);
    const component = ctx.themeDefinition.components[doc.component];
    if (!component?.renderDocument) throw new Error(`${doc.source}: Component "${doc.component}" cannot render a document`);
    const documentInput = documentComponentInput(ctx, doc, context);
    await writeIfChanged(ctx, `${routeFor(ctx, doc).replace(/^\//, '')}index.html`, pageShell(ctx, doc, component.renderDocument(documentInput, context)));
    if (ctx.config.outputs?.markdownMirrors === true) await writeIfChanged(ctx, `${routeFor(ctx, doc).replace(/^\//, '').replace(/\/$/, '')}.md`, `${doc.markdown.trim()}\n`);
    doc.nodes = [];
    doc.directives = [];
  });
  ctx.profile.parse = Math.round(parseWork * 100) / 100;
  ctx.profile.render = duration(renderStart);
  const assetStart = performance.now();
  await writeGeneratedPages(ctx);
  const siteUrl = String(ctx.config.siteUrl || '').replace(/\/$/, '');
  await writeIfChanged(ctx, 'robots.txt', robotsText(ctx, siteUrl));
  const archiveRoutes = await writeArchives(ctx);
  const sitemapDocuments = [...ctx.routes.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([route, doc]) => {
    const translations = ctx.translationIndex.get(translationKey(doc.collection, doc.id)) || [];
    const lines = ['<url>', `  <loc>${xml(`${siteUrl}${route}`)}</loc>`];
    // Only dated post documents have an author-controlled last-modified date.
    // Stable pages and generated archive routes continue to use their
    // publication/source date and never inherit an article's `updated` field.
    const lastModified = isPostCollection(ctx, doc.collection) ? doc.updated || doc.date : doc.date;
    if (lastModified && publicationTimestamp(lastModified) !== undefined) lines.push(`  <lastmod>${xml(lastModified.slice(0, 10))}</lastmod>`);
    const defaultTranslation = translations.find(translation => translation.locale === (ctx.config.defaultLocale || 'en'));
    if (defaultTranslation) lines.push(`  <xhtml:link rel="alternate" hreflang="x-default" href="${xml(`${siteUrl}${routeFor(ctx, defaultTranslation)}`)}"/>`);
    lines.push(...translations.map(translation => `  <xhtml:link rel="alternate" hreflang="${xml(translation.locale)}" href="${xml(`${siteUrl}${routeFor(ctx, translation)}`)}"/>`), '</url>');
    return lines.join('\n');
  });
  sitemapDocuments.unshift(['<url>', `  <loc>${xml(`${siteUrl}/`)}</loc>`, '</url>'].join('\n'));
  sitemapDocuments.push(...archiveRoutes.map(route => ['<url>', `  <loc>${xml(`${siteUrl}${route}`)}</loc>`, '</url>'].join('\n')));
  const sitemap = [`<?xml version="1.0" encoding="UTF-8"?>`, `<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="https://www.w3.org/1999/xhtml">`, ...sitemapDocuments.flatMap(entry => entry.split('\n').map(line => `  ${line}`)), `</urlset>`, ''].join('\n');
  await writeIfChanged(ctx, 'sitemap.xml', sitemap);
  for (const locale of ctx.config.activeLocales || [ctx.config.defaultLocale || 'en']) {
    await writeSearch(ctx, locale);
    for (const feedCollectionName of feedCollections(ctx)) {
      if (!documentsForCollection(ctx, feedCollectionName, locale).length) continue;
      const feedRoute = feedRouteFor(ctx, locale, feedCollectionName);
      await writeIfChanged(ctx, `${feedRoute.replace(/^\//, '')}`, feedXml(ctx, locale, feedCollectionName));
    }
  }
  await writeLlms(ctx, siteUrl);
  await writeApiCatalog(ctx, siteUrl);
  await writeAuthDiscovery(ctx, siteUrl);
  await writeMcpServerCard(ctx, siteUrl);
  await writeAgentSkills(ctx);
  await writeArdManifest(ctx, siteUrl);
  await writeAgentInfo(ctx, siteUrl);
  await writeIfChanged(ctx, '.pageskill/catalog.json', JSON.stringify(catalog(ctx), null, 2)); await copyThemeAndAssets(ctx); ctx.profile.assets = duration(assetStart);
  const previousOutputs = new Set(ctx.cache.outputs || []); const writeStart = performance.now();
  for (const old of previousOutputs) {
    const { normalized, target } = outputTarget(ctx, old);
    if (ctx.outputs.has(normalized)) continue;
    try { await fs.rm(target); } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
  }
  ctx.profile.write = duration(writeStart);
  const manifest: CacheManifest = { version: 4, rendererVersion: RENDERER_VERSION, configHash: ctx.configHash, themeHash: ctx.themeHash, assetHash: ctx.assetHash, contentRoots: ctx.contentRoots, routeCount: ctx.routes.size, documents: Object.fromEntries(ctx.docs.map(doc => {
    const dependencies = doc.dependencyKeys.length ? doc.dependencyKeys : ctx.cache.documents[doc.source]?.dependencies || [];
    const components = doc.componentNames.length ? doc.componentNames : ctx.cache.documents[doc.source]?.components || [];
    return [doc.source, { hash: doc.hash, outputs: documentOutputs(ctx, doc), dependencies, components, mtimeMs: doc.stat.mtimeMs, size: doc.stat.size, collection: doc.collection, id: doc.id, contentKey: doc.contentKey, locale: doc.locale, title: doc.title, description: doc.description, component: doc.component, date: doc.date, updated: doc.updated, author: doc.author, cover: doc.cover, data: doc.data, markdown: doc.markdown, excerpt: doc.excerpt, bodyLine: doc.bodyLine || 1, metrics: doc.metrics }];
  })), images: ctx.imageCache, outputs: [...ctx.outputs].sort(), outputHashes: Object.fromEntries([...ctx.outputs].map(output => [output, ctx.outputHashes[output] || ctx.cache.outputHashes?.[output] || '']).filter(([, hash]) => Boolean(hash))) };
  const cacheDirectory = path.join(ctx.root, '.pageskill');
  await fs.mkdir(cacheDirectory, { recursive: true });
  const manifestTarget = path.join(cacheDirectory, 'manifest.json');
  const manifestTemporary = `${manifestTarget}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(manifestTemporary, JSON.stringify(manifest, null, 2));
  await fs.rename(manifestTemporary, manifestTarget);
  const dependencyGraph = {
    version: 1,
    rendererVersion: RENDERER_VERSION,
    files: Object.fromEntries(ctx.docs.map(doc => [normalizePath(path.relative(ctx.root, doc.source)), {
      content: `${doc.collection}:${doc.id}:${doc.locale}`,
      dependencies: manifest.documents[doc.source]?.dependencies || [],
      outputs: manifest.documents[doc.source]?.outputs || []
    }])),
    routes: Object.fromEntries([...ctx.routes.entries()].map(([route, doc]) => [route, `${doc.collection}:${doc.id}:${doc.locale}`])),
    images: ctx.imageCache,
    outputs: manifest.outputs
  };
  const graphTarget = path.join(cacheDirectory, 'dependency-graph.json');
  const graphTemporary = `${graphTarget}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(graphTemporary, JSON.stringify(dependencyGraph, null, 2));
  await fs.rename(graphTemporary, graphTarget);
  ctx.profile.total = duration(totalStart);
  await writePrivateIfChanged(ctx, 'build-profile.json', JSON.stringify(ctx.profile, null, 2));
  ctx.cache = manifest;
  if (ctx.stagedOutput) {
    const staged = ctx.stagedOutput;
    await fs.mkdir(path.dirname(staged.final), { recursive: true });
    await fs.rename(staged.temporary, staged.final);
    ctx.out = staged.final;
    ctx.stagedOutput = undefined;
  }
  return ctx;
}

export async function check(ctx: BuildContext) {
  for (const doc of ctx.docs) if (!doc.nodes.length && doc.markdown) { doc.nodes = parseMarkdown(doc.markdown, doc.source, doc.bodyLine || 1); doc.directives = flattenDirectives(doc.nodes); }
  ctx.diagnostics.length = 0;
  for (const doc of ctx.docs) ctx.diagnostics.push(...documentSchemaDiagnostics(ctx.config, doc));
  ctx.diagnostics.push(...integrationPrivacyPolicyDiagnostics(ctx.config, ctx.themeDefinition, ctx.docs));
  const errors = [...ctx.diagnostics];
  for (const doc of ctx.docs) {
    const layout = ctx.themeDefinition.components[doc.component];
    if (!layout?.renderDocument) errors.push(`${doc.source}:1:1: Component "${doc.component}" cannot render a document`);
    for (const node of doc.directives) {
      if (node.name === 'slot') continue;
      const component = ctx.themeDefinition.components[node.name];
      if (!component?.render) errors.push(diagnostic(node.position, `unknown Component "${node.name}"; add it to the active theme or choose a supported Component`));
      else try { validateComponentAttrs(node, component); } catch (error) { errors.push(String((error as Error).message || error)); }
    }
  }
  if (errors.length) throw new Error(errors.join('\n')); return { ok: true, documents: ctx.docs.length, routes: ctx.routes.size || ctx.cache.routeCount || ctx.docs.length, outputs: ctx.outputs.size };
}

class InspectError extends Error {
  code: string;
  details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'InspectError';
    this.code = code;
    this.details = details;
  }
}

function inspectDocument(ctx: BuildContext, doc: Document) {
  parseDocumentNodes(ctx, doc);
  return {
    id: doc.id,
    collection: doc.collection,
    locale: doc.locale,
    component: doc.component,
    route: routeFor(ctx, doc),
    source: doc.source,
    title: doc.title,
    date: doc.date,
    updated: doc.updated,
    metrics: doc.metrics,
    directives: doc.directives.map(node => ({ name: node.name, attrs: node.attrs, position: node.position }))
  };
}

function inspectNotFound(query: string, kind: string, available: string[]): never {
  throw new InspectError('INSPECT_NOT_FOUND', `No ${kind} matches "${query}".`, { query, kind, available });
}

function inspectContent(ctx: BuildContext, query: string, collection?: string, id?: string, category?: string) {
  const matches = ctx.docs.filter(doc => {
    if (collection && doc.collection !== collection) return false;
    if (category && postCategory(doc) !== category) return false;
    if (id !== undefined) return doc.id === id;
    return !query || doc.id === query || doc.source.includes(query);
  });
  if (query && !matches.length) inspectNotFound(query, collection ? `content in collection "${collection}"` : 'content', [...new Set(ctx.docs.map(doc => doc.id))].sort());
  return { kind: 'content', query, items: matches.map(doc => inspectDocument(ctx, doc)) };
}

export async function inspect(ctx: BuildContext, query = '') {
  const rawQuery = String(query || '').trim();
  const separator = rawQuery.indexOf(':');
  if (separator < 0) return inspectContent(ctx, rawQuery);

  const namespace = rawQuery.slice(0, separator).trim().toLowerCase();
  const id = rawQuery.slice(separator + 1).trim();
  const availableNamespaces = ['component', 'collection', 'page', 'post', 'release', 'updates'];
  if (!availableNamespaces.includes(namespace)) {
    throw new InspectError('INSPECT_INVALID_QUERY', `Unsupported inspect namespace "${namespace}".`, { query: rawQuery, allowedNamespaces: availableNamespaces });
  }
  if (!id) throw new InspectError('INSPECT_INVALID_QUERY', `Inspect namespace "${namespace}" requires an id.`, { query: rawQuery, allowedNamespaces: availableNamespaces });

  if (namespace === 'page' || namespace === 'post' || namespace === 'release' || namespace === 'updates') {
    const collection = namespace === 'page' ? 'pages' : namespace === 'post' ? 'posts' : 'updates';
    return inspectContent(ctx, rawQuery, collection, id);
  }

  if (namespace === 'collection') {
    const settings = ctx.config.content?.collections?.[id];
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) inspectNotFound(rawQuery, 'collection', Object.keys(ctx.config.content?.collections || {}).sort());
    return {
      kind: 'collection',
      query: rawQuery,
      item: {
        name: id,
        ...settings,
        contentType: String(settings.contentType || 'page'),
        route: String(settings.route || '/:locale/:id/'),
        component: String(settings.component || defaultComponent(ctx.config, id)),
        schema: settings.schema && typeof settings.schema === 'object' ? settings.schema : {},
        feed: settings.feed && typeof settings.feed === 'object' ? settings.feed : undefined,
        archive: settings.archive && typeof settings.archive === 'object' ? settings.archive : undefined
      }
    };
  }

  const themeComponent = themeComponentFor(ctx, id);
  const settings = themeComponentSettings(ctx, id);
  if (themeComponent === undefined) inspectNotFound(rawQuery, 'component', Object.keys(ctx.themeDefinition.components || {}).sort());
  return {
    kind: 'component',
    query: rawQuery,
    item: {
      name: id,
      enabled: themeComponent ? settings.enabled !== false : false,
      theme: themeComponent ? { ...themeComponent, settings } : null,
      config: settings
    }
  };
}

export function getCatalog(ctx: BuildContext) { return catalog(ctx); }
