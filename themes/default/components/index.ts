import type { ThemeBlockDefinition, ThemeModuleDefinition } from '../../../src/theme-api.ts';
import { block as cta } from './cta/index.ts';
import { block as featureGrid } from './feature-grid/index.ts';
import { block as hero } from './hero/index.ts';
import { block as learningPath } from './learning-path/index.ts';
import { block as postList } from './post-list/index.ts';
import { tocBlock } from '../plugins/toc/index.ts';

export const blocks: Record<string, ThemeBlockDefinition> = {
  hero,
  'feature-grid': featureGrid,
  'learning-path': learningPath,
  'post-list': postList,
  cta,
  toc: tocBlock
};

export const modules: ThemeModuleDefinition[] = [
  { id: 'hero', kind: 'component', blocks: { hero } },
  { id: 'feature-grid', kind: 'component', blocks: { 'feature-grid': featureGrid } },
  { id: 'learning-path', kind: 'component', blocks: { 'learning-path': learningPath } },
  { id: 'post-list', kind: 'component', blocks: { 'post-list': postList }, i18n: 'components/post-list/messages.yml' },
  { id: 'cta', kind: 'component', blocks: { cta } }
];
