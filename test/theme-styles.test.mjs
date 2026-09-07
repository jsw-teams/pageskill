import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createContext, build, refreshContext } from '../src/compiler.ts';
import { planThemeStyles } from '../src/lib/theme-styles.ts';

function externalPaths(tags) {
  return tags.filter(tag => tag.kind === 'external').map(tag => tag.path);
}

test('inlines only small local Pattern/Block CSS, keeps order, and deduplicates resources', () => {
  const sources = new Map([
    ['style.css', 'body{color:black}'],
    ['pattern.css', '.pattern{color:teal}'],
    ['large.css', `.${'x'.repeat(2045)}{color:red}`],
    ['block.css', '.block{color:blue}'],
    ['unused.css', '.unused{display:none}']
  ]);
  const tags = planThemeStyles(['style.css', 'pattern.css', 'block.css', 'large.css', 'pattern.css'], sources, { alwaysExternal: ['style.css'] });

  assert.deepEqual(externalPaths(tags), ['style.css', 'large.css']);
  assert.equal(tags.filter(tag => tag.kind === 'inline').length, 1);
  const inline = tags.find(tag => tag.kind === 'inline');
  assert.equal(inline.css, `${sources.get('pattern.css')}\n${sources.get('block.css')}`);
  assert.equal(inline.bytes, Buffer.byteLength(inline.css, 'utf8'));
  assert.doesNotMatch(inline.css, /unused/);
  assert.deepEqual(tags.map(tag => tag.kind), ['external', 'inline', 'external']);
});

test('uses UTF-8 bytes and counts separator bytes in the page budget', () => {
  const unicode = 'a{content:"汉字"}';
  const unicodeTags = planThemeStyles(['style.css', 'unicode.css'], new Map([
    ['style.css', 'body{}'],
    ['unicode.css', unicode]
  ]), { alwaysExternal: ['style.css'] });
  const unicodeInline = unicodeTags.find(tag => tag.kind === 'inline');
  assert.equal(unicodeInline.bytes, Buffer.byteLength(unicode, 'utf8'));
  assert.equal(unicodeInline.bytes > unicode.length, true);

  const first = 'a'.repeat(2048);
  const second = 'b'.repeat(2048);
  const boundary = planThemeStyles(['style.css', 'first.css', 'second.css'], new Map([
    ['style.css', 'body{}'],
    ['first.css', first],
    ['second.css', second]
  ]), { alwaysExternal: ['style.css'] });
  assert.deepEqual(boundary.map(tag => tag.kind), ['external', 'inline', 'external']);
  assert.equal(boundary[1].bytes, 2048);

  const joined = planThemeStyles(['style.css', 'first.css', 'second.css'], new Map([
    ['style.css', 'body{}'],
    ['first.css', 'a'.repeat(2047)],
    ['second.css', 'b'.repeat(2048)]
  ]), { alwaysExternal: ['style.css'] });
  const joinedInline = joined.find(tag => tag.kind === 'inline');
  assert.equal(joinedInline.bytes, Buffer.byteLength(joinedInline.css, 'utf8'));
  assert.equal(joinedInline.bytes, 4096);
  assert.deepEqual(externalPaths(joined), ['style.css']);

  const three = planThemeStyles(['style.css', 'first.css', 'second.css', 'third.css'], new Map([
    ['style.css', 'body{}'],
    ['first.css', 'a'.repeat(2047)],
    ['second.css', 'b'.repeat(2048)],
    ['third.css', 'c']
  ]), { alwaysExternal: ['style.css'] });
  assert.equal(three.find(tag => tag.kind === 'inline').bytes, 4096);
  assert.deepEqual(externalPaths(three), ['style.css', 'third.css']);
});

