import { plugin as chrome } from './chrome/index.ts';
import { plugin as cookies } from './cookies/index.ts';
import { plugin as language } from './language/index.ts';
import { plugin as search } from './search/index.ts';
import { plugin as toc } from './toc/index.ts';
import { plugin as postMeta } from './post-meta/index.ts';
import { plugin as codeCopy } from './code-copy/index.ts';

export const plugins = { chrome, search, toc, postMeta, codeCopy, privacyConsent: cookies, language };
