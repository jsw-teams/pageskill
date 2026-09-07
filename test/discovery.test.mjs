import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile as nodeExecFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createContext, build, inspect } from '../src/compiler.ts';

const execFile = promisify(nodeExecFile);
const cli = fileURLToPath(new URL('../src/bin/pageskill.mjs', import.meta.url));
const legacyCli = fileURLToPath(new URL('../src/bin/pagekiln.mjs', import.meta.url));
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pagekiln-discovery-'));
  await fs.mkdir(path.join(root, 'content/pages/home'), { recursive: true });
  await fs.mkdir(path.join(root, 'content/posts/note'), { recursive: true });
  await fs.mkdir(path.join(root, 'themes/default'), { recursive: true });
  await fs.writeFile(path.join(root, 'config.yml'), `siteUrl: https://example.test
defaultLocale: en
activeLocales: [en]
siteName: { en: Test }
description: { en: Test site }
theme:
  name: default
plugins:
  search:
    enabled: true
content:
  collections:
    pages:
      contentType: page
      pattern: document
      route: /:locale/:id/
      schema:
        title: { type: string, required: true }
    posts:
      contentType: post
      pattern: blog
      route: /:locale/posts/:id/
      feed: true
      archive: true
`);
  await fs.writeFile(path.join(root, 'themes/default/theme.yml'), `name: default
module: theme.js
style: style.css
plugins:
  search:
    enabled: true
patterns: [document, blog]
blocks: [hero]
`);
  await fs.writeFile(path.join(root, 'themes/default/style.css'), 'body{color:black}\n');
  await fs.writeFile(path.join(root, 'themes/default/hero.css'), '.hero{}\n');
  await fs.writeFile(path.join(root, 'themes/default/hero.js'), 'export {};\n');
  await fs.writeFile(path.join(root, 'themes/default/blog.css'), '.post{}\n');
  await fs.writeFile(path.join(root, 'themes/default/theme.js'), `const blocks = {
  hero: {
    name: 'hero',
    schema: { tone: 'string' },
    defaults: { tone: 'default' },
    contexts: ['page'],
    resources: { styles: ['hero.css'], scripts: ['hero.js'] },
    render: (node, context) => '<section class="hero">' + context.renderNodes(node.children) + '</section>'
  }
};
export default {
  patterns: {
    document: { name: 'document', contexts: ['page'], render: content => content },
    blog: { name: 'blog', contexts: ['post'], resources: { styles: ['blog.css'] }, render: content => content }
  },
  blocks
};
`);
  await fs.writeFile(path.join(root, 'content/pages/home/en.md'), '---\ntitle: Home\n---\n\n:::hero{tone="default"}\n# Home\n:::\n');
  await fs.writeFile(path.join(root, 'content/posts/note/en.md'), '---\ntitle: Note\ndate: 2026-08-10\n---\n\n# Note\n');
  return root;
}

async function runCli(root, ...args) {
  return runCliWithEnv(root, {}, ...args);
}

async function runCliWithEnv(root, extraEnv, ...args) {
  return execFile(process.execPath, [cli, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...extraEnv, PAGESKILL_SITE_ROOT: root },
    maxBuffer: 2 * 1024 * 1024
  });
}

async function runCliFromCwd(cwd, extraEnv, ...args) {
  const env = { ...process.env, ...extraEnv };
  delete env.PAGESKILL_SITE_ROOT;
  return execFile(process.execPath, [cli, ...args], {
    cwd,
    env,
    maxBuffer: 2 * 1024 * 1024
  });
}

