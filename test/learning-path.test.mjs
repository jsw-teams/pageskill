import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspect, createContext } from '../src/compiler.ts';
import { parseMarkdown } from '../src/lib/markdown.ts';
import { escapeHtml, safeUrl } from '../src/lib/safe-html.ts';
import theme from '../themes/default/theme.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function renderContext() {
  return { escapeHtml, safeUrl, renderNodes: nodes => nodes.map(node => node.html).join('') };
}

test('learning-path is discoverable and renders six safe illustrated cards', async () => {
  const context = await createContext(repoRoot);
  const discovery = await inspect(context, 'block:learning-path');
  assert.deepEqual(discovery.item.schema, {});
  assert.deepEqual(discovery.item.contexts, ['page']);
  assert.deepEqual(discovery.item.resources, { styles: ['blocks/learning-path.css'], scripts: [] });
  assert.deepEqual(Object.keys(context.themeDefinition.patterns), ['landing', 'document', 'docs', 'blog']);

  const source = `:::learning-path
### Start <script>alert(1)</script>
Read it. [Open](javascript:alert(1))

### Settings
Set it.

### Markdown
Write it.

### First content
Add it.

### Cookies
Choose it.

### Customize
Tune it.
:::`;
  const [node] = parseMarkdown(source, 'learning-path.md');
  const html = theme.blocks['learning-path'].render(node, renderContext());

  assert.equal((html.match(/<article class="learning-path-card /g) || []).length, 6);
  assert.equal((html.match(/<img /g) || []).length, 6);
  assert.deepEqual([...html.matchAll(/src="(\/assets\/learning\/[^"]+\.png)"/g)].map(match => match[1]), [
    '/assets/learning/start.png',
    '/assets/learning/settings.png',
    '/assets/learning/markdown.png',
    '/assets/learning/first-content.png',
    '/assets/learning/cookies.png',
    '/assets/learning/customize.png'
  ]);
  assert.equal((html.match(/alt="" aria-hidden="true" loading="lazy" decoding="async" width="112" height="112"/g) || []).length, 6);
  assert.match(html, /Start &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /href="#">Open<\/a>/);
  assert.doesNotMatch(html, /style=/);

  const css = await readFile(path.join(repoRoot, 'themes/default/blocks/learning-path.css'), 'utf8');
  assert.ok(Buffer.byteLength(css, 'utf8') <= 2048);
  assert.doesNotMatch(css, /url\s*\(/i);
  assert.doesNotMatch(css, /(?:^|[;{}])(?:left|top):/);
  assert.match(css, /\.learning-path-art\{[^}]*background:#fff[^}]*height:112px[^}]*width:112px/);
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)/);
  for (const step of ['start', 'settings', 'markdown', 'first-content', 'cookies', 'customize']) {
    await readFile(path.join(repoRoot, `content/assets/learning/${step}.png`));
  }
});
