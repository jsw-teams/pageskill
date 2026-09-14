import type { ComponentDefinition } from '../../../src/theme-api.ts';
import { component as shellContract } from './shell/chrome.ts';
import { renderShell } from './shell/index.ts';
import { component as consent } from './consent/index.ts';
import { component as language } from './language/index.ts';
import { component as search } from './search/index.ts';
import { component as toc } from './toc/index.ts';
import { component as postMeta } from './post-meta/index.ts';
import { component as codeCopy } from './code-copy/index.ts';
import { component as comments } from './comments/index.ts';
import { component as commentTranslation } from './comment-translation/index.ts';
import { component as archive } from './archive/index.ts';
import { component as cta } from './cta/index.ts';
import { component as featureGrid } from './feature-grid/index.ts';
import { component as hero } from './hero/index.ts';
import { component as learningPath } from './learning-path/index.ts';
import { component as postList } from './post-list/index.ts';
import { component as page } from './page/index.ts';
import { component as post } from './post/index.ts';

/** The default theme has one public extension vocabulary: Components. */
export const components: ComponentDefinition[] = [
  { ...shellContract, id: 'shell', shell: renderShell, resources: { styles: ['components/shell/style.css'] }, i18n: 'components/shell/messages.yml' },
  { ...consent, id: 'privacyConsent' },
  { ...language, id: 'language' },
  { ...search, id: 'search' },
  { ...toc, id: 'toc' },
  { ...postMeta, id: 'postMeta' },
  { ...codeCopy, id: 'codeCopy' },
  { ...comments, id: 'comments', source: 'external', capabilities: ['render', 'client', 'server', 'storage', 'cache'] },
  { ...commentTranslation, id: 'comment-translation', source: 'external', capabilities: ['client', 'server', 'storage', 'cache', 'ai'] },
  { ...hero, id: 'hero' },
  { ...featureGrid, id: 'feature-grid' },
  { ...learningPath, id: 'learning-path' },
  { ...postList, id: 'post-list' },
  { ...cta, id: 'cta' },
  { ...page, id: 'page' },
  { ...post, id: 'post' },
  { ...archive, id: 'archive' }
];