test('inspect supports content ids and explicit capability namespaces', async () => {
  const root = await fixture();
  try {
    const ctx = await createContext(root);
    const content = await inspect(ctx, 'home');
    assert.equal(content.kind, 'content');
    assert.equal(content.items[0].id, 'home');

    const page = await inspect(ctx, 'page:home');
    assert.equal(page.kind, 'content');
    assert.equal(page.items[0].collection, 'pages');

    const block = await inspect(ctx, 'block:hero');
    assert.deepEqual(block.item.schema, { tone: 'string' });
    assert.deepEqual(block.item.defaults, { tone: 'default' });
    assert.deepEqual(block.item.contexts, ['page']);
    assert.deepEqual(block.item.resources, { styles: ['hero.css'], scripts: ['hero.js'] });

    const pattern = await inspect(ctx, 'pattern:blog');
    assert.deepEqual(pattern.item.contexts, ['post']);
    assert.deepEqual(pattern.item.resources, { styles: ['blog.css'], scripts: [] });

    const collection = await inspect(ctx, 'collection:posts');
    assert.equal(collection.item.contentType, 'post');
    assert.equal(collection.item.route, '/:locale/posts/:id/');
    assert.equal(collection.item.pattern, 'blog');
    assert.equal(collection.item.feed, true);
    assert.equal(collection.item.archive, true);

    const plugin = await inspect(ctx, 'plugin:search');
    assert.equal(plugin.item.enabled, true);
    assert.equal(plugin.item.theme.enabled, true);
    assert.equal(plugin.item.config.enabled, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('inspect returns a stable structured not-found error', async () => {
  const root = await fixture();
  try {
    await assert.rejects(inspect(await createContext(root), 'block:missing'), error => {
      assert.equal(error.code, 'INSPECT_NOT_FOUND');
      assert.equal(error.details.query, 'block:missing');
      assert.deepEqual(error.details.available, ['hero']);
      return true;
    });
    await assert.rejects(runCli(root, 'inspect', 'pattern:missing'), error => {
      const payload = JSON.parse(error.stderr);
      assert.equal(payload.error.code, 'INSPECT_NOT_FOUND');
      assert.equal(payload.error.query, 'pattern:missing');
      return true;
    });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('catalog works without dist and matches the build catalog capability facts', async () => {
  const root = await fixture();
  try {
    const sourceCatalog = JSON.parse((await runCli(root, 'catalog')).stdout);
    await assert.rejects(fs.stat(path.join(root, 'dist')));
    assert.equal(sourceCatalog.theme.name, 'default');
    assert.deepEqual(sourceCatalog.patterns.map(item => item.name), ['document', 'blog']);
    assert.deepEqual(sourceCatalog.blocks.map(item => item.name), ['hero']);
    assert.equal(sourceCatalog.collections.find(item => item.name === 'posts').feed, true);
    assert.deepEqual(sourceCatalog.agent.sourceOfTruth, ['config.yml', 'content/', 'themes/']);
    assert.deepEqual(sourceCatalog.agent.generatedDiscovery, ['.pagekiln/catalog.json', '.well-known/agent.json']);
    assert.deepEqual(sourceCatalog.agent.agentInstructions, ['AGENTS.md']);

    await build(await createContext(root));
    const builtCatalog = JSON.parse(await fs.readFile(path.join(root, 'dist/.pagekiln/catalog.json'), 'utf8'));
    for (const field of ['theme', 'patterns', 'blocks', 'collections', 'languages', 'agent', 'privacy']) assert.deepEqual(sourceCatalog[field], builtCatalog[field], field);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('init copies a minimal declared-and-implemented starter that checks and builds', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pagekiln-init-'));
  try {
    const result = await runCli(root, 'init');
    assert.match(result.stdout, /Initialized neutral Pageskill site/);
    for (const relative of ['config.yml', 'content/pages/home/en.md', 'themes/default/theme.yml', 'themes/default/theme.js', 'themes/default/style.css']) {
      await fs.access(path.join(root, relative));
    }
    const ctx = await createContext(root);
    assert.deepEqual(Object.keys(ctx.themeDefinition.patterns).sort(), [...ctx.theme.patterns].sort());
    assert.deepEqual(Object.keys(ctx.themeDefinition.blocks).sort(), [...ctx.theme.blocks].sort());
    await runCli(root, 'check');
    await runCli(root, 'build');
    assert.match(await fs.readFile(path.join(root, 'dist/en/index.html'), 'utf8'), /Write Markdown/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('pageskill is the only CLI entry and PAGESKILL_SITE_ROOT wins without a legacy fallback', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pagekiln-cli-root-'));
  const ignoredRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pagekiln-legacy-root-'));
  const cwdRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pageskill-cwd-root-'));
  try {
    const packageManifest = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'));
    const packageLock = JSON.parse(await fs.readFile(path.join(repoRoot, 'package-lock.json'), 'utf8'));
    assert.deepEqual(packageManifest.bin, { pageskill: 'src/bin/pageskill.mjs' });
    assert.deepEqual(packageLock.packages[''].bin, { pageskill: 'src/bin/pageskill.mjs' });
    assert.equal((await runCliFromCwd(cwdRoot, {}, '--version')).stdout.trim(), packageManifest.version);
    assert.equal((await runCliFromCwd(cwdRoot, {}, '-v')).stdout.trim(), packageManifest.version);

    await runCli(root, 'init');
    await runCliWithEnv(root, { PAGEKILN_SITE_ROOT: ignoredRoot }, 'build');
    await fs.access(path.join(root, 'dist/en/index.html'));
    await assert.rejects(fs.access(path.join(ignoredRoot, 'dist')), error => error?.code === 'ENOENT');
    await assert.rejects(fs.access(legacyCli), error => error?.code === 'ENOENT');

    await runCliFromCwd(cwdRoot, { PAGEKILN_SITE_ROOT: ignoredRoot }, 'init');
    await fs.access(path.join(cwdRoot, 'config.yml'));
    await assert.rejects(fs.access(path.join(ignoredRoot, 'config.yml')), error => error?.code === 'ENOENT');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(ignoredRoot, { recursive: true, force: true });
    await fs.rm(cwdRoot, { recursive: true, force: true });
  }
});
