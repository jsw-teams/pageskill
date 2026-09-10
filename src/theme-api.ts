import type { DirectiveNode, MarkdownNode } from './lib/markdown.ts';

export type ThemeAttributeType = 'string' | 'number' | 'boolean';

export type ThemeDocument = {
  id: string;
  collection: string;
  locale: string;
  source: string;
  title: string;
  description: string;
  pattern: string;
  date?: string;
  /** Effective author after the site-level fallback is applied. */
  author?: string;
  /** Optional cover/hero image declared by the document frontmatter. */
  cover?: string;
  data: Record<string, any>;
  markdown: string;
  excerpt: string;
  nodes: MarkdownNode[];
  directives: DirectiveNode[];
};

export type ThemeRenderContext = {
  doc: ThemeDocument;
  config: Record<string, any>;
  theme: Record<string, any>;
  themeConfig: Record<string, any>;
  renderNodes: (nodes: MarkdownNode[]) => string;
  renderBlock: (node: DirectiveNode) => string;
  renderInline: (value: string) => string;
  escapeHtml: (value: unknown) => string;
  safeUrl: (value: string) => string;
  localized: (value: unknown, fallback: string) => string;
  translate: (key: string, fallback: string) => string;
  /** Read a localized, schema-validated copy override from theme.yml. */
  pluginText: (pluginName: string, key: string, fallback: string) => string;
  routeFor: (doc: Pick<ThemeDocument, 'collection' | 'id' | 'locale' | 'data'>) => string;
  collection: (name: string, locale?: string) => ThemeDocument[];
  translations: (collection: string, id: string) => ThemeDocument[];
  position: (doc: Pick<ThemeDocument, 'collection' | 'id' | 'locale'>) => number;
  formatDate: (value?: string) => string;
  blogRelations: () => string;
};

export type ThemeShellContext = ThemeRenderContext & {
  content: string;
  head: string;
  bodyClass: string;
  mainClass: string;
  siteName: string;
  siteDescription: string;
  currentRoute: string;
  homeHref: string;
  brandIcon: string;
  navigationLinks: string;
  languageLinks: string;
  chrome: ThemeChromeConfig;
  navigationLabel: string;
  languageLabel: string;
  skipLabel: string;
  headerNote: string;
  footerNote: string;
  footerKicker: string;
  attribution: string;
  showAttribution: boolean;
  searchMarkup: string;
  search: {
    enabled: boolean;
    indexHref: string;
    scriptSrc: string;
    label: string;
    placeholder: string;
    submitLabel: string;
    noResultsLabel: string;
    errorLabel: string;
    resultLabel: string;
    hitTitleLabel: string;
    hitDescriptionLabel: string;
    hitHeadingLabel: string;
    hitContentLabel: string;
    hitPathLabel: string;
    queryHint: string;
    maxResults: number;
  };
  privacyMarkup: string;
  privacyTriggerMarkup: string;
  privacy: {
    enabled: boolean;
    scriptSrc: string;
    storage: string;
    retentionDays: number;
    policyHref: string;
    title: string;
    description: string;
    bannerLabel: string;
    settingsLabel: string;
    acceptLabel: string;
    rejectLabel: string;
    saveLabel: string;
    closeLabel: string;
    essentialLabel: string;
    essentialDescription: string;
    optionalLabel: string;
    optionalDescription: string;
    policyLabel: string;
    categories: Array<{
      id: string;
      label: string;
      description: string;
      required: boolean;
      defaultValue: boolean;
      provider: string;
      retentionDays: number;
    }>;
    integrations: Array<Record<string, string>>;
    gatedScripts: Array<{ category: string; href: string }>;
  };
};

/** Safe, structured links contributed by a theme's shell configuration.  The
 * compiler resolves the locale and rejects unsafe URLs before the shell sees
 * them; theme renderers still escape the label when they emit markup. */
export type ThemeChromeLink = {
  label: string;
  href: string;
  current?: boolean;
};

export type ThemeChromeSlot = {
  enabled: boolean;
  before: ThemeChromeLink[];
  after: ThemeChromeLink[];
};

export type ThemeChromeConfig = {
  navigation: ThemeChromeSlot;
  footer: ThemeChromeSlot;
};

export type ThemeResource = string | {
  path: string;
  id?: string;
};

export type ThemeResources = {
  styles?: ThemeResource[];
  scripts?: ThemeResource[];
};

