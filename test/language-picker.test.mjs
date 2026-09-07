import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { build, createContext } from '../src/compiler.ts';

const SCRIPT_PATH = path.join(process.cwd(), 'themes/default/scripts/language-picker.js');

const THEME = [
  'export default {',
  '  blocks: {},',
  '  patterns: {',
  "    landing: { name: 'landing', contexts: ['page'], render: content => content },",
  "    document: { name: 'document', contexts: ['page'], render: content => content },",
  "    blog: { name: 'blog', contexts: ['post'], render: content => content }",
  '  }',
  '};'
].join('\n');

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pagekiln-language-'));
  await mkdir(path.join(root, 'content/pages/home'), { recursive: true });
  await mkdir(path.join(root, 'themes/default/scripts'), { recursive: true });
  const config = [
    'siteUrl: https://example.test',
    'defaultLocale: en',
    'activeLocales:',
    '  - en',
    '  - zh-sg',
    '  - zh-tw',
    'siteName:',
    '  en: Test',
    '  zh-sg: 测试',
    '  zh-tw: 測試',
    'theme:',
    '  name: default',
    'content:',
    '  collections:',
    '    pages:',
    '      contentType: page',
    '      route: /:locale/:id/',
    'outputs:',
    '  markdownMirrors: true',
    ''
  ].join('\n');
  await writeFile(path.join(root, 'config.yml'), config);
  await writeFile(path.join(root, 'themes/default/theme.yml'), 'name: default\nscripts:\n  - scripts/language-picker.js\n');
  await writeFile(path.join(root, 'themes/default/theme.js'), THEME);
  await writeFile(path.join(root, 'themes/default/style.css'), 'body { color: black; }\n');
  await writeFile(path.join(root, 'themes/default/scripts/language-picker.js'), await readFile(SCRIPT_PATH));
  await writeFile(path.join(root, 'content/pages/home/en.md'), '---\ntitle: Home\n---\n\n# Home\n');
  return root;
}

function runPicker({ stored = null, languages = [], language = '', pathname = '/' } = {}) {
  const locales = ['en', 'zh-sg', 'zh-tw'];
  const links = locales.map(locale => ({
    dataset: { locale },
    listeners: {},
    addEventListener(type, callback) { this.listeners[type] = callback; },
    setAttribute() {},
    querySelector() { return null; }
  }));
  const root = {
    dataset: {
      languageCopy: JSON.stringify({
        defaultLocale: 'en',
        locales,
        storageKey: 'pagekiln-locale',
        copy: Object.fromEntries(locales.map(locale => [locale, {
          title: 'Title ' + locale,
          siteName: 'Test',
          description: 'Description ' + locale,
          headerNote: 'Note',
          siteDescription: 'Description'
        }]))
      })
    },
    querySelectorAll(selector) {
      return selector === 'a[data-locale]' || selector === '[data-locale]' ? links : [];
    }
  };
  const storage = {
    getItem() { return stored; },
    setItem(key, value) { this.last = [key, value]; }
  };
  const document = {
    title: '',
    documentElement: { lang: 'en' },
    querySelector(selector) { return selector === '[data-language-picker]' ? root : null; },
    querySelectorAll() { return []; },
    createTextNode(value) { return { nodeType: 3, nodeValue: value }; }
  };
  const location = { pathname, redirectedTo: null, replace(value) { this.redirectedTo = value; } };
  vm.runInNewContext(readFileSync(SCRIPT_PATH, 'utf8'), {
    document,
    navigator: { languages, language },
    window: { localStorage: storage, location }
  });
  return { document, location, storage, links };
}

test('root language picker asset is generated while locale pages keep their route', async () => {
  const root = await fixture();
  try {
    await build(await createContext(root));
    const picker = await readFile(path.join(root, 'dist/index.html'), 'utf8');
    const localePage = await readFile(path.join(root, 'dist/en/index.html'), 'utf8');
    assert.match(picker, /data-language-picker/);
    assert.match(picker, /data-language-copy=/);
    assert.match(picker, /data-language-recommended/);
    const asset = picker.match(/src="(\/assets\/theme\/default\/scripts\/language-picker\.[a-f0-9]+\.js)"/)?.[1];
    assert.ok(asset);
    assert.match(await readFile(path.join(root, 'dist', asset.slice(1)), 'utf8'), /navigator\.languages/);
    assert.doesNotMatch(localePage, /data-language-picker/);
    assert.doesNotMatch(localePage, /language-picker\.[a-f0-9]+\.js/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('language picker prioritizes stored locale, maps browser languages, and leaves locale routes alone', async () => {
  const stored = runPicker({ stored: 'zh-tw', languages: ['en-US'] });
  assert.equal(stored.document.documentElement.lang, 'zh-tw');
  assert.equal(stored.location.redirectedTo, null);

  const browser = runPicker({ stored: 'invalid', languages: ['fr-FR', 'zh-Hant-TW'], language: 'en-US' });
  assert.equal(browser.document.documentElement.lang, 'zh-tw');
  assert.equal(browser.location.redirectedTo, null);

  const fallback = runPicker({ languages: ['fr-FR'], language: 'de-DE' });
  assert.equal(fallback.document.documentElement.lang, 'en');
  assert.equal(fallback.location.redirectedTo, null);

  const localePage = runPicker({ languages: ['zh-CN'], pathname: '/en/' });
  assert.equal(localePage.document.documentElement.lang, 'zh-sg');
  assert.equal(localePage.location.redirectedTo, null);
  localePage.links.find(link => link.dataset.locale === 'en').listeners.click();
  assert.deepEqual(localePage.storage.last, ['pagekiln-locale', 'en']);
});
