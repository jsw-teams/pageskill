import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import {
  classifyPublicPath,
  classifyPublicUrl,
  decodePublicPath,
  isPublicPath
} from '../src/lib/static-security.ts';

test('static security classifies public, private, and malformed paths', () => {
  const publicPaths = [
    '/',
    '/assets/app.js',
    '/en/server/index.html',
    '/.well-known/agent.json',
    '/.well-known/security.txt',
    '/foo%2ebar.js'
  ];
  for (const pathname of publicPaths) assert.equal(isPublicPath(pathname, { staticDirectory: 'static' }), true, pathname);

  const privatePaths = [
    '/server/index.js',
    '/_pagekiln/backend/handler.js',
    '/.pagekiln/catalog.json',
    '/.assetsignore',
    '/_worker.js',
    '/cloudflare-worker.mjs',
    '/vps-server.mjs',
    '/wrangler.toml',
    '/dist/server/index.js',
    '/STATIC/_pagekiln/backend/handler.js',
    '/dist/static/server/index.js',
    '/.well-known/.secret',
    '/.well-known/_pagekiln/handler.js'
  ];
  for (const pathname of privatePaths) {
    const result = classifyPublicPath(pathname, { staticDirectory: 'static' });
    assert.deepEqual(result, { ok: false, reason: 'private' }, pathname);
  }

  const invalidPaths = [
    '/%',
    '/assets/%2fsecret.js',
    '/assets/%5csecret.js',
    '/a/../secret.js',
    '/a/%2e%2e/secret.js',
    '/assets/%252fsecret.js',
    '/assets/%2573erver/index.js',
    '/assets/file:secret.js',
    '/assets/server./index.js',
    '/assets/file%20'
  ];
  for (const pathname of invalidPaths) assert.equal(classifyPublicPath(pathname).ok, false, pathname);
  assert.equal(decodePublicPath('/assets/app.js'), '/assets/app.js');
  assert.equal(decodePublicPath('/dist/assets/app.js'), '/assets/app.js');
  assert.equal(decodePublicPath('/static/assets/app.js', { staticDirectory: 'static' }), '/assets/app.js');
  assert.equal(decodePublicPath('/dist/static/assets/app.js', { staticDirectory: 'static' }), '/assets/app.js');
  assert.equal(decodePublicPath('/dist/', { staticDirectory: 'static' }), '/');
  assert.deepEqual(classifyPublicUrl('https://example.test/%'), { ok: false, reason: 'invalid' });
});

test('local search keeps result text inert and turns only HTTP(S) URLs into same-origin absolute links', async () => {
  class TextNode {
    constructor(value) { this.nodeType = 3; this.textContent = String(value); this.parentNode = null; }
  }
  const matches = (node, selector) => {
    if (!node || node.nodeType !== 1) return false;
    if (selector.startsWith('[') && selector.endsWith(']')) return selector.slice(1, -1) in node.attributes;
    return node.tagName === selector.toUpperCase();
  };
  class Element {
    constructor(tagName) {
      this.nodeType = 1;
      this.tagName = tagName.toUpperCase();
      this.attributes = {};
      this.dataset = {};
      this.children = [];
      this.parentNode = null;
      this.listeners = new Map();
      this.hidden = false;
      this.value = '';
      this.href = '';
    }
    get textContent() { return this.children.map(child => child.textContent || '').join(''); }
    set textContent(value) { this.replaceChildren(new TextNode(value)); }
    setAttribute(name, value) { this.attributes[name] = String(value); if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value); }
    removeAttribute(name) { delete this.attributes[name]; }
    hasAttribute(name) { return name in this.attributes; }
    append(...nodes) { for (const node of nodes) { if (!node) continue; node.parentNode = this; this.children.push(node); } }
    appendChild(node) { this.append(node); return node; }
    replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
    addEventListener(type, handler) { const list = this.listeners.get(type) || []; list.push(handler); this.listeners.set(type, list); }
    dispatchEvent(event) { for (const handler of this.listeners.get(event.type) || []) handler(event); return true; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    querySelectorAll(selector) {
      const found = [];
      const visit = node => { for (const child of node.children || []) { if (matches(child, selector)) found.push(child); visit(child); } };
      visit(this);
      return found;
    }
    contains(node) { let current = node; while (current) { if (current === this) return true; current = current.parentNode; } return false; }
    focus() {}
  }
  const document = {
    documentElement: { lang: 'en' },
    listeners: new Map(),
    createElement: tagName => new Element(tagName),
    createTextNode: value => new TextNode(value),
    querySelector: selector => matches(root, selector) ? root : root.querySelector(selector),
    querySelectorAll: selector => matches(root, selector) ? [root] : root.querySelectorAll(selector),
    addEventListener(type, handler) { const list = this.listeners.get(type) || []; list.push(handler); this.listeners.set(type, list); },
    head: new Element('head'),
    activeElement: null
  };
  const root = new Element('form');
  root.setAttribute('data-local-search', '');
  root.dataset.searchIndex = '/assets/search-index.en.json';
  const input = new Element('input');
  input.setAttribute('data-search-input', '');
  const results = new Element('div');
  results.setAttribute('data-search-results', '');
  root.append(input, results);
  document.activeElement = input;
  const entries = [
    { id: 'valid', title: 'attack valid', description: '', headings: '', text: 'safe', url: '/en/about/' },
    { id: 'js', title: 'attack javascript', description: '', headings: '', text: 'safe', url: 'javascript:javascript:alert(1)' },
    { id: 'data', title: 'attack data', description: '', headings: '', text: 'safe', url: 'data:text/html,<img src=x onerror=alert(1)>' },
    { id: 'network', title: 'attack network', description: '', headings: '', text: 'safe', url: '//evil.test/pwn' },
    { id: 'double-slash', title: 'attack double slash', description: '', headings: '', text: 'safe', url: 'https://example.test//evil.test' },
    { id: 'html-text', title: 'safe text', description: '', headings: '', text: 'attack <img src=x onerror=alert(1)>', url: '/en/text/' }
  ];
  const window = {
    location: { href: 'https://example.test/en/', origin: 'https://example.test', protocol: 'https:' },
    clearTimeout() {},
    setTimeout(handler) { handler(); return 0; },
    fetch: async () => ({ ok: true, status: 200, json: async () => entries })
  };
  const context = vm.createContext({ document, window, URL, fetch: window.fetch, console, setTimeout, clearTimeout });
  const source = await readFile('themes/default/scripts/search.js', 'utf8');
  vm.runInContext(source, context, { filename: 'search.js' });
  input.value = 'attack';
  root.dispatchEvent({ type: 'submit', preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));

  const links = results.querySelectorAll('a');
  assert.ok(links.length >= 3);
  assert.ok(links.some(link => link.href === 'https://example.test/en/about/'));
  assert.ok(links.some(link => link.href === 'https://example.test//evil.test'));
  assert.ok(links.every(link => link.href.startsWith('https://example.test/')));
  assert.ok(links.every(link => !link.href.startsWith('javascript:') && !link.href.startsWith('data:')));
  assert.ok(results.textContent.includes('<img src=x onerror=alert(1)>'));
  assert.equal(results.querySelectorAll('img').length, 0);
});

