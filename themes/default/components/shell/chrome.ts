import type { ComponentDefinition, ComponentOptionSchema } from '../../../../src/theme-api.ts';

const chromeLink: ComponentOptionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    key: { type: 'string' },
    label: { type: 'string' },
    labels: { type: 'object', additionalProperties: true },
    href: { type: 'string', required: true },
    target: { type: 'string', enum: ['_self', '_blank'] }
  }
};

const chromeSlot: ComponentOptionSchema = {
  type: 'array',
  items: chromeLink
};

const chromeRegion: ComponentOptionSchema = {
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
export const component: ComponentDefinition = {
  id: 'shell',
  capabilities: ['render'],
  contexts: ['site'],
  implementation: 'components/shell/chrome.ts',
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
