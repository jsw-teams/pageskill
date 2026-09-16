import type { ComponentDefinition } from '../../../../src/theme-api.ts';

/**
 * Optional translation capability for the Comments External Component.
 * The browser UI is composed by Comments, while this declaration records the
 * separate server, storage, cache, and AI contract in the Theme catalog.
 */
export const component: ComponentDefinition = {
  id: 'comment-translation',
  source: 'external',
  capabilities: ['server', 'storage', 'cache', 'ai'],
  contexts: ['comment'],
  implementation: 'components/comment-translation/index.ts',
  i18n: 'components/comment-translation/messages.yml',
  defaults: { enabled: false },
  schema: { enabled: { type: 'boolean' } }
};
