import { MarkdownError } from '../../../../src/lib/markdown.ts';
import type { ThemeBlockDefinition } from '../../../../src/theme-api.ts';
import { groupedContent, validateAttrs } from '../shared/index.ts';

const steps = ['start', 'settings', 'markdown', 'first-content', 'cookies', 'customize'] as const;
export const block: ThemeBlockDefinition = {
  name: 'learning-path',
  schema: {},
  contexts: ['page'],
  resources: { styles: ['components/learning-path/style.css'] },
  render: (node, context) => {
    validateAttrs(node, block);
    const cards = groupedContent(node.children, context);
    if (cards.length !== steps.length) throw new MarkdownError('Block "learning-path" needs exactly six level-three headings with their supporting Markdown', node.position);
    const renderedCards = cards.map((content, index) => {
      const step = steps[index];
      const imageSource = context.safeUrl(`/assets/learning/${step}.png`);
      return `<article class="learning-path-card learning-path-card-${step}"><div class="learning-path-art learning-path-art-${step}" aria-hidden="true"><img src="${imageSource}" alt="" aria-hidden="true" loading="lazy" decoding="async" width="112" height="112"></div><div class="learning-path-content">${content}</div></article>`;
    }).join('');
    return `<section class="block learning-path"><div class="learning-path-grid">${renderedCards}</div></section>`;
  }
};
