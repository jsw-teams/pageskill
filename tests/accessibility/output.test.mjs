import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../..', import.meta.url));
const publicRoot = path.join(root, 'dist', 'public');

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(file));
    else if (entry.name.endsWith('.html')) files.push(file);
  }
  return files;
}

function targetFile(rawHref, currentFile) {
  const value = new URL(rawHref, 'https://pageskill.test');
  const pathname = decodeURIComponent(value.pathname);
  if (!pathname.startsWith('/')) return undefined;
  if (pathname.endsWith('/')) return path.join(publicRoot, pathname.slice(1), 'index.html');
  return path.join(publicRoot, pathname.slice(1));
}

test('generated links resolve to generated outputs and keep external target security', async () => {
  const files = await htmlFiles(publicRoot);
  assert.ok(files.length > 0);
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    for (const match of html.matchAll(/<a\b([^>]*?)\bhref="([^"]+)"([^>]*)>/gi)) {
      const attributes = `${match[1]}${match[3]}`;
      const href = match[2];
      assert.doesNotMatch(href, /^(?:javascript|data|file):/i);
      if (/^https?:\/\//i.test(href)) {
        if (/target="_blank"/i.test(attributes)) assert.match(attributes, /rel="noopener noreferrer"/i);
        assert.doesNotMatch(attributes, /aria-current=/i);
        continue;
      }
      if (/^(?:mailto|tel):/i.test(href) || href.startsWith('#')) continue;
      const target = targetFile(href, file);
      assert.ok(target, `could not resolve generated link ${href} in ${file}`);
      const targetHtml = await readFile(target, 'utf8');
      const fragment = new URL(href, 'https://pageskill.test').hash.slice(1);
      if (fragment) assert.match(targetHtml, new RegExp(`\\bid="${fragment.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}"`), `missing fragment ${href} in ${target}`);
    }
    for (const match of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)) {
      const source = match[1];
      if (/^https?:\/\//i.test(source)) continue;
      const target = targetFile(source, file);
      assert.ok(target, `could not resolve generated image ${source} in ${file}`);
      await readFile(target);
    }
  }
});

test('generated Markdown output includes accessible code, tables, images, and focus targets', async () => {
  const html = await readFile(path.join(publicRoot, 'en', 'posts', 'markdown', 'index.html'), 'utf8');
  assert.match(html, /<main id="main" tabindex="-1"/);
  assert.match(html, /class="code-copy"[^>]*aria-label="Copy code"/);
  assert.match(html, /data-code-copy-status[^>]*aria-live="polite"/);
  assert.match(html, /<pre tabindex="0"><code/);
  assert.match(html, /class="table-wrap" tabindex="0"/);
  assert.match(html, /<th[^>]*scope="col"/);
  assert.match(html, /alt="Pageskill home page with site navigation and article cards"[^>]*width="179" height="179"/);
  assert.doesNotMatch(html, /user-select\s*:\s*none/i);
});
