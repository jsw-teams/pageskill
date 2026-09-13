import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig, loadThemeConfig } from '../src/runtime/config/load.js';
import { resolveDeploymentConfig } from '../src/runtime/config/deployment.js';
import { resolveSiteLink, renderSiteLink } from '../src/runtime/lib/site-links.js';

const tempRoots = new Set();

async function project() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pageskill-config-'));
  tempRoots.add(root);
  return root;
}

async function put(root, relative, source) {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, source, 'utf8');
  return file;
}

function baseConfig(extendsLine = '') {
  return extendsLine + 'siteUrl: https://example.com\n' +
    'defaultLocale: en\n' +
    'activeLocales:\n' +
    '  - en\n';
}

function linkOptions(overrides = {}) {
  return {
    locale: 'en',
    fallbackLocale: 'en',
    currentPath: '/en/about/',
    namespace: 'navigation',
    translate: (_key, fallback) => fallback,
    ...overrides
  };
}

test.after(async () => {
  for (const root of tempRoots) await rm(root, { recursive: true, force: true });
});

test('layered config recursively merges objects, replaces arrays, and hashes all layers', async () => {
  const root = await project();
  await put(root, 'config/base.yml', 'siteName:\n  en: Base\n  nested:\n    base: true\nlist: [base]\nnullable: value\n');
  await put(root, 'config/second.yml', 'siteName:\n  nested:\n    second: true\nlist: [second]\n');
  await put(root, 'config.yml', 'extends:\n  - ./config/base.yml\n  - ./config/second.yml\nsiteUrl: https://example.com\ndefaultLocale: en\nactiveLocales: [en]\nsiteName:\n  nested:\n    root: true\nlist: [root]\nnullable: null\n');

  const first = await loadConfig(root);
  assert.equal(first.config.siteName.en, 'Base');
  assert.deepEqual(first.config.siteName.nested, { base: true, second: true, root: true });
  assert.deepEqual(first.config.list, ['root']);
  assert.equal(first.config.nullable, null);
  assert.deepEqual(first.config.archive, { pageSize: 50 });
  assert.equal(first.config.i18n.fallbackLocale, 'en');
  assert.equal(first.config.agentDiscovery.skills.enabled, true);
  assert.equal(first.configFiles.length, 3);

  await put(root, 'config/base.yml', 'siteName:\n  en: Changed\n  nested:\n    base: true\nlist: [base]\nnullable: value\n');
  const second = await loadConfig(root);
  assert.notEqual(first.configHash, second.configHash);
});