export type ThemeOptionSchema = {
  type: 'boolean' | 'string' | 'number' | 'object' | 'array';
  required?: boolean;
  min?: number;
  max?: number;
  enum?: unknown[];
  items?: ThemeOptionSchema;
  properties?: Record<string, ThemeOptionSchema>;
  additionalProperties?: boolean;
};

export type ThemeI18nSource = string | {
  source?: string;
  fallbackLocale?: string;
  locales?: Record<string, any>;
  messages?: Record<string, any>;
} | Record<string, any>;

export type ThemePluginDefinition = {
  implementation?: string;
  resources?: ThemeResources;
  i18n?: ThemeI18nSource | ThemeI18nSource[];
  defaults?: Record<string, any>;
  schema?: Record<string, ThemeOptionSchema>;
  /** @deprecated Theme capability enablement belongs to the site instance. */
  enabled?: boolean;
};

/** A code-owned theme unit. The entry module may pass these to defineTheme so
 * registration and capability types stay in one place. */
export type ThemeModuleDefinition = {
  id: string;
  kind: 'shell' | 'layout' | 'component' | 'plugin';
  blocks?: Record<string, ThemeBlockDefinition>;
  patterns?: Record<string, ThemePatternDefinition>;
  shell?: (context: ThemeShellContext) => string;
  resources?: ThemeResources;
  i18n?: ThemeI18nSource | ThemeI18nSource[];
  defaults?: Record<string, any>;
  /** @deprecated Use i18n; retained for a one-release source migration. */
  messages?: ThemeI18nSource | ThemeI18nSource[];
  /** @deprecated Resource paths belong in resources. */
  plugin?: { enabledBy?: 'config'; script?: string; resources?: ThemeResources; i18n?: ThemeI18nSource | ThemeI18nSource[]; defaults?: Record<string, any>; schema?: Record<string, ThemeOptionSchema> };
  schema?: Record<string, ThemeOptionSchema>;
};

export type ThemeBlockDefinition = {
  name: string;
  schema: Record<string, ThemeAttributeType>;
  defaults?: Record<string, string>;
  example?: string;
  contexts?: string[];
  resources?: ThemeResources;
  dependencies?: (node: DirectiveNode, context: ThemeRenderContext) => string[];
  render: (node: DirectiveNode, context: ThemeRenderContext) => string;
};

export type ThemePatternDefinition = {
  name: string;
  contexts: string[];
  resources?: ThemeResources;
  render: (content: string, context: ThemeRenderContext) => string;
};

export type PageskillTheme = {
  name?: string;
  resources?: ThemeResources;
  i18n?: ThemeI18nSource | ThemeI18nSource[];
  plugins?: Record<string, ThemePluginDefinition>;
  defaults?: Record<string, any>;
  blocks: Record<string, ThemeBlockDefinition>;
  patterns: Record<string, ThemePatternDefinition>;
  shell?: (context: ThemeShellContext) => string;
};

export type ThemeDefinitionInput = {
  name?: string;
  resources?: ThemeResources;
  i18n?: ThemeI18nSource | ThemeI18nSource[];
  plugins?: Record<string, ThemePluginDefinition>;
  defaults?: Record<string, any>;
  blocks?: Record<string, ThemeBlockDefinition>;
  patterns?: Record<string, ThemePatternDefinition>;
  shell?: (context: ThemeShellContext) => string;
  modules?: ThemeModuleDefinition[];
};

/** @deprecated Use PageskillTheme. Kept as a source-compatible alias for existing themes. */
export type PagekilnTheme = PageskillTheme;

function mergeResourceList(left: ThemeResource[] = [], right: ThemeResource[] = []): ThemeResource[] {
  const seen = new Set<string>();
  return [...left, ...right].filter(value => {
    const path = typeof value === 'string' ? value : value.path;
    if (!path || seen.has(path)) return false;
    seen.add(path);
    return true;
  });
}

function mergeResources(left: ThemeResources | undefined, right: ThemeResources | undefined): ThemeResources {
  return {
    styles: mergeResourceList(left?.styles, right?.styles),
    scripts: mergeResourceList(left?.scripts, right?.scripts)
  };
}

function moduleI18nSource(module: ThemeModuleDefinition): ThemeI18nSource | ThemeI18nSource[] | undefined {
  return module.i18n ?? module.messages ?? module.plugin?.i18n;
}

