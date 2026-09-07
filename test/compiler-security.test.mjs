import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, createContext } from '../src/compiler.ts';

const THEME = `export default {
  patterns: { document: { name: 'document', contexts: ['page'], render: content => content } },
  blocks: {}
};
`;

async function fixture(config = '', options = {}) {
  const defaultLocale = options.defaultLocale ?? 'en';
  const themeName = options.themeName ?? 'default';
  const root = await mkdtemp(path.join(os.tmpdir(), 'pageskill-compiler-security-'));
  await mkdir(path.join(root, 'content/pages/home'), { recursive: true });
  await mkdir(path.join(root, 'themes/default/scripts'), { recursive: true });
  await writeFile(path.join(root, 'config.yml'), `siteUrl: https://example.test
defaultLocale: ${JSON.stringify(defaultLocale)}
activeLocales: [en]
theme:
  name: ${JSON.stringify(themeName)}
content:
  collections:
    pages:
      contentType: page
      pattern: document
      route: /:locale/:id/
${config}`);
  await writeFile(path.join(root, 'themes/default/theme.yml'), `name: default
module: theme.js
style: style.css
plugins:
  privacyConsent:
    enabled: true
    script: scripts/cookie-consent.js
`);
  await writeFile(path.join(root, 'themes/default/theme.js'), THEME);
  await writeFile(path.join(root, 'themes/default/style.css'), 'body{}');
  await writeFile(path.join(root, 'themes/default/scripts/cookie-consent.js'), 'export default {};');
  await writeFile(path.join(root, 'content/pages/home/en.md'), '---\ntitle: Home\n---\n\n# Home\n');
  return root;
}

