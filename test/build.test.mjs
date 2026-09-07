import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { createContext, refreshContext, build } from '../src/compiler.ts';

const FIXTURE_THEME = `const block = (name, render) => ({ name, schema: {}, render });
const blocks = {
  hero: { name: 'hero', schema: { tone: 'string', align: 'string' }, render: (node, context) => '<section class="block hero">' + context.renderNodes(node.children) + '</section>' },
  'feature-grid': { name: 'feature-grid', schema: { columns: 'number' }, render: (node, context) => '<section class="block feature-grid">' + context.renderNodes(node.children) + '</section>' },
  'compiler-board': block('compiler-board', (node, context) => '<section class="block compiler-board">' + context.renderNodes(node.children) + '</section>'),
  metrics: block('metrics', (node, context) => '<section class="block metrics">' + context.renderNodes(node.children) + '</section>'),
  'benchmark-chart': block('benchmark-chart', node => { const match = String(node.raw).match(/Cold build\\s*\\|\\s*([0-9.]+)\\s*\\|\\s*([0-9.]+)/); const value = match ? Number(match[1]) : 0; return '<figure class="block benchmark-chart"><span data-seconds="' + value.toFixed(2) + '"></span></figure>'; }),
  'research-matrix': block('research-matrix', (node, context) => '<section class="block research-matrix">' + context.renderNodes(node.children) + '</section>'),
  comparison: block('comparison', (node, context) => '<section class="block comparison">' + context.renderNodes(node.children) + '</section>'),
  pipeline: block('pipeline', (node, context) => '<section class="block pipeline">' + context.renderNodes(node.children) + '</section>'),
  'post-list': { name: 'post-list', schema: { limit: 'number' }, dependencies: (_node, context) => ['collection:posts:' + context.doc.locale], render: (node, context) => '<section class="block post-list">' + context.collection('posts').slice(0, Number(node.attrs.limit || 6)).map(post => '<h3>' + context.escapeHtml(post.title) + '</h3>').join('') + '</section>' },
  toc: block('toc', () => '<nav class="block toc"></nav>'),
  cta: { name: 'cta', schema: { href: 'string' }, render: (node, context) => '<section class="block landing-cta">' + context.renderNodes(node.children) + '</section>' }
};
export default { blocks, patterns: {
  landing: { name: 'landing', contexts: ['page'], render: content => content },
  document: { name: 'document', contexts: ['page', 'custom'], render: content => content },
  blog: { name: 'blog', contexts: ['post', 'blog'], render: content => content }
} };`;

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pagekiln-'));
  await mkdir(path.join(root, 'content/pages/home'), { recursive: true });
  await mkdir(path.join(root, 'content/pages/docs'), { recursive: true });
  await mkdir(path.join(root, 'content/posts/note'), { recursive: true });
  await mkdir(path.join(root, 'themes/default'), { recursive: true });
  await writeFile(path.join(root, 'config.yml'), 'siteUrl: https://example.test\ndefaultLocale: en\nactiveLocales:\n  - en\n  - zh-CN\nsiteName:\n  en: Test\n  zh-CN: 测试\ntheme:\n  name: default\ncontent:\n  collections:\n    pages:\n      route: /:locale/:id/\n    posts:\n      route: /:locale/posts/:id/\n      feed: true\noutputs:\n  markdownMirrors: true\nfeed:\n  title: Test\n');
  await writeFile(path.join(root, 'themes/default/theme.yml'), 'name: default\n');
  await writeFile(path.join(root, 'themes/default/style.css'), 'body { color: black; }\n');
  await writeFile(path.join(root, 'themes/default/theme.js'), FIXTURE_THEME);
  await writeFile(path.join(root, 'content/pages/home/en.md'), '---\ntitle: Home\npattern: landing\n---\n\n# Home\n\n:::hero{tone="brand"}\n## Hello\n:::\n');
  await writeFile(path.join(root, 'content/pages/docs/zh-CN.md'), '---\ntitle: 文档\n---\n\n# 文档\n\n内容。\n');
  await writeFile(path.join(root, 'content/posts/note/en.md'), '---\ntitle: Note\ndescription: Searchable note\ndate: 2026-08-08\n---\n\n# Note\n\nSearchable text.\n');
  return root;
}

