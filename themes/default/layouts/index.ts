import type { ThemeModuleDefinition, ThemePatternDefinition } from '../../../src/theme-api.ts';
import { pattern as blog } from './blog/index.ts';
import { pattern as docs } from './docs/index.ts';
import { pattern as document } from './document/index.ts';
import { pattern as landing } from './landing/index.ts';

export const patterns: Record<string, ThemePatternDefinition> = { landing, document, docs, blog };

export const modules: ThemeModuleDefinition[] = [
  { id: 'landing', kind: 'layout', patterns: { landing } },
  { id: 'document', kind: 'layout', patterns: { document } },
  { id: 'docs', kind: 'layout', patterns: { docs } },
  { id: 'blog', kind: 'layout', patterns: { blog }, i18n: 'layouts/blog/messages.yml' }
];