test('CLI preview remains loopback-only and cannot read internal or symlinked runtime files', async t => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const root = await mkdtemp(path.join(os.tmpdir(), 'pageskill-security-'));
  let child;
  let timer;
  try {
    await cp(path.join(repoRoot, 'starter'), root, { recursive: true });
    const port = 41000 + Math.floor(Math.random() * 1000);
    child = spawn(process.execPath, [path.join(repoRoot, 'src/bin/pageskill.mjs'), 's', `--port=${port}`], {
      cwd: repoRoot,
      env: { ...process.env, PAGESKILL_SITE_ROOT: root },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    child.stdout.on('data', chunk => { output += String(chunk); });
    child.stderr.on('data', chunk => { output += String(chunk); });
    await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`preview did not start: ${output}`)), 15000);
      child.stdout.on('data', chunk => {
        if (!String(chunk).includes('Pageskill preview server:')) return;
        clearTimeout(timer);
        timer = undefined;
        resolve();
      });
      child.once('exit', code => reject(new Error(`preview exited before start (${code}): ${output}`)));
    });

    const dist = path.join(root, 'dist');
    const publicRoot = path.join(dist, 'public');
    await mkdir(path.join(publicRoot, 'assets'), { recursive: true });
    await mkdir(path.join(dist, '_pagekiln', 'backend'), { recursive: true });
    await writeFile(path.join(publicRoot, 'assets', 'app.js'), 'window.appLoaded = true;\n');
    await writeFile(path.join(dist, '_pagekiln', 'backend', 'handler.js'), 'export const secret = "should not be served";\n');

    const request = requestPath => new Promise((resolve, reject) => {
      const req = httpRequest({ host: '127.0.0.1', port, path: requestPath, method: 'GET' }, response => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString() }));
      });
      req.on('error', reject);
      req.end();
    });
    const publicPage = await request('/en/');
    assert.equal(publicPage.status, 200);
    const publicAsset = await request('/assets/app.js');
    assert.equal(publicAsset.status, 200);
    assert.match(publicAsset.body, /window\.appLoaded/);
    for (const publicAlias of ['/dist/assets/app.js', '/public/assets/app.js']) {
      assert.equal((await request(publicAlias)).status, 200, publicAlias);
    }
    for (const privatePath of ['/server/index.js', '/_pagekiln/backend/handler.js', '/dist/_pagekiln/backend/handler.js']) {
      assert.equal((await request(privatePath)).status, 404, privatePath);
    }
    assert.equal((await request('/%')).status, 400);
    assert.equal((await request('/en/')).status, 200);

    let linkCreated = false;
    try {
      await symlink(
        path.join(dist, '_pagekiln', 'backend'),
        path.join(publicRoot, 'public-link'),
        process.platform === 'win32' ? 'junction' : 'dir'
      );
      linkCreated = true;
    } catch (error) {
      if (!['EACCES', 'EPERM', 'ENOTSUP'].includes(error?.code)) throw error;
      t.diagnostic(`symlink containment regression skipped: ${error.code}`);
    }
    if (linkCreated) {
      assert.equal((await request('/public-link/handler.js')).status, 404);
    } else {
      t.diagnostic('symlink containment regression was not exercised on this host');
    }
  } finally {
    if (timer) clearTimeout(timer);
    if (child && child.exitCode === null) {
      child.kill();
      await Promise.race([once(child, 'exit'), new Promise(resolve => setTimeout(resolve, 2000))]);
    }
    await rm(root, { recursive: true, force: true });
  }
});

