import type { DirectiveNode, MarkdownNode } from './lib/markdown.ts';
import type { ContentMetrics } from './lib/content-metrics.ts';

/** A Component owns reusable presentation, behavior, and capability contracts. */
export type ComponentCapability = 'render' | 'client' | 'server' | 'storage' | 'cache' | 'ai' | 'integration';
export type ComponentSource = 'built-in' | 'external';
export type ComponentAttributeType = 'string' | 'number' | 'boolean';

export type ContentDocument = {
  id: string;
  collection: string;
  /** Stable identity shared by every locale variant. */
  contentKey: string;
  locale: string;
  source: string;
  title: string;
  description: string;
  /** The Component that owns the document layout. */
  component: string;
  date?: string;
  updated?: string;
  author?: string;
  cover?: string;
  data: Record<string, any>;
  markdown: string;
  excerpt: string;
  nodes: MarkdownNode[];
  directives: DirectiveNode[];
  metrics: ContentMetrics;
};

export type ContentKind = 'page' | 'post' | 'release' | string;

export type ContentQueryOptions = {
  collection?: string;
  kind?: ContentKind;
  category?: string;
  locale?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'date:desc' | 'date:asc' | 'title:asc' | 'title:desc';
};

export type ContentIdentity = Pick<ContentDocument, 'collection' | 'id' | 'contentKey' | 'locale'> & {
  /** Public contract alias for the locale-independent content identity. */
  key: string;
};

export type ContentContext = {
  identity: ContentIdentity;
  query: (options?: ContentQueryOptions) => ContentDocument[];
  translations: (collection?: string, id?: string) => ContentDocument[];
  label: (value: string) => string;
  position: (document: Pick<ContentDocument, 'collection' | 'id' | 'locale'>) => number;
};

export type ComponentUrlContext = {
  siteUrl: string;
  forDocument: (document: Pick<ContentDocument, 'collection' | 'id' | 'locale' | 'data'>) => string;
  forCollection: (collection: string, locale?: string) => string;
  forArchive: (options: { collection?: string; category?: string; locale?: string; page?: number }) => string;
  asset: (value: string) => string;
  sitemap: string;
};

export type ComponentInput = {
  node?: DirectiveNode;
  attrs: Record<string, string>;
  children: MarkdownNode[];
  /** Named slots are supplied by the Markdown/component composition layer. */
  slots: Record<string, MarkdownNode[]>;
  /** Structured data supplied by frontmatter, configuration, or runtime data. */
  props: Record<string, unknown>;
  /** The already rendered default slot. */
  renderedChildren: string;
  runtime?: unknown;
};

export type ComponentDocumentInput = {
  renderedContent: string;
  slots: Record<string, string>;
  props: Record<string, unknown>;
  runtime?: unknown;
};

export type ComponentRenderContext = {
  doc: ContentDocument;
  config: Record<string, any>;
  theme: Record<string, any>;
  themeConfig: Record<string, any>;
  content: ContentContext;
  url: ComponentUrlContext;
  renderNodes: (nodes: MarkdownNode[]) => string;
  renderComponent: (name: string, input?: Partial<ComponentInput>) => string;
  renderInline: (value: string) => string;
  escapeHtml: (value: unknown) => string;
  safeUrl: (value: string) => string;
  localized: (value: unknown, fallback: string) => string;
  translate: (key: string, fallback: string) => string;
  /** Read a localized, schema-validated Component copy override. */
  componentText: (componentName: string, key: string, fallback: string) => string;
  formatDate: (value?: string) => string;
  htmlLang?: string;
  blogRelations: () => string;
};

export type ComponentPrivacyContext = {
  /** A trusted adapter runtime is present, even when no consent UI is needed. */
  runtimeEnabled: boolean;
  enabled: boolean;
  scriptSrc: string;
  decisionRetentionDays: number;
  policyHref: string;
  title: string;
  description: string;
  bannerLabel: string;
  settingsLabel: string;
  acceptLabel: string;
  rejectLabel: string;
  saveLabel: string;
  closeLabel: string;
  policyLabel: string;
  categories: Array<{
    purpose: string;
    label: string;
    description: string;
    providers: string[];
  }>;
  integrations: Array<Record<string, any>>;
  socialPlaceholderTitle?: string;
  socialPlaceholderDescription?: string;
  socialPlaceholderAllowLabel?: string;
};

export type ComponentShellContext = ComponentRenderContext & {
  renderedContent: string;
  head: string;
  bodyClass: string;
  mainClass: string;
  siteName: string;
  siteDescription: string;
  currentRoute: string;
  homeHref: string;
  brandIcon: string;
  navigationLinks: string;
  footerLinks: string;
  languageLinks: string;
  chrome: ComponentChromeConfig;
  navigationLabel: string;
  languageLabel: string;
  skipLabel: string;
  headerNote: string;
  footerNote: string;
  footerKicker: string;
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
  privacy: ComponentPrivacyContext;
};

export type ComponentChromeLink = {
  label: string;
  href: string;
  key?: string;
  target?: '_self' | '_blank';
  external?: boolean;
  current?: boolean;
};

export type ComponentChromeSlot = {
  enabled: boolean;
  before: ComponentChromeLink[];
  after: ComponentChromeLink[];
};

export type ComponentChromeConfig = {
  navigation: ComponentChromeSlot;
  footer: ComponentChromeSlot;
};

export type ComponentResource = string | { path: string; id?: string };
export type ComponentResources = { styles?: ComponentResource[]; scripts?: ComponentResource[] };

