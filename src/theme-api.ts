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
  renderNodes: (nodes: MarkdownNode[]) => string;
  renderBlock: (node: DirectiveNode) => string;
  renderInline: (value: string) => string;
  escapeHtml: (value: unknown) => string;
  safeUrl: (value: string) => string;
  localized: (value: unknown, fallback: string) => string;
  translate: (key: string, fallback: string) => string;
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
  };
};

export type ThemeBlockDefinition = {
  name: string;
  schema: Record<string, ThemeAttributeType>;
  defaults?: Record<string, string>;
  example?: string;
  contexts?: string[];
  resources?: { styles?: string[]; scripts?: string[] };
  dependencies?: (node: DirectiveNode, context: ThemeRenderContext) => string[];
  render: (node: DirectiveNode, context: ThemeRenderContext) => string;
};

export type ThemePatternDefinition = {
  name: string;
  contexts: string[];
  resources?: { styles?: string[]; scripts?: string[] };
  render: (content: string, context: ThemeRenderContext) => string;
};

export type PageskillTheme = {
  name?: string;
  blocks: Record<string, ThemeBlockDefinition>;
  patterns: Record<string, ThemePatternDefinition>;
  shell?: (context: ThemeShellContext) => string;
};

/** @deprecated Use PageskillTheme. Kept as a source-compatible alias for existing themes. */
export type PagekilnTheme = PageskillTheme;

export function defineTheme(theme: PageskillTheme): PageskillTheme {
  return theme;
}
