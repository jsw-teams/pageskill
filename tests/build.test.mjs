import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createContext, build } from '../src/runtime/compiler.js';

const root = fileURLToPath(new URL('../', import.meta.url));

async function pathExists(file) {
  try { await access(file); return true; } catch { return false; }
}

test('generated post metadata keeps updated separate from publication date', async () => {
  const context = await createContext(root);
  await build(context);
  const document = context.docs.find(item => item.id === 'agent-discovery' && item.locale === 'en');
  assert.ok(document);
  assert.equal(document.date, '2026-09-11');
  assert.equal(document.updated, '2026-09-16');
  assert.ok(document.metrics.totalUnits > 0);
  assert.ok(document.metrics.readingMinutes >= 1);

  const html = await readFile(path.join(root, 'dist', 'public', 'en', 'posts', 'agent-discovery', 'index.html'), 'utf8');
  assert.match(html, /article:published_time" content="2026-09-11T00:00:00\.000Z"/);
  assert.match(html, /article:modified_time" content="2026-09-16T00:00:00\.000Z"/);
  assert.match(html, /post-update-notice/);
  assert.match(html, /Updated/);
  assert.match(html, /September 16, 2026/);
  assert.match(html, /min read/);
  assert.match(html, /href="https:\/\/github\.com\/jsw-teams\/pageskill" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /href="\/en\/privacy\/"/);

  const simplifiedHtml = await readFile(path.join(root, 'dist', 'public', 'zh-sg', 'posts', 'agent-discovery', 'index.html'), 'utf8');
  assert.match(simplifiedHtml, /发布于/);
  assert.match(simplifiedHtml, /更新于/);
  assert.match(simplifiedHtml, /本文已更新/);

  const sitemap = await readFile(path.join(root, 'dist', 'public', 'sitemap.xml'), 'utf8');
  const sitemapEntry = sitemap.slice(sitemap.indexOf('/en/posts/agent-discovery/'), sitemap.indexOf('/en/posts/agent-discovery/') + 260);
  assert.match(sitemapEntry, /<lastmod>2026-09-16<\/lastmod>/);

  const search = JSON.parse(await readFile(path.join(root, 'dist', 'public', 'assets', 'search-index.en.json'), 'utf8'));
  const searchEntry = search.find(item => item.id === 'agent-discovery');
  assert.equal(searchEntry.date, '2026-09-11');
  assert.equal(searchEntry.updated, '2026-09-16');

  const feed = await readFile(path.join(root, 'dist', 'public', 'en', 'posts', 'feed.xml'), 'utf8');
  const feedItem = feed.slice(feed.indexOf('<title>Configure Agent discovery'), feed.indexOf('</item>', feed.indexOf('<title>Configure Agent discovery')));
  assert.match(feedItem, /<pubDate>Fri, 11 Sep 2026 00:00:00 GMT<\/pubDate>/);
  assert.doesNotMatch(feedItem, /<pubDate>Wed, 16 Sep 2026/);

  const manifest = JSON.parse(await readFile(path.join(root, '.pageskill', 'manifest.json'), 'utf8'));
  const manifestEntry = Object.values(manifest.documents).find(item => item.id === 'agent-discovery' && item.locale === 'en');
  assert.equal(manifestEntry.updated, '2026-09-16');
  assert.equal(manifestEntry.metrics.totalUnits, document.metrics.totalUnits);

  assert.equal(manifest.version, 4);
  assert.doesNotMatch(html, /branding|attribution/i);
  assert.equal(await pathExists(path.join(root, 'wrangler.toml')), false);

  const ordinaryPost = await readFile(path.join(root, 'dist', 'public', 'en', 'posts', 'first-post', 'index.html'), 'utf8');
  assert.doesNotMatch(ordinaryPost, /article:modified_time/);
  assert.doesNotMatch(ordinaryPost, /post-update-notice/);

  const categoryArchive = await readFile(path.join(root, 'dist', 'public', 'en', 'posts', 'category', 'tutorial', 'index.html'), 'utf8');
  assert.match(categoryArchive, /<p class="eyebrow">Tutorials<\/p>/);
  assert.doesNotMatch(categoryArchive, /category\.tutorial/);
});