test('does not merge inline CSS across an external stylesheet', () => {
  const sources = new Map([
    ['small-a.css', '.a{}'],
    ['large.css', `.${'x'.repeat(2049)}{color:red}`],
    ['small-b.css', '.b{}']
  ]);
  const tags = planThemeStyles(['small-a.css', 'large.css', 'small-b.css'], sources);
  assert.deepEqual(tags.map(tag => tag.kind), ['inline', 'external', 'inline']);
  assert.equal(tags[0].css, '.a{}');
  assert.equal(tags[2].css, '.b{}');
  assert.deepEqual(externalPaths(tags), ['large.css']);
});

test('unsafe CSS, unsafe paths, missing sources, and disabled inlining fall back to external links', () => {
  const names = [
    'url.css', 'image-set.css', 'webkit-image-set.css', 'image.css', 'src.css',
    'import.css', 'charset.css', 'namespace.css', 'comment.css', 'slash.css',
    'html.css', 'bom.css', 'parent.css', 'missing.css'
  ];
  const sources = new Map([
    ['url.css', '.a{background:url(icons/a.svg)}'],
    ['image-set.css', '.a{background:image-set("a.png" 1x)}'],
    ['webkit-image-set.css', '.a{background:-webkit-image-set("a.png" 1x)}'],
    ['image.css', '.a{background:image("a.png")}'],
    ['src.css', '.a{src:src("a.png")}'],
    ['import.css', '/* @import "a.css" */ .a{}'],
    ['charset.css', '@charset "UTF-8"; .a{}'],
    ['namespace.css', '@namespace svg url(http://example.test/svg);'],
    ['comment.css', '.a{background:u/**/rl("a.png")}'],
    ['slash.css', '.a{content:"\\61"}'],
    ['html.css', '.a{content:"</style>"}'],
    ['bom.css', '\uFEFF.a{}'],
    ['parent.css', '.a{}']
  ]);
  const styles = [
    ...names.slice(0, 12).map(name => name),
    '/absolute.css', '../parent.css', 'missing.css'
  ];
  const tags = planThemeStyles(styles, sources);
  assert.deepEqual(externalPaths(tags), styles);

  const disabled = planThemeStyles(['small.css', 'other.css'], new Map([
    ['small.css', '.small{}'],
    ['other.css', '.other{}']
  ]), { inlineStyles: false });
  assert.deepEqual(disabled, [
    { kind: 'external', path: 'small.css' },
    { kind: 'external', path: 'other.css' }
  ]);
});

