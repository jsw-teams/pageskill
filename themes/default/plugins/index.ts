import { plugin as chrome } from './chrome/index.ts';
import { plugin as cookies } from './cookies/index.ts';
import { plugin as language } from './language/index.ts';
import { plugin as search } from './search/index.ts';
import { plugin as toc } from './toc/index.ts';
import { plugin as postMeta } from './post-meta/index.ts';

export const plugins = { chrome, search, toc, postMeta, privacyConsent: cookies, language };