test('build creates locale routes, feed, search, mirrors, profile, and markdown excerpts', async () => {
  const root = await fixture();
  try {
    const postFile = path.join(root, 'content/posts/note/en.md');
    await writeFile(postFile, '---\ntitle: Note\ndescription: Searchable note\ndate: 2026-08-08\ncover: /assets/note.webp\n---\n\n# Note\n\nSearchable text.\n\n<more>\n\nFull body.\n');
    const ctx = await build(await createContext(root));
    assert.equal(ctx.routes.has('/en/'), true);
    assert.equal(ctx.routes.has('/en/posts/note/'), true);
    assert.equal(ctx.routes.has('/zh-CN/'), true);
    assert.equal(ctx.routes.has('/zh-CN/docs/'), true);
    assert.match(await readFile(path.join(root, 'dist/en/feed.xml'), 'utf8'), /Note/);
    assert.match(await readFile(path.join(root, 'dist/assets/search-index.en.json'), 'utf8'), /Searchable note/);
    assert.match(await readFile(path.join(root, 'dist/en/posts/note/index.html'), 'utf8'), /og:image[^>]+note\.webp/);
    assert.match(await readFile(path.join(root, 'dist/en/posts/note.md'), 'utf8'), /Searchable text/);
    assert.match(await readFile(path.join(root, 'dist/.pagekiln/build-profile.json'), 'utf8'), /"render"/);
    const post = ctx.docs.find(doc => doc.collection === 'posts' && doc.id === 'note' && doc.locale === 'en');
    assert.equal(post.excerpt, '# Note\n\nSearchable text.');
    assert.doesNotMatch(post.markdown, /<more>/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('landing compiler blocks render an explicit product comparison', async () => {
  const root = await fixture();
  try {
    await writeFile(path.join(root, 'content/pages/home/en.md'), '---\ntitle: Home\npattern: landing\n---\n\n# Home\n\n:::compiler-board\n### Source\nMarkdown\n\n### Compiler\nSchema\n\n### Output\nStatic HTML\n:::\n\n:::benchmark-chart\n| Scenario | 100 docs | 1,000 docs |\n| --- | ---: | ---: |\n| Cold build | 2.5 | 5 |\n:::\n\n:::comparison\n### Typical builder\n- Edit page surface\n\n### Pagekiln\n- Compile reusable system\n:::\n');
    const ctx = await build(await createContext(root));
    const html = await readFile(path.join(root, 'dist/en/index.html'), 'utf8');
    assert.equal(ctx.routes.has('/en/'), true);
    assert.match(html, /class="block compiler-board"/);
    assert.match(html, /class="block benchmark-chart"/);
    assert.match(html, /data-seconds="2\.50"/);
    assert.match(html, /class="block comparison"/);
    assert.match(html, /Typical builder/);
    assert.match(html, /Compile reusable system/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('collection defaults choose landing for home and blog for posts', async () => {
  const root = await fixture();
  try {
    const configFile = path.join(root, 'config.yml');
    const config = (await readFile(configFile, 'utf8'))
      .replace('    pages:\n      route: /:locale/:id/', '    pages:\n      contentType: page\n      route: /:locale/:id/')
      .replace('    posts:\n      route: /:locale/posts/:id/', '    posts:\n      contentType: post\n      route: /:locale/posts/:id/');
    await writeFile(configFile, config);
    await writeFile(path.join(root, 'content/pages/home/en.md'), '---\ntitle: Home\n---\n\n# Home\n');
    const ctx = await build(await createContext(root));
    assert.equal(ctx.docs.find(doc => doc.collection === 'pages' && doc.id === 'home' && doc.locale === 'en')?.pattern, 'landing');
    assert.equal(ctx.docs.find(doc => doc.collection === 'pages' && doc.id === 'docs' && doc.locale === 'zh-CN')?.pattern, 'document');
    assert.equal(ctx.docs.find(doc => doc.collection === 'posts' && doc.id === 'note' && doc.locale === 'en')?.pattern, 'blog');
    assert.match(await readFile(path.join(root, 'dist/en/index.html'), 'utf8'), /data-pattern="landing"/);
    assert.match(await readFile(path.join(root, 'dist/en/posts/note/index.html'), 'utf8'), /data-pattern="blog"/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('language navigation renders once in the article title area', async () => {
  const root = await fixture();
  try {
    await writeFile(path.join(root, 'content/pages/docs/en.md'), '---\ntitle: Docs\n---\n\n# Docs\n\nEnglish content.\n');
    await writeFile(path.join(root, 'content/posts/note/zh-CN.md'), '---\ntitle: 笔记\ndescription: 翻译文章\ndate: 2026-08-08\n---\n\n# 笔记\n\n中文内容。\n');
    const ctx = await build(await createContext(root));
    assert.equal(ctx.routes.has('/en/docs/'), true);
    const html = await readFile(path.join(root, 'dist/en/posts/note/index.html'), 'utf8');
    assert.equal((html.match(/class="languages"/g) || []).length, 1);
    assert.equal((html.match(/class="languages-list"/g) || []).length, 1);
    assert.match(html, /class="languages-heading"[^>]*>Languages<\/span>/);
    assert.match(html, /data-locale="en"/);
    assert.equal((html.match(/class="locale-switcher"/g) || []).length, 0);
    assert.equal((html.match(/footer-meta/g) || []).length, 0);
    assert.doesNotMatch(html, /href="\/llms\.txt"/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('theme-configured privacy, local search, sitemap, and Agent metadata are emitted', async () => {
  const root = await fixture();
  try {
    await mkdir(path.join(root, 'themes/default/scripts'), { recursive: true });
    await writeFile(path.join(root, 'themes/default/theme.yml'), `name: default
i18n: i18n.yml
plugins:
  search:
    script: scripts/search.js
  privacyConsent:
    script: scripts/cookie-consent.js
`);
    await writeFile(path.join(root, 'themes/default/i18n.yml'), `fallbackLocale: en
messages:
  en:
    cookieConsent:
      categories:
        - id: essential
          label: Essential
          description: Required for the site.
        - id: analytics
          label: Optional analytics
          description: Off until consent.
        - id: advertising
          label: Optional advertising
          description: Off until consent.
`);
    await writeFile(path.join(root, 'themes/default/scripts/search.js'), 'document.querySelector("[data-local-search]");\n');
    await writeFile(path.join(root, 'themes/default/scripts/cookie-consent.js'), 'document.querySelector("[data-cookie-consent]");\n');
    await writeFile(path.join(root, 'themes/default/scripts/analytics.js'), 'window.analyticsLoaded = true;\n');
    const configFile = path.join(root, 'config.yml');
    await writeFile(configFile, `${await readFile(configFile, 'utf8')}\nprivacy:\n  cookieConsent:\n    enabled: true\n    policyRoute: /:locale/docs/#privacy\n    storage: cookie\n    retentionDays: 180\n    gatedScripts:\n      - source: scripts/analytics.js\n        category: analytics\n    categories:\n      - id: essential\n        required: true\n        default: true\n      - id: analytics\n        required: false\n        default: false\n      - id: advertising\n        required: false\n        default: false\n    integrations:\n      googleAnalytics:\n        enabled: true\n        measurementId: G-TEST123\n      googleAds:\n        enabled: true\n        conversionId: AW-TEST123\n      cloudflareWebAnalytics:\n        enabled: true\n        token: cf-test-token\n      baiduTongji:\n        enabled: true\n        siteId: baidu-test-id\n`);
    await build(await createContext(root));
    await build(await createContext(root));
    const html = await readFile(path.join(root, 'dist/en/posts/note/index.html'), 'utf8');
    const agent = JSON.parse(await readFile(path.join(root, 'dist/.well-known/agent.json'), 'utf8'));
    const catalog = JSON.parse(await readFile(path.join(root, 'dist/.pagekiln/catalog.json'), 'utf8'));
    assert.match(html, /data-cookie-consent/);
    assert.match(html, /data-cookie-audience="human"/);
    assert.ok(html.indexOf('class="privacy-consent"') < html.indexOf('class="skip"'));
    assert.ok(html.indexOf('class="privacy-trigger"') > html.indexOf('class="site-footer"'));
    assert.match(html, /data-cookie-category="analytics"/);
    assert.match(html, /data-cookie-category="advertising"/);
    assert.match(html, /data-cookie-integrations=/);
    assert.match(html, /data-local-search/);
    assert.match(html, /rel="sitemap"/);
    assert.match(html, /cookie-consent\.[a-f0-9]+\.js/);
    assert.match(html, /data-cookie-script/);
    assert.match(html, /data-cookie-src=.*analytics\.[a-f0-9]+\.js/);
    assert.doesNotMatch(html, /<script[^>]+analytics\.js/);
    assert.doesNotMatch(html, /Agent-readable privacy|Agent 可读隐私说明/);
    assert.match(html, /search\.[a-f0-9]+\.js/);
    assert.doesNotMatch(html, /\?v=/);
    assert.match(html, /data-search-hit-title=/);
    assert.match(html, /data-search-query-hint=/);
    const cookieAsset = html.match(/src="([^"]*cookie-consent\.[a-f0-9]+\.js)"/)?.[1];
    const searchAsset = html.match(/src="([^"]*search\.[a-f0-9]+\.js)"/)?.[1];
    assert.ok(cookieAsset);
    assert.ok(searchAsset);
    assert.match(await readFile(path.join(root, 'dist', cookieAsset.replace(/^\//, '')), 'utf8'), /data-cookie-consent/);
    assert.match(await readFile(path.join(root, 'dist', searchAsset.replace(/^\//, '')), 'utf8'), /data-local-search/);
    const cssAsset = html.match(/href="([^"]*style\.[a-f0-9]+\.css)"/)?.[1];
    assert.ok(cssAsset);
    assert.doesNotMatch(await readFile(path.join(root, 'dist', cssAsset.replace(/^\//, '')), 'utf8'), /[\r\n]/);
    assert.equal(agent.privacy.retentionDays, 180);
    assert.equal(agent.privacy.audience, 'agent');
    assert.equal(agent.privacy.format, 'application/json');
    assert.equal(agent.privacy.optionalCookiesDefault, false);
    assert.deepEqual(agent.privacy.integrations.map(entry => entry.provider), ['googleAnalytics', 'googleAds', 'cloudflareWebAnalytics', 'baiduTongji']);
    assert.deepEqual(catalog.privacy.cookieConsent.integrations.map(entry => entry.provider), ['googleAnalytics', 'googleAds', 'cloudflareWebAnalytics', 'baiduTongji']);
    assert.equal(catalog.theme.name, 'default');
    assert.equal(catalog.theme.style, 'style.css');
    assert.match(catalog.theme.fingerprint, /^[a-f0-9]{20}$/);
    assert.equal(catalog.agent.optional, true);
    assert.equal(catalog.agent.role, 'assistive');
    assert.ok(catalog.agent.functionMap.some(entry => entry.id === 'write-page'));
    assert.equal(agent.agentGuidance.optional, true);
    assert.ok(agent.agentGuidance.functionMap.some(entry => entry.id === 'measure-build'));
    const sitemap = await readFile(path.join(root, 'dist/sitemap.xml'), 'utf8');
    assert.match(sitemap, /<urlset xmlns="https:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9" xmlns:xhtml="https:\/\/www\.w3\.org\/1999\/xhtml">/);
    assert.match(sitemap, /<url>\n\s+<loc>https:\/\/example\.test\//);
    assert.match(sitemap, /<xhtml:link rel="alternate" hreflang="x-default"/);
    assert.match(sitemap, /lastmod>2026-08-08/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('config rejects CSS, HTML, and script injection keys', async () => {
  const root = await fixture();
  try {
    const configFile = path.join(root, 'config.yml');
    await writeFile(configFile, `${await readFile(configFile, 'utf8')}\ncss: injected.css\n`);
    await assert.rejects(createContext(root), error => /config\.yml:1:1/.test(error.message) && /not a site\/plugin setting/.test(error.message) && /theme\.yml/.test(error.message));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('deleted documents remove their generated route', async () => {
  const root = await fixture();
  try {
    await build(await createContext(root));
    const file = path.join(root, 'content/posts/note/en.md');
    await rm(file);
    await build(await createContext(root));
    await assert.rejects(stat(path.join(root, 'dist/en/posts/note/index.html')));
    await assert.rejects(stat(path.join(root, 'dist/public/en/posts/note/index.html')));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('collection schema errors point to the source document', async () => {
  const root = await fixture();
  try {
    const configFile = path.join(root, 'config.yml');
    const config = await readFile(configFile, 'utf8');
    await writeFile(configFile, config.replace('    pages:\n      route: /:locale/:id/', '    pages:\n      route: /:locale/:id/\n      schema:\n        summary:\n          type: string\n          required: true'));
    await assert.rejects(build(await createContext(root)), error => /content[\\/]pages[\\/]home[\\/]en\.md:1:1/.test(error.message) && error.message.includes('summary'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('refreshContext keeps object identity and invalidates collection dependants', async () => {
  const root = await fixture();
  try {
    const home = path.join(root, 'content/pages/home/en.md');
    await writeFile(home, '---\ntitle: Home\npattern: landing\n---\n\n# Home\n\n:::post-list{limit="6"}\n:::\n');
    const ctx = await build(await createContext(root));
    const identity = ctx;
    const before = await readFile(path.join(root, 'dist/en/index.html'), 'utf8');
    const post = path.join(root, 'content/posts/note/en.md');
    await writeFile(post, '---\ntitle: Updated note\ndescription: Searchable note\ndate: 2026-08-08\n---\n\n# Updated note\n\nSearchable text.\n');
    await refreshContext(ctx, [post]);
    await build(ctx);
    const after = await readFile(path.join(root, 'dist/en/index.html'), 'utf8');
    assert.equal(ctx, identity);
    assert.notEqual(before, after);
    assert.match(after, /Updated note/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('missing translations use the configured locale fallback', async () => {
  const root = await fixture();
  try {
    const ctx = await build(await createContext(root));
    const languagePicker = await readFile(path.join(root, 'dist/index.html'), 'utf8');
    assert.match(languagePicker, /Choose a site language/);
    assert.match(languagePicker, /href="\/en\/"/);
    assert.match(languagePicker, /href="\/zh-CN\/"/);
    assert.match(languagePicker, /data-locale="en"[^>]*>[\s\S]*?<strong>English<\/strong>/);
    assert.match(languagePicker, /data-locale="zh-CN"[^>]*>[\s\S]*?<strong>简体中文<\/strong>/);
    const notFound = await readFile(path.join(root, 'dist/404.html'), 'utf8');
    assert.match(notFound, /class="error-page"/);
    assert.match(notFound, /404/);
    assert.equal(ctx.routes.has('/zh-CN/posts/note/'), true);
    assert.match(await readFile(path.join(root, 'dist/zh-CN/posts/note/index.html'), 'utf8'), /Note/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('theme plugin enabled switches can disable search and privacy UI', async () => {
  const root = await fixture();
  try {
    await mkdir(path.join(root, 'themes/default/scripts'), { recursive: true });
    await writeFile(path.join(root, 'themes/default/theme.yml'), `name: default
plugins:
  search:
    enabled: false
    script: scripts/search.js
  privacyConsent:
    enabled: false
    script: scripts/cookie-consent.js
`);
    await writeFile(path.join(root, 'themes/default/scripts/search.js'), 'document.querySelector("[data-local-search]");\n');
    await writeFile(path.join(root, 'themes/default/scripts/cookie-consent.js'), 'document.querySelector("[data-cookie-consent]");\n');
    const configFile = path.join(root, 'config.yml');
    await writeFile(configFile, `${await readFile(configFile, 'utf8')}\nsearch:\n  enabled: true\nprivacy:\n  cookieConsent:\n    enabled: true\n`);
    await build(await createContext(root));
    const html = await readFile(path.join(root, 'dist/en/posts/note/index.html'), 'utf8');
    assert.doesNotMatch(html, /data-local-search/);
    assert.doesNotMatch(html, /data-cookie-consent/);
    assert.doesNotMatch(html, /search\.[a-f0-9]+\.js/);
    assert.doesNotMatch(html, /cookie-consent\.[a-f0-9]+\.js/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('long-lived context reloads changed assets without reprocessing identical images', async () => {
  const root = await fixture();
  try {
    await mkdir(path.join(root, 'content/assets'), { recursive: true });
    const png = await readFile(new URL('../content/assets/favicon-32x32.png', import.meta.url));
    await writeFile(path.join(root, 'content/assets/source.png'), png);
    const configFile = path.join(root, 'config.yml');
    await writeFile(configFile, `${await readFile(configFile, 'utf8')}images:\n  variants:\n    - source: source.png\n      output: assets/thumb.webp\n      width: 16\n      height: 16\n      format: webp\n`);
    const ctx = await build(await createContext(root));
    const output = path.join(root, 'dist/assets/thumb.webp');
    const first = await stat(output);
    await assert.rejects(stat(path.join(root, 'dist/assets/source.png')));
    await new Promise(resolve => setTimeout(resolve, 30));
    await writeFile(path.join(root, 'content/assets/source.png'), png);
    await refreshContext(ctx, [path.join(root, 'content/assets/source.png')]);
    await build(ctx);
    const second = await stat(output);
    assert.equal(second.mtimeMs, first.mtimeMs);
    assert.equal(ctx.profile.imagesProcessed, 0);
    assert.equal(ctx.profile.imageCacheHits, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('deployment output uses one Web Fetch handler and keeps static Pages mode worker-free', async () => {
  const root = await fixture();
  try {
    await build(await createContext(root));
    const worker = await readFile(path.join(root, 'dist/cloudflare-worker.mjs'), 'utf8');
    const vps = await readFile(path.join(root, 'dist/vps-server.mjs'), 'utf8');
    const sitesServer = await readFile(path.join(root, 'dist/server/index.js'), 'utf8');
    assert.match(worker, /createSiteFetchHandler/);
    assert.match(vps, /Deno\.serve/);
    assert.match(sitesServer, /\.\/_pagekiln\/fetch-router\.js/);
    assert.doesNotMatch(vps, /node:fs|createReadStream/);
    await assert.rejects(stat(path.join(root, 'dist/_worker.js')));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('unified public boundary rejects the legacy dist static root', async () => {
  const root = await fixture();
  try {
    const configFile = path.join(root, 'config.yml');
    await writeFile(configFile, `${await readFile(configFile, 'utf8')}\ndeployment:\n  openaiSites:\n    staticDirectory: dist\n`);
    await assert.rejects(createContext(root), /staticDirectory.*private dist bundle root/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('mixed Sites deployment mirrors public output into its configured static directory', async () => {
  const root = await fixture();
  try {
    const configFile = path.join(root, 'config.yml');
    await writeFile(configFile, `${await readFile(configFile, 'utf8')}\ndeployment:\n  openaiSites:\n    staticDirectory: public\n`);
    await build(await createContext(root));
    assert.match(await readFile(path.join(root, 'dist/index.html'), 'utf8'), /Choose a site language/);
    assert.match(await readFile(path.join(root, 'dist/en/index.html'), 'utf8'), /Hello/);
    assert.match(await readFile(path.join(root, 'dist/public/index.html'), 'utf8'), /Choose a site language/);
    assert.match(await readFile(path.join(root, 'dist/server/index.js'), 'utf8'), /static-assets\.js/);
    assert.match(await readFile(path.join(root, 'dist/server/_pagekiln/static-assets.js'), 'utf8'), /index\.html/);
    assert.doesNotMatch(await readFile(path.join(root, 'dist/server/_pagekiln/static-assets.js'), 'utf8'), /server\/index\.js/);
    const { fetchStaticAsset } = await import(`${pathToFileURL(path.join(root, 'dist/server/_pagekiln/static-assets.js')).href}?test=${Date.now()}`);
    for (const requestPath of ['/dist/', '/dist/en/index.html', '/sitemap.xml']) {
      const response = await fetchStaticAsset(new Request(`https://example.test${requestPath}`));
      assert.equal(response.status, 200, requestPath);
    }
    await rm(path.join(root, 'content/pages/home/en.md'));
    await build(await createContext(root));
    const refreshed = await import(`${pathToFileURL(path.join(root, 'dist/server/_pagekiln/static-assets.js')).href}?deleted=${Date.now()}`);
    assert.equal((await refreshed.fetchStaticAsset(new Request('https://example.test/dist/en/'))).status, 404);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('cached source index discovers a newly added locale inside an existing content id', async () => {
  const root = await fixture();
  try {
    await build(await createContext(root));
    const translation = path.join(root, 'content/posts/note/zh-CN.md');
    await writeFile(translation, '---\ntitle: 翻译文章\ndescription: 新增语言文件\ndate: 2026-08-08\n---\n\n# 翻译文章\n');
    const ctx = await build(await createContext(root));
    assert.equal(ctx.byKey.has('posts:note:zh-CN'), true);
    assert.match(await readFile(path.join(root, 'dist/zh-CN/posts/note/index.html'), 'utf8'), /翻译文章/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('unknown Blocks fail with the Markdown source position', async () => {
  const root = await fixture();
  try {
    const home = path.join(root, 'content/pages/home/en.md');
    await writeFile(home, '---\ntitle: Home\n---\n\n# Home\n\n:::missing-block\ntext\n:::\n');
    await assert.rejects(build(await createContext(root)), error => /home[\\/]en\.md:7:1/.test(error.message) && error.message.includes('unknown Block'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('theme modules own custom Blocks and the page shell', async () => {
  const root = await fixture();
  try {
    await writeFile(path.join(root, 'themes/default/theme.yml'), 'name: default\nmodule: theme.js\n');
    await writeFile(path.join(root, 'themes/default/theme.js'), `export default {
      patterns: { landing: { name: 'landing', contexts: ['page'], render: content => content }, document: { name: 'document', contexts: ['page'], render: content => content }, blog: { name: 'blog', contexts: ['post'], render: content => content } },
      blocks: { note: { name: 'note', schema: { tone: 'string' }, render: (node, context) => '<aside data-tone="' + context.escapeHtml(node.attrs.tone || 'info') + '">' + context.renderNodes(node.children) + '</aside>' } },
      shell: context => '<!doctype html><html><head>' + context.head + '</head><body data-theme-shell="yes">' + context.content + '</body></html>'
    };`);
    await writeFile(path.join(root, 'content/pages/home/en.md'), '---\ntitle: Home\npattern: landing\n---\n\n:::note{tone="brand"}\nCustom theme content\n:::\n');
    await build(await createContext(root));
    const html = await readFile(path.join(root, 'dist/en/index.html'), 'utf8');
    assert.match(html, /data-theme-shell="yes"/);
    assert.match(html, /data-tone="brand"/);
    assert.match(await readFile(path.join(root, 'dist/.pagekiln/catalog.json'), 'utf8'), /"name": "note"/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
