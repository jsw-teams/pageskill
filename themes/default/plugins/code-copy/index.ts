import type { ThemePluginDefinition } from '../../../../src/theme-api.ts';

export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/code-copy/index.ts',
  resources: {
    styles: ['plugins/code-copy/style.css'],
    scripts: ['plugins/code-copy/script.js']
  },
  i18n: 'plugins/code-copy/messages.yml',
  defaults: { enabled: true },
  schema: { enabled: { type: 'boolean' } }
};