test('cookie consent loads only HTTP(S) configured scripts after consent', async () => {
  class Element {
    constructor(tagName) {
      this.nodeType = 1;
      this.tagName = tagName.toUpperCase();
      this.attributes = {};
      this.dataset = {};
      this.children = [];
      this.parentNode = null;
      this.listeners = new Map();
      this.hidden = false;
      this.disabled = false;
      this.checked = false;
      this.src = '';
    }
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
    }
    removeAttribute(name) { delete this.attributes[name]; }
    hasAttribute(name) { return name in this.attributes; }
    append(...nodes) { for (const node of nodes) { if (!node) continue; node.parentNode = this; this.children.push(node); } }
    replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
    addEventListener(type, handler) { const list = this.listeners.get(type) || []; list.push(handler); this.listeners.set(type, list); }
    dispatchEvent(event) { for (const handler of this.listeners.get(event.type) || []) handler(event); return true; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    querySelectorAll(selector) {
      const selectors = selector.split(',').map(item => item.trim());
      const matchesSelector = (node, value) => {
        const tag = value.match(/^[a-z][a-z\d-]*/i)?.[0];
        if (tag && node.tagName !== tag.toUpperCase()) return false;
        for (const match of value.matchAll(/\[([^\]=]+)(?:="([^"]*)")?\]/g)) {
          if (!(match[1] in node.attributes)) return false;
          if (match[2] !== undefined && node.attributes[match[1]] !== match[2]) return false;
        }
        return true;
      };
      const found = [];
      const visit = node => { for (const child of node.children || []) { if (selectors.some(value => matchesSelector(child, value))) found.push(child); visit(child); } };
      visit(this);
      return found;
    }
  }
  const root = new Element('section');
  root.setAttribute('data-cookie-consent', '');
  root.dataset.cookieStorage = 'localStorage';
  const banner = new Element('div');
  banner.setAttribute('data-cookie-banner', '');
  const essential = new Element('input');
  essential.setAttribute('data-cookie-category', 'essential');
  essential.disabled = true;
  const analytics = new Element('input');
  analytics.setAttribute('data-cookie-category', 'analytics');
  const script = (category, source) => {
    const template = new Element('template');
    template.setAttribute('data-cookie-script', '');
    template.setAttribute('data-cookie-category', category);
    template.setAttribute('data-cookie-src', source);
    return template;
  };
  const dangerousJavascript = script('analytics', 'javascript:alert(1)');
  const dangerousData = script('analytics', 'data:text/javascript,alert(1)');
  const validHttps = script('analytics', 'https://analytics.example.test/analytics.js');
  const validHttp = script('analytics', 'http://analytics.example.test/legacy.js');
  const validRelative = script('analytics', '/scripts/analytics.js');
  const accept = new Element('button');
  accept.setAttribute('data-cookie-action', 'accept-all');
  root.append(banner, essential, analytics, dangerousJavascript, dangerousData, validHttps, validHttp, validRelative, accept);
  const document = {
    cookie: '',
    activeElement: accept,
    head: new Element('head'),
    querySelector(selector) { return selector === '[data-cookie-consent]' ? root : root.querySelector(selector); },
    querySelectorAll(selector) { return selector === '[data-cookie-consent]' ? [root] : root.querySelectorAll(selector); },
    createElement: tagName => new Element(tagName),
    addEventListener() {}
  };
  const values = new Map();
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  const window = {
    location: { protocol: 'https:', href: 'https://example.test/en/' },
    localStorage,
    dispatchEvent() {}
  };
  class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
  const context = vm.createContext({ document, window, localStorage, CustomEvent, console, URL });
  const source = await readFile('themes/default/scripts/cookie-consent.js', 'utf8');
  vm.runInContext(source, context, { filename: 'cookie-consent.js' });
  accept.dispatchEvent({ type: 'click' });
  const loaded = document.head.children.filter(node => node.tagName === 'SCRIPT');
  assert.deepEqual(loaded.map(node => node.src), [
    'https://analytics.example.test/analytics.js',
    'http://analytics.example.test/legacy.js',
    'https://example.test/scripts/analytics.js'
  ]);
  assert.equal(dangerousJavascript.dataset.loaded, undefined);
  assert.equal(dangerousData.dataset.loaded, undefined);
  assert.equal(root.dataset.cookieState, 'saved');
  assert.ok(values.has('pagekiln-consent'));
});
