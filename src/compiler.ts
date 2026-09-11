import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseYaml, YamlError } from './lib/yaml.ts';
import { escapeHtml, safeUrl, html, unsafeHtml } from './lib/safe-html.ts';
import { flattenDirectives, MarkdownError, parseMarkdown, renderInline } from './lib/markdown.ts';
import { planThemeStyles } from './lib/theme-styles.ts';
import { isPublicPath } from './lib/static-security.ts';
import type { MarkdownNode, SourcePosition, DirectiveNode } from './lib/markdown.ts';
import type { PageskillTheme, ThemeBlockDefinition, ThemeChromeConfig, ThemeChromeLink, ThemeI18nSource, ThemeOptionSchema, ThemePluginDefinition, ThemeRenderContext, ThemeResources, ThemeShellContext } from './theme-api.ts';

export type Locale = string;
export type Document = {
  id: string; collection: string; locale: Locale; source: string; title: string; description: string;
  pattern: string; date?: string; author?: string; cover?: string; data: Record<string, any>; markdown: string; excerpt: string; nodes: MarkdownNode[];
  directives: DirectiveNode[]; hash: string; bodyLine: number; stat: { mtimeMs: number; size: number };
  dependencyKeys: string[]; blockNames: string[];
};
export type BuildContext = {
  root: string; out: string; config: Record<string, any>; theme: Record<string, any>; themeConfig: Record<string, any>; themeI18n: Record<string, any>; themeDefinition: PageskillTheme; docs: Document[];
  byKey: Map<string, Document>; routes: Map<string, Document>; cache: CacheManifest; profile: BuildProfile;
  outputs: Set<string>; diagnostics: string[]; configHash: string; themeHash: string;
  imageCache: Record<string, CachedImage>; collectionIndex: Map<string, Document[]>;
  translationIndex: Map<string, Document[]>; documentPositions: Map<string, number>; tagIndex: Map<string, Document[]>;
  assetHash: string; backendHash: string; outputHashes: Record<string, string>;
  contentRoots: Record<string, number>;
  stagedOutput?: { final: string; temporary: string };
  markdownCache: Map<string, MarkdownNode[]>;
  sourceParseCache: Map<string, { data: Record<string, any>; body: string; excerpt: string; bodyLine: number }>;
  themeStyleSources: Map<string, string>; themeAssetHashes: Record<string, string>;
};
type CachedDocument = { hash: string; outputs: string[]; dependencies?: string[]; blocks?: string[]; mtimeMs: number; size: number; collection: string; id: string; locale: string; title: string; description: string; pattern: string; date?: string; author?: string; cover?: string; data: Record<string, any>; markdown: string; excerpt?: string; bodyLine: number };
type CachedImage = { hash: string; output: string };
type CacheManifest = { version: 2; rendererVersion?: string; configHash?: string; themeHash?: string; assetHash?: string; backendHash?: string; contentRoots?: Record<string, number>; routeCount?: number; documents: Record<string, CachedDocument>; images?: Record<string, CachedImage>; outputs: string[]; outputHashes?: Record<string, string> };
export type BuildProfile = { discover: number; load: number; validate: number; parse: number; route: number; render: number; assets: number; write: number; total: number; documents: number; changedOutputs: number; imagesProcessed: number; imageCacheHits: number };
// Increment this whenever compiler output semantics change so an existing
// incremental cache cannot preserve a discovery file rendered by old code.
const RENDERER_VERSION = '2.4.30';
const MAX_MARKDOWN_CACHE = 32;
const MAX_SOURCE_PARSE_CACHE = 64;
const LOAD_CONCURRENCY = 32;
const RENDER_CONCURRENCY = 32;

export const SafeHtml = html;
export { unsafeHtml, escapeHtml, safeUrl, parseYaml, parseMarkdown, renderInline, MarkdownError, YamlError };

function duration(start: number) { return Math.round((performance.now() - start) * 100) / 100; }
function sha(value: string | Uint8Array) { return crypto.createHash('sha256').update(value).digest('hex'); }
function shortHash(value: string | Uint8Array) { return sha(value).slice(0, 20); }
function normalizePath(value: string) { return value.replaceAll('\\', '/'); }

type RelativePathOptions = { allowEmpty?: boolean; rejectDoubleDot?: boolean };

/**
 * Validate an untrusted path before normalising it.  Build outputs and theme
 * resources are addressed with POSIX separators in manifests, but a Windows
 * backslash must be treated as a separator while validating too.
 */
function safeRelativePath(value: unknown, label: string, options: RelativePathOptions = {}): string {
  if (typeof value !== 'string') throw new Error(`${label} must be a relative path`);
  const raw = value;
  if (!raw) {
    if (options.allowEmpty) return '';
    throw new Error(`${label} must be a non-empty relative path`);
  }
  if (/[\u0000-\u001f\u007f-\u009f]/.test(raw)) throw new Error(`${label} contains control characters`);
  const normalized = normalizePath(raw);
  if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) throw new Error(`${label} must be a relative path`);
  if (options.rejectDoubleDot && raw.includes('..')) throw new Error(`${label} must not contain ".."`);
  if (normalized.split('/').some(part => part === '..')) throw new Error(`${label} must not escape its root`);
  // A colon in an output component can address an NTFS alternate data stream.
  if (normalized.split('/').some(part => part.includes(':'))) throw new Error(`${label} contains an unsafe path component`);
  // Windows trims these characters from names, so accepting them would make
  // the manifest key and the actual file differ.
  if (normalized.split('/').some(part => part !== '.' && /[. ]$/.test(part))) throw new Error(`${label} contains an unsafe path component`);
  const canonical = normalized.split('/').filter(part => part && part !== '.').join('/');
  if (!canonical && !options.allowEmpty) throw new Error(`${label} must be a non-empty relative path`);
  return canonical;
}

function pathIsWithin(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function containedPath(root: string, value: unknown, label: string): string {
  const relative = safeRelativePath(value, label);
  const target = path.resolve(root, relative);
  if (!pathIsWithin(root, target) || target === path.resolve(root)) throw new Error(`${label} escapes its root`);
  return target;
}

function outputTarget(ctx: BuildContext, relative: unknown): { normalized: string; target: string } {
  const raw = typeof relative === 'string' ? relative : String(relative ?? '');
  const target = containedPath(ctx.out, raw, 'build output path');
  return { normalized: normalizePath(path.relative(path.resolve(ctx.out), target)), target };
}

const LOCALE_TAG = /^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/;

function validLocaleTag(value: unknown): value is string {
  return typeof value === 'string' && LOCALE_TAG.test(value);
}

function configuredThemeName(config: Record<string, any>): string {
  const value = config.theme?.name;
  if (value === undefined || value === null || value === '') return 'default';
  if (typeof value !== 'string' || !value || value === '.' || value === '..' || /[\\/\u0000-\u001f\u007f-\u009f:]/.test(value) || /[. ]$/.test(value)) {
    throw new Error('config.yml: theme.name must name one safe theme directory');
  }
  return value;
}

function configuredNavigation(config: Record<string, any>): Record<string, any> {
  if (isRecord(config.navigation)) return config.navigation;
  return isRecord(config.theme?.nav) ? config.theme.nav : {};
}

function configuredStaticDirectory(config: Record<string, any>): string {
  const deployment = config.deployment && typeof config.deployment === 'object' && !Array.isArray(config.deployment) ? config.deployment : {};
  const sites = deployment.openaiSites && typeof deployment.openaiSites === 'object' && !Array.isArray(deployment.openaiSites) ? deployment.openaiSites : {};
  // `deployment.staticDirectory` is the mixed deployment setting. Keep the
  // OpenAI Sites value as a compatibility fallback for existing projects.
  const value = Object.prototype.hasOwnProperty.call(deployment, 'staticDirectory')
    ? deployment.staticDirectory
    : sites.staticDirectory;
  if (value === undefined || value === null || value === '') return '';
  const label = Object.prototype.hasOwnProperty.call(deployment, 'staticDirectory')
    ? 'config.yml: deployment.staticDirectory'
    : 'config.yml: deployment.openaiSites.staticDirectory';
  const normalized = safeRelativePath(value, label, { rejectDoubleDot: true });
  if (!normalized) throw new Error(`${label} must be a non-empty relative path`);
  return normalized;
}

function hasOpenAiSitesDeployment(config: Record<string, any>): boolean {
  const deployment = config.deployment && typeof config.deployment === 'object' && !Array.isArray(config.deployment) ? config.deployment : {};
  return Boolean(deployment.openaiSites && typeof deployment.openaiSites === 'object' && !Array.isArray(deployment.openaiSites));
}

function configuredPublicDirectory(config: Record<string, any>): string {
  if (config.deployment?.enabled === false) return '';
  const configured = configuredStaticDirectory(config);
  // A deployment must never expose the private build root as its public asset
  // directory. The old OpenAI Sites `dist` setting needs migration.
  if (configured.toLocaleLowerCase() === 'dist') {
    throw new Error('config.yml: deployment.staticDirectory cannot use the private dist bundle root; choose "public" or another public subdirectory');
  }
  const directory = configured || 'public';
  const first = directory.split('/')[0].toLocaleLowerCase();
  if (new Set(['server', '_pagekiln', '.pagekiln', 'assets']).has(first)) {
    throw new Error(`config.yml: deployment.staticDirectory cannot use reserved public directory "${directory}"`);
  }
  return directory;
}

function legacyDynamicRoutes(config: Record<string, any>): string[] {
  const raw = config.deployment?.dynamicRoutes;
  const values = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw];
  const routes: string[] = [];
  for (const value of values) {
    const route = String(value || '').trim();
    if (!route || !route.startsWith('/') || /[\u0000-\u001f\u007f-\u009f]/.test(route)) continue;
    if (!routes.includes(route)) routes.push(route);
  }
  return routes;
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
  const values = [locale, locale.replaceAll('_', '-').split('-')[0], fallbackLocale, fallbackLocale.replaceAll('_', '-').split('-')[0]];
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

/**
 * Read a locale-keyed copy override from a plugin instance in theme.yml.
 * Fallback values are merged first, so a new locale can override only the
 * labels it has translated while the remaining labels stay usable.
 */
function themePluginCopy(ctx: BuildContext, pluginName: string, locale: string): Record<string, any> {
  const configured = themePluginSettings(ctx, pluginName).copy;
  if (!isRecord(configured)) return {};
  let merged: Record<string, any> = {};
  for (const candidate of [...localeCandidates(locale, fallbackLocaleFor(ctx))].reverse()) {
    if (isRecord(configured[candidate])) merged = mergeLocaleValue(merged, configured[candidate]);
  }
  return merged;
}

/** Return one safe string override; renderers still escape the final value. */
function themePluginText(ctx: BuildContext, pluginName: string, locale: string, key: string): string | undefined {
  const value = nestedValue(themePluginCopy(ctx, pluginName, locale), key);
  return value === undefined || value === null || value === '' || typeof value === 'object' ? undefined : String(value);
}

const DEFAULT_LANGUAGE_NAMES: Record<string, string> = {
  'zh-sg': '简体中文',
  'zh-tw': '繁體中文',
  'zh-cn': '简体中文',
  'zh-hans': '简体中文',
  'zh-hant': '繁體中文',
  en: 'English'
};

function languageDisplayName(ctx: BuildContext, _locale: string, candidate: string): string {
  const localeData = ctx.themeI18n?.locales && typeof ctx.themeI18n.locales === 'object' ? ctx.themeI18n.locales[candidate] : undefined;
  const ownLabel = localeData && typeof localeData === 'object' ? (localeData.label || localeData.name) : localeData;
  const normalized = candidate.toLowerCase().replaceAll('_', '-');
  return ownLabel ? String(ownLabel) : DEFAULT_LANGUAGE_NAMES[candidate] || DEFAULT_LANGUAGE_NAMES[normalized] || candidate;
}

function collectionKey(collection: string, locale: string) { return `${collection}:${locale}`; }
function translationKey(collection: string, id: string) { return `${collection}:${id}`; }
function documentKey(doc: Pick<Document, 'collection' | 'id' | 'locale'>) { return `${doc.collection}:${doc.id}:${doc.locale}`; }

function formatDate(value: string | undefined, locale: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return escapeHtml(value);
  try { return escapeHtml(new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date)); }
  catch { return escapeHtml(date.toISOString().slice(0, 10)); }
}

/**
 * Return a timestamp only for an ISO-shaped, calendar-valid publication date.
 * A bad date must never sort ahead of a real article or silently become a
 * different day through JavaScript's date normalisation.
 */
function publicationTimestamp(value: unknown): number | undefined {
  const raw = typeof value === 'string' ? value.trim() : '';
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(raw);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed.valueOf();
}

/** Sort valid publications newest-first and make same-day order deterministic. */
function comparePublicationOrder(left: Pick<Document, 'id' | 'date'>, right: Pick<Document, 'id' | 'date'>): number {
  const leftTime = publicationTimestamp(left.date);
  const rightTime = publicationTimestamp(right.date);
  if (leftTime === undefined && rightTime !== undefined) return 1;
  if (leftTime !== undefined && rightTime === undefined) return -1;
  if (leftTime !== undefined && rightTime !== undefined && leftTime !== rightTime) return rightTime - leftTime;
  return left.id.localeCompare(right.id);
}

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

function normalizeThemeResources(value: unknown): ThemeResources {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    styles: themeResourceList(record.styles),
    scripts: themeResourceList(record.scripts)
  };
}