test('extends reports missing, invalid, escaped, and circular files with field context', async () => {
  const missing = await project();
  await put(missing, 'config.yml', baseConfig('extends: ./config/missing.yml\n'));
  await assert.rejects(() => loadConfig(missing), /config\.yml: extends\[0\].*does not exist/);

  const escaped = await project();
  await put(escaped, 'config.yml', baseConfig('extends: ../outside.yml\n'));
  await assert.rejects(() => loadConfig(escaped), /config\.yml: extends\[0\]/);

  const invalid = await project();
  await put(invalid, 'config.yml', 'siteUrl: [\ndefaultLocale: en\nactiveLocales: [en]\n');
  await assert.rejects(() => loadConfig(invalid), /config\.yml: invalid YAML/);

  const circular = await project();
  await put(circular, 'config.yml', baseConfig('extends: ./config/a.yml\n'));
  await put(circular, 'config/a.yml', 'extends: ./b.yml\n');
  await put(circular, 'config/b.yml', 'extends: ./a.yml\n');
  await assert.rejects(() => loadConfig(circular), /circular extends reference/);

  const linkedOutside = await project();
  const outside = await project();
  await put(outside, 'shared.yml', 'siteName: Outside\n');
  await put(linkedOutside, 'config.yml', baseConfig('extends: ./config/shared/shared.yml\n'));
  await mkdir(path.join(linkedOutside, 'config'), { recursive: true });
  await symlink(outside, path.join(linkedOutside, 'config', 'shared'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(() => loadConfig(linkedOutside), /symbolic link|escapes the project root/);

  const badLink = await project();
  await put(badLink, 'config.yml', baseConfig('extends: ./config/links.yml\n'));
  await put(badLink, 'config/links.yml', 'navigation:\n  links:\n    - label: unsafe\n      href: javascript:alert(1)\n');
  await assert.rejects(() => loadConfig(badLink), /config\/links\.yml: navigation\.links\[0\]\.href/);

  const badDeployment = await project();
  await put(badDeployment, 'config.yml', baseConfig('extends: ./config/deployment.yml\n'));
  await put(badDeployment, 'config/deployment.yml', 'deployment:\n  targets: [not-a-target]\n');
  await assert.rejects(() => loadConfig(badDeployment), /config\/deployment\.yml: deployment\.targets\[0\].*unsupported target/);
});

test('explicit theme.config is the only theme instance source', async () => {
  const root = await project();
  await put(root, 'config.yml', baseConfig('theme:\n  name: default\n  config: ./site/theme.yml\n'));
  await put(root, 'site/theme.yml', 'plugins:\n  search:\n    maxResults: 12\n');
  await put(root, 'themes/default/theme.yml', 'plugins:\n  search:\n    maxResults: 8\n');
  const explicit = await loadThemeConfig(root, { theme: { name: 'default', config: './site/theme.yml' } });
  assert.equal(explicit.file, path.join(root, 'site/theme.yml'));
  assert.equal(explicit.config.plugins.search.maxResults, 12);

  const noInstance = await loadThemeConfig(root, { theme: { name: 'default' } });
  assert.equal(noInstance.file, undefined);
  assert.deepEqual(noInstance.config, {});
  await put(root, 'site/unsafe.yml', 'copy: { en: { title: Unsafe } }\n');
  await assert.rejects(() => loadThemeConfig(root, { theme: { name: 'default', config: './site/unsafe.yml' } }), /copy.*not supported/);
});

test('deployment normalization has one target vocabulary and safe public defaults', () => {
  const resolved = resolveDeploymentConfig({ deployment: { targets: ['cloudflare-pages', 'cloudflare-workers', 'github-pages'], backend: false, staticDirectory: 'site-public' } });
  assert.deepEqual(resolved.targets, ['cloudflare-pages', 'cloudflare-workers', 'github-pages']);
  assert.equal(resolved.staticDirectory, 'site-public');
  assert.equal(resolved.backend, false);
  assert.equal(resolved.cloudflare.apiTokenEnv, 'CLOUDFLARE_API_TOKEN');
  assert.equal(resolved.github.tokenEnv, 'GITHUB_TOKEN');
  assert.equal(resolved.vps.port, 22);
  assert.equal('openaiSitesConfigured' in resolved, false);
  assert.throws(() => resolveDeploymentConfig({ deployment: { targets: ['cf-pages'] } }), /unsupported target/);
  assert.throws(() => resolveDeploymentConfig({ deployment: { targets: 'github-pages' } }), /targets must be an array/);
  assert.throws(() => resolveDeploymentConfig({ deployment: { openaiSites: { staticDirectory: 'site-public' } } }), /openaiSites\.staticDirectory/);
  assert.throws(() => resolveDeploymentConfig({ deployment: { staticDirectory: {} } }), /relative path/);
});

test('site links resolve locale, labels, current state, and external target security', () => {
  const internal = resolveSiteLink({ key: 'home', href: '/:locale/' }, linkOptions({ locale: 'zh-tw', currentPath: '/zh-tw/' }));
  assert.equal(internal.href, '/zh-tw/');
  assert.equal(internal.current, true);
  assert.equal(internal.external, false);

  const fallbackLabel = resolveSiteLink({ key: 'github', labels: { 'zh-sg': 'GitHub 简体' }, label: 'GitHub', href: '/about/' }, linkOptions({ locale: 'zh-tw', fallbackLocale: 'zh-sg' }));
  assert.equal(fallbackLabel.label, 'GitHub 简体');
  const englishLabel = resolveSiteLink({ key: 'docs', labels: { en: 'Documentation' }, label: 'Docs', href: '/docs/' }, linkOptions());
  assert.equal(englishLabel.label, 'Documentation');
  const translatedLabel = resolveSiteLink({ key: 'privacy', href: '/privacy/' }, linkOptions({ translate: (key, fallback) => key === 'navigation.privacy' ? 'Privacy' : fallback }));
  assert.equal(translatedLabel.label, 'Privacy');

  const external = resolveSiteLink({ label: 'External', href: 'https://example.com', target: '_blank' }, linkOptions({ currentPath: 'https://example.com' }));
  assert.equal(external.external, true);
  assert.equal(external.current, false);
  const html = renderSiteLink(external, 'footer-link');
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /aria-current/);

  assert.equal(resolveSiteLink({ label: 'Section', href: '#section' }, linkOptions()).current, false);
  for (const href of ['javascript:alert(1)', 'data:text/html,x', '//example.com', '/a/../b/', '/a/%2e%2e/b/', '/a/%252e%252e/b/', '/a/%00/b', 'file:///tmp/a', 'https://', 'https://bad host/']) {
    assert.throws(() => resolveSiteLink({ label: 'unsafe', href }, linkOptions()), /unsafe|traversal|must be/);
  }
});