test('rejects unsafe config path and locale values before loading a theme', async () => {
  const cases = [
    [{ defaultLocale: "en'); globalThis.pwned = true; //" }, /defaultLocale.*locale tag/],
    [{ themeName: '../outside' }, /theme\.name.*theme directory/],
    [`deployment:\n  openaiSites:\n    staticDirectory: ../public\n`, /staticDirectory.*relative|must not contain/],
    [`deployment:\n  staticDirectory: dist\n`, /private dist bundle root/]
  ];
  for (const [extra, expected] of cases) {
    const root = typeof extra === 'string' ? await fixture(extra) : await fixture('', extra);
    try {
      await assert.rejects(createContext(root), expected);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test('rejects a frontmatter route that would escape dist', async () => {
  const root = await fixture();
  try {
    await writeFile(path.join(root, 'content/pages/home/en.md'), '---\ntitle: Home\nroute: ../outside/\n---\n\n# Home\n');
    await assert.rejects(build(await createContext(root)), /build output path|escape|\.\./i);
    await assert.rejects(stat(path.join(root, 'outside/index.html')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('quotes generated JavaScript and TOML values without executing configuration', async () => {
  const root = await fixture(`deployment:
  cloudflare:
    accountId: 'acct"\\path'
    workers:
      name: 'worker"\\name'
      compatibilityDate: '2026-08-10"\\date'
`);
  try {
    await build(await createContext(root));
    const worker = await readFile(path.join(root, 'dist/cloudflare-worker.mjs'), 'utf8');
    const toml = await readFile(path.join(root, 'dist/wrangler.toml'), 'utf8');
    assert.match(worker, /defaultLocale: "en"/);
    assert.doesNotMatch(worker, /globalThis|pwned/);
    assert.match(toml, /name = "worker\\"\\\\name"/);
    assert.match(toml, /account_id = "acct\\"\\\\path"/);
    assert.doesNotMatch(toml, /name = "worker"\\\\name"/);
    assert.doesNotMatch(toml, /compatibility_date = "2026-08-10"\\\\date"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('embedded Sites assets expose public GET and HEAD files without backend artifacts', async () => {
  const root = await fixture(`deployment:
  openaiSites:
    staticDirectory: public
`);
  try {
    await build(await createContext(root));
    const runtimePath = path.join(root, 'dist/server/_pagekiln/static-assets.js');
    const source = await readFile(runtimePath, 'utf8');
    assert.doesNotMatch(source, /backend[\\/]handler|server[\\/]index\.js|_pagekiln[\\/]backend/);
    const { fetchStaticAsset } = await import(`${pathToFileURL(runtimePath).href}?security=${Date.now()}`);
    const get = await fetchStaticAsset(new Request('https://example.test/'));
    assert.equal(get.status, 200);
    assert.match(await get.text(), /<!doctype html>/i);
    const search = await fetchStaticAsset(new Request('https://example.test/assets/search-index.en.json'));
    assert.equal(search.status, 200);
    assert.equal(search.headers.get('cache-control'), 'no-cache');
    const html = await readFile(path.join(root, 'dist/public/en/index.html'), 'utf8');
    const fingerprintedCss = html.match(/\/assets\/theme\/default\/style\.[a-f0-9]{12}\.css/)?.[0];
    assert.ok(fingerprintedCss);
    const css = await fetchStaticAsset(new Request(`https://example.test${fingerprintedCss}`));
    assert.equal(css.status, 200);
    assert.equal(css.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    const head = await fetchStaticAsset(new Request('https://example.test/', { method: 'HEAD' }));
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    const post = await fetchStaticAsset(new Request('https://example.test/', { method: 'POST' }));
    assert.equal(post.status, 405);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('generated VPS handler serves public files and API while guarding private and symlink paths', async t => {
  const root = await fixture(`deployment:
  backend: true
`);
  const previousDeno = globalThis.Deno;
  let serveHandler;
  try {
    await mkdir(path.join(root, 'backend'), { recursive: true });
    await mkdir(path.join(root, '.pagekiln', 'backend-runtime', 'backend'), { recursive: true });
    await writeFile(path.join(root, 'backend/handler.ts'), 'export const sourceContract = true;\n');
    await writeFile(path.join(root, '.pagekiln/backend-runtime/backend/handler.js'), `import { Router } from '../fetch-router.js';
const router = new Router();
router.get('/api/health', () => new Response('ok'));
router.get('/api/protected', ({ request, env }) => {
  const authorized = request.headers.get('authorization') === \`Bearer \${env.TEST_TOKEN}\`;
  return authorized ? Response.json({ ok: true }) : new Response('Unauthorized', { status: 401 });
});
export { router };
`);
    await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
    await build(await createContext(root));

    const dist = path.join(root, 'dist');
    const publicRoot = path.join(dist, 'public');
    const deno = {
      env: { get: name => name === 'TEST_TOKEN' ? 'runtime-secret-token' : undefined },
      async realPath(value) { return realpath(value instanceof URL ? fileURLToPath(value) : value); },
      readFile,
      serve(_options, handler) { serveHandler = handler; return { shutdown() {} }; }
    };
    globalThis.Deno = deno;
    const generated = await import(`${pathToFileURL(path.join(dist, 'vps-server.mjs')).href}?security=${Date.now()}`);
    assert.equal(typeof generated.fetchHandler, 'function');
    assert.equal(typeof serveHandler, 'function');

    const page = await serveHandler(new Request('https://example.test/en/'), {});
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Home/);
    const health = await serveHandler(new Request('https://example.test/api/health'), {});
    assert.equal(health.status, 200);
    assert.equal(await health.text(), 'ok');
    const unauthorized = await serveHandler(new Request('https://example.test/api/protected'), {});
    assert.equal(unauthorized.status, 401);
    const authorized = await serveHandler(new Request('https://example.test/api/protected', {
      headers: { authorization: 'Bearer runtime-secret-token' }
    }), {});
    assert.equal(authorized.status, 200);
    assert.deepEqual(await authorized.json(), { ok: true });
    assert.doesNotMatch(await readFile(path.join(publicRoot, 'en/index.html'), 'utf8'), /runtime-secret-token/);
    const search = await serveHandler(new Request('https://example.test/assets/search-index.en.json', { method: 'HEAD' }), {});
    assert.equal(search.status, 200);
    assert.equal(await search.text(), '');
    assert.equal(search.headers.get('cache-control'), 'no-cache');
    for (const privatePath of ['/server/index.js', '/_pagekiln/backend/handler.js', '/dist/_pagekiln/backend/handler.js']) {
      assert.equal((await serveHandler(new Request(`https://example.test${privatePath}`), {})).status, 404, privatePath);
    }

    let linkCreated = false;
    try {
      await symlink(path.join(dist, '_pagekiln', 'backend'), path.join(publicRoot, 'private-link'), process.platform === 'win32' ? 'junction' : 'dir');
      linkCreated = true;
    } catch (error) {
      if (!['EACCES', 'EPERM', 'ENOTSUP'].includes(error?.code)) throw error;
      t.diagnostic(`VPS symlink containment regression skipped: ${error.code}`);
    }
    if (linkCreated) assert.equal((await serveHandler(new Request('https://example.test/private-link/handler.js'), {})).status, 404);
    else t.diagnostic('VPS symlink containment regression was not exercised on this host');
  } finally {
    if (previousDeno === undefined) delete globalThis.Deno;
    else globalThis.Deno = previousDeno;
    await rm(root, { recursive: true, force: true });
  }
});

test('gated script query parameters remain valid after HTML escaping', async () => {
  const root = await fixture(`privacy:
  cookieConsent:
    enabled: true
    gatedScripts:
      - source: 'https://analytics.example.test/script.js?x=1&y="q"'
        category: analytics
`);
  try {
    await build(await createContext(root));
    const html = await readFile(path.join(root, 'dist/en/index.html'), 'utf8');
    assert.match(html, /data-cookie-src="https:\/\/analytics\.example\.test\/script\.js\?x=1&amp;y=&quot;q&quot;"/);
    assert.doesNotMatch(html, /&amp;amp;/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