test('build keeps the main bundle external and regenerates inline CSS after a theme change', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pageskill-theme-styles-'));
  try {
    await mkdir(path.join(root, 'themes/default'), { recursive: true });
    await mkdir(path.join(root, 'content/pages/home'), { recursive: true });
    await writeFile(path.join(root, 'config.yml'), `siteUrl: https://example.test
defaultLocale: en
activeLocales: [en]
theme:
  name: default
content:
  collections:
    pages:
      contentType: page
      pattern: landing
      route: /:locale/:id/
      schema:
        title:
          type: string
          required: true
`);
    await writeFile(path.join(root, 'themes/default/theme.yml'), `name: default
module: theme.js
style: style.css
`);
    await writeFile(path.join(root, 'themes/default/theme.js'), `export default {
  patterns: { landing: { name: 'landing', contexts: ['page'], resources: { styles: ['pattern.css'] }, render: content => content } },
  blocks: {}
};
`);
    await writeFile(path.join(root, 'themes/default/style.css'), 'body{color:black}\n');
    await writeFile(path.join(root, 'themes/default/pattern.css'), '.pattern{color:teal}\n');
    await writeFile(path.join(root, 'content/pages/home/en.md'), '---\ntitle: Home\npattern: landing\n---\n\n# Home\n');

    const first = await build(await createContext(root));
    const firstHtml = await readFile(path.join(root, 'dist/en/index.html'), 'utf8');
    assert.match(firstHtml, /<style>\.pattern\{color:teal\}\n<\/style>/);
    assert.match(firstHtml, /href="\/assets\/theme\/default\/style\.[a-f0-9]+\.css"/);
    assert.doesNotMatch(firstHtml, /href="[^\"]*pattern\.[a-f0-9]+\.css"/);
    const mainAsset = firstHtml.match(/href="([^"]*style\.[a-f0-9]+\.css)"/)?.[1];
    assert.ok(mainAsset);
    assert.equal(await readFile(path.join(root, 'dist', mainAsset.replace(/^\//, '')), 'utf8'), 'body{color:black}');

    await writeFile(path.join(root, 'themes/default/pattern.css'), '.pattern{color:purple}\n');
    const context = await refreshContext(first, [path.join(root, 'themes/default/pattern.css')]);
    await build(context);
    const secondHtml = await readFile(path.join(root, 'dist/en/index.html'), 'utf8');
    assert.match(secondHtml, /<style>\.pattern\{color:purple\}\n<\/style>/);
    assert.doesNotMatch(secondHtml, /color:teal/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('bundles theme and preset CSS once and filters repeated block references', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pageskill-theme-style-bundle-'));
  try {
    await mkdir(path.join(root, 'themes/default'), { recursive: true });
    await mkdir(path.join(root, 'content/pages/home'), { recursive: true });
    await writeFile(path.join(root, 'config.yml'), `siteUrl: https://example.test
defaultLocale: en
activeLocales: [en]
theme:
  name: default
content:
  collections:
    pages:
      contentType: page
      pattern: landing
      route: /:locale/:id/
      schema:
        title:
          type: string
          required: true
`);
    await writeFile(path.join(root, 'themes/default/theme.yml'), `name: default
module: theme.js
style: style.css
styles:
  - global.css
presets:
  aurora:
    styles:
      - preset.css
`);
    await writeFile(path.join(root, 'themes/default/theme.js'), `export default {
  patterns: { landing: { name: 'landing', contexts: ['page'], resources: { styles: ['pattern.css'] }, render: content => content } },
  blocks: { card: { name: 'card', schema: {}, resources: { styles: ['global.css', 'block.css', 'preset.css', 'block.css'] }, render: content => content } }
};
`);
    await writeFile(path.join(root, 'themes/default/style.css'), 'body{color:black}');
    await writeFile(path.join(root, 'themes/default/global.css'), '.global{color:green}');
    await writeFile(path.join(root, 'themes/default/preset.css'), '.preset{color:orange}');
    await writeFile(path.join(root, 'themes/default/pattern.css'), '.pattern{color:teal}');
    await writeFile(path.join(root, 'themes/default/block.css'), '.block{color:blue}');
    await writeFile(path.join(root, 'content/pages/home/en.md'), '---\ntitle: Home\npattern: landing\n---\n\n# Home\n\n:::card\n:::\n');

    await build(await createContext(root));
    const html = await readFile(path.join(root, 'dist/en/index.html'), 'utf8');
    assert.equal((html.match(/<link rel="stylesheet"/g) || []).length, 1);
    assert.match(html, /<style>\.pattern\{color:teal\}\n\.block\{color:blue\}<\/style>/);
    assert.doesNotMatch(html, /global|preset/);
    const mainAsset = html.match(/href="([^\"]*style\.[a-f0-9]+\.css)"/)?.[1];
    assert.ok(mainAsset);
    const mainCss = await readFile(path.join(root, 'dist', mainAsset.replace(/^\//, '')), 'utf8');
    assert.match(mainCss, /\.global\{color:green\}/);
    assert.match(mainCss, /\.preset\{color:orange\}/);
    assert.equal((mainCss.match(/\.global/g) || []).length, 1);
    assert.equal((mainCss.match(/\.preset/g) || []).length, 1);
    await assert.rejects(readFile(path.join(root, 'dist/assets/theme/default/global.css')));
    await assert.rejects(readFile(path.join(root, 'dist/assets/theme/default/preset.css')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
