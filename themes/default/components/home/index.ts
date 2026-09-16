import type { ComponentDefinition } from '../../../../src/theme-api.ts';

/** A spacious landing-page frame for the stable content/pages/home document. */
export const component: ComponentDefinition = {
  id: 'home',
  capabilities: ['render'],
  contexts: ['page'],
  renderDocument: (input) => {
    const content = input.slots.content || input.renderedContent;
    const header = input.slots.header || '';
    const footer = input.slots.footer || '';
    return `<div class="home-layout">${header}<article class="home-body">${content}</article>${footer}</div>`;
  }
};
