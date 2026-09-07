import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile as nodeExecFile } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createContext, build, inspect } from '../src/compiler.ts';

const execFile = promisify(nodeExecFile);
const cli = fileURLToPath(new URL('../src/bin/pageskill.mjs', import.meta.url));
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const THEME = `export default {
  patterns: {
    landing: { name: 'landing', contexts: ['page'], render: content => content },
    docs: { name: 'docs', contexts: ['page'], render: content => content },
    blog: { name: 'blog', contexts: ['post'], render: content => content }
  },
  blocks: {}
};\n`;

async function runCli(root, ...args) {
  return execFile(process.execPath, [cli, ...args], {
    cwd: repoRoot,
    env: { ...process.env, PAGESKILL_SITE_ROOT: root },
    maxBuffer: 2 * 1024 * 1024
  });
}

async function contractFixture({ missingDate = false, posts = null } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pagekiln-content-contract-'));
  await mkdir(path.join(root, 'content/pages/home'), { recursive: true });
  await mkdir(path.join(root, 'content/pages/guide'), { recursive: true });
  await mkdir(path.join(root, 'content/posts'), { recursive: true });
  await mkdir(path.join(root, 'themes/default'), { recursive: true });
  await writeFile(path.join(root, 'config.yml'), `siteUrl: https://example.test
defaultLocale: en
activeLocales:
  - en
siteName:
  en: Contract test
description:
  en: Content contract test
theme:
  name: default
content:
  collections:
    pages:
      contentType: page
      pattern: document
      route: /:locale/:id/
      schema:
        title:
          type: string
          required: true
        description: string
        pattern: string
    posts:
      contentType: post
      pattern: blog
      route: /:locale/posts/:id/
      feed: true
      archive: true
      orderBy: date:desc
      schema:
        title:
          type: string
          required: true
        description: string
        date:
          type: string
          required: true
        cover: string
        pattern: string
archive:
  collection: posts
feed:
  collection: posts
  title: Contract test
  limit: 20
`);
  await writeFile(path.join(root, 'themes/default/theme.yml'), 'name: default\nstyle: style.css\n');
  await writeFile(path.join(root, 'themes/default/style.css'), 'body{color:black}\n');
  await writeFile(path.join(root, 'themes/default/theme.js'), THEME);
  await writeFile(path.join(root, 'content/pages/home/en.md'), '---\ntitle: Home\npattern: landing\n---\n\n# Home\n');
  await writeFile(path.join(root, 'content/pages/guide/en.md'), '---\ntitle: Guide\npattern: docs\n---\n\n# Guide\n\nCurrent instructions.\n');
  const entries = posts || { note: { title: 'Note', date: '2026-08-08' } };
  for (const [id, entry] of Object.entries(entries)) {
    const frontmatter = [
      '---',
      `title: ${entry.title}`,
      entry.description ? `description: ${entry.description}` : '',
      missingDate ? '' : `date: ${entry.date || ''}`,
      'pattern: blog',
      '---',
      '',
      `# ${entry.title}`,
      '',
      `Record ${id}.`
    ].filter(Boolean).join('\n') + '\n';
    await mkdir(path.join(root, 'content/posts', id), { recursive: true });
    await writeFile(path.join(root, 'content/posts', id, 'en.md'), frontmatter);
  }
  return root;
}

function postsContract(config) {
  const posts = config.content.collections.posts;
  return {
    contentType: posts.contentType,
    pattern: posts.pattern,
    route: posts.route,
    feed: posts.feed,
    archive: posts.archive,
    orderBy: posts.orderBy,
    schema: posts.schema
  };
}

test('check rejects a Product Note without the required date', async () => {
  const root = await contractFixture({ missingDate: true });
  try {
    await assert.rejects(() => runCli(root, 'check'), error => {
      assert.equal(error.code, 1);
      assert.match(String(error.stderr), /frontmatter field "date" is required/);
      assert.match(String(error.stderr), /content[\\/]posts[\\/]note[\\/]en\.md/);
      return true;
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('dated Product Notes enter the archive and Feed in descending date order while pages need no date', async () => {
  const root = await contractFixture({
    posts: {
      older: { title: 'Older note', date: '2026-08-08' },
      newer: { title: 'Newer note', date: '2026-08-10' }
    }
  });
  try {
    const ctx = await build(await createContext(root));
    const archive = await readFile(path.join(root, 'dist/en/posts/index.html'), 'utf8');
    const feed = await readFile(path.join(root, 'dist/en/feed.xml'), 'utf8');
    assert.ok(archive.includes('Newer note'));
    assert.ok(archive.includes('Older note'));
    assert.ok(archive.indexOf('Newer note') < archive.indexOf('Older note'));
    assert.ok(feed.indexOf('Newer note') < feed.indexOf('Older note'));
    assert.equal(ctx.routes.has('/en/guide/'), true);
    assert.equal((await inspect(ctx, 'collection:posts')).item.schema.date.required, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Starter posts contract matches the formal example and the new Product Note is one translation group', async () => {
  const formal = await createContext(repoRoot);
  const starterRoot = await mkdtemp(path.join(os.tmpdir(), 'pagekiln-starter-contract-'));
  try {
    await runCli(starterRoot, 'init');
    const starter = await createContext(starterRoot);
    assert.deepEqual(postsContract(starter.config), postsContract(formal.config));

    const inspected = await inspect(formal, 'collection:posts');
    assert.equal(inspected.item.schema.date.required, true);

    const notes = formal.docs.filter(doc => doc.collection === 'posts' && doc.id === 'prompt-skill-after-models');
    assert.deepEqual(notes.map(doc => doc.locale).sort(), ['en', 'zh-sg', 'zh-tw']);
    assert.ok(notes.every(doc => doc.data.cover === '/assets/product-note-cover.webp'));
    await build(formal);
    const home = await readFile(path.join(repoRoot, 'dist/zh-sg/index.html'), 'utf8');
    assert.match(home, /product-note-cover\.webp/);
    assert.equal((home.match(/模型越来越强之后/g) || []).length, 1);
  } finally {
    await rm(starterRoot, { recursive: true, force: true });
  }
});