function definitionWithModuleResources<T extends { resources?: ThemeResources }>(definition: T, resources: ThemeResources | undefined): T {
  if (!resources || (!resources.styles?.length && !resources.scripts?.length)) return definition;
  return { ...definition, resources: mergeResources(resources, definition.resources) };
}

/**
 * Resolve code-owned modules once at the theme entry point. The compiler sees
 * the returned PageskillTheme only; it never scans or imports module files.
 */
export function defineTheme(theme: ThemeDefinitionInput): PageskillTheme {
  const modules = Array.isArray(theme.modules) ? theme.modules : [];
  const moduleBlocks: Record<string, ThemeBlockDefinition> = {};
  const modulePatterns: Record<string, ThemePatternDefinition> = {};
  const modulePlugins: Record<string, ThemePluginDefinition> = {};
  let moduleResources: ThemeResources = {};
  let moduleShell = theme.shell;
  const moduleI18n: ThemeI18nSource[] = [];
  let moduleDefaults: Record<string, any> = {};

  for (const module of modules) {
    const resources = mergeResources(module.resources, module.plugin?.resources);
    if (module.kind === 'shell') {
      moduleResources = mergeResources(moduleResources, resources);
      if (!moduleShell && module.shell) moduleShell = module.shell;
    }
    if (module.kind === 'component') {
      for (const [name, definition] of Object.entries(module.blocks || {})) moduleBlocks[name] = definitionWithModuleResources(definition, resources);
    }
    if (module.kind === 'layout') {
      for (const [name, definition] of Object.entries(module.patterns || {})) modulePatterns[name] = definitionWithModuleResources(definition, resources);
    }
    if (module.kind === 'plugin') {
      modulePlugins[module.id] = {
        resources,
        ...(moduleI18nSource(module) !== undefined ? { i18n: moduleI18nSource(module) } : {}),
        ...(module.defaults || module.plugin?.defaults ? { defaults: { ...(module.defaults || {}), ...(module.plugin?.defaults || {}) } } : {}),
        ...(module.schema || module.plugin?.schema ? { schema: module.schema || module.plugin?.schema } : {})
      };
    }
    const translations = moduleI18nSource(module);
    if (translations !== undefined) moduleI18n.push(...(Array.isArray(translations) ? translations : [translations]));
    if (module.defaults) moduleDefaults = { ...moduleDefaults, ...module.defaults };
  }

  const explicitI18n = theme.i18n === undefined ? [] : (Array.isArray(theme.i18n) ? theme.i18n : [theme.i18n]);
  const i18n = [...explicitI18n, ...moduleI18n];
  const plugins: Record<string, ThemePluginDefinition> = { ...modulePlugins };
  for (const [name, definition] of Object.entries(theme.plugins || {})) {
    const modulePlugin = modulePlugins[name];
    plugins[name] = modulePlugin ? {
      ...modulePlugin,
      ...definition,
      resources: mergeResources(modulePlugin.resources, definition.resources),
      ...(definition.i18n === undefined && modulePlugin.i18n !== undefined ? { i18n: modulePlugin.i18n } : {}),
      ...(modulePlugin.defaults || definition.defaults ? { defaults: { ...(modulePlugin.defaults || {}), ...(definition.defaults || {}) } } : {}),
      ...(definition.schema === undefined && modulePlugin.schema !== undefined ? { schema: modulePlugin.schema } : {})
    } : definition;
  }
  const blocks: Record<string, ThemeBlockDefinition> = { ...moduleBlocks };
  for (const [name, definition] of Object.entries(theme.blocks || {})) blocks[name] = definitionWithModuleResources(definition, moduleBlocks[name]?.resources);
  const patterns: Record<string, ThemePatternDefinition> = { ...modulePatterns };
  for (const [name, definition] of Object.entries(theme.patterns || {})) patterns[name] = definitionWithModuleResources(definition, modulePatterns[name]?.resources);
  const resources = mergeResources(moduleResources, theme.resources);
  const { modules: _modules, ...rest } = theme;
  return {
    ...rest,
    blocks,
    patterns,
    ...(moduleShell ? { shell: moduleShell } : {}),
    ...(resources.styles?.length || resources.scripts?.length ? { resources } : {}),
    ...(i18n.length ? { i18n: i18n.length === 1 ? i18n[0] : i18n } : {}),
    ...(Object.keys(moduleDefaults).length || theme.defaults ? { defaults: { ...moduleDefaults, ...(theme.defaults || {}) } } : {}),
    ...(Object.keys(plugins).length ? { plugins } : {})
  };
}