function legacyThemeResources(theme: Record<string, any>): ThemeResources {
  const styles = Array.isArray(theme.styles) ? theme.styles : theme.style ? [theme.style] : [];
  return { styles: themeResourceList(styles), scripts: themeResourceList(theme.scripts) };
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeThemePlugin(value: unknown, legacy: unknown): ThemePluginDefinition & Record<string, any> {
  const source = isRecord(value) ? value : {};
  const old = isRecord(legacy) ? legacy : {};
  const sourceResources = source.resources === undefined ? undefined : normalizeThemeResources(source.resources);
  const legacyResources = old.resources === undefined ? undefined : normalizeThemeResources(old.resources);
  const resources = sourceResources || {
    styles: legacyResources?.styles || [],
    scripts: legacyResources?.scripts || (old.script ? themeResourceList([old.script]) : [])
  };
  const defaults = {
    ...(isRecord(old.defaults) ? old.defaults : {}),
    ...(isRecord(source.defaults) ? source.defaults : {})
  };
  const legacyDefinition = {
    ...(typeof old.implementation === 'string' ? { implementation: old.implementation } : {}),
    ...(old.resources !== undefined ? { resources: legacyResources } : {}),
    ...(old.i18n !== undefined ? { i18n: old.i18n } : {}),
    ...(old.schema !== undefined ? { schema: old.schema } : {}),
    ...(old.enabled !== undefined ? { enabled: old.enabled } : {}),
    ...(Object.keys(defaults).length ? { defaults } : {})
  };
  return {
    ...legacyDefinition,
    ...source,
    resources,
    ...(Object.keys(defaults).length ? { defaults } : {})
  };
}

function normalizeThemeDefinition(value: PageskillTheme, legacy: Record<string, any>): PageskillTheme {
  const legacyResources = legacyThemeResources(legacy);
  const moduleResources = value.resources === undefined ? undefined : normalizeThemeResources(value.resources);
  const resources = moduleResources || legacyResources;
  const legacyPlugins = isRecord(legacy.plugins) ? legacy.plugins : {};
  const modulePlugins = isRecord(value.plugins) ? value.plugins : {};
  const plugins = Object.fromEntries([...new Set([...Object.keys(legacyPlugins), ...Object.keys(modulePlugins)])]
    .map(name => [name, normalizeThemePlugin(modulePlugins[name], legacyPlugins[name])]));
  const i18n = value.i18n !== undefined ? value.i18n : legacy.i18n;
  return {
    ...value,
    name: value.name || legacy.name,
    resources,
    plugins,
    ...(i18n !== undefined ? { i18n } : {}),
    ...(value.defaults ? { defaults: value.defaults } : {})
  };
}

function legacyThemePluginSettings(config: Record<string, any>, name: string): Record<string, any> {
  if (name === 'language') return {};
  const values: Record<string, any> = {};
  const legacyPlugins = isRecord(config.plugins) ? config.plugins : {};
  if (isRecord(legacyPlugins[name])) {
    const legacySettings = { ...legacyPlugins[name] };
    // Provider instances and trusted script sources belong to theme.yml. Keep
    // the old config path readable for non-executable legacy options, but do
    // not let site config smuggle integration code into the privacy plugin.
    if (name === 'privacyConsent') {
      delete legacySettings.integrations;
      delete legacySettings.gatedScripts;
    }
    Object.assign(values, legacySettings);
  }
  if (name === 'search' && isRecord(config.search)) Object.assign(values, config.search);
  if (name === 'privacyConsent' && isRecord(config.privacy?.cookieConsent)) {
    const { policyRoute: _policyRoute, agentRoute: _agentRoute, integrations: _integrations, gatedScripts: _gatedScripts, ...settings } = config.privacy.cookieConsent;
    Object.assign(values, settings);
  }
  return values;
}

// These aliases only migrate the pre-3.0.2 object-shaped setting. New theme
// files use the provider names and identifiers from each provider's own web
// integration contract, so an account-specific value is never confused with
// a Pageskill-generated ID.
const PRIVACY_PROVIDER_ALIASES: Record<string, string> = {
  googleAnalytics: 'google-analytics',
  'google-analytics': 'google-analytics',
  googleAds: 'google-ads',
  'google-ads': 'google-ads',
  cloudflareWebAnalytics: 'cloudflare-web-analytics',
  'cloudflare-web-analytics': 'cloudflare-web-analytics',
  baiduTongji: 'baidu-tongji',
  'baidu-tongji': 'baidu-tongji',
  x: 'x-for-websites',
  'x-for-websites': 'x-for-websites',
  recaptcha: 'recaptcha',
  hcaptcha: 'hcaptcha',
  turnstile: 'turnstile'
};

// Consent purposes describe the real reason a provider can make a request.
// They are code-owned vocabulary, not account IDs invented in theme.yml.
const PRIVACY_PURPOSE_ALIASES: Record<string, string> = {
  essential: 'essential',
  measurement: 'measurement',
  analytics: 'measurement',
  advertising: 'advertising',
  security: 'fraud-prevention',
  'fraud-prevention': 'fraud-prevention',
  'fraud_prevention': 'fraud-prevention',
  social: 'social-embedding',
  'social-embedding': 'social-embedding',
  'social_embed': 'social-embedding'
};

function canonicalPrivacyPurpose(value: unknown): string {
  const source = String(value || '').trim().toLowerCase();
  if (!source) return '';
  const alias = PRIVACY_PURPOSE_ALIASES[source];
  if (alias) return alias;
  // Custom purposes are allowed for third-party modules, but only a matching
  // category and a registered provider can make one active.
  return source.replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
}

// Each built-in adapter maps to a documented web-service purpose.  A theme
// may choose a more specific registered purpose, but it cannot make an
// unregistered provider execute merely by adding an arbitrary field.
const PRIVACY_PROVIDER_DEFINITIONS: Record<string, { field?: string; defaultPurpose: string }> = {
  'google-analytics': { field: 'measurementId', defaultPurpose: 'measurement' },
  'google-ads': { field: 'tagId', defaultPurpose: 'advertising' },
  'cloudflare-web-analytics': { field: 'token', defaultPurpose: 'measurement' },
  'baidu-tongji': { field: 'siteSignature', defaultPurpose: 'measurement' },
  recaptcha: { field: 'siteKey', defaultPurpose: 'fraud-prevention' },
  hcaptcha: { field: 'siteKey', defaultPurpose: 'fraud-prevention' },
  turnstile: { field: 'siteKey', defaultPurpose: 'fraud-prevention' },
  'x-for-websites': { defaultPurpose: 'social-embedding' }
};

function canonicalPrivacyProvider(value: unknown): string {
  const source = String(value || '').trim();
  if (!source) return '';
  const alias = PRIVACY_PROVIDER_ALIASES[source] || PRIVACY_PROVIDER_ALIASES[source.toLowerCase()];
  if (alias) return alias;
  // Unknown providers remain inert data until a theme module registers them.
  return source.toLowerCase().replace(/[^a-z0-9.-]+/g, '-').replace(/^-|-$/g, '');
}

function normalizePrivacyIntegrations(value: unknown): Array<Record<string, any>> {
  const normalize = (raw: unknown, fallbackProvider = ''): Record<string, any> | null => {
    if (!isRecord(raw)) return null;
    const candidate = raw.provider === 'captcha' ? raw.platform : raw.provider || raw.platform || fallbackProvider;
    const provider = canonicalPrivacyProvider(candidate);
    if (!provider) return null;
    const normalized: Record<string, any> = { ...raw, provider };
    const purpose = canonicalPrivacyPurpose(raw.purpose ?? raw.category);
    if (purpose) normalized.purpose = purpose;
    delete normalized.category;
    // Preserve the old object-shaped configuration during migration while
    // translating names that had been too generic for the real web contract.
    if (provider === 'google-ads') {
      if (normalized.tagId === undefined && normalized.conversionId !== undefined) normalized.tagId = normalized.conversionId;
      delete normalized.conversionId;
    }
    if (provider === 'baidu-tongji') {
      if (normalized.siteSignature === undefined && normalized.siteId !== undefined) normalized.siteSignature = normalized.siteId;
      delete normalized.siteId;
    }
    if (provider === 'recaptcha' || provider === 'hcaptcha' || provider === 'turnstile') delete normalized.platform;
    return normalized;
  };
  if (Array.isArray(value)) return value.map(entry => normalize(entry)).filter(Boolean) as Array<Record<string, any>>;
  if (!isRecord(value)) return [];
  const entries: Array<Record<string, any>> = [];
  for (const [legacyProvider, raw] of Object.entries(value)) {
    if (legacyProvider === 'captcha' && Array.isArray(raw)) {
      raw.forEach(entry => {
        const normalized = normalize(entry, isRecord(entry) ? entry.platform : '');
        if (normalized) entries.push(normalized);
      });
      continue;
    }
    const normalized = normalize(raw, legacyProvider);
    if (normalized) entries.push(normalized);
  }
  return entries;
}

function normalizePrivacyPluginSettings(settings: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = { ...settings };
  if (settings.categories !== undefined && Array.isArray(settings.categories)) {
    normalized.categories = settings.categories.map((raw: unknown) => {
      if (!isRecord(raw)) return raw;
      const purpose = canonicalPrivacyPurpose(raw.purpose ?? raw.id);
      const category = { ...raw };
      if (purpose) category.purpose = purpose;
      delete category.id;
      return category;
    });
  }
  if (settings.gatedScripts !== undefined && Array.isArray(settings.gatedScripts)) {
    normalized.gatedScripts = settings.gatedScripts.map((raw: unknown) => {
      if (!isRecord(raw)) return raw;
      const purpose = canonicalPrivacyPurpose(raw.purpose ?? raw.category);
      const script = { ...raw };
      if (purpose) script.purpose = purpose;
      delete script.category;
      return script;
    });
  }
  if (settings.integrations !== undefined) normalized.integrations = normalizePrivacyIntegrations(settings.integrations);
  return normalized;
}

function themeOptionValueMatches(value: unknown, type: ThemeOptionSchema['type']): boolean {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return isRecord(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === type;
}

function validateThemeOption(value: unknown, schema: ThemeOptionSchema, label: string): void {
  if (!themeOptionValueMatches(value, schema.type)) throw new Error(`${label} must be ${schema.type}`);
  if (schema.enum && !schema.enum.some(candidate => JSON.stringify(candidate) === JSON.stringify(value))) {
    throw new Error(`${label} must be one of ${schema.enum.map(candidate => String(candidate)).join(', ')}`);
  }
  if (schema.type === 'number') {
    if (schema.min !== undefined && (value as number) < schema.min) throw new Error(`${label} must be at least ${schema.min}`);
    if (schema.max !== undefined && (value as number) > schema.max) throw new Error(`${label} must be at most ${schema.max}`);
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

function validateThemePluginSettings(settings: Record<string, any>, schema: Record<string, ThemeOptionSchema>, label: string): void {
  for (const [key, value] of Object.entries(settings)) {
    const option = schema[key];
    if (!option) throw new Error(`${label}.${key} is not a supported option`);
    validateThemeOption(value, option, `${label}.${key}`);
  }
  for (const [key, option] of Object.entries(schema)) if (option.required && settings[key] === undefined) {
    throw new Error(`${label}.${key} is required`);
  }
}

function normalizeThemeConfig(config: Record<string, any>, theme: Record<string, any>, definition: PageskillTheme, themeName: string): Record<string, any> {
  const configuredPlugins = theme.plugins === undefined ? {} : theme.plugins;
  if (!isRecord(configuredPlugins)) throw new Error(`themes/${themeName}/theme.yml: plugins must be a mapping`);
  const definitions = definition.plugins || {};
  for (const name of Object.keys(configuredPlugins)) {
    if (name === 'language') continue;
    if (!definitions[name]) throw new Error(`themes/${themeName}/theme.yml: plugins.${name} is not declared by the theme entry`);
    if (!isRecord(configuredPlugins[name])) throw new Error(`themes/${themeName}/theme.yml: plugins.${name} must be a mapping`);
  }
  const plugins: Record<string, any> = {};
  for (const [name, plugin] of Object.entries(definitions)) {
    const schema = plugin.schema || {};
    const defaults = isRecord(plugin.defaults) ? cloneThemeValue(plugin.defaults) : {};
    const legacy = legacyThemePluginSettings(config, name);
    const configured = name === 'language' ? {} : isRecord(configuredPlugins[name]) ? configuredPlugins[name] : {};
    const mergedSettings = { ...defaults, ...legacy, ...configured };
    const settings = name === 'privacyConsent' ? normalizePrivacyPluginSettings(mergedSettings) : mergedSettings;
    validateThemePluginSettings(settings, schema, `themes/${themeName}/theme.yml: plugins.${name}`);
    plugins[name] = settings;
  }
  return { plugins };
}

function themeI18nSources(definition: PageskillTheme): Array<{ owner: string; source: ThemeI18nSource }> {
  const sources: Array<{ owner: string; source: ThemeI18nSource }> = [];
  if (definition.i18n !== undefined) {
    const values = Array.isArray(definition.i18n) ? definition.i18n : [definition.i18n];
    values.forEach((source, index) => sources.push({ owner: `theme.i18n[${index}]`, source }));
  }
  for (const [name, plugin] of Object.entries(definition.plugins || {})) {
    if (plugin.i18n === undefined) continue;
    const values = Array.isArray(plugin.i18n) ? plugin.i18n : [plugin.i18n];
    values.forEach((source, index) => sources.push({ owner: `theme.plugins.${name}.i18n[${index}]`, source }));
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

async function readThemeI18nSource(themeRoot: string, source: ThemeI18nSource, owner: string): Promise<Record<string, any>> {
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
  const checkResources = (resources: ThemeResources | undefined, label: string) => {
    for (const pathValue of [...(resources?.styles || []), ...(resources?.scripts || [])]) validateThemeResourcePath(themeRoot, pathValue, label);
  };
  checkResources(definition.resources, 'theme resource path');
  for (const [name, plugin] of Object.entries(definition.plugins || {})) {
    checkResources(plugin.resources, `theme plugin ${name} resource path`);
    const gatedScripts = plugin.defaults?.gatedScripts;
    if (Array.isArray(gatedScripts)) for (const entry of gatedScripts) {
      const source = typeof entry === 'string' ? entry : entry?.src || entry?.source;
      if (typeof source === 'string' && !source.startsWith('/') && !/^https?:\/\//i.test(source)) {
        validateThemeResourcePath(themeRoot, source, `theme plugin ${name} gated script path`);
      }
    }
  }
  for (const pattern of Object.values(definition.patterns)) checkResources(pattern.resources, `Pattern ${pattern.name} resource path`);
  for (const block of Object.values(definition.blocks)) checkResources(block.resources, `Block ${block.name} resource path`);
  for (const { owner, source } of themeI18nSources(definition)) {
    if (typeof source === 'string') validateThemeResourcePath(themeRoot, source, `${owner} path`);
    else if (isRecord(source) && typeof source.source === 'string') validateThemeResourcePath(themeRoot, source.source, `${owner} path`);
  }
}

/**
 * Resource access stays behind the normalized theme definition.  The YAML
 * shape is still accepted by normalizeThemeDefinition for existing sites, but
 * the renderer and asset copier no longer need to know about its parallel
 * style/script/pattern maps.
 */
function themeResources(ctx: BuildContext): ThemeResources {
  return ctx.themeDefinition.resources || {};
}

function themePlugin(ctx: BuildContext, name: string): (ThemePluginDefinition & Record<string, any>) | undefined {
  const plugin = ctx.themeDefinition.plugins?.[name];
  return plugin as (ThemePluginDefinition & Record<string, any>) | undefined;
}

function resourcePaths(resources: ThemeResources | undefined, kind: 'styles' | 'scripts'): string[] {
  return themeResourceList(resources?.[kind]);
}

function pluginResourcePaths(ctx: BuildContext, names: string[], kind: 'styles' | 'scripts'): string[] {
  for (const name of names) {
    const paths = resourcePaths(themePlugin(ctx, name)?.resources, kind);
    if (paths.length) return paths;
  }
  return [];
}

// Most plugins are data-driven capabilities: once their site instance is
// enabled, their declared resources are available to every rendered page.
// A few plugins own their markup and loading lifecycle (consent, search, the
// language picker, and the table-of-contents block), so their resources are
// emitted by those renderers instead of this generic path.
function genericPluginResourcePaths(ctx: BuildContext, kind: 'styles' | 'scripts'): string[] {
  const rendererOwned = new Set(['privacyConsent', 'cookies', 'search', 'language', 'languagePicker', 'toc']);
  const paths: string[] = [];
  for (const [name, plugin] of Object.entries(ctx.themeDefinition.plugins || {})) {
    if (rendererOwned.has(name) || !pluginEnabled(ctx, name)) continue;
    paths.push(...resourcePaths(plugin.resources, kind));
  }
  return [...new Set(paths)];
}

function patternResourcePaths(ctx: BuildContext, name: string, kind: 'styles' | 'scripts'): string[] {
  return resourcePaths(ctx.themeDefinition.patterns[name]?.resources, kind);
}

function blockResourcePaths(ctx: BuildContext, name: string, kind: 'styles' | 'scripts'): string[] {
  return resourcePaths(ctx.themeDefinition.blocks[name]?.resources, kind);
}

function themePluginSettings(ctx: BuildContext, name: string): Record<string, any> {
  const settings = ctx.themeConfig?.plugins?.[name];
  return isRecord(settings) ? settings : {};
}

const MAX_CHROME_LINKS = 8;
const MAX_CHROME_LABEL_LENGTH = 160;
const MAX_CHROME_HREF_LENGTH = 2048;

function emptyChromeSlot(): ThemeChromeConfig['navigation'] {
  return { enabled: false, before: [], after: [] };
}

function chromeLabel(item: Record<string, any>, locale: string): string {
  const labels = isRecord(item.labels) ? item.labels : {};
  const candidates = [...new Set([locale, locale.replace('_', '-'), locale.split(/[-_]/)[0], 'en'])];
  for (const candidate of candidates) {
    if (typeof labels[candidate] === 'string' && labels[candidate].trim()) return labels[candidate].trim().slice(0, MAX_CHROME_LABEL_LENGTH);
  }
  return typeof item.label === 'string' ? item.label.trim().slice(0, MAX_CHROME_LABEL_LENGTH) : '';
}

function chromeHref(ctx: BuildContext, value: unknown, locale: string): string {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw || raw.length > MAX_CHROME_HREF_LENGTH || raw.startsWith('//') || raw.includes('\\') || /[\u0000-\u001f\u007f-\u009f]/.test(raw)) return '';
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { return ''; }
  if (decoded.includes('\\') || decoded.split('/').some(part => part === '..') || /[\u0000-\u001f\u007f-\u009f]/.test(decoded)) return '';
  const href = raw.replaceAll(':locale', locale);
  return safeUrl(href) === '#' ? '' : href;
}

function configuredChromeSlot(ctx: BuildContext, doc: Document, currentRoute: string, regionName: 'navigation' | 'footer'): ThemeChromeConfig['navigation'] {
  const settings = themePluginSettings(ctx, 'chrome');
  const region = isRecord(settings[regionName]) ? settings[regionName] : {};
  const enabled = settings.enabled !== false && region.enabled !== false;
  if (!enabled || !themePluginFor(ctx, 'chrome')) return emptyChromeSlot();
  const links = (slot: 'before' | 'after'): ThemeChromeLink[] => {
    const values = Array.isArray(region[slot]) ? region[slot] : [];
    return values.slice(0, MAX_CHROME_LINKS).map((item: unknown) => {
      if (!isRecord(item)) return null;
      const label = chromeLabel(item, doc.locale);
      const href = chromeHref(ctx, item.href, doc.locale);
      if (!label || !href) return null;
      return { label, href, current: href === currentRoute };
    }).filter(Boolean) as ThemeChromeLink[];
  };
  return { enabled: true, before: links('before'), after: links('after') };
}

function configuredChrome(ctx: BuildContext, doc: Document, currentRoute: string, showSiteChrome: boolean): ThemeChromeConfig {
  if (!showSiteChrome) return { navigation: emptyChromeSlot(), footer: configuredChromeSlot(ctx, doc, currentRoute, 'footer') };
  return {
    navigation: configuredChromeSlot(ctx, doc, currentRoute, 'navigation'),
    footer: configuredChromeSlot(ctx, doc, currentRoute, 'footer')
  };
}

function gatedScriptResourcePaths(ctx: BuildContext): string[] {
  const settings = cookieConsentSettings(ctx);
  if (!Array.isArray(settings.gatedScripts)) return [];
  return [...new Set(settings.gatedScripts.map((entry: any) => {
    const source = typeof entry === 'string' ? entry : entry?.src || entry?.source;
    if (typeof source !== 'string' || !source || source.startsWith('/') || /^https?:\/\//i.test(source)) return '';
    return safeRelativePath(source, 'trusted gated script path');
  }).filter(Boolean))];
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
  const runtimeRoot = path.join(root, '.pagekiln', 'theme-runtime');
  const runtimeThemeRoot = path.join(runtimeRoot, 'themes', themeName);
  // Preserve the compiled runtime tree inside the generation directory. This
  // matters for imports from themes/* into src/*: keeping only the theme
  // subtree would leave those nested ESM dependencies in the old cache root.
  const sourceRoot = pathIsWithin(runtimeThemeRoot, candidate) ? runtimeRoot : themeRoot;
  const generationRoot = path.join(root, '.pagekiln', 'theme-generations', `${themeName}-${generation}`);
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

async function loadThemeDefinition(root: string, themeName: string, theme: Record<string, any>, fingerprint: string, generation: string): Promise<PageskillTheme> {
  const themeRoot = containedPath(path.join(root, 'themes'), themeName, 'theme directory');
  const configuredEntry = safeRelativePath(theme.module || theme.entry || 'index.ts', 'theme module path');
  const compiledEntries = [
    configuredEntry.endsWith('.ts') ? configuredEntry.replace(/\.ts$/, '.js') : '',
    configuredEntry.endsWith('.ts') ? configuredEntry.replace(/\.ts$/, '.mjs') : ''
  ].filter(Boolean);
  const sourceCandidates = [
    containedPath(themeRoot, configuredEntry, 'theme module path'),
    ...compiledEntries.map(entry => containedPath(themeRoot, entry, 'compiled theme module path')),
    // Compatibility for pre-entry themes. New themes have only index.ts.
    ...(configuredEntry === 'index.ts' ? [containedPath(themeRoot, 'theme.ts', 'legacy theme module path')] : []),
    containedPath(themeRoot, 'theme.js', 'theme module path'),
    containedPath(themeRoot, 'theme.mjs', 'theme module path')
  ];
  const runtimeCandidates = sourceCandidates
    .filter(file => file.endsWith('.ts'))
    .map(file => path.join(root, '.pagekiln', 'theme-runtime', path.relative(root, file).replace(/\.ts$/, '.js')));
  const candidates = [...runtimeCandidates, ...sourceCandidates];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      const module = await importThemeModule(candidate, root, themeRoot, themeName, generation);
      const definition = module.default || module.theme;
      if (definition?.patterns && definition?.blocks) {
        const normalized = normalizeThemeDefinition(definition as PageskillTheme, theme);
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

function splitMoreMarker(body: string): { markdown: string; excerpt: string } {
  const marker = /(?:^|\n)\s*(?:<more>|<!--\s*more\s*-->)\s*(?=\n|$)/i;
  const match = marker.exec(body.replaceAll('\r', ''));
  if (!match || match.index < 0) return { markdown: body, excerpt: body.trim() };
  const before = body.slice(0, match.index + (match[0].startsWith('\n') ? 1 : 0));
  return { markdown: body.replace(match[0], '\n'), excerpt: before.trim() };
}

function assertConfigSurface(config: Record<string, any>) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('config.yml must contain a mapping');
  const forbidden = new Set(['css', 'style', 'styles', 'script', 'scripts', 'gatedscripts', 'html', 'rawhtml', 'unsafehtml']);
  const visit = (value: unknown, trail: string): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach((entry, index) => visit(entry, trail + '[' + index + ']')); return; }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (forbidden.has(key.toLocaleLowerCase())) throw new Error('config.yml:1:1: "' + trail + '.' + key + '" is not a site/plugin setting; declare visual resources and trusted renderers in themes/<name>/index.ts');
      visit(child, trail + '.' + key);
    }
  };
  visit(config, 'config');

  const defaultLocale = config.defaultLocale ?? 'en';
  if (!validLocaleTag(defaultLocale)) throw new Error('config.yml: defaultLocale must be a valid locale tag');
  const activeLocales = config.activeLocales === undefined ? [defaultLocale] : config.activeLocales;
  if (!Array.isArray(activeLocales) || activeLocales.some(locale => !validLocaleTag(locale))) {
    throw new Error('config.yml: activeLocales must contain valid locale tags');
  }
  configuredThemeName(config);
  configuredStaticDirectory(config);
  configuredPublicDirectory(config);
}

function parseFrontmatter(source: string, file: string) {
  const lines = source.replaceAll('\r', '').split('\n');
  if (lines[0] !== '---') {
    const split = splitMoreMarker(source);
    return { data: {}, body: split.markdown, excerpt: split.excerpt, bodyLine: 1 };
  }
  let closing = -1;
  for (let index = 1; index < lines.length; index += 1) if (lines[index] === '---' || lines[index] === '...') { closing = index; break; }
  if (closing < 0) throw new MarkdownError('unclosed YAML frontmatter; add a closing --- line', { file, line: 1, column: 1 });
  try {
    const split = splitMoreMarker(lines.slice(closing + 1).join('\n'));
    return { data: parseYaml(lines.slice(1, closing).join('\n')), body: split.markdown, excerpt: split.excerpt, bodyLine: closing + 2 };
  } catch (error) {
    if (error instanceof YamlError) throw new MarkdownError(`invalid YAML frontmatter: ${error.message}`, { file, line: error.line + 1, column: error.column });
    throw error;
  }
}

function documentIdentity(root: string, file: string) {
  const content = path.join(root, 'content');
  const relative = normalizePath(path.relative(content, file));
  const parts = relative.split('/');
  const collection = parts.shift() || 'pages';
  const filename = parts.pop() || '';
  const extension = path.extname(filename);
  const stem = filename.slice(0, -extension.length);
  const localeMatch = stem.match(/^(?:index\.)?([A-Za-z]{2,}(?:-[A-Za-z0-9]+)?)$/);
  const locale = localeMatch?.[1] || 'en';
  const idParts = [...parts];
  if (!localeMatch) idParts.push(stem);
  let id = idParts.join('/') || 'home';
  if (id === 'index') id = 'home';
  return { collection, id, locale };
}

function defaultPattern(config: Record<string, any>, collection: string, id = '', patterns?: Record<string, any>): string {
  const settings = config.content?.collections?.[collection];
  const configured = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings.pattern : undefined;
  if (collection === 'pages' && id === 'home' && patterns?.landing) return 'landing';
  if (configured) return String(configured);
  if (collection === 'posts' || settings?.contentType === 'post') return 'blog';
  return 'document';
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

async function loadDocument(root: string, file: string, config: Record<string, any>, sourceCache?: Map<string, { data: Record<string, any>; body: string; excerpt: string; bodyLine: number }>, patterns?: Record<string, any>): Promise<Document> {
  const [source, stat] = await Promise.all([fs.readFile(file, 'utf8'), fs.stat(file)]);
  const identity = documentIdentity(root, file);
  const hash = shortHash(source);
  let frontmatter = sourceCache?.get(hash);
  if (!frontmatter) {
    frontmatter = parseFrontmatter(source, file);
    if (sourceCache) {
      if (sourceCache.size >= MAX_SOURCE_PARSE_CACHE) sourceCache.delete(sourceCache.keys().next().value as string);
      sourceCache.set(hash, frontmatter as { data: Record<string, any>; body: string; excerpt: string; bodyLine: number });
    }
  }
  const data = frontmatter.data as Record<string, any>;
  return {
    ...identity,
    source: file,
    title: String(data.title || identity.id),
    description: String(data.description || ''),
    pattern: String(data.pattern || defaultPattern(config, identity.collection, identity.id, patterns)),
    date: data.date ? String(data.date) : undefined,
    author: data.author ? String(data.author) : localizedValue(config.author, identity.locale, 'Site Owner'),
    cover: data.cover ? String(data.cover) : undefined,
    data,
    markdown: frontmatter.body,
    excerpt: frontmatter.excerpt,
    bodyLine: frontmatter.bodyLine,
    nodes: [],
    directives: [],
    dependencyKeys: [],
    blockNames: [],
    hash,
    stat: { mtimeMs: stat.mtimeMs, size: stat.size }
  };
}

function schemaType(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function validateDocumentSchema(ctx: BuildContext, doc: Document) {
  const schema = ctx.config.content?.collections?.[doc.collection]?.schema;
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return;
  for (const [key, rawRule] of Object.entries(schema as Record<string, any>)) {
    const rule = typeof rawRule === 'string' ? { type: rawRule, required: false } : rawRule || {};
    const value = doc.data[key];
    if (rule.required && (value === undefined || value === null || value === '')) {
      ctx.diagnostics.push(`${doc.source}:1:1: frontmatter field "${key}" is required by collection "${doc.collection}"`);
      continue;
    }
    if (value !== undefined && rule.type && schemaType(value) !== rule.type) {
      ctx.diagnostics.push(`${doc.source}:1:1: frontmatter field "${key}" must be ${rule.type}; received ${schemaType(value)}`);
    }
  }
  if (isPostCollection(ctx, doc.collection) && doc.data.date !== undefined && publicationTimestamp(doc.data.date) === undefined) {
    ctx.diagnostics.push(`${doc.source}:1:1: frontmatter field "date" must be a valid ISO publication date (YYYY-MM-DD)`);
  }
}

function dependenciesFor(ctx: BuildContext, doc: Document): string[] {
  const dependencies = new Set<string>([`translation:${doc.collection}:${doc.id}`]);
  const context = themeContextFor(ctx, doc);
  for (const directive of doc.directives) {
    const definition = ctx.themeDefinition.blocks[directive.name];
    for (const dependency of definition?.dependencies?.(directive, context) || []) dependencies.add(dependency);
  }
  return [...dependencies].sort();
}

function rebuildDocumentIndexes(ctx: BuildContext) {
  ctx.collectionIndex.clear();
  ctx.translationIndex.clear();
  ctx.documentPositions.clear();
  ctx.tagIndex.clear();
  for (const doc of ctx.routes.values()) {
    if (doc.source.startsWith('fallback:')) continue;
    const key = translationKey(doc.collection, doc.id);
    const translations = ctx.translationIndex.get(key) || [];
    if (!translations.some(candidate => candidate.locale === doc.locale)) translations.push(doc);
    ctx.translationIndex.set(key, translations);
  }
  for (const translations of ctx.translationIndex.values()) translations.sort((left, right) => left.locale.localeCompare(right.locale));
  for (const doc of ctx.docs) {
    const key = collectionKey(doc.collection, doc.locale);
    ctx.collectionIndex.set(key, [...(ctx.collectionIndex.get(key) || []), doc]);
    for (const tag of Array.isArray(doc.data.tags) ? doc.data.tags.map(String) : []) {
      const tagKey = `${doc.collection}:${doc.locale}:${tag}`;
      ctx.tagIndex.set(tagKey, [...(ctx.tagIndex.get(tagKey) || []), doc]);
    }
  }
  for (const documents of ctx.collectionIndex.values()) {
    documents.sort(comparePublicationOrder);
    documents.forEach((doc, index) => ctx.documentPositions.set(documentKey(doc), index));
  }
}

function documentOutputs(ctx: BuildContext, doc: Document): string[] {
  const base = `${routeFor(ctx, doc).replace(/^\//, '')}index.html`;
  return ctx.config.outputs?.markdownMirrors === true ? [base, `${routeFor(ctx, doc).replace(/^\//, '').replace(/\/$/, '')}.md`] : [base];
}

function slug(value: string) { return value.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{Letter}\p{Number}\s-]/gu, '').trim().replace(/[\s_-]+/g, '-'); }
const DEFAULT_POST_CATEGORY = 'uncategorized';
function postCategory(doc: Pick<Document, 'collection' | 'data'>): string {
  if (doc.collection !== 'posts') return '';
  const value = doc.data?.category ?? doc.data?.type ?? '';
  return String(value).trim().toLocaleLowerCase() || DEFAULT_POST_CATEGORY;
}

function contentViewSettings(ctx: BuildContext, name: string): Record<string, any> {
  const value = ctx.config.content?.views?.[name];
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function viewForDocument(ctx: BuildContext, doc: Pick<Document, 'collection' | 'data'>): { name: string; settings: Record<string, any> } | undefined {
  const views = ctx.config.content?.views;
  if (!views || typeof views !== 'object' || Array.isArray(views)) return undefined;
  for (const [name, raw] of Object.entries(views)) {
    const settings = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, any> : {};
    if (String(settings.collection || name) !== doc.collection) continue;
    if (settings.category !== undefined && postCategory(doc) !== String(settings.category).trim().toLocaleLowerCase()) continue;
    return { name, settings };
  }
  return undefined;
}

function documentViewCollection(ctx: BuildContext, doc: Pick<Document, 'collection' | 'data'>): string {
  return viewForDocument(ctx, doc)?.name || doc.collection;
}

function sourceDocuments(ctx: BuildContext): Document[] {
  return ctx.routes.size ? [...ctx.routes.values()] : ctx.docs;
}

function documentsForCollection(ctx: BuildContext, collection: string, locale: string): Document[] {
  const viewSettings = contentViewSettings(ctx, collection);
  const sourceCollection = String(viewSettings.collection || collection);
  const viewCategory = viewSettings.category === undefined ? undefined : String(viewSettings.category).trim().toLocaleLowerCase();
  const documents = sourceDocuments(ctx).filter(doc => {
    if (doc.locale !== locale || doc.collection !== sourceCollection) return false;
    if (viewCategory !== undefined) return postCategory(doc) === viewCategory;
    if (collection === sourceCollection && sourceCollection === 'posts') return !viewForDocument(ctx, doc);
    return true;
  });
  return documents.sort(comparePublicationOrder);
}

function routeFor(ctx: BuildContext, doc: Document): string {
  if (doc.data?.route) return String(doc.data.route).replace(':locale', doc.locale).replace(/\/+/g, '/').replace(/([^:])\/\//g, '$1/');
  const view = viewForDocument(ctx, doc);
  const routeConfig = view?.settings.route || ctx.config.content?.collections?.[doc.collection]?.route || '/:locale/:id/';
  return String(routeConfig).replace(':locale', doc.locale).replace(':id', doc.id === 'home' ? '' : doc.id).replace(/\/+/g, '/').replace(/([^:])\/\//g, '$1/');
}

function blogRelationsFor(ctx: BuildContext, doc: Document): string {
  const posts = documentsForCollection(ctx, documentViewCollection(ctx, doc), doc.locale);
  const index = posts.findIndex(candidate => candidate.id === doc.id && candidate.locale === doc.locale);
  const newer = index > 0 ? posts[index - 1] : undefined;
  const older = index >= 0 && index + 1 < posts.length ? posts[index + 1] : undefined;
  const tags = Array.isArray(doc.data.tags) ? doc.data.tags.map(String) : [];
  const related: Document[] = [];
  const candidates = tags.length
    ? tags.flatMap(tag => (ctx.tagIndex.get(`${doc.collection}:${doc.locale}:${tag}`) || []).filter(candidate => documentViewCollection(ctx, candidate) === documentViewCollection(ctx, doc)))
    : [posts[index - 1], posts[index + 1], posts[0], posts[1], posts[2], posts[3]];
  for (const candidate of candidates) if (candidate && candidate.id !== doc.id && !related.some(entry => entry.id === candidate.id)) {
    related.push(candidate);
    if (related.length === 3) break;
  }
  const relationLink = (label: string, candidate: Document | undefined) => candidate ? `<a class="post-pagination-link" href="${safeUrl(routeFor(ctx, candidate))}" aria-label="${escapeHtml(`${label}: ${candidate.title}`)}"><span class="post-pagination-label">${escapeHtml(label)}</span><strong>${escapeHtml(candidate.title)}</strong></a>` : '';
  const previousLabel = themeText(ctx, doc.locale, 'previous', 'Previous post');
  const nextLabel = themeText(ctx, doc.locale, 'next', 'Next post');
  const relatedLabel = themeText(ctx, doc.locale, 'related', 'Related');
  return `<footer class="post-relations"><nav class="post-pagination">${relationLink(previousLabel, newer)}${relationLink(nextLabel, older)}</nav>${related.length ? `<section class="related-posts"><h2>${escapeHtml(relatedLabel)}</h2><ul>${related.map(candidate => `<li><a href="${safeUrl(routeFor(ctx, candidate))}">${escapeHtml(candidate.title)}</a></li>`).join('')}</ul></section>` : ''}</footer>`;
}

function themeContextFor(ctx: BuildContext, doc: Document): ThemeRenderContext {
  let context!: ThemeRenderContext;
  context = {
    doc,
    config: ctx.config,
    theme: ctx.theme,
    themeConfig: ctx.themeConfig,
    renderNodes: nodes => nodes.map(node => node.kind === 'directive' ? context.renderBlock(node) : node.html).join(''),
    renderBlock: node => renderThemeBlock(ctx, node, context),
    renderInline,
    escapeHtml,
    safeUrl,
    localized: (value, fallback) => localizedValue(value, doc.locale, fallback),
    translate: (key, fallback) => themeText(ctx, doc.locale, key, fallback),
    pluginText: (pluginName, key, fallback) => themePluginText(ctx, pluginName, doc.locale, key) || fallback,
    routeFor: candidate => routeFor(ctx, candidate as Document),
    collection: (name, locale = doc.locale) => documentsForCollection(ctx, name, locale),
    translations: (collection, id) => ctx.translationIndex.get(translationKey(collection, id)) || [],
    position: candidate => ctx.documentPositions.get(documentKey(candidate as Document)) ?? -1,
    formatDate: value => formatDate(value, doc.locale),
    blogRelations: () => blogRelationsFor(ctx, doc)
  };
  return context;
}

function renderThemeBlock(ctx: BuildContext, node: DirectiveNode, context: ThemeRenderContext): string {
  const definition = ctx.themeDefinition.blocks[node.name];
  if (!definition) throw new MarkdownError(`unknown Block "${node.name}"; use one of ${Object.keys(ctx.themeDefinition.blocks).join(', ')}`, node.position);
  return definition.render(node, context);
}

function validateThemeAttrs(node: DirectiveNode, definition: ThemeBlockDefinition) {
  for (const key of Object.keys(node.attrs)) {
    if (!(key in definition.schema)) throw new MarkdownError(`unknown attribute "${key}" on Block "${node.name}"; available attributes: ${Object.keys(definition.schema).join(', ') || 'none'}`, node.position);
  }
}

function renderChromeLinks(context: ThemeShellContext, links: ThemeChromeLink[], className: string): string {
  return links.map(link => {
    const href = context.safeUrl(link.href);
    if (href === '#') return '';
    return `<a class="${className}" href="${href}"${link.current ? ' aria-current="page"' : ''}>${context.escapeHtml(link.label)}</a>`;
  }).join('');
}

function fallbackShell(context: ThemeShellContext): string {
  const chrome = context.chrome || { navigation: { enabled: true, before: [], after: [] }, footer: { enabled: true, before: [], after: [] } };
  const pageLanguages = isPostCollectionConfig(context.config, context.doc.collection) ? context.languageLinks : '';
  const languageNav = pageLanguages ? `<nav class="languages" aria-label="${context.escapeHtml(context.languageLabel)}"><span class="languages-heading" aria-hidden="true">${context.escapeHtml(context.languageLabel)}</span><div class="languages-list">${pageLanguages}</div></nav>` : '';
  const archiveCollection = String(context.config.archive?.collection || 'posts');
  const collectionKeyName = context.doc.collection === 'archive' ? archiveCollection : context.doc.collection;
  const collectionLabel = context.translate(`collections.${collectionKeyName}`, collectionKeyName);
  const pageHeader = context.doc.source.startsWith('generated:') ? '' : `<header class="page-header"><p class="eyebrow">${context.escapeHtml(collectionLabel)}</p><h1>${context.escapeHtml(context.doc.title)}</h1>${context.doc.description ? `<p>${context.escapeHtml(context.doc.description)}</p>` : ''}${languageNav}</header>`;
  const navLinks = `${renderChromeLinks(context, chrome.navigation.before, 'primary-nav-link')}${context.navigationLinks}${renderChromeLinks(context, chrome.navigation.after, 'primary-nav-link')}`;
  const primaryNav = navLinks ? `<nav class="primary-nav" aria-label="${context.escapeHtml(context.navigationLabel)}">${navLinks}</nav>` : '';
  const headerActions = `${context.searchMarkup}${primaryNav}`;
  const siteMapLabel = context.doc.locale.startsWith('zh-tw') ? '網站地圖' : context.doc.locale.startsWith('zh') ? '站点地图' : 'Site map';
  const privacyPolicy = context.privacy.enabled ? `<a class="footer-tool-link" href="${context.safeUrl(context.privacy.policyHref)}">${context.escapeHtml(context.privacy.policyLabel)}</a>` : '';
  const footerTools = `<nav class="footer-tools" aria-label="${context.escapeHtml(siteMapLabel)}">${renderChromeLinks(context, chrome.footer.before, 'footer-tool-link')}<a class="footer-tool-link" href="/sitemap.xml">${context.escapeHtml(siteMapLabel)}</a>${privacyPolicy}${context.privacyTriggerMarkup || ''}${renderChromeLinks(context, chrome.footer.after, 'footer-tool-link')}</nav>`;
  return `<!doctype html><html lang="${context.escapeHtml(context.doc.locale)}"><head>${context.head}</head><body class="${context.bodyClass}" data-pattern="${context.escapeHtml(context.doc.pattern)}">${context.privacyMarkup}<a class="skip" href="#main">${context.escapeHtml(context.skipLabel)}</a><header class="site-header"><div class="header-inner"><a class="brand" href="${context.homeHref}"><img class="brand-mark" src="${context.brandIcon}" alt="" width="32" height="32"><span class="brand-copy"><strong>${context.escapeHtml(context.siteName)}</strong><small>${context.escapeHtml(context.headerNote)}</small></span></a>${headerActions ? `<div class="header-actions">${headerActions}</div>` : ''}</div></header><main id="main" class="${context.mainClass}">${pageHeader}${context.content}</main><footer class="site-footer"><div class="footer-grid">${footerTools}</div>${context.showAttribution ? `<div class="footer-bottom"><span class="footer-credit">${context.attribution}</span></div>` : ''}</footer></body></html>`;
}

const DEFAULT_COOKIE_CATEGORIES = [
  {
    purpose: 'essential', required: true, defaultValue: true, provider: 'Pageskill', retentionDays: 365
  },
  {
    purpose: 'measurement', required: false, defaultValue: false, provider: 'Not configured', retentionDays: 0
  },
  {
    purpose: 'advertising', required: false, defaultValue: false, provider: 'Not configured', retentionDays: 0
  },
  {
    purpose: 'fraud-prevention', required: false, defaultValue: false, provider: 'Not configured', retentionDays: 0
  },
  {
    purpose: 'social-embedding', required: false, defaultValue: false, provider: 'Not configured', retentionDays: 0
  }
];

function pluginEnabled(ctx: BuildContext, name: string): boolean {
  const themePlugin = themePluginFor(ctx, name);
  const settings = themePluginSettings(ctx, name);
  // Theme code declares the capability and its schema; theme.yml owns the
  // instance switch and all user-provided options.
  return Boolean(themePlugin) && settings.enabled !== false;
}

function themePluginFor(ctx: BuildContext, name: string): (ThemePluginDefinition & Record<string, any>) | undefined {
  return themePlugin(ctx, name);
}

function cookieConsentSettings(ctx: BuildContext): Record<string, any> {
  const themeSettings = themePluginSettings(ctx, 'privacyConsent');
  const siteSettings = ctx.config?.privacy?.cookieConsent;
  const merged = {
    ...themeSettings,
    ...(siteSettings && typeof siteSettings === 'object' ? {
      policyRoute: siteSettings.policyRoute,
      agentRoute: siteSettings.agentRoute
    } : {})
  };
  return merged;
}

function cookieCategories(settings: Record<string, any>, locale: string, localizedCategories: any[] = [], configuredCopy: Record<string, any> = {}) {
  const source = Array.isArray(settings.categories) && settings.categories.length ? settings.categories : DEFAULT_COOKIE_CATEGORIES;
  const localizedByPurpose = new Map(localizedCategories.map(category => [canonicalPrivacyPurpose(category?.purpose ?? category?.id), category]));
  const configuredByPurpose = new Map((Array.isArray(configuredCopy.categories) ? configuredCopy.categories : []).map(category => [canonicalPrivacyPurpose(category?.purpose ?? category?.id), category]));
  const seen = new Set<string>();
  return source.map((raw: any) => {
    const purpose = canonicalPrivacyPurpose(raw?.purpose ?? raw?.id) || 'custom';
    if (seen.has(purpose)) return null;
    seen.add(purpose);
    const localized = localizedByPurpose.get(purpose) || {};
    const configured = configuredByPurpose.get(purpose) || {};
    const copy = { ...localized, ...configured, ...raw };
    const required = raw?.required === true || (purpose === 'essential' && raw?.required !== false);
    const retentionDays = Number.isFinite(Number(raw?.retentionDays)) ? Math.max(0, Number(raw.retentionDays)) : Math.max(0, Number(settings.retentionDays || (required ? 365 : 0)));
    return {
      // id remains an internal compatibility key; public theme data exposes
      // the purpose that explains why a provider may run.
      id: purpose,
      purpose,
      label: localizedValue(copy.label, locale, purpose),
      description: localizedValue(copy.description, locale, required ? 'Required for the site to work.' : 'Optional; off until you choose it.'),
      required,
      defaultValue: required || raw?.default === true || raw?.defaultValue === true,
      provider: localizedValue(copy.provider, locale, required ? 'Pageskill' : 'Not configured'),
      retentionDays
    };
  }).filter(Boolean);
}

const PRIVACY_INTEGRATION_LABELS: Record<string, Record<string, string>> = {
  'google-analytics': { en: 'Google Analytics', 'zh-sg': 'Google Analytics', 'zh-tw': 'Google Analytics' },
  'google-ads': { en: 'Google Ads', 'zh-sg': 'Google Ads', 'zh-tw': 'Google Ads' },
  'cloudflare-web-analytics': { en: 'Cloudflare Web Analytics', 'zh-sg': 'Cloudflare Web Analytics', 'zh-tw': 'Cloudflare Web Analytics' },
  'baidu-tongji': { en: 'Baidu Tongji', 'zh-sg': '百度统计', 'zh-tw': '百度統計' },
  recaptcha: { en: 'reCAPTCHA', 'zh-sg': 'reCAPTCHA', 'zh-tw': 'reCAPTCHA' },
  hcaptcha: { en: 'hCaptcha', 'zh-sg': 'hCaptcha', 'zh-tw': 'hCaptcha' },
  turnstile: { en: 'Cloudflare Turnstile', 'zh-sg': 'Cloudflare Turnstile', 'zh-tw': 'Cloudflare Turnstile' },
  'x-for-websites': { en: 'X for Websites', 'zh-sg': 'X for Websites', 'zh-tw': 'X for Websites' }
};

function privacyIntegrations(settings: Record<string, any>, categories: Array<{ purpose: string; required: boolean } | null>) {
  const source = normalizePrivacyIntegrations(settings.integrations);
  const optional = new Set(categories.filter(category => category && !category.required).map(category => category!.purpose));
  const result: Array<Record<string, string>> = [];
  const valueAllowed = (provider: string, value: string) => {
    if (!value || value.length > 256 || /[<>"'`\\\s]/.test(value)) return false;
    // The first two adapters use the identifier formats documented by Google;
    // the remaining adapters receive public tokens or keys from their own UI.
    if (provider === 'google-analytics') return /^G-[A-Z0-9_-]+$/i.test(value);
    if (provider === 'google-ads') return /^(AW|GT)-[A-Z0-9_-]+$/i.test(value);
    return true;
  };
  source.forEach((raw: any) => {
    if (!raw || typeof raw !== 'object' || raw.enabled !== true) return;
    const provider = canonicalPrivacyProvider(raw.provider);
    const definition = PRIVACY_PROVIDER_DEFINITIONS[provider];
    if (!definition) return;
    const purpose = canonicalPrivacyPurpose(raw.purpose) || definition.defaultPurpose;
    if (!optional.has(purpose)) return;
    if (!definition.field) {
      result.push({ provider, purpose });
      return;
    }
    const value = String(raw[definition.field] || '').trim();
    if (!valueAllowed(provider, value)) return;
    result.push({ provider, purpose, [definition.field]: value });
  });
  return result;
}

function privacyIntegrationLabel(integration: Record<string, string>, locale: string): string {
  const language = locale.startsWith('zh-tw') ? 'zh-tw' : locale.startsWith('zh') ? 'zh-sg' : 'en';
  const base = PRIVACY_INTEGRATION_LABELS[integration.provider]?.[language] || PRIVACY_INTEGRATION_LABELS[integration.provider]?.en || integration.provider;
  return base;
}

function decorateCookieCategories(categories: any[], integrations: Array<Record<string, string>>, locale = 'en') {
  return categories.map(category => {
    const providers = integrations.filter(integration => integration.purpose === category.purpose).map(integration => privacyIntegrationLabel(integration, locale));
    return providers.length ? { ...category, provider: providers.join(', ') } : category;
  });
}

function publicPrivacyIntegration(integration: Record<string, string>) {
  return {
    provider: integration.provider,
    purpose: integration.purpose,
    ...(integration.platform ? { platform: integration.platform } : {})
  };
}

function publicPrivacyCategory(category: Record<string, any>) {
  const { id: _internalId, ...publicCategory } = category;
  return publicCategory;
}

function privacyShellData(ctx: BuildContext, doc: Document, themeBase: string) {
  const settings = cookieConsentSettings(ctx);
  const enabled = settings.enabled === true && pluginEnabled(ctx, 'privacyConsent');
  const copy = themeLocaleData(ctx, doc.locale).cookieConsent || {};
  const configuredCopy = themePluginCopy(ctx, 'privacyConsent', doc.locale);
  const text = (key: string, fallback: string) => themePluginText(ctx, 'privacyConsent', doc.locale, key) || themeText(ctx, doc.locale, `cookieConsent.${key}`, fallback);
  const policyRoute = String(settings.policyRoute || '/:locale/privacy/').replace(':locale', doc.locale);
  const script = String(pluginResourcePaths(ctx, ['privacyConsent', 'cookies'], 'scripts')[0] || 'scripts/cookie-consent.js').trim();
  const scriptHref = script.startsWith('/') || /^https?:\/\//i.test(script) ? script : themeResourceHref(ctx, themeBase, script);
  const baseCategories = cookieCategories(settings, doc.locale, Array.isArray(copy.categories) ? copy.categories : [], configuredCopy) as Array<{ id: string; purpose: string; label: string; description: string; required: boolean; defaultValue: boolean; provider: string; retentionDays: number }>;
  const integrations = privacyIntegrations(settings, baseCategories);
  // Remove the compiler-only compatibility id before handing data to a theme.
  const categories = decorateCookieCategories(baseCategories, integrations, doc.locale).map(({ id: _internalId, ...category }) => category) as Array<{ purpose: string; label: string; description: string; required: boolean; defaultValue: boolean; provider: string; retentionDays: number }>;
  const optionalCategory = categories.find(category => !category.required);
  const retentionDays = Math.max(0, Number(settings.retentionDays || 365));
  const gatedScripts = (Array.isArray(settings.gatedScripts) ? settings.gatedScripts : []).map((entry: any) => {
    const source = typeof entry === 'string' ? entry : entry?.src || entry?.source;
    const purpose = typeof entry === 'string' ? 'measurement' : canonicalPrivacyPurpose(entry?.purpose ?? entry?.category) || 'measurement';
    if (!source || !categories.some(item => item.purpose === purpose && !item.required)) return null;
    const href = String(source).startsWith('/') || /^https?:\/\//i.test(String(source)) ? String(source) : themeResourceHref(ctx, themeBase, String(source));
    // Keep the runtime payload as a raw, protocol-checked URL. Renderers call
    // safeUrl exactly once when placing it in an HTML attribute.
    return { purpose: String(purpose), href: String(href) };
  }).filter(Boolean) as Array<{ purpose: string; href: string }>;
  const privacy = {
    enabled,
    scriptSrc: safeUrl(scriptHref),
    storage: String(settings.storage || 'cookie'),
    retentionDays,
    policyHref: safeUrl(policyRoute),
    title: text('title', doc.locale.startsWith('zh-tw') ? 'Cookie 偏好設定' : doc.locale.startsWith('zh') ? 'Cookie 偏好设置' : 'Cookie preferences'),
    description: text('description', doc.locale.startsWith('zh-tw') ? '選擇哪些可選用途可以運作；必要功能不用於廣告或追蹤。' : doc.locale.startsWith('zh') ? '选择哪些可选用途可以工作；必要功能不用于广告或追踪。' : 'Choose which optional purposes may run; essential functions are not used for advertising or tracking.'),
    bannerLabel: text('bannerLabel', doc.locale.startsWith('zh') ? '隐私选择' : 'Privacy choices'),
    settingsLabel: text('settingsLabel', doc.locale.startsWith('zh-tw') ? 'Cookie 設定' : doc.locale.startsWith('zh') ? 'Cookie 设置' : 'Cookie settings'),
    acceptLabel: text('acceptLabel', doc.locale.startsWith('zh') ? '接受可选项' : 'Accept optional'),
    rejectLabel: text('rejectLabel', doc.locale.startsWith('zh') ? '仅必要项' : 'Essential only'),
    saveLabel: text('saveLabel', doc.locale.startsWith('zh-tw') ? '儲存選擇' : doc.locale.startsWith('zh') ? '保存选择' : 'Save choices'),
    closeLabel: text('closeLabel', doc.locale.startsWith('zh') ? '关闭' : 'Close'),
    essentialLabel: text('essentialLabel', doc.locale.startsWith('zh-tw') ? '必要功能' : doc.locale.startsWith('zh') ? '必要功能' : 'Essential'),
    essentialDescription: text('essentialDescription', doc.locale.startsWith('zh-tw') ? '儲存你的選擇；不啟用追蹤。' : doc.locale.startsWith('zh') ? '保存你的选择；不启用追踪。' : 'Stores your choice; does not enable tracking.'),
    optionalLabel: text('optionalLabel', optionalCategory?.label || (doc.locale.startsWith('zh-tw') ? '可選用途' : doc.locale.startsWith('zh') ? '可选用途' : 'Optional purposes')),
    optionalDescription: text('optionalDescription', optionalCategory?.description || (doc.locale.startsWith('zh-tw') ? '預設關閉；只有同意後才可啟用。' : doc.locale.startsWith('zh') ? '默认关闭；只有同意后才可启用。' : 'Off by default; enabled only after consent.')),
    policyLabel: text('policyLabel', doc.locale.startsWith('zh-tw') ? '隱私政策' : doc.locale.startsWith('zh') ? '隐私政策' : 'Privacy policy'),
    categories,
    integrations,
    gatedScripts
  };
  const escape = (value: unknown) => escapeHtml(value);
  const retentionUnit = doc.locale.startsWith('zh') ? '天' : 'days';
  const providerLabel = text('providerLabel', doc.locale.startsWith('zh') ? '提供者' : 'Provider');
  const retentionLabel = text('retentionLabel', doc.locale.startsWith('zh') ? '保存期限' : 'Retention');
  const retentionSession = text('retentionSession', doc.locale.startsWith('zh') ? '会话期间' : 'Session');
  const categoryMarkup = privacy.categories.map(category => {
    const retention = category.retentionDays > 0 ? `${category.retentionDays} ${retentionUnit}` : retentionSession;
    const metadata = `<span class="cookie-option-meta">${category.provider ? `<span><span class="cookie-option-meta-label">${escape(providerLabel)}</span>${escape(category.provider)}</span>` : ''}<span><span class="cookie-option-meta-label">${escape(retentionLabel)}</span>${escape(retention)}</span></span>`;
    return `<label class="cookie-option"><input type="checkbox" data-cookie-purpose="${escape(category.purpose)}"${category.required ? ' checked disabled' : category.defaultValue ? ' checked' : ''}><span><strong>${escape(category.label)}</strong><small>${escape(category.description)}</small>${metadata}</span></label>`;
  }).join('');
  const gatedScriptMarkup = gatedScripts.map(script => `<template data-cookie-script data-cookie-purpose="${escape(script.purpose)}" data-cookie-src="${safeUrl(script.href)}"></template>`).join('');
  const privacyMarkup = enabled ? `<section class="privacy-consent" data-cookie-consent data-cookie-audience="human" data-cookie-version="2" data-cookie-storage="${escape(privacy.storage)}" data-cookie-retention-days="${privacy.retentionDays}" data-cookie-integrations="${escape(JSON.stringify(integrations))}" aria-label="${escape(privacy.bannerLabel)}"><div class="cookie-banner" data-cookie-banner hidden role="region" aria-labelledby="cookie-banner-title"><div class="cookie-banner-copy"><p id="cookie-banner-title"><strong>${escape(privacy.title)}</strong></p><p>${escape(privacy.description)}</p></div><div class="cookie-actions"><button class="button-secondary" type="button" data-cookie-action="reject-optional">${escape(privacy.rejectLabel)}</button><button class="button-primary" type="button" data-cookie-action="open" aria-controls="cookie-dialog">${escape(privacy.settingsLabel)}</button><button class="button-primary" type="button" data-cookie-action="accept-all">${escape(privacy.acceptLabel)}</button></div><p class="privacy-links"><a href="${privacy.policyHref}">${escape(privacy.policyLabel)}</a></p></div><dialog id="cookie-dialog" class="cookie-dialog" data-cookie-dialog aria-labelledby="cookie-dialog-title" aria-describedby="cookie-dialog-description"><form method="dialog" class="cookie-dialog-card"><div class="cookie-dialog-heading"><h2 id="cookie-dialog-title">${escape(privacy.title)}</h2><button class="cookie-close" type="button" data-cookie-action="close" aria-label="${escape(privacy.closeLabel)}">×</button></div><p id="cookie-dialog-description">${escape(privacy.description)}</p><fieldset><legend>${escape(privacy.bannerLabel)}</legend>${categoryMarkup}</fieldset><p class="privacy-links"><a href="${privacy.policyHref}">${escape(privacy.policyLabel)}</a></p><div class="cookie-actions"><button class="button-secondary" type="button" data-cookie-action="reject-optional">${escape(privacy.rejectLabel)}</button><button class="button-primary" type="button" data-cookie-action="save">${escape(privacy.saveLabel)}</button></div></form></dialog>${gatedScriptMarkup}<script type="module" src="${privacy.scriptSrc}"></script></section>` : '';
  const privacyTriggerMarkup = enabled ? `<button class="privacy-trigger" type="button" data-cookie-action="open" aria-controls="cookie-dialog">${escape(privacy.settingsLabel)}</button>` : '';
  return { privacy, privacyMarkup, privacyTriggerMarkup };
}

function localSearchData(ctx: BuildContext, doc: Document, themeBase: string) {
  const settings = themePluginSettings(ctx, 'search');
  const plugin = themePluginFor(ctx, 'search');
  const hasPlugin = Boolean(plugin);
  const enabled = !doc.source.startsWith('generated:') && hasPlugin && settings.enabled !== false && pluginEnabled(ctx, 'search');
  const text = (key: string, fallback: string) => themePluginText(ctx, 'search', doc.locale, key) || themeText(ctx, doc.locale, `search.${key}`, fallback);
  const script = String(pluginResourcePaths(ctx, ['search'], 'scripts')[0] || 'scripts/search.js').trim();
  const scriptHref = script.startsWith('/') || /^https?:\/\//i.test(script) ? script : themeResourceHref(ctx, themeBase, script);
  const search = {
    enabled,
    indexHref: `/assets/search-index.${doc.locale}.json`,
    scriptSrc: safeUrl(scriptHref),
    label: text('label', doc.locale.startsWith('zh') ? '站内搜索' : 'Search this site'),
    placeholder: text('placeholder', doc.locale.startsWith('zh-tw') ? '搜尋頁面和內容' : doc.locale.startsWith('zh') ? '搜索页面和内容' : 'Search pages and posts'),
    submitLabel: text('submitLabel', doc.locale.startsWith('zh') ? '搜索' : 'Search'),
    noResultsLabel: text('noResultsLabel', doc.locale.startsWith('zh') ? '没有找到匹配内容。' : 'No matching content.'),
    errorLabel: text('errorLabel', doc.locale.startsWith('zh') ? '搜索索引暂时不可用。' : 'Search is temporarily unavailable.'),
    resultLabel: text('resultLabel', doc.locale.startsWith('zh') ? '搜索结果' : 'Search results'),
    hitTitleLabel: text('hitTitle', doc.locale.startsWith('zh-tw') ? '標題命中' : doc.locale.startsWith('zh') ? '标题命中' : 'Title match'),
    hitDescriptionLabel: text('hitDescription', doc.locale.startsWith('zh-tw') ? '摘要命中' : doc.locale.startsWith('zh') ? '摘要命中' : 'Summary match'),
    hitHeadingLabel: text('hitHeading', doc.locale.startsWith('zh-tw') ? '章節命中' : doc.locale.startsWith('zh') ? '章节命中' : 'Section match'),
    hitContentLabel: text('hitContent', doc.locale.startsWith('zh-tw') ? '正文命中' : doc.locale.startsWith('zh') ? '正文命中' : 'Content match'),
    hitPathLabel: text('hitPath', doc.locale.startsWith('zh-tw') ? '路徑命中' : doc.locale.startsWith('zh') ? '路径命中' : 'Path match'),
    queryHint: text('queryHint', doc.locale.startsWith('zh-tw') ? '至少輸入兩個英文字母或一個中文字詞' : doc.locale.startsWith('zh') ? '至少输入两个字母或一个中文词' : 'Enter at least two letters or a meaningful word'),
    maxResults: Math.max(1, Math.min(50, Number(settings.maxResults || 8)))
  };
  const inputId = `pagekiln-search-${doc.locale.replace(/[^a-z0-9]+/gi, '-')}-${shortHash(doc.id).slice(0, 6)}`;
  const searchMarkup = search.enabled ? `<form class="site-search" data-local-search data-search-index="${escapeHtml(search.indexHref)}" data-search-max-results="${search.maxResults}" data-search-no-results="${escapeHtml(search.noResultsLabel)}" data-search-error="${escapeHtml(search.errorLabel)}" data-search-query-hint="${escapeHtml(search.queryHint)}" data-search-hit-title="${escapeHtml(search.hitTitleLabel)}" data-search-hit-description="${escapeHtml(search.hitDescriptionLabel)}" data-search-hit-heading="${escapeHtml(search.hitHeadingLabel)}" data-search-hit-content="${escapeHtml(search.hitContentLabel)}" data-search-hit-path="${escapeHtml(search.hitPathLabel)}" role="search"><label class="sr-only" for="${inputId}">${escapeHtml(search.label)}</label><div class="site-search-control"><input id="${inputId}" name="q" type="search" autocomplete="off" placeholder="${escapeHtml(search.placeholder)}" data-search-input><button type="submit" aria-label="${escapeHtml(search.submitLabel)}">⌕</button></div><div class="search-results" data-search-results hidden aria-live="polite" aria-label="${escapeHtml(search.resultLabel)}"></div><script type="module" src="${search.scriptSrc}"></script></form>` : '';
  return { search, searchMarkup };
}

function fallbackShellWithPrivacy(context: ThemeShellContext): string {
  return fallbackShell(context);
}

function generatedDocument(id: string, locale: string, title: string, description: string, route: string, pattern = 'landing'): Document {
  return {
    id,
    collection: 'pages',
    locale,
    source: `generated:${id}`,
    title,
    description,
    pattern,
    data: { route },
    markdown: '',
    excerpt: '',
    nodes: [],
    directives: [],
    hash: shortHash(`${id}:${locale}:${title}:${description}:${route}`),
    bodyLine: 1,
    stat: { mtimeMs: 0, size: 0 },
    dependencyKeys: [],
    blockNames: []
  };
}

function languagePickerCopy(ctx: BuildContext, locale: string, themeBase: string) {
  const generated = generatedDocument('home', locale, '', '', '/');
  const privacy = privacyShellData(ctx, generated, themeBase).privacy;
  return {
    title: themeText(ctx, locale, 'languagePicker.title', 'Choose a site language'),
    description: themeText(ctx, locale, 'languagePicker.description', 'Choose a language to open the matching site version.'),
    recommended: themeText(ctx, locale, 'languagePicker.recommended', locale.startsWith('zh-tw') ? '建議語言' : locale.startsWith('zh') ? '建议语言' : 'Recommended'),
    siteName: localizedValue(ctx.config.siteName, locale, 'Pageskill'),
    siteDescription: localizedValue(ctx.config.description, locale, ''),
    headerNote: themeText(ctx, locale, 'shell.headerNote', 'Markdown-native · static-first'),
    skipToContent: themeText(ctx, locale, 'shell.skipToContent', locale.startsWith('zh-tw') ? '跳至內容' : locale.startsWith('zh') ? '跳至内容' : 'Skip to content'),
    siteMap: themeText(ctx, locale, 'siteMap', locale.startsWith('zh-tw') ? '網站地圖' : locale.startsWith('zh') ? '站点地图' : 'Site map'),
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
      policyHref: privacy.policyHref,
      categories: privacy.categories.map(category => ({
        purpose: category.purpose,
        label: category.label,
        description: category.description,
        provider: category.provider,
        required: category.required,
        retentionDays: category.retentionDays
      }))
    }
  };
}

function languagePickerMarkup(ctx: BuildContext, locale: string, scriptHref = ''): string {
  const locales = ctx.config.activeLocales || [ctx.config.defaultLocale || locale];
  const themeName = configuredThemeName(ctx.config);
  const themeBase = `/assets/theme/${themeName}`;
  const copy = Object.fromEntries(locales.map((candidate: string) => [candidate, languagePickerCopy(ctx, candidate, themeBase)]));
  const languageData = JSON.stringify({
    defaultLocale: ctx.config.defaultLocale || locale,
    locales,
    storageKey: 'pagekiln-locale',
    copy
  });
  const title = themeText(ctx, locale, 'languagePicker.title', 'Choose a site language');
  const description = themeText(ctx, locale, 'languagePicker.description', 'Choose a language to open the matching site version.');
  const cards = locales.map((candidate: string) => {
    const href = safeUrl(`/${candidate}/`);
    const name = languageDisplayName(ctx, locale, candidate);
    return `<li><a class="language-card" href="${href}" lang="${escapeHtml(candidate)}" data-locale="${escapeHtml(candidate)}"><span class="language-card-index" aria-hidden="true">${escapeHtml(String(locales.indexOf(candidate) + 1).padStart(2, '0'))}</span><strong>${escapeHtml(name)}</strong><span class="language-card-recommendation" data-language-recommended aria-hidden="true"></span><span class="language-card-arrow" aria-hidden="true">↗</span></a></li>`;
  }).join('');
  const script = scriptHref ? `<script type="module" src="${safeUrl(scriptHref)}"></script>` : '';
  return `<section class="language-picker" data-language-picker data-language-copy="${escapeHtml(languageData)}" aria-labelledby="language-picker-title"><h1 id="language-picker-title">${escapeHtml(title)}</h1><p class="language-picker-description">${escapeHtml(description)}</p><ul class="language-picker-list">${cards}</ul></section>${script}`;
}

function notFoundMarkup(ctx: BuildContext, locale: string): string {
  const title = themeText(ctx, locale, 'notFound.title', 'This page is not here');
  const description = themeText(ctx, locale, 'notFound.description', 'The address may have changed. Return home or continue through the guide.');
  const homeLabel = themeText(ctx, locale, 'notFound.home', 'Back to home');
  const guideLabel = themeText(ctx, locale, 'notFound.guide', 'Open the guide');
  const homeHref = safeUrl(routeFor(ctx, generatedDocument('home', locale, 'Home', '', `/${locale}/`)));
  const guide = ctx.docs.find(doc => doc.collection === 'posts' && doc.id === 'start' && doc.locale === locale);
  const guideLink = guide ? `<a class="button-secondary" href="${safeUrl(routeFor(ctx, guide))}">${escapeHtml(guideLabel)}</a>` : '';
  return `<section class="error-page" aria-labelledby="not-found-title"><p class="error-code" aria-hidden="true">404</p><h2 id="not-found-title">${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p><div class="error-actions"><a class="button-primary" href="${homeHref}">${escapeHtml(homeLabel)}</a>${guideLink}</div></section>`;
}

async function writeGeneratedPages(ctx: BuildContext) {
  const locale = ctx.config.defaultLocale || 'en';
  const themeName = configuredThemeName(ctx.config);
  const themeBase = `/assets/theme/${themeName}`;
  const languageScript = pluginResourcePaths(ctx, ['language', 'languagePicker'], 'scripts')[0] || '';
  const languageScriptHref = languageScript ? themeResourceHref(ctx, themeBase, languageScript) : '';
  const pickerTitle = themeText(ctx, locale, 'languagePicker.title', 'Choose a site language');
  const pickerDescription = themeText(ctx, locale, 'languagePicker.description', 'Choose a language to open the matching site version.');
  const picker = generatedDocument('home', locale, pickerTitle, pickerDescription, '/');
  await writeIfChanged(ctx, 'index.html', pageShell(ctx, picker, languagePickerMarkup(ctx, locale, languageScriptHref)));
  const notFoundTitle = themeText(ctx, locale, 'notFound.title', 'This page is not here');
  const notFoundDescription = themeText(ctx, locale, 'notFound.description', 'The address may have changed. Return home or continue through the guide.');
  const notFound = generatedDocument('not-found', locale, notFoundTitle, notFoundDescription, '/404.html', 'document');
  await writeIfChanged(ctx, '404.html', pageShell(ctx, notFound, notFoundMarkup(ctx, locale)));
}

type ThemeStyleBundle = { styleFile: string; styleFiles: string[]; bundled: Set<string>; fingerprint: string };

function themeResourcePaths(values: unknown[], label: string): string[] {
  return [...new Set(values.map(value => safeRelativePath(themeResourceValue(value), label)))];
}

/** The main stylesheet is the bundle for theme resources and the selected preset. */
function themeStyleBundle(ctx: BuildContext): ThemeStyleBundle {
  const selectedPreset = ctx.theme.presets?.[ctx.theme.preset || 'aurora'];
  const rawStyles = [
    ...resourcePaths(themeResources(ctx), 'styles'),
    ...(Array.isArray(selectedPreset?.styles) ? selectedPreset.styles : [])
  ];
  const styleFiles = themeResourcePaths(rawStyles, 'theme stylesheet path');
  const styleFile = styleFiles[0] || 'style.css';
  const fingerprint = shortHash(minifyCss(styleFiles.map(relative => ctx.themeStyleSources.get(relative) || '').join('\n'))).slice(0, 12);
  return { styleFile, styleFiles, bundled: new Set(styleFiles), fingerprint };
}

function pageShell(ctx: BuildContext, doc: Document, content: string): string {
  const siteName = localizedValue(ctx.config.siteName, doc.locale, 'Pageskill');
  const siteDescription = localizedValue(ctx.config.description, doc.locale, 'The static-first website compiler for content that scales.');
  const icons = ctx.config.icons || {};
  const branding = ctx.config.branding || {};
  const showAttribution = branding.showAttribution === true;
  const attributionText = localizedValue(branding.attribution, doc.locale, 'Pageskill by JSW Teams');
  const attributionUrl = branding.attributionUrl ? safeUrl(branding.attributionUrl) : '#';
  const headerNote = themeText(ctx, doc.locale, 'shell.headerNote', 'Markdown-native · static-first');
  const skipLabel = themeText(ctx, doc.locale, 'shell.skipToContent', 'Skip to content');
  const languageLabel = themeText(ctx, doc.locale, 'shell.languages', 'Languages');
  const navigationLabel = themeText(ctx, doc.locale, 'shell.navigation', 'Primary navigation');
  const footerNote = themeText(ctx, doc.locale, 'shell.footerNote', 'A small compiler for durable content.');
  const footerKicker = themeText(ctx, doc.locale, 'shell.footerKicker', 'Content compiler');
  const generatedPage = doc.source.startsWith('generated:');
  const showSiteChrome = !generatedPage || doc.collection === 'archive';
  const navigationConfig = configuredNavigation(ctx.config);
  const navigation = Array.isArray(navigationConfig.links) ? navigationConfig.links : [];
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
  const navigationLinks = showSiteChrome ? navigation.map((item: any) => {
    const href = String(item.href || '').replace(':locale', doc.locale);
    const current = href === currentRoute ? ' aria-current="page"' : '';
    return `<a href="${safeUrl(href)}"${current}>${escapeHtml(themeText(ctx, doc.locale, `navigation.${item.key}`, item.key || item.href || 'Link'))}</a>`;
  }).join('') : '';
  const chrome = configuredChrome(ctx, doc, currentRoute, showSiteChrome);
  const headIconLinks = [
    icons.favicon ? `<link rel="icon" href="${safeUrl(icons.favicon)}">` : '',
    icons.icon32 ? `<link rel="icon" type="image/png" sizes="32x32" href="${safeUrl(icons.icon32)}">` : '',
    icons.appleTouchIcon ? `<link rel="apple-touch-icon" href="${safeUrl(icons.appleTouchIcon)}">` : '',
    icons.manifest ? `<link rel="manifest" href="${safeUrl(icons.manifest)}">` : ''
  ].join('');
  const documentFeedCollection = doc.collection === 'archive'
    ? String(doc.data?.archiveCollection || feedCollection(ctx) || '')
    : isPostCollection(ctx, doc.collection) ? documentViewCollection(ctx, doc) : String(feedCollection(ctx) || '');
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
  const patternStyles = themeResourcePaths([
    ...patternResourcePaths(ctx, doc.pattern, 'styles')
  ], 'Pattern stylesheet path');
  const blockStyles = themeResourcePaths(doc.directives.flatMap(node => [
    ...blockResourcePaths(ctx, node.name, 'styles')
  ]), 'Block stylesheet path');
  const pluginStyles = [
    ...genericPluginResourcePaths(ctx, 'styles'),
    ...(pluginEnabled(ctx, 'privacyConsent') && cookieConsentSettings(ctx).enabled === true ? pluginResourcePaths(ctx, ['privacyConsent', 'cookies'], 'styles') : []),
    ...(pluginEnabled(ctx, 'search') ? pluginResourcePaths(ctx, ['search'], 'styles') : []),
    ...(pluginEnabled(ctx, 'toc') ? pluginResourcePaths(ctx, ['toc'], 'styles') : []),
    ...(doc.source.startsWith('generated:') ? pluginResourcePaths(ctx, ['language', 'languagePicker'], 'styles') : [])
  ];
  // Global theme and preset styles are already part of the fingerprinted main
  // bundle.  Remove them here so a page cannot inline them or link a file that
  // copyThemeAndAssets intentionally did not emit separately.
  const pageStyles = [styleBundle.styleFile, ...pluginStyles, ...patternStyles, ...blockStyles]
    .filter(style => style === styleBundle.styleFile || !styleBundle.bundled.has(style));
  const styleTags = planThemeStyles(pageStyles, ctx.themeStyleSources, {
    inlineStyles: ctx.theme.inlineStyles !== false,
    alwaysExternal: [styleBundle.styleFile]
  });
  const stylesheets = styleTags.map(tag => tag.kind === 'inline'
    ? `<style>${tag.css}</style>`
    : `<link rel="stylesheet" href="${safeUrl(themeResourceHref(ctx, themeBase, tag.path, tag.path === styleBundle.styleFile ? styleBundle.fingerprint : ''))}">`).join('');
  const searchData = localSearchData(ctx, doc, themeBase);
  const browserScripts = themeResourcePaths([
    ...resourcePaths(themeResources(ctx), 'scripts'),
    ...genericPluginResourcePaths(ctx, 'scripts'),
    ...(pluginEnabled(ctx, 'toc') && (doc.pattern === 'blog' || doc.directives.some(node => node.name === 'toc')) ? pluginResourcePaths(ctx, ['toc'], 'scripts') : []),
    ...doc.directives.flatMap(node => blockResourcePaths(ctx, node.name, 'scripts'))
  ], 'Theme script path');
  const scriptTags = browserScripts.map(script => `<script type="module" src="${safeUrl(themeResourceHref(ctx, themeBase, String(script)))}"></script>`).join('');
  const attribution = showAttribution ? (attributionUrl === '#' ? `<span>${escapeHtml(attributionText)}</span>` : `<a href="${attributionUrl}">${escapeHtml(attributionText)}</a>`) : '';
  const socialImage = doc.data?.ogImage || doc.data?.cover || ctx.config.images?.social;
  const socialImageUrl = absoluteImageUrl(socialImage, String(ctx.config.siteUrl || '').replace(/\/$/, ''));
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(doc.title)} · ${escapeHtml(siteName)}</title><meta name="description" content="${escapeHtml(doc.description || siteDescription)}"><meta name="theme-color" content="${escapeHtml(ctx.config.pwa?.themeColor || '#d9563b')}"><meta property="og:title" content="${escapeHtml(doc.title)}"><meta property="og:description" content="${escapeHtml(doc.description || siteDescription)}"><meta property="og:type" content="${doc.date ? 'article' : 'website'}"><meta property="og:url" content="${safeUrl(absoluteUrl)}">${socialImageUrl ? `<meta property="og:image" content="${safeUrl(socialImageUrl)}">` : ''}<link rel="canonical" href="${safeUrl(absoluteUrl)}"><link rel="sitemap" type="application/xml" href="/sitemap.xml">${headIconLinks}${alternates}${stylesheets}${scriptTags}`;
  const headWithFeed = head.replace('<link rel="sitemap" type="application/xml" href="/sitemap.xml">', `<link rel="sitemap" type="application/xml" href="/sitemap.xml">${postsFeedLink}`);
  const privacyData = privacyShellData(ctx, doc, themeBase);
  const bodyClass = `theme-${escapeHtml(configuredThemeName(ctx.config))}`;
  const shellContext = { ...themeContextFor(ctx, doc), content, head: headWithFeed, bodyClass, mainClass: `pattern-${escapeHtml(doc.pattern)}`, siteName, siteDescription, currentRoute, homeHref, brandIcon, navigationLinks, languageLinks, navigationLabel, languageLabel, skipLabel, headerNote, footerNote, footerKicker, attribution, showAttribution, chrome, ...searchData, searchMarkup: showSiteChrome ? searchData.searchMarkup : '', ...privacyData } as ThemeShellContext;
  if (ctx.themeDefinition.shell) return ctx.themeDefinition.shell(shellContext);
  return fallbackShellWithPrivacy(shellContext);
}

function contentNodes(doc: Document): MarkdownNode[] {
  const first = doc.nodes[0];
  if (first?.kind === 'heading' && first.depth === 1 && first.text.trim().replace(/\s+/g, ' ') === doc.title.trim().replace(/\s+/g, ' ')) return doc.nodes.slice(1);
  return doc.nodes;
}

/** Describe generated discovery from the outputs this renderer plans to publish. */
function discoveryBoundaries(ctx: BuildContext) {
  const generated = publicDiscoveryResources(ctx).map(resource => resource.href);
  if (ctx.outputs.has('robots.txt') || !ctx.stagedOutput) generated.push('/robots.txt');
  return {
    sourceOfTruth: ['config.yml', 'content/', 'themes/'],
    generatedDiscovery: [...new Set(generated)],
    agentInstructions: ['AGENTS.md']
  };
}

/** The code-owned registry is the only capability list consumed by Agent output. */
function agentFunctionMap() {
  return [
    { id: 'write-page', purpose: 'Write current site content for a page, guide, reference, or directory', paths: ['content/pages/<id>/<locale>.md'], commands: ['pageskill g'] },
    { id: 'write-post', purpose: 'Record a dated post; use category: tutorial for a tutorial and omit it for uncategorized content', paths: ['content/posts/<id>/<locale>.md'], commands: ['pageskill g'] },
    { id: 'write-update', purpose: 'Record a version update as a post with category: update; the updates view keeps it separate from ordinary posts', paths: ['content/posts/<version>/<locale>.md'], frontmatter: { category: 'update', date: 'YYYY-MM-DD' }, commands: ['pageskill g'] },
    { id: 'change-layout', purpose: 'Add, modify, or remove an existing layout, component, pattern, or stylesheet', paths: ['themes/<name>/index.ts', 'themes/<name>/components/', 'themes/<name>/layouts/'], commands: ['pageskill g --profile'] },
    { id: 'change-site', purpose: 'Change locales, routes, collections, SEO, privacy, discovery policy, plugin copy/options, or deployment settings', paths: ['config.yml', 'themes/<name>/theme.yml'], commands: ['pageskill g --profile'] },
    { id: 'configure-plugin', purpose: 'Configure a declared foundation plugin from theme.yml without editing its renderer', paths: ['themes/<name>/theme.yml', 'themes/<name>/plugins/<plugin>/index.ts'], commands: ['pageskill g --profile'] },
    { id: 'discover-extension', purpose: 'Read active theme Patterns, Blocks, collections, plugin switches, contexts, and resource dependencies', paths: ['themes/<name>/index.ts', 'themes/<name>/theme.yml', 'config.yml'], commands: ['import { getCatalog, inspect } from "pageskill"'] },
    { id: 'discover-site', purpose: 'Read renderer-generated agent metadata, API links, Markdown negotiation, and content signals', paths: ['dist/public/.well-known/', 'dist/public/robots.txt', 'dist/public/llms.txt'], commands: ['pageskill g'] },
    { id: 'preview', purpose: 'Open the local development server with a persistent incremental context', paths: ['src/bin/pageskill.mjs', 'src/compiler.ts'], commands: ['pageskill s'] },
    { id: 'deploy', purpose: 'Build and publish the configured public site target', paths: ['config.yml', 'dist/public/'], commands: ['pageskill d --dry-run', 'pageskill d'] },
    { id: 'dynamic-backend', purpose: 'Add runtime business logic, secrets, writes, or webhooks', paths: ['backend/handler.ts'], commands: ['pageskill g'] }
  ];
}

function discoverySettings(ctx: BuildContext, name: string): Record<string, any> {
  // Discovery policy is data from config.yml; absent sections stay disabled
  // unless the renderer explicitly defines a safe default.
  const value = ctx.config.agentDiscovery?.[name];
  return isRecord(value) ? value : {};
}

function discoveryEnabled(ctx: BuildContext, name: string, fallback = false): boolean {
  // A capability is opt-in unless its renderer default is explicitly true.
  const settings = discoverySettings(ctx, name);
  return settings.enabled === undefined ? fallback : settings.enabled === true;
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
  if (!discoveryEnabled(ctx, 'apiCatalog', false)) return;
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
    name: String(localizedValue(settings.name, locale, localizedValue(ctx.config.siteName, locale, 'Pageskill'))),
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
  return agentFunctionMap().map((entry: any) => String(entry.purpose || '').trim()).filter(Boolean).join('; ').slice(0, 1024);
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
  const title = String(settings.title || localizedValue(ctx.config.siteName, String(ctx.config.defaultLocale || 'en'), 'Pageskill')).replaceAll(/[\r\n]+/g, ' ');
  const instructions = Array.isArray(settings.instructions)
    ? settings.instructions.map((value: unknown) => String(value).replaceAll(/[\r\n]+/g, ' ').trim()).filter(Boolean)
    : [];
  const sections = (agentFunctionMap() as Array<Record<string, unknown>>).map(generatedAgentCapabilitySection);
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
  if (!discoveryEnabled(ctx, 'skills', true)) return;
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
  if (discoveryEnabled(ctx, 'apiCatalog', false) && configuredApiCatalogEntries(ctx, String(ctx.config.siteUrl || '').replace(/\/$/, '')).length) paths.push('.well-known/api-catalog', '.well-known/api-catalog.md');
  if (discoveryEnabled(ctx, 'ard', true)) paths.push('.well-known/ai-catalog.json');
  if (discoveryEnabled(ctx, 'skills', true)) paths.push('.well-known/agent-skills/index.json', `.well-known/agent-skills/${agentSkillName(ctx)}/SKILL.md`);
  if (authSettings(ctx).enabled === true) paths.push('.well-known/oauth-protected-resource', 'auth.md');
  if (authSettings(ctx).enabled === true && authSettings(ctx).authorizationEndpoint && authSettings(ctx).tokenEndpoint) paths.push('.well-known/oauth-authorization-server');
  if (discoveryEnabled(ctx, 'mcp', false)) paths.push('.well-known/mcp/server-card.json');
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
  if (!discoveryEnabled(ctx, 'ard', true)) return;
  let host = siteUrl;
  try { host = new URL(siteUrl).host; } catch { /* siteUrl validation is handled by the site deployment */ }
  const siteName = localizedValue(ctx.config.siteName, String(ctx.config.defaultLocale || 'en'), 'Pageskill');
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
  const privacySettings = cookieConsentSettings(ctx);
  const locale = ctx.config.defaultLocale || 'en';
  const basePrivacyCategories = cookieCategories(privacySettings, locale, themeLocaleData(ctx, locale).cookieConsent?.categories || [], themePluginCopy(ctx, 'privacyConsent', locale));
  const privacyIntegrationsData = privacyIntegrations(privacySettings, basePrivacyCategories);
  const privacyCategories = decorateCookieCategories(basePrivacyCategories, privacyIntegrationsData, locale);
  return {
    version: 2,
    theme: {
      name: String(ctx.theme.name || ctx.config.theme?.name || 'default'),
      fingerprint: String(ctx.theme.__fingerprint || ctx.themeHash).slice(0, 20),
      resources: {
        styles: resourcePaths(themeResources(ctx), 'styles'),
        scripts: resourcePaths(themeResources(ctx), 'scripts')
      },
      plugins: Object.fromEntries(Object.entries(ctx.themeDefinition.plugins || {}).map(([name, value]: [string, any]) => [name, {
        enabled: pluginEnabled(ctx, name),
        resources: value?.resources || {},
        defaults: value?.defaults || {},
        schema: value?.schema || {},
        settings: themePluginSettings(ctx, name)
      }]))
    },
    compiler: { runtime: 'node22-esm', renderer: 'typescript-safe-html', markdown: 'commonmark-gfm', yaml: 'yaml-1.2', directives: 'pagekiln-block-directive' },
    presets: Object.entries(ctx.theme.presets || {}).map(([name, value]) => ({ name, ...(value as Record<string, any>) })),
    patterns: Object.values(ctx.themeDefinition.patterns).map(pattern => ({ name: pattern.name, contexts: pattern.contexts, resources: { styles: resourcePaths(pattern.resources, 'styles'), scripts: resourcePaths(pattern.resources, 'scripts') } })),
    blocks: Object.values(ctx.themeDefinition.blocks).map(block => ({
      name: block.name,
      schema: block.schema,
      defaults: block.defaults || {},
      contexts: block.contexts || ['page', 'post'],
      resources: { styles: resourcePaths(block.resources, 'styles'), scripts: resourcePaths(block.resources, 'scripts') },
      examples: [block.example || `:::${block.name}${Object.entries(block.defaults || {}).map(([key, value]) => `${key}="${value}"`).join(' ') ? `{${Object.entries(block.defaults || {}).map(([key, value]) => `${key}="${value}"`).join(' ')}}` : ''}\n:::`]
    })),
    collections: Object.entries(ctx.config.content?.collections || {}).map(([name, value]) => {
      const settings = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
      return {
        name,
        ...settings,
        contentType: String(settings.contentType || 'page'),
        route: String(settings.route || '/:locale/:id/'),
        pattern: String(settings.pattern || defaultPattern(ctx.config, name, '', ctx.themeDefinition.patterns)),
        schema: settings.schema && typeof settings.schema === 'object' ? settings.schema : {},
        feed: settings.feed === true,
        archive: settings.archive === true
      };
    }),
    views: Object.entries(ctx.config.content?.views || {}).map(([name, value]) => ({ name, ...(value && typeof value === 'object' && !Array.isArray(value) ? value : {}) })),
    languages: ctx.config.activeLocales || [ctx.config.defaultLocale || 'en'],
    agent: {
      optional: true,
      role: 'assistive',
      defaultCommands: ['npm install', 'pageskill s', 'pageskill g'],
      ...discoveryBoundaries(ctx),
      functionMap: agentFunctionMap()
    },
    privacy: {
      cookieConsent: {
        enabled: privacySettings.enabled === true && pluginEnabled(ctx, 'privacyConsent'),
        storage: String(privacySettings.storage || 'cookie'),
        retentionDays: Math.max(0, Number(privacySettings.retentionDays || 365)),
        categories: privacyCategories.map(publicPrivacyCategory),
        integrations: privacyIntegrationsData.map(publicPrivacyIntegration),
        policyRoute: String(privacySettings.policyRoute || '/:locale/privacy/'),
        agentRoute: String(privacySettings.agentRoute || '/.well-known/agent.json'),
        choices: { optionalDefault: false, rejectAvailable: true, withdrawAvailable: true }
      },
      machineReadable: { agent: '/.well-known/agent.json', catalog: '/.pagekiln/catalog.json', sitemap: '/sitemap.xml', llms: '/llms.txt' }
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
  let unchangedLegacy = false;
  if (!cachedHash && (ctx.cache.outputs || []).includes(normalized)) {
    try { unchangedLegacy = (await fs.readFile(target)).equals(incoming); } catch { /* missing legacy output */ }
  }
  if (!unchangedLegacy) {
    const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(temporary, incoming);
    await fs.rename(temporary, target);
    ctx.profile.changedOutputs += 1;
  }
  ctx.outputs.add(normalized);
  ctx.outputHashes[normalized] = incomingHash;
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
  const usedPatterns = new Set(ctx.docs.map(doc => doc.pattern));
  const dependencyFiles = new Set<string>();
  for (const file of [
    ...resourcePaths(themeResources(ctx), 'scripts'),
    ...genericPluginResourcePaths(ctx, 'styles'),
    ...genericPluginResourcePaths(ctx, 'scripts'),
    ...gatedScriptResourcePaths(ctx),
    ...(pluginEnabled(ctx, 'privacyConsent') ? pluginResourcePaths(ctx, ['privacyConsent', 'cookies'], 'styles') : []),
    ...(pluginEnabled(ctx, 'privacyConsent') ? pluginResourcePaths(ctx, ['privacyConsent', 'cookies'], 'scripts') : []),
    ...(pluginEnabled(ctx, 'search') ? pluginResourcePaths(ctx, ['search'], 'styles') : []),
    ...(pluginEnabled(ctx, 'search') ? pluginResourcePaths(ctx, ['search'], 'scripts') : []),
    ...(pluginEnabled(ctx, 'toc') ? pluginResourcePaths(ctx, ['toc'], 'styles') : []),
    ...(pluginEnabled(ctx, 'toc') ? pluginResourcePaths(ctx, ['toc'], 'scripts') : []),
    // The root language selector is generated by the compiler itself, so its
    // small enhancement script is copied whenever the theme declares it. It
    // is not an optional site integration and has no config switch.
    ...pluginResourcePaths(ctx, ['language', 'languagePicker'], 'styles'),
    ...pluginResourcePaths(ctx, ['language', 'languagePicker'], 'scripts')
  ]) dependencyFiles.add(safeRelativePath(file, 'theme resource path'));
  for (const pattern of usedPatterns) {
    for (const file of [...patternResourcePaths(ctx, pattern, 'styles'), ...patternResourcePaths(ctx, pattern, 'scripts')]) dependencyFiles.add(safeRelativePath(file, 'Pattern resource path'));
  }
  for (const doc of ctx.docs) for (const block of doc.blockNames.length ? doc.blockNames : ctx.cache.documents[doc.source]?.blocks || []) {
    for (const file of [...blockResourcePaths(ctx, block, 'styles'), ...blockResourcePaths(ctx, block, 'scripts')]) dependencyFiles.add(safeRelativePath(file, 'Block resource path'));
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
  await writeIfChanged(ctx, 'AGENTS.md', await fs.readFile(path.join(ctx.root, 'AGENTS.md'), 'utf8').catch(() => ''));
  const locale = ctx.config.defaultLocale || 'en';
  const siteName = localizedValue(ctx.config.siteName, locale, 'Pageskill');
  const manifestIcons = [
    ctx.config.icons?.icon192 ? { src: String(ctx.config.icons.icon192), sizes: '192x192', type: 'image/png' } : null,
    ctx.config.icons?.icon512 ? { src: String(ctx.config.icons.icon512), sizes: '512x512', type: 'image/png' } : null
  ].filter(Boolean);
  await writeIfChanged(ctx, 'site.webmanifest', JSON.stringify({ name: siteName, short_name: siteName, start_url: '/', display: 'minimal-ui', background_color: ctx.config.pwa?.backgroundColor || '#ffffff', theme_color: ctx.config.pwa?.themeColor || '#000000', icons: manifestIcons }, null, 2));
}

async function removeLegacyOutputs(ctx: BuildContext) {
  const legacyFiles = ['icon-192.png', 'icon-512.png', 'icon-source.png', 'og-default.png', 'og-default.jpg', 'og-default-source.png'];
  for (const file of legacyFiles) {
    try { await fs.rm(outputTarget(ctx, file).target); } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
  }
}

function xml(value: string) { return escapeHtml(value).replaceAll('&quot;', '&quot;'); }
function collectionSettings(ctx: BuildContext, collection: string): Record<string, any> {
  const value = ctx.config.content?.collections?.[collection];
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function isPostCollectionConfig(config: Record<string, any>, collection: string): boolean {
  const settings = config.content?.collections?.[collection];
  return collection === 'posts' || Boolean(settings && typeof settings === 'object' && !Array.isArray(settings) && settings.contentType === 'post');
}

function isPostCollection(ctx: BuildContext, collection: string): boolean {
  return isPostCollectionConfig(ctx.config, collection);
}

async function writeAgentInfo(ctx: BuildContext, siteUrl: string) {
  // Agent metadata describes active consent, locale, and discovery outputs;
  // it does not expose private configuration or claim disabled services.
  const settings = cookieConsentSettings(ctx);
  const locale = ctx.config.defaultLocale || 'en';
  const policyRoute = String(settings.policyRoute || '/:locale/privacy/');
  const policyRoutes = Object.fromEntries((ctx.config.activeLocales || [locale]).map((candidate: string) => [candidate, policyRoute.replace(':locale', candidate)]));
  const baseCategories = cookieCategories(settings, locale, themeLocaleData(ctx, locale).cookieConsent?.categories || [], themePluginCopy(ctx, 'privacyConsent', locale));
  const integrations = privacyIntegrations(settings, baseCategories);
  await writeIfChanged(ctx, '.well-known/agent.json', JSON.stringify({
    version: 1,
    site: { name: localizedValue(ctx.config.siteName, locale, 'Pageskill'), defaultLocale: locale, locales: ctx.config.activeLocales || [locale] },
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
      consentRequiredForOptional: true,
      optionalCookiesDefault: false,
      withdrawalAvailable: settings.enabled === true && pluginEnabled(ctx, 'privacyConsent'),
      enabled: settings.enabled === true && pluginEnabled(ctx, 'privacyConsent'),
      storage: String(settings.storage || 'cookie'),
      retentionDays: Math.max(0, Number(settings.retentionDays || 365)),
      categories: decorateCookieCategories(baseCategories, integrations, locale).map(publicPrivacyCategory),
      integrations: integrations.map(publicPrivacyIntegration),
      noAnalyticsByDefault: true,
      policyRoute,
      policyRoutes,
      agentRoute: String(settings.agentRoute || '/.well-known/agent.json'),
      note: 'Generated behavior disclosure; controller, provider, retention, and transfer details come from site configuration and deployment.'
    },
    agentGuidance: {
      optional: true,
      role: 'assistive',
      ...discoveryBoundaries(ctx),
      functionMap: agentFunctionMap()
    },
    generatedBy: { name: 'Pageskill', version: 3, static: true, siteUrl }
  }, null, 2));
}
function feedCollections(ctx: BuildContext): string[] {
  if (ctx.config.feed?.enabled === false) return [];
  if (typeof ctx.config.feed?.collection === 'string' && String(ctx.config.feed.collection).trim()) return [String(ctx.config.feed.collection)];
  if (Array.isArray(ctx.config.feed?.collections)) return ctx.config.feed.collections.map(String);
  return Object.entries(ctx.config.content?.collections || {})
    .filter(([, value]) => value && typeof value === 'object' && !Array.isArray(value) && (value as any).feed === true)
    .map(([name]) => name);
}
function feedCollection(ctx: BuildContext): string | undefined { return feedCollections(ctx)[0]; }
function feedRouteFor(ctx: BuildContext, locale: string, collection: string): string {
  const view = contentViewSettings(ctx, collection);
  const settings = collectionSettings(ctx, collection);
  const firstCollection = feedCollection(ctx);
  const configured = view.feedRoute || settings.feedRoute || (collection === firstCollection ? ctx.config.feed?.route : undefined) || (collection === 'posts' ? '/:locale/feed.xml' : `/:locale/${collection}/feed.xml`);
  return String(configured).replace(':locale', locale).replace(':collection', collection).replace(/\/{2,}/g, '/').replace(/([^:])\/\//g, '$1/');
}
function archiveCollections(ctx: BuildContext): string[] {
  if (ctx.config.archive?.enabled === false) return [];
  if (typeof ctx.config.archive?.collection === 'string') return [String(ctx.config.archive.collection)];
  if (Array.isArray(ctx.config.archive?.collections)) return ctx.config.archive.collections.map(String);
  return Object.entries(ctx.config.content?.collections || {}).filter(([, value]) => (value as any)?.archive === true).map(([name]) => name);
}
function feedXml(ctx: BuildContext, locale: string, collection: string) {
  const entries = documentsForCollection(ctx, collection, locale).slice(0, Number(ctx.config.feed?.limit || 20));
  const site = String(ctx.config.siteUrl || '').replace(/\/$/, '');
  return `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>${xml(localizedValue(ctx.config.feed?.title, locale, localizedValue(ctx.config.siteName, locale, 'Site')))}</title><link>${xml(site)}</link><description>${xml(localizedValue(ctx.config.description, locale, ''))}</description>${entries.map(entry => { const parsed = entry.date ? new Date(entry.date) : null; const published = parsed && !Number.isNaN(parsed.valueOf()) ? parsed.toUTCString() : entry.date || ''; return `<item><title>${xml(entry.title)}</title><link>${xml(`${site}${routeFor(ctx, entry)}`)}</link><guid>${xml(`${site}${routeFor(ctx, entry)}`)}</guid><pubDate>${xml(published)}</pubDate><description>${xml(entry.description)}</description></item>`; }).join('')}</channel></rss>`;
}

function searchIndex(ctx: BuildContext, locale: string) {
  return sourceDocuments(ctx).filter(doc => doc.locale === locale).sort((left, right) => routeFor(ctx, left).localeCompare(routeFor(ctx, right))).map(doc => ({
    id: doc.id,
    collection: documentViewCollection(ctx, doc),
    category: postCategory(doc),
    title: doc.title,
    description: doc.description,
    url: routeFor(ctx, doc),
    date: doc.date || '',
    headings: doc.nodes.filter(node => node.kind === 'heading').map(node => node.text).join(' '),
    text: doc.markdown.replaceAll(/[`*_>#]/g, ' ').replaceAll(/:::.*$/gm, ' ').replaceAll(/\s+/g, ' ').trim()
  }));
}

async function writeSearch(ctx: BuildContext, locale: string) {
  const settings = themePluginSettings(ctx, 'search');
  if (!pluginEnabled(ctx, 'search')) return;
  const entries = searchIndex(ctx, locale);
  const shardSize = Math.max(50, Number(settings.shardSize || 500));
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
  const shardSize = Math.max(50, Number(ctx.config.llms?.full?.shardSize || 250));
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
  const pageSize = Math.max(10, Number(ctx.config.archive?.pageSize || 50));
  for (const collection of archiveCollections(ctx)) for (const locale of ctx.config.activeLocales || [ctx.config.defaultLocale || 'en']) {
    const entries = documentsForCollection(ctx, collection, locale);
    if (!entries.length) continue;
    const base = String(ctx.config.archive?.route || contentViewSettings(ctx, collection).archiveRoute || collectionSettings(ctx, collection).archiveRoute || `/:locale/${collection}/`).replace(':locale', locale).replace(':collection', collection).replace(/\/+/g, '/').replace(/([^:])\/\//g, '$1/');
    const archiveBase = `/${base.replace(/^\/+|\/+$/g, '')}/`;
    const pages = Math.ceil(entries.length / pageSize);
    for (let page = 1; page <= pages; page += 1) {
      const route = page === 1 ? archiveBase : `${archiveBase}page/${page}/`;
      const title = themeText(ctx, locale, `archive.${collection}.title`, themeText(ctx, locale, 'archive.title', collection));
      const readLabel = themeText(ctx, locale, `archive.${collection}.continue`, themeText(ctx, locale, 'archive.continue', 'Read note'));
      const archiveDescription = themeText(ctx, locale, `archive.${collection}.description`, themeText(ctx, locale, 'archive.description', `Published ${collection}`));
      const publishedLabel = themeText(ctx, locale, 'post.published', 'Published');
      const authorLabel = themeText(ctx, locale, 'post.author', 'Author');
      const coverAltLabel = themeText(ctx, locale, 'post.coverAlt', 'Cover image');
      const pageCount = locale.startsWith('zh-tw') ? `第 ${page} 頁，共 ${pages} 頁` : locale.startsWith('zh') ? `第 ${page} 页，共 ${pages} 页` : `Page ${page} of ${pages}`;
      const listing = entries.slice((page - 1) * pageSize, page * pageSize).map(entry => {
        const coverUrl = publicImageUrl(entry.data?.cover || entry.data?.ogImage);
        const coverMarkup = coverUrl ? `<div class="archive-entry-cover"><img src="${coverUrl}" alt="${escapeHtml(`${coverAltLabel}: ${entry.title}`)}" width="1200" height="630" sizes="144px" loading="lazy" decoding="async"></div>` : '';
        const author = entry.author || localizedValue(ctx.config.author, locale, 'Site Owner');
        return `<article class="archive-entry">${coverMarkup}<p class="archive-entry-index"><span class="archive-entry-label">${escapeHtml(publishedLabel)}</span><time datetime="${escapeHtml(entry.date || '')}">${formatDate(entry.date, locale)}</time></p><div class="archive-entry-main"><h2><a href="${safeUrl(routeFor(ctx, entry))}">${escapeHtml(entry.title)}</a></h2>${entry.description ? `<p class="archive-entry-summary">${escapeHtml(entry.description)}</p>` : ''}<p class="archive-entry-author"><span class="archive-entry-label">${escapeHtml(authorLabel)}</span> ${escapeHtml(author)}</p><p class="archive-entry-action"><a href="${safeUrl(routeFor(ctx, entry))}">${escapeHtml(readLabel)} <span aria-hidden="true">↗</span></a></p></div></article>`;
      }).join('');
      const previousHref = page === 2 ? archiveBase : `${archiveBase}page/${page - 1}/`;
      const nextHref = `${archiveBase}page/${page + 1}/`;
      const pagination = `<nav class="archive-pagination" aria-label="${escapeHtml(title)}">${page > 1 ? `<a href="${safeUrl(previousHref)}">${escapeHtml(themeText(ctx, locale, 'archive.previousPage', 'Previous page'))}</a>` : '<span aria-hidden="true"></span>'}<span class="archive-page-count">${escapeHtml(pageCount)}</span>${page < pages ? `<a href="${safeUrl(nextHref)}">${escapeHtml(themeText(ctx, locale, 'archive.nextPage', 'Next page'))}</a>` : '<span aria-hidden="true"></span>'}</nav>`;
      const document: Document = { id: `archive-${collection}-${page}`, collection: 'archive', locale, source: `generated:archive:${collection}:${locale}:${page}`, title, description: archiveDescription, pattern: 'document', date: undefined, data: { route, archiveCollection: collection }, markdown: '', excerpt: '', bodyLine: 1, nodes: [], directives: [], dependencyKeys: [], blockNames: [], hash: '', stat: { mtimeMs: 0, size: 0 } };
      const archiveHeader = `<header class="archive-header"><p class="eyebrow">${escapeHtml(themeText(ctx, locale, `collections.${collection}`, collection))}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(archiveDescription)}</p></header>`;
      await writeIfChanged(ctx, `${route.replace(/^\//, '')}index.html`, pageShell(ctx, document, `${archiveHeader}<section class="archive-list">${listing}</section>${pagination}`));
      routes.push(route);
    }
  }
  return routes;
}

async function writeDeployments(ctx: BuildContext) {
  if (ctx.config.deployment?.enabled === false) return;
  const locale = ctx.config.defaultLocale || 'en';
  const deployment = ctx.config.deployment && typeof ctx.config.deployment === 'object' ? ctx.config.deployment : {};
  const publicDirectory = configuredPublicDirectory(ctx.config);
  const publicDirectoryLiteral = JSON.stringify(publicDirectory);
  // Embed only renderer-derived public metadata in adapters; private config
  // and backend implementation details never cross the deployment boundary.
  const discoveryLiteral = JSON.stringify(siteDiscoveryOptions(ctx));
  const cloudflare = deployment.cloudflare && typeof deployment.cloudflare === 'object' ? deployment.cloudflare : {};
  const workers = cloudflare.workers && typeof cloudflare.workers === 'object' ? cloudflare.workers : {};
  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  const runtimeCandidates = [path.join(moduleDirectory, 'fetch-router.js'), path.join(moduleDirectory, 'runtime', 'fetch-router.js')];
  let fetchRouterSource = '';
  for (const candidate of runtimeCandidates) {
    try { fetchRouterSource = await fs.readFile(candidate, 'utf8'); break; } catch { /* try source-mode runtime location */ }
  }
  if (!fetchRouterSource) throw new Error('compiled Fetch router is missing; run npm run compile-runtime');
  await writeIfChanged(ctx, '_pagekiln/fetch-router.js', fetchRouterSource);
  await writeIfChanged(ctx, 'server/_pagekiln/fetch-router.js', fetchRouterSource);
  const securityRuntimeCandidates = [path.join(moduleDirectory, 'lib', 'static-security.js'), path.join(moduleDirectory, 'runtime', 'lib', 'static-security.js')];
  let securityRuntimeSource = '';
  for (const candidate of securityRuntimeCandidates) {
    try { securityRuntimeSource = await fs.readFile(candidate, 'utf8'); break; } catch { /* try the other compiled runtime location */ }
  }
  if (!securityRuntimeSource) throw new Error('compiled static-security runtime is missing; run npm run compile-runtime');
  await writeIfChanged(ctx, '_pagekiln/lib/static-security.js', securityRuntimeSource);
  await writeIfChanged(ctx, 'server/_pagekiln/lib/static-security.js', securityRuntimeSource);

  const backendSource = path.join(ctx.root, 'backend', 'handler.ts');
  let backendEnabled = false;
  try { await fs.access(backendSource); backendEnabled = ctx.config.deployment?.backend !== false; } catch { /* static-only project */ }
  if (backendEnabled) {
    const backendRuntime = path.join(ctx.root, '.pagekiln', 'backend-runtime');
    const backendEntry = path.join(backendRuntime, 'backend', 'handler.js');
    try { await fs.access(backendEntry); } catch { throw new Error('backend/handler.ts exists but its JavaScript runtime is missing; run npm run compile-backend'); }
    for (const file of await walk(backendRuntime, ['.js'])) {
      const relative = normalizePath(path.relative(backendRuntime, file));
      const source = await fs.readFile(file);
      await writeIfChanged(ctx, `_pagekiln/${relative}`, source);
      await writeIfChanged(ctx, `server/_pagekiln/${relative}`, source);
    }
  }

  const backendImport = backendEnabled ? `import { router } from './_pagekiln/backend/handler.js';\n` : 'const router = undefined;\n';
  const localeLiteral = JSON.stringify(String(locale));
  const worker = `import { createSiteFetchHandler } from './_pagekiln/fetch-router.js';\n${backendImport}const fetchHandler = createSiteFetchHandler({ router, defaultLocale: ${localeLiteral}, staticDirectory: ${publicDirectoryLiteral}, discovery: ${discoveryLiteral} });\nexport { fetchHandler };\nexport default { fetch: fetchHandler };\n`;
  await writeIfChanged(ctx, 'cloudflare-worker.mjs', worker);
  if (backendEnabled) await writeIfChanged(ctx, '_worker.js', worker);
  await writeIfChanged(ctx, '.assetsignore', `_worker.js\ncloudflare-worker.mjs\nvps-server.mjs\nwrangler.toml\n_pagekiln/*\nserver/*\n.pagekiln/*\n`);
  // Keep the old list readable for static-only projects, but a backend must
  // run first for every pathname: registered Router paths are not an asset
  // allowlist and may live outside `/api`.
  const routes = legacyDynamicRoutes(ctx.config);
  const workerFirst = backendEnabled ? 'true' : routes.length ? `[ ${routes.map(route => JSON.stringify(route)).join(', ')} ]` : 'false';
  const workerName = String(workers.name || 'pageskill-site');
  const compatibilityDate = String(workers.compatibilityDate || '2026-08-10');
  const accountId = cloudflare.accountId ? `account_id = ${JSON.stringify(String(cloudflare.accountId))}\n` : '';
  await writeIfChanged(ctx, 'wrangler.toml', `${accountId}name = ${JSON.stringify(workerName)}\nmain = "cloudflare-worker.mjs"\ncompatibility_date = ${JSON.stringify(compatibilityDate)}\n\n[assets]\ndirectory = ${JSON.stringify(`./${publicDirectory}`)}\nbinding = "ASSETS"\nrun_worker_first = ${workerFirst}\nhtml_handling = "auto-trailing-slash"\nnot_found_handling = "404-page"\n`);
  const denoBackendImport = backendEnabled ? `import { router } from './_pagekiln/backend/handler.js';\n` : 'const router = undefined;\n';
  const vpsStaticSource = `import { publicPathFromUrl, isPublicPath } from './_pagekiln/lib/static-security.js';\nconst staticRootPath = await Deno.realPath(new URL(${JSON.stringify(`./${publicDirectory}/`)}, import.meta.url));\nconst staticRoot = staticRootPath.replaceAll('\\\\', '/');\nconst staticRootPrefix = staticRoot.endsWith('/') ? staticRoot : staticRoot + '/';\nconst staticTypes = ${JSON.stringify({
    '.css': 'text/css; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.eot': 'application/vnd.ms-fontobject',
    '.gif': 'image/gif', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon', '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.pdf': 'application/pdf',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8'
  })};
function staticContentType(pathname) { const extension = pathname.slice(pathname.lastIndexOf('.')).toLowerCase(); return staticTypes[extension] || 'application/octet-stream'; }
function staticCacheControl(pathname) { return /^\\/assets\\/(?:[^/]+\\/)*[^/]+\\.[a-f0-9]{12}\\.(?:css|js|mjs)$/i.test(pathname) ? 'public, max-age=31536000, immutable' : 'no-cache'; }
async function fetchStaticAsset(request) {
  const method = String(request.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  const decodedPath = publicPathFromUrl(request.url, { staticDirectory: ${publicDirectoryLiteral} });
  if (!decodedPath) return new Response('Not found', { status: 404 });
  const pathname = decodedPath === '/' || decodedPath.endsWith('/') ? decodedPath + 'index.html' : decodedPath;
  const relative = pathname.replace(/^\\/+/, '');
  let target;
  try { target = await Deno.realPath(staticRootPath + '/' + relative); } catch { return new Response('Not found', { status: 404 }); }
  const canonicalTarget = target.replaceAll('\\\\', '/');
  if (canonicalTarget !== staticRoot && !canonicalTarget.startsWith(staticRootPrefix)) return new Response('Not found', { status: 404 });
  const targetRelative = canonicalTarget.slice(staticRoot.length).replace(/^\\/+/, '');
  if (!isPublicPath('/' + targetRelative, { staticDirectory: ${publicDirectoryLiteral} })) return new Response('Not found', { status: 404 });
  let body;
  try { body = await Deno.readFile(target); } catch { return new Response('Not found', { status: 404 }); }
  const headers = new Headers({ 'content-type': staticContentType(pathname) });
  headers.set('cache-control', staticCacheControl(pathname));
  return new Response(method === 'HEAD' ? null : body, { status: 200, headers });
}
`;
  await writeIfChanged(ctx, 'vps-server.mjs', `${vpsStaticSource}import { createSiteFetchHandler } from './_pagekiln/fetch-router.js';\n${denoBackendImport}const runtimeEnv = new Proxy({}, { get: (_target, key) => Deno.env.get(String(key)) });\nconst fetchHandler = createSiteFetchHandler({ router, defaultLocale: ${JSON.stringify(String(locale))}, staticDirectory: ${publicDirectoryLiteral}, discovery: ${discoveryLiteral}, assets: fetchStaticAsset });\nconst port = Number(Deno.env.get('PORT') || '8787');\nconst hostname = Deno.env.get('HOST') || '127.0.0.1';\nDeno.serve({ port, hostname }, (request, info) => fetchHandler(request, runtimeEnv, info));\nexport { fetchHandler };\n`);
  const sitesBackendImport = backendEnabled ? `import { router } from './_pagekiln/backend/handler.js';\n` : 'const router = undefined;\n';
  const openAiSites = hasOpenAiSitesDeployment(ctx.config);
  const staticOption = openAiSites ? `, staticDirectory: ${publicDirectoryLiteral}` : '';
  const staticAssetsImport = openAiSites ? `import { fetchStaticAsset } from './_pagekiln/static-assets.js';\n` : '';
  const staticAssetsOption = openAiSites ? ', assets: fetchStaticAsset' : '';
  await writeIfChanged(ctx, 'server/index.js', `import { createSiteFetchHandler } from './_pagekiln/fetch-router.js';\n${sitesBackendImport}${staticAssetsImport}const fetchHandler = createSiteFetchHandler({ router, defaultLocale: ${localeLiteral}${staticOption}, discovery: ${discoveryLiteral}${staticAssetsOption} });\nexport { fetchHandler };\nexport default { fetch: fetchHandler };\n`);
}

function openaiSitesStaticDirectory(ctx: BuildContext): string {
  return configuredStaticDirectory(ctx.config);
}

async function writeSiteStaticDirectory(ctx: BuildContext) {
  const staticDirectory = configuredPublicDirectory(ctx.config);
  if (!staticDirectory) return;
  const targetPrefix = `${staticDirectory}/`;
  // A route or asset whose URL already occupies the configured public prefix
  // would be overwritten by the snapshot. Fail before copying any files.
  for (const output of ctx.outputs) {
    if (output === staticDirectory || output.startsWith(targetPrefix)) {
      throw new Error(`config.yml: deployment.staticDirectory "${staticDirectory}" conflicts with generated output "${output}"; choose another public subdirectory`);
    }
  }
  const outputs = [...ctx.outputs];
  for (const output of outputs) {
    if (!output || output.startsWith(targetPrefix) || !isPublicPath(`/${output}`, { staticDirectory })) continue;
    try {
      await writeIfChanged(ctx, `${staticDirectory}/${output}`, await fs.readFile(outputTarget(ctx, output).target));
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

function staticContentType(file: string): string {
  const normalized = normalizePath(file).replace(/^\/+/, '');
  if (normalized === '.well-known/api-catalog') return 'application/linkset+json; charset=utf-8';
  if (normalized === '.well-known/oauth-protected-resource' || normalized === '.well-known/oauth-authorization-server') return 'application/json; charset=utf-8';
  const types: Record<string, string> = {
    '.css': 'text/css; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.eot': 'application/vnd.ms-fontobject',
    '.gif': 'image/gif', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon', '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.pdf': 'application/pdf',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8'
  };
  return types[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

async function writeSiteStaticRuntime(ctx: BuildContext) {
  // The Sites adapter is the only consumer that needs a generated base64
  // asset table. Mixed deployments use the public directory through ASSETS
  // (or the Deno callback in vps-server.mjs) by default.
  if (!hasOpenAiSitesDeployment(ctx.config)) return;
  const staticDirectory = configuredPublicDirectory(ctx.config);
  if (!staticDirectory) return;
  const staticPrefix = `${staticDirectory}/`;
  const entries: string[] = [];
  // Read only outputs recorded during this build. Walking the directory would
  // re-embed stale files from a deleted page (or an untracked manual file)
  // before the old-output cleanup below runs.
  for (const output of [...ctx.outputs].sort()) {
    if (!output.startsWith(staticPrefix)) continue;
    const relative = output.slice(staticPrefix.length);
    if (!relative) continue;
    // Only files in the public root are embedded. Deployment metadata,
    // generated runtimes, caches, and server code must never become assets.
    if (!isPublicPath(`/${relative}`, { staticDirectory })) continue;
    const data = (await fs.readFile(outputTarget(ctx, output).target)).toString('base64');
    entries.push(`  ${JSON.stringify(`/${relative}`)}: [${JSON.stringify(staticContentType(relative))}, ${JSON.stringify(data)}]`);
  }
  const staticDirectoryLiteral = JSON.stringify(staticDirectory);
  const source = `import { publicPathFromUrl } from './lib/static-security.js';\n\nconst assets = {\n${entries.join(',\n')}\n};\n\nfunction decode(value) {\n  const binary = atob(value);\n  const bytes = new Uint8Array(binary.length);\n  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);\n  return bytes;\n}\n\nfunction staticCacheControl(pathname) { return /^\\/assets\\/(?:[^/]+\\/)*[^/]+\\.[a-f0-9]{12}\\.(?:css|js|mjs)$/i.test(pathname) ? 'public, max-age=31536000, immutable' : 'no-cache'; }\n\nexport function fetchStaticAsset(request) {\n  const method = String(request.method || 'GET').toUpperCase();\n  if (method !== 'GET' && method !== 'HEAD') return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });\n  const decodedPath = publicPathFromUrl(request.url, { staticDirectory: ${staticDirectoryLiteral} });\n  if (!decodedPath) return new Response('Not found', { status: 404 });\n  const pathname = decodedPath === '/' || decodedPath.endsWith('/') ? decodedPath + 'index.html' : decodedPath;\n  const asset = assets[pathname];\n  if (!asset) return new Response('Not found', { status: 404 });\n  const headers = new Headers({ 'content-type': asset[0], 'cache-control': staticCacheControl(pathname) });\n  return new Response(method === 'HEAD' ? null : decode(asset[1]), { status: 200, headers });\n}\n`;
  await writeIfChanged(ctx, 'server/_pagekiln/static-assets.js', source);
}

export async function createContext(root = process.cwd()): Promise<BuildContext> {
  const discoverStart = performance.now();
  let cache = await readJson<CacheManifest>(path.join(root, '.pagekiln', 'manifest.json'), { version: 2, documents: {}, outputs: [] });
  if (cache.rendererVersion !== RENDERER_VERSION) cache = { ...cache, documents: {} };
  const configFile = path.join(root, 'config.yml');
  const configSource = await fs.readFile(configFile, 'utf8');
  const config = parseYaml(configSource);
  assertConfigSurface(config);
  const themeName = configuredThemeName(config);
  const themeRoot = containedPath(path.join(root, 'themes'), themeName, 'theme directory');
  const themeSource = await fs.readFile(path.join(themeRoot, 'theme.yml'), 'utf8').catch(() => '{}');
  const theme = parseYaml(themeSource);
  const themeFiles = await walk(themeRoot, ['.yml', '.css', '.js', '.mjs', '.ts']);
  const themeReads = await parallelMap(themeFiles, 16, async file => ({
    relative: normalizePath(path.relative(themeRoot, file)),
    source: await fs.readFile(file, 'utf8')
  }));
  const themeChunks = themeReads.map(({ relative, source }) => `${relative}\0${source}`);
  const themeStyleSources = new Map(themeReads
    .filter(({ relative }) => path.extname(relative).toLowerCase() === '.css')
    .map(({ relative, source }) => [relative, source] as const));
  const themeAssetHashes = Object.fromEntries(themeReads
    .filter(({ relative }) => ['.css', '.js', '.mjs'].includes(path.extname(relative).toLowerCase()))
    .map(({ relative, source }) => {
      const extension = path.extname(relative).toLowerCase();
      return [relative, shortHash(extension === '.css' ? minifyCss(source) : source).slice(0, 12)];
    }));
  const backendRoot = path.join(root, 'backend');
  const backendFiles = await walk(backendRoot, ['.ts']);
  const backendStats = await parallelMap(backendFiles, 16, async file => {
    const stat = await fs.stat(file);
    return [normalizePath(path.relative(backendRoot, file)), String(stat.mtimeMs), String(stat.size)].join('\0');
  });
  const backendHash = shortHash(backendStats.join('\0'));
  const configHash = shortHash(configSource);
  const themeHash = shortHash(themeChunks.join('\0'));
  // The public asset fingerprint remains content based.  Theme module imports
  // use a per-context generation so a long-lived preview process cannot keep
  // an old nested layout/component module from Node's ESM cache.
  const generation = `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}`;
  const themeDefinition = await loadThemeDefinition(root, themeName, theme, themeHash, generation);
  const themeConfig = normalizeThemeConfig(config, theme, themeDefinition, themeName);
  const themeI18n = await loadThemeI18n(themeRoot, themeDefinition, String(config.i18n?.fallbackLocale || config.defaultLocale || 'en'));
  // Keep site-level visual options from the legacy YAML while exposing one
  // normalized definition to all compiler consumers. Resource discovery is
  // owned by the defineTheme export, not by a second file registry.
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
      return {
        ...cached,
        ...identity,
        pattern: String(cached.data?.pattern || defaultPattern(config, identity.collection, identity.id, themeDefinition.patterns)),
        author: cached.data?.author ? String(cached.data.author) : localizedValue(config.author, identity.locale, 'Site Owner'),
        cover: cached.cover || (cached.data?.cover ? String(cached.data.cover) : undefined),
        excerpt: typeof cached.excerpt === 'string' ? cached.excerpt : cached.markdown,
        source,
        bodyLine: cached.bodyLine || 1,
        stat: { mtimeMs: stat.mtimeMs, size: stat.size },
        nodes: [],
        directives: [],
        dependencyKeys: cached.dependencies || [],
        blockNames: cached.blocks || []
      } as Document;
    }
    return loadDocument(root, source, config, sourceParseCache, themeDefinition.patterns);
  });
  const docs = loadedDocs.filter((doc): doc is Document => doc !== null);
  profile.load = duration(loadStart);
  profile.documents = docs.length;
  const byKey = new Map(docs.map(doc => [`${doc.collection}:${doc.id}:${doc.locale}`, doc]));
  return { root, out: path.join(root, 'dist'), config, theme: runtimeTheme, themeConfig, themeI18n, themeDefinition, docs, byKey, routes: new Map(), cache, profile, outputs: new Set(), diagnostics: [], configHash, themeHash, assetHash, backendHash, contentRoots, imageCache: {}, outputHashes: {}, collectionIndex: new Map(), translationIndex: new Map(), documentPositions: new Map(), tagIndex: new Map(), markdownCache: new Map(), sourceParseCache, themeStyleSources, themeAssetHashes };
}

export async function refreshContext(ctx: BuildContext, changedFiles: string[] = []): Promise<BuildContext> {
  const absoluteChanges = [...new Set(changedFiles.map(file => path.resolve(ctx.root, file)))];
  if (!absoluteChanges.length) {
    const fresh = await createContext(ctx.root);
    Object.assign(ctx, fresh);
    return ctx;
  }

  const normalizedRoot = normalizePath(path.resolve(ctx.root)).toLocaleLowerCase();
  const configPath = `${normalizedRoot}/config.yml`;
  const themePrefix = `${normalizedRoot}/themes/`;
  const contentPrefix = `${normalizedRoot}/content/`;
  const agentPath = `${normalizedRoot}/agents.md`;
  const backendPrefix = normalizedRoot + '/backend/';
  const requiresGlobalReload = absoluteChanges.some(file => {
    const normalized = normalizePath(file).toLocaleLowerCase();
    return normalized === configPath || normalized === agentPath || normalized.startsWith(themePrefix) || normalized.startsWith(backendPrefix) || (normalized.startsWith(contentPrefix) && path.extname(normalized) !== '.md');
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
      const loaded = await loadDocument(ctx.root, file, ctx.config, ctx.sourceParseCache, ctx.themeDefinition.patterns);
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
  if (!outputDirectoryExists) {
    const stageRoot = path.join(ctx.root, '.pagekiln');
    await fs.mkdir(stageRoot, { recursive: true });
    for (const entry of await fs.readdir(stageRoot, { withFileTypes: true })) if (entry.isDirectory() && entry.name.startsWith('output-stage-')) {
      await fs.rm(path.join(stageRoot, entry.name), { recursive: true, force: true });
    }
    const temporary = path.join(stageRoot, `output-stage-${process.pid}-${Date.now()}`);
    await fs.mkdir(temporary, { recursive: true });
    ctx.stagedOutput = { final: finalOutput, temporary };
    ctx.out = temporary;
  }

  const globalChanged = !outputDirectoryExists || ctx.cache.rendererVersion !== RENDERER_VERSION || ctx.cache.configHash !== ctx.configHash || ctx.cache.themeHash !== ctx.themeHash || ctx.cache.backendHash !== ctx.backendHash;
  const assetChanged = ctx.cache.assetHash !== ctx.assetHash;
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
    await writeIfChanged(ctx, '.pagekiln/build-profile.json', JSON.stringify(ctx.profile, null, 2));
    return ctx;
  }

  await removeLegacyOutputs(ctx);

  const affected = new Set<string>();
  for (const doc of ctx.docs) {
    const cached = ctx.cache.documents[doc.source];
    const dependent = (cached?.dependencies || []).some(key => dependencyChanges.has(key));
    if (globalChanged || directlyChanged.has(doc.source) || !cached || dependent) affected.add(doc.source);
    else for (const output of cached.outputs || documentOutputs(ctx, doc)) retainOutput(ctx, output);
  }

  ctx.profile.parse = 0;

  const validateStart = performance.now();
  for (const doc of ctx.docs) {
    validateDocumentSchema(ctx, doc);
    if (!ctx.themeDefinition.patterns[doc.pattern]) ctx.diagnostics.push(`${doc.source}:1:1: unknown Pattern "${doc.pattern}"; use one of ${Object.keys(ctx.themeDefinition.patterns).join(', ')}`);
  }
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
      if (!ctx.themeDefinition.blocks[node.name]) throw new MarkdownError(`unknown Block "${node.name}"; use one of ${Object.keys(ctx.themeDefinition.blocks).join(', ')}`, node.position);
      validateThemeAttrs(node, ctx.themeDefinition.blocks[node.name]);
    }
    doc.dependencyKeys = dependenciesFor(ctx, doc);
    doc.blockNames = [...new Set(doc.directives.map(directive => directive.name))].sort();
    const context = themeContextFor(ctx, doc);
    const rendered = context.renderNodes(contentNodes(doc));
    const pattern = ctx.themeDefinition.patterns[doc.pattern] || ctx.themeDefinition.patterns.document;
    await writeIfChanged(ctx, `${routeFor(ctx, doc).replace(/^\//, '')}index.html`, pageShell(ctx, doc, pattern.render(rendered, context)));
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
  const archiveRoutes = ctx.config.archive?.enabled === false ? [] : await writeArchives(ctx);
  const sitemapDocuments = [...ctx.routes.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([route, doc]) => {
    const translations = ctx.translationIndex.get(translationKey(doc.collection, doc.id)) || [];
    const lines = ['<url>', `  <loc>${xml(`${siteUrl}${route}`)}</loc>`];
    if (doc.date && !Number.isNaN(new Date(doc.date).valueOf())) lines.push(`  <lastmod>${xml(new Date(doc.date).toISOString().slice(0, 10))}</lastmod>`);
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
  await writeIfChanged(ctx, '.pagekiln/catalog.json', JSON.stringify(catalog(ctx), null, 2)); await writeDeployments(ctx); await copyThemeAndAssets(ctx); await writeSiteStaticDirectory(ctx); await writeSiteStaticRuntime(ctx); ctx.profile.assets = duration(assetStart);
  const previousOutputs = new Set(ctx.cache.outputs || []); const writeStart = performance.now();
  for (const old of previousOutputs) {
    const { normalized, target } = outputTarget(ctx, old);
    if (ctx.outputs.has(normalized)) continue;
    try { await fs.rm(target); } catch (error: any) { if (error.code !== 'ENOENT') throw error; }
  }
  if (openaiSitesStaticDirectory(ctx) === 'dist') {
    const legacyStaticDirectory = outputTarget(ctx, 'static').target;
    await fs.rm(legacyStaticDirectory, { recursive: true, force: true });
  }
  ctx.profile.write = duration(writeStart);
  ctx.outputs.add('.pagekiln/build-profile.json');
  const manifest: CacheManifest = { version: 2, rendererVersion: RENDERER_VERSION, configHash: ctx.configHash, themeHash: ctx.themeHash, assetHash: ctx.assetHash, backendHash: ctx.backendHash, contentRoots: ctx.contentRoots, routeCount: ctx.routes.size, documents: Object.fromEntries(ctx.docs.map(doc => {
    const dependencies = doc.dependencyKeys.length ? doc.dependencyKeys : ctx.cache.documents[doc.source]?.dependencies || [];
    const blocks = doc.blockNames.length ? doc.blockNames : ctx.cache.documents[doc.source]?.blocks || [];
    return [doc.source, { hash: doc.hash, outputs: documentOutputs(ctx, doc), dependencies, blocks, mtimeMs: doc.stat.mtimeMs, size: doc.stat.size, collection: doc.collection, id: doc.id, locale: doc.locale, title: doc.title, description: doc.description, pattern: doc.pattern, date: doc.date, author: doc.author, cover: doc.cover, data: doc.data, markdown: doc.markdown, excerpt: doc.excerpt, bodyLine: doc.bodyLine || 1 }];
  })), images: ctx.imageCache, outputs: [...ctx.outputs].sort(), outputHashes: Object.fromEntries([...ctx.outputs].map(output => [output, ctx.outputHashes[output] || ctx.cache.outputHashes?.[output] || '']).filter(([, hash]) => Boolean(hash))) };
  const cacheDirectory = path.join(ctx.root, '.pagekiln');
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
  await writeIfChanged(ctx, '.pagekiln/build-profile.json', JSON.stringify(ctx.profile, null, 2));
  ctx.cache = manifest;
  if (ctx.stagedOutput) {
    const staged = ctx.stagedOutput;
    await fs.rename(staged.temporary, staged.final);
    ctx.out = staged.final;
    ctx.stagedOutput = undefined;
  }
  return ctx;
}

export async function check(ctx: BuildContext) {
  for (const doc of ctx.docs) if (!doc.nodes.length && doc.markdown) { doc.nodes = parseMarkdown(doc.markdown, doc.source, doc.bodyLine || 1); doc.directives = flattenDirectives(doc.nodes); }
  const errors = [...ctx.diagnostics]; for (const doc of ctx.docs) for (const node of doc.directives) if (!ctx.themeDefinition.blocks[node.name]) errors.push(diagnostic(node.position, `unknown Block "${node.name}"; add it to the active theme or choose a supported Block`));
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
    pattern: doc.pattern,
    route: routeFor(ctx, doc),
    source: doc.source,
    title: doc.title,
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
  const availableNamespaces = ['block', 'pattern', 'collection', 'plugin', 'page', 'post', 'update'];
  if (!availableNamespaces.includes(namespace)) {
    throw new InspectError('INSPECT_INVALID_QUERY', `Unsupported inspect namespace "${namespace}".`, { query: rawQuery, allowedNamespaces: availableNamespaces });
  }
  if (!id) throw new InspectError('INSPECT_INVALID_QUERY', `Inspect namespace "${namespace}" requires an id.`, { query: rawQuery, allowedNamespaces: availableNamespaces });

  if (namespace === 'page' || namespace === 'post' || namespace === 'update') {
    const collection = namespace === 'page' ? 'pages' : 'posts';
    return inspectContent(ctx, rawQuery, collection, id, namespace === 'update' ? 'update' : undefined);
  }

  if (namespace === 'block') {
    const block = ctx.themeDefinition.blocks[id];
    if (!block) inspectNotFound(rawQuery, 'Block', Object.keys(ctx.themeDefinition.blocks).sort());
    return {
      kind: 'block',
      query: rawQuery,
      item: {
        name: block.name,
        schema: block.schema,
        defaults: block.defaults || {},
        contexts: block.contexts || ['page', 'post'],
        resources: {
          styles: resourcePaths(block.resources, 'styles'),
          scripts: resourcePaths(block.resources, 'scripts')
        },
        examples: [block.example || `:::${block.name}\n:::`]
      }
    };
  }

  if (namespace === 'pattern') {
    const pattern = ctx.themeDefinition.patterns[id];
    if (!pattern) inspectNotFound(rawQuery, 'Pattern', Object.keys(ctx.themeDefinition.patterns).sort());
    return {
      kind: 'pattern',
      query: rawQuery,
      item: {
        name: pattern.name,
        contexts: pattern.contexts,
        resources: {
          styles: resourcePaths(pattern.resources, 'styles'),
          scripts: resourcePaths(pattern.resources, 'scripts')
        }
      }
    };
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
        pattern: String(settings.pattern || defaultPattern(ctx.config, id, '', ctx.themeDefinition.patterns)),
        schema: settings.schema && typeof settings.schema === 'object' ? settings.schema : {},
        feed: settings.feed === true,
        archive: settings.archive === true
      }
    };
  }

  const themePlugin = themePluginFor(ctx, id);
  const settings = themePluginSettings(ctx, id);
  if (themePlugin === undefined) inspectNotFound(rawQuery, 'plugin', Object.keys(ctx.themeDefinition.plugins || {}).sort());
  return {
    kind: 'plugin',
    query: rawQuery,
    item: {
      name: id,
      enabled: themePlugin ? settings.enabled !== false : false,
      theme: themePlugin ? { ...themePlugin, settings } : null,
      config: settings
    }
  };
}

export function getCatalog(ctx: BuildContext) { return catalog(ctx); }
