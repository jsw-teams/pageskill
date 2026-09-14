import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { MemoryCacheProvider, SingleFlight } from '../src/runtime/runtime-contract.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const componentRoot = path.join(root, 'themes', 'default', 'components');

async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(file));
    else files.push(file);
  }
  return files;
}

function htmlContext() {
  return {
    escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'),
    safeUrl: value => String(value),
    renderNodes: nodes => nodes.map(node => node.html || '').join(''),
    translate: (_key, fallback) => fallback,
    componentText: (_component, _key, fallback) => fallback
  };
}

test('default Components contain no demo brand, fixed document, or locale route', async () => {
  const sources = await Promise.all((await filesUnder(componentRoot))
    .filter(file => /\.(?:ts|js)$/i.test(file))
    .map(file => readFile(file, 'utf8')));
  const source = sources.join('\n');
  for (const literal of ['Pageskill', 'OpenJSU', 'toewpq', 'jsw-teams', '/en/', '/zh-tw/', '/zh-sg/', 'posts/start', 'posts/markdown']) {
    assert.equal(source.includes(literal), false, `default Component source leaks ${literal}`);
  }
  const registry = await import(pathToFileUrl(path.join(root, '.pageskill', 'theme-runtime', 'themes', 'default', 'components', 'index.js')));
  const definitions = registry.components;
  assert.ok(Array.isArray(definitions));
  assert.ok(definitions.some(item => item.id === 'comments' && item.source === 'external' && !item.capabilities.includes('ai')));
  assert.ok(definitions.some(item => item.id === 'comment-translation' && item.source === 'external' && item.capabilities.includes('ai')));
  assert.equal(definitions.some(item => ['plugin', 'pattern', 'layout', 'module'].includes(item.id)), false);
});

function pathToFileUrl(file) {
  return new URL(`file:///${file.replaceAll('\\', '/')}`).href;
}

test('content replacement renders through the same Component implementation', async () => {
  const heroModule = await import(pathToFileUrl(path.join(root, '.pageskill', 'theme-runtime', 'themes', 'default', 'components', 'hero', 'index.js')));
  const sourceFile = path.join(componentRoot, 'hero', 'index.ts');
  const implementationHash = createHash('sha256').update(await readFile(sourceFile)).digest('hex');
  const context = htmlContext();
  const fixtureFiles = [
    path.join(root, 'tests', 'fixtures', 'component-contract', 'site-a.md'),
    path.join(root, 'tests', 'fixtures', 'component-contract', 'site-b.md')
  ];
  const rendered = [];
  for (const fixture of fixtureFiles) {
    const body = await readFile(fixture, 'utf8');
    rendered.push(heroModule.component.render({ attrs: {}, children: [], slots: {}, props: {}, renderedChildren: body }, context));
  }
  assert.notEqual(rendered[0], rendered[1]);
  assert.match(rendered[0], /Field Notes/);
  assert.match(rendered[1], /Botanical Notes/);
  assert.equal(createHash('sha256').update(await readFile(sourceFile)).digest('hex'), implementationHash);
});

test('CacheProvider TTL and wildcard invalidation plus twenty-request single-flight', async () => {
  const cache = new MemoryCacheProvider();
  cache.set('comments:v1:posts:first:page:1', { comments: [] }, { ttlSeconds: 30 });
  cache.set('comments:v1:posts:first:page:2', { comments: [] }, { ttlSeconds: 30 });
  cache.set('translation:v1:comment:hash:en', 'translated', { ttlSeconds: 30 });
  assert.deepEqual(cache.get('comments:v1:posts:first:page:1'), { comments: [] });
  cache.invalidate('comments:v1:posts:first:*');
  assert.equal(cache.get('comments:v1:posts:first:page:1'), null);
  assert.equal(cache.get('translation:v1:comment:hash:en'), 'translated');
  cache.set('expired', 'value', { ttlSeconds: 0 });
  assert.equal(cache.get('expired'), null);

  const flight = new SingleFlight();
  let calls = 0;
  const sourceHash = source => createHash('sha256').update(source).digest('hex');
  const targetLocale = 'zh-tw';
  const translate = source => flight.run(`translation:v1:comment:comment-1:${sourceHash(source)}:${targetLocale}`, async () => {
    calls += 1;
    await new Promise(resolve => setTimeout(resolve, 5));
    return 'translated';
  });
  const results = await Promise.all(Array.from({ length: 20 }, () => translate('same source comment')));
  assert.equal(calls, 1);
  assert.deepEqual([...new Set(results)], ['translated']);
  await translate('changed source comment');
  assert.equal(calls, 2);
});
