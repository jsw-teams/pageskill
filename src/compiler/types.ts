import type { ContentMetrics } from '../lib/content-metrics.ts';
import type { MarkdownNode, SourcePosition, DirectiveNode } from '../lib/markdown.ts';
import type { PageskillTheme, I18nSource, ComponentResources } from '../theme-api.ts';

export type Locale = string;

export type Document = {
  id: string;
  collection: string;
  contentKey: string;
  locale: Locale;
  source: string;
  title: string;
  description: string;
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
  hash: string;
  bodyLine: number;
  stat: { mtimeMs: number; size: number };
  dependencyKeys: string[];
  componentNames: string[];
};

export type CachedDocument = {
  hash: string;
  outputs: string[];
  dependencies?: string[];
  components?: string[];
  mtimeMs: number;
  size: number;
  collection: string;
  id: string;
  contentKey?: string;
  locale: string;
  title: string;
  description: string;
  component: string;
  date?: string;
  updated?: string;
  author?: string;
  cover?: string;
  data: Record<string, any>;
  markdown: string;
  excerpt?: string;
  bodyLine: number;
  metrics?: ContentMetrics;
};

export type CachedImage = { hash: string; output: string };
export type ImageDimensions = { width: number; height: number };

export type CacheManifest = {
  version: 4;
  rendererVersion?: string;
  configHash?: string;
  themeHash?: string;
  assetHash?: string;
  contentRoots?: Record<string, number>;
  routeCount?: number;
  documents: Record<string, CachedDocument>;
  images?: Record<string, CachedImage>;
  outputs: string[];
  outputHashes?: Record<string, string>;
};

export type BuildProfile = {
  discover: number;
  load: number;
  validate: number;
  parse: number;
  route: number;
  render: number;
  assets: number;
  write: number;
  total: number;
  documents: number;
  changedOutputs: number;
  imagesProcessed: number;
  imageCacheHits: number;
};

export type BuildContext = {
  root: string;
  out: string;
  config: Record<string, any>;
  configFiles: string[];
  theme: Record<string, any>;
  themeConfig: Record<string, any>;
  themeConfigFile?: string;
  themeI18n: Record<string, any>;
  themeDefinition: PageskillTheme;
  docs: Document[];
  byKey: Map<string, Document>;
  routes: Map<string, Document>;
  cache: CacheManifest;
  profile: BuildProfile;
  outputs: Set<string>;
  diagnostics: string[];
  configHash: string;
  themeHash: string;
  imageCache: Record<string, CachedImage>;
  imageDimensions: Record<string, ImageDimensions>;
  collectionIndex: Map<string, Document[]>;
  translationIndex: Map<string, Document[]>;
  documentPositions: Map<string, number>;
  tagIndex: Map<string, Document[]>;
  assetHash: string;
  outputHashes: Record<string, string>;
  contentRoots: Record<string, number>;
  stagedOutput?: { final: string; temporary: string };
  markdownCache: Map<string, MarkdownNode[]>;
  sourceParseCache: Map<string, { data: Record<string, any>; body: string; excerpt: string; bodyLine: number }>;
  themeStyleSources: Map<string, string>;
  themeAssetHashes: Record<string, string>;
  componentWarnings: string[];
};

export type ComponentDiscoverySource = Pick<ComponentResources, 'styles'> & { implementation?: string; i18n?: I18nSource };
