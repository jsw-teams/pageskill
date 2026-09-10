import type { ThemePluginDefinition, ThemeOptionSchema } from '../../../../src/theme-api.ts';

const chromeLink: ThemeOptionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    label: { type: 'string', required: true },
    labels: { type: 'object', additionalProperties: true },
    href: { type: 'string', required: true }
  }
};

const chromeSlot: ThemeOptionSchema = {
  type: 'array',
  items: chromeLink
};

const chromeRegion: ThemeOptionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    enabled: { type: 'boolean' },
    before: chromeSlot,
    after: chromeSlot
  }
};

/**
 * The shell accepts links only.  Raw HTML, scripts, styles, arbitrary
 * attributes, and DOM selectors deliberately have no schema entry.
 */
export const plugin: ThemePluginDefinition = {
  implementation: 'plugins/chrome/index.ts',
  defaults: {
    enabled: true,
    navigation: { enabled: true, before: [], after: [] },
    footer: { enabled: true, before: [], after: [] }
  },
  schema: {
    enabled: { type: 'boolean' },
    navigation: chromeRegion,
    footer: chromeRegion
  }
};
