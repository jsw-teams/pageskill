import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { build, check, createContext } from '../src/runtime/compiler.js';

const root = fileURLToPath(new URL('../', import.meta.url));

test('Core always builds static dist/public without worker output', async () => {
  // Keep the fixture below the repository so its generated ESM theme modules
  // resolve the repository's installed package dependencies normally.
  const fixture = await mkdtemp(path.join(root, 'tests', '.static-core-'));
  try {
    await cp(path.join(root, '.pageskill', 'theme-runtime'), path.join(fixture, '.pageskill', 'theme-runtime'), { recursive: true });
    await cp(path.join(root, 'themes', 'default'), path.join(fixture, 'themes', 'default'), { recursive: true });
    await mkdir(path.join(fixture, 'site'), { recursive: true });
    await writeFile(path.join(fixture, 'site', 'theme.yml'), 'components:\n  comments:\n    enabled: true\n', 'utf8');
    await mkdir(path.join(fixture, 'content', 'pages', 'home'), { recursive: true });
    await writeFile(path.join(fixture, 'content', 'pages', 'home', 'en.md'), `---\ntitle: Botanical Notes\nkind: page\ndescription: A small independent site.\n---\n\n:::hero\n# Botanical Notes\n\nA field guide for a completely different site.\n:::\n\n:::feature-grid\n## Field observations\nThe editorial copy stays in Markdown.\n\n## Shared components\nThe same Component implementation serves another brand.\n:::\n\n:::slot{name="aside"}\nA structured aside remains content-authored.\n:::\n`, 'utf8');
    await writeFile(path.join(fixture, 'config.yml'), `siteUrl: https://example.com\ndefaultLocale: en\nactiveLocales: [en]\nsiteName: Example Botanical Notes\ndescription: A small independent site.\ntheme:\n  name: default\n  config: ./site/theme.yml\napis:\n  comments:\n    url: https://api.example.net/v1/comments\n    token: fixture-public-client-token\n    auth: bearer\ncontent:\n  collections:\n    pages:\n      contentType: page\n      component: page\n      route: /:locale/:id/\n      schema:\n        title: { type: string, required: true }\n        kind: { type: string, required: true }\n        description: string\nnavigation:\n  links: []\nfooter:\n  links: []\n`, 'utf8');

    const context = await createContext(fixture);
    await build(context);
    await check(context);
    const output = path.join(fixture, 'dist', 'public');
    const html = await readFile(path.join(output, 'en', 'index.html'), 'utf8');
    const client = await readFile(path.join(output, 'assets', 'pageskill', 'client.js'), 'utf8');
    assert.match(html, /Botanical Notes/);
    assert.match(html, /Field observations/);
    assert.match(html, /Shared components/);
    assert.match(html, /structured aside remains content-authored/);
    assert.equal(context.out, output);
    assert.match(client, /https:\/\/api\.example\.net\/v1\/comments/);
    assert.match(client, /fixture-public-client-token/);
    assert.match(client, /authorization.*Bearer/);
    assert.equal(await pathExists(path.join(output, '_worker.js')), false);
    assert.equal(await pathExists(path.join(output, '_pageskill')), false);
    assert.equal(await pathExists(path.join(fixture, 'wrangler.toml')), false);
    const publicRoot = path.join(fixture, 'dist', 'public');
    const textFiles = (await filesUnder(publicRoot))
      .filter(file => /\.(?:html|md|txt|xml|json)$/i.test(file))
      .filter(file => {
        const relative = path.relative(publicRoot, file).replaceAll('\\', '/');
        return !relative.startsWith('.pageskill/') && !relative.startsWith('.well-known/');
      });
    const renderedSite = (await Promise.all(textFiles.map(file => readFile(file, 'utf8')))).join('\n');
    for (const literal of ['Pageskill', 'OpenJSU', 'toewpq', 'jsw-teams', 'posts/start', 'posts/markdown']) {
      assert.equal(renderedSite.includes(literal), false, `independent generated site leaks ${literal}`);
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(file));
    else files.push(file);
  }
  return files;
}

async function pathExists(file) {
  try { await readFile(file); return true; } catch { return false; }
}