export type ComponentOptionSchema = {
  type: 'boolean' | 'string' | 'number' | 'object' | 'array';
  required?: boolean;
  min?: number;
  max?: number;
  enum?: unknown[];
  /** Optional code-owned regular expression for string identifiers. */
  pattern?: string;
  items?: ComponentOptionSchema;
  properties?: Record<string, ComponentOptionSchema>;
  additionalProperties?: boolean;
};

export type IntegrationConsentRequirement = 'required' | 'optional' | 'none';
export type IntegrationLoadPolicy = 'immediate' | 'consent' | 'on-demand';

/** A trusted Provider Adapter is code-owned; site YAML selects only its public fields. */
export type ProviderAdapter = {
  id: string;
  schema: Record<string, ComponentOptionSchema>;
  privacy: {
    purpose: string;
    consent: IntegrationConsentRequirement;
    load: IntegrationLoadPolicy;
  };
  labelKey?: string;
  runtime: string;
  publicFields?: string[];
  placeholder?: boolean;
};

export type I18nSource = string | {
  source?: string;
  fallbackLocale?: string;
  locales?: Record<string, any>;
  messages?: Record<string, any>;
} | Record<string, any>;

export type ComponentDefinition = {
  id: string;
  source?: ComponentSource;
  capabilities?: ComponentCapability[];
  contexts?: string[];
  implementation?: string;
  resources?: ComponentResources;
  i18n?: I18nSource | I18nSource[];
  defaults?: Record<string, any>;
  schema?: Record<string, ComponentOptionSchema>;
  integrations?: Record<string, ProviderAdapter>;
  /** Render a Markdown directive or a composed Component invocation. */
  render?: (input: ComponentInput, context: ComponentRenderContext) => string;
  /** Render a document shell/layout. This is still a Component, not another API. */
  renderDocument?: (input: ComponentDocumentInput, context: ComponentRenderContext) => string;
  /** Render the complete site shell. */
  shell?: (context: ComponentShellContext) => string;
  dependencies?: (input: ComponentInput, context: ComponentRenderContext) => string[];
  example?: string;
};

export type PageskillTheme = {
  name?: string;
  resources?: ComponentResources;
  i18n?: I18nSource | I18nSource[];
  components: Record<string, ComponentDefinition>;
  defaults?: Record<string, any>;
};

export type ThemeInput = {
  name?: string;
  resources?: ComponentResources;
  i18n?: I18nSource | I18nSource[];
  components?: ComponentDefinition[] | Record<string, ComponentDefinition>;
  defaults?: Record<string, any>;
};

function mergeResourceList(left: ComponentResource[] = [], right: ComponentResource[] = []): ComponentResource[] {
  const seen = new Set<string>();
  return [...left, ...right].filter(value => {
    const resourcePath = typeof value === 'string' ? value : value.path;
    if (!resourcePath || seen.has(resourcePath)) return false;
    seen.add(resourcePath);
    return true;
  });
}

function mergeResources(left: ComponentResources | undefined, right: ComponentResources | undefined): ComponentResources {
  return {
    styles: mergeResourceList(left?.styles, right?.styles),
    scripts: mergeResourceList(left?.scripts, right?.scripts)
  };
}

function withModuleResources<T extends { resources?: ComponentResources }>(definition: T, resources: ComponentResources | undefined): T {
  if (!resources || (!resources.styles?.length && !resources.scripts?.length)) return definition;
  return { ...definition, resources: mergeResources(resources, definition.resources) };
}

/** Define one public extension unit. There is no parallel Plugin or Layout API. */
export function defineComponent(definition: ComponentDefinition): ComponentDefinition {
  if (!definition.id || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(definition.id)) throw new Error(`component id is invalid: ${definition.id || '(empty)'}`);
  return { ...definition, source: definition.source || 'built-in' };
}

/** Resolve code-owned Components once at the theme entry point. */
export function defineTheme(theme: ThemeInput): PageskillTheme {
  const definitions = Array.isArray(theme.components)
    ? theme.components
    : Object.entries(theme.components || {}).map(([id, definition]) => ({ ...definition, id: definition.id || id }));
  const componentMap: Record<string, ComponentDefinition> = {};
  const componentI18n: I18nSource[] = [];
  let componentDefaults: Record<string, any> = {};

  for (const item of definitions) {
    const original = defineComponent(item);
    if (componentMap[original.id]) throw new Error(`component id is registered more than once: ${original.id}`);
    const resources = original.resources || {};
    const definition = withModuleResources({ ...original, resources }, resources);
    componentMap[original.id] = definition;
    if (definition.i18n !== undefined) componentI18n.push(...(Array.isArray(definition.i18n) ? definition.i18n : [definition.i18n]));
    if (definition.defaults) componentDefaults = { ...componentDefaults, ...definition.defaults };
  }

  const explicitI18n = theme.i18n === undefined ? [] : (Array.isArray(theme.i18n) ? theme.i18n : [theme.i18n]);
  const resources = theme.resources || {};
  return {
    name: theme.name,
    components: componentMap,
    ...(Object.keys(resources).length ? { resources } : {}),
    ...(explicitI18n.length || componentI18n.length ? { i18n: [...explicitI18n, ...componentI18n] } : {}),
    ...(Object.keys(componentDefaults).length || theme.defaults ? { defaults: { ...componentDefaults, ...(theme.defaults || {}) } } : {})
  };
}
