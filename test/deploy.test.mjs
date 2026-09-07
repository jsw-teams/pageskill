import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { deploy } from '../src/deploy.mjs';

test('deployment reads the target and VPS destination from config.yml data', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pagekiln-deploy-'));
  try {
    const out = path.join(root, 'dist');
    await mkdir(out, { recursive: true });
    const result = await deploy(root, {
      config: { deployment: { targets: ['vps'], vps: { host: 'example.com', user: 'deploy', remotePath: '/var/www/site', port: 2222, identityFile: '~/.ssh/id_ed25519', publicKeyFile: '~/.ssh/id_ed25519.pub' } } },
      out
    }, ['--dry-run']);
    assert.deepEqual(result.targets, ['vps']);
    assert.equal(result.results[0].status, 'dry-run');
    assert.deepEqual(result.results[0].args.slice(0, 3), ['-r', '-P', '2222']);
    assert.equal(result.results[0].args.includes('-i'), true);
    assert.equal(result.results[0].authFiles.length, 2);
    assert.match(result.results[0].args.at(-1), /deploy@example\.com:\/var\/www\/site\/$/);
    await assert.rejects(() => deploy(root, { config: { deployment: { targets: ['vps'], vps: { remotePath: '/var/www/site' } } }, out }, ['--target', 'vps']), /config\.yml/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('GitHub and Cloudflare token configuration names environment variables without exposing secrets', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pagekiln-deploy-token-'));
  try {
    const out = path.join(root, 'dist');
    await mkdir(out, { recursive: true });
    const github = await deploy(root, {
      config: { deployment: { targets: ['github-pages'], github: { remote: 'origin', branch: 'gh-pages', tokenEnv: 'GITHUB_TOKEN' } } },
      out
    }, ['--dry-run']);
    assert.equal(github.results[0].credentialEnv, 'GITHUB_TOKEN');
    assert.equal(JSON.stringify(github).includes('secret-value'), false);

    const cloudflare = await deploy(root, {
      config: { deployment: { targets: ['cloudflare-pages'], cloudflare: { apiTokenEnv: 'PAGEKILN_TEST_CLOUDFLARE_TOKEN_7F4B', pages: { project: 'pagekiln-site' } } } },
      out
    }, ['--dry-run']);
    assert.equal(cloudflare.results[0].credentialEnv, 'PAGEKILN_TEST_CLOUDFLARE_TOKEN_7F4B');
    await assert.rejects(() => deploy(root, {
      config: { deployment: { targets: ['cloudflare-pages'], cloudflare: { apiTokenEnv: 'PAGEKILN_TEST_CLOUDFLARE_TOKEN_7F4B', pages: { project: 'pagekiln-site' } } } },
      out
    }), /PAGEKILN_TEST_CLOUDFLARE_TOKEN_7F4B/);
    await assert.rejects(() => deploy(root, {
      config: { deployment: { targets: ['github-pages'], github: { remote: 'origin', branch: 'gh-pages', token: 'secret-value' } } },
      out
    }, ['--dry-run']), /must not contain a secret/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('VPS rejects a public key without its private key', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pagekiln-deploy-keypair-'));
  try {
    const out = path.join(root, 'dist');
    await mkdir(out, { recursive: true });
    await assert.rejects(() => deploy(root, {
      config: { deployment: { targets: ['vps'], vps: { host: 'example.com', user: 'deploy', remotePath: '/var/www/site', publicKeyFile: '~/.ssh/id_ed25519.pub' } } },
      out
    }, ['--dry-run']), /publicKeyFile requires/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('deployment can resolve multiple targets from config.yml in order', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pagekiln-deploy-multi-'));
  try {
    const out = path.join(root, 'dist');
    await mkdir(out, { recursive: true });
    const result = await deploy(root, {
      config: {
        deployment: {
          targets: ['vps', 'cloudflare-pages'],
          vps: { host: 'example.com', user: 'deploy', remotePath: '/var/www/site' },
          cloudflare: { pages: { project: 'pagekiln-site' } }
        }
      },
      out
    }, ['--dry-run']);
    assert.deepEqual(result.targets, ['vps', 'cloudflare-pages']);
    assert.deepEqual(result.results.map(entry => entry.target), ['vps', 'cloudflare-pages']);
    assert.equal(result.results.every(entry => entry.status === 'dry-run'), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('OpenAI Sites handoff validates the dist entry and static root', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'pagekiln-deploy-sites-'));
  try {
    const out = path.join(root, 'dist');
    await mkdir(path.join(out, 'server'), { recursive: true });
    await mkdir(path.join(out, 'public'), { recursive: true });
    await mkdir(path.join(root, '.openai'), { recursive: true });
    await writeFile(path.join(out, 'server/index.js'), 'export default {}');
    await writeFile(path.join(out, 'public/index.html'), '<!doctype html>');
    await writeFile(path.join(root, '.openai/hosting.json'), '{"project_id":"appgprj_test"}');
    const result = await deploy(root, {
      config: { deployment: { targets: ['openai-sites'], openaiSites: { metadata: '.openai/hosting.json', staticDirectory: 'public' } } },
      out
    }, ['--dry-run']);
    assert.equal(result.results[0].status, 'handoff-required');
    assert.equal(result.results[0].staticDirectory, 'public');
    await rm(path.join(out, 'public/index.html'));
    await assert.rejects(() => deploy(root, {
      config: { deployment: { targets: ['openai-sites'], openaiSites: { metadata: '.openai/hosting.json', staticDirectory: 'public' } } },
      out
    }, ['--dry-run']), /public\/index\.html/);
    await assert.rejects(() => deploy(root, {
      config: { deployment: { targets: ['openai-sites'], openaiSites: { metadata: '.openai/hosting.json', staticDirectory: 'dist' } } },
      out
    }, ['--dry-run']), /cannot be "dist"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Cloudflare Pages dry-run stages public files and keeps the Worker runtime under _worker.js', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pagekiln-deploy-pages-stage-'));
  try {
    const out = path.join(root, 'dist');
    await mkdir(path.join(out, 'public', 'assets'), { recursive: true });
    await mkdir(path.join(out, 'server'), { recursive: true });
    await mkdir(path.join(out, '_pagekiln', 'backend'), { recursive: true });
    await writeFile(path.join(out, 'public', 'index.html'), '<!doctype html>');
    await writeFile(path.join(out, 'public', 'assets', 'app.js'), 'window.app = true;');
    await mkdir(path.join(out, 'public', '.well-known'), { recursive: true });
    await writeFile(path.join(out, 'public', '.well-known', 'agent.json'), '{}');
    await writeFile(path.join(out, 'server', 'index.js'), 'private server');
    await mkdir(path.join(out, '_pagekiln', 'lib'), { recursive: true });
    const fetchRouterSource = await readFile(path.join(process.cwd(), 'src', 'runtime', 'fetch-router.js'), 'utf8');
    const securitySource = await readFile(path.join(process.cwd(), 'src', 'runtime', 'lib', 'static-security.js'), 'utf8');
    await writeFile(path.join(out, '_pagekiln', 'fetch-router.js'), fetchRouterSource);
    await writeFile(path.join(out, '_pagekiln', 'lib', 'static-security.js'), securitySource);
    await writeFile(path.join(out, '_pagekiln', 'backend', 'handler.js'), `import { Router } from '../fetch-router.js';
const router = new Router();
router.get('/api/health', () => new Response('ok'));
export { router };
`);
    await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
    await writeFile(path.join(out, '_worker.js'), `import { createSiteFetchHandler } from './_pagekiln/fetch-router.js';
import { router } from './_pagekiln/backend/handler.js';
const fetchHandler = createSiteFetchHandler({ router, defaultLocale: 'en' });
export { fetchHandler };
export default { fetch: fetchHandler };
`);
    const result = await deploy(root, {
      config: { deployment: { targets: ['cloudflare-pages'], cloudflare: { pages: { project: 'pagekiln-site' } } } },
      out
    }, ['--dry-run']);
    const stage = result.results[0].args[2];
    assert.equal(result.results[0].source, path.relative(root, stage).replaceAll('\\', '/'));
    assert.equal(await readFile(path.join(stage, 'index.html'), 'utf8'), '<!doctype html>');
    assert.equal(await readFile(path.join(stage, 'assets', 'app.js'), 'utf8'), 'window.app = true;');
    assert.equal(await readFile(path.join(stage, '.well-known', 'agent.json'), 'utf8'), '{}');
    assert.match(await readFile(path.join(stage, '_worker.js', 'index.js'), 'utf8'), /fetch-router/);
    assert.match(await readFile(path.join(stage, '_worker.js', '_pagekiln', 'backend', 'handler.js'), 'utf8'), /api\/health/);
    assert.match(await readFile(path.join(stage, '_worker.js', '_pagekiln', 'fetch-router.js'), 'utf8'), /createSiteFetchHandler/);
    assert.match(await readFile(path.join(stage, '_worker.js', '_pagekiln', 'lib', 'static-security.js'), 'utf8'), /publicPathFromUrl/);
    const worker = await import(`${pathToFileURL(path.join(stage, '_worker.js', 'index.js')).href}?test=${Date.now()}`);
    const assets = {
      async fetch(request) {
        const pathname = new URL(request.url).pathname;
        if (pathname === '/' || pathname === '/index.html') return new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } });
        return new Response('Not found', { status: 404 });
      }
    };
    const page = await worker.default.fetch(new Request('https://example.test/'), { ASSETS: assets });
    assert.equal(page.status, 200);
    assert.equal(await page.text(), '<!doctype html>');
    const health = await worker.default.fetch(new Request('https://example.test/api/health'), { ASSETS: assets });
    assert.equal(health.status, 200);
    assert.equal(await health.text(), 'ok');
    await assert.rejects(stat(path.join(stage, 'server')));
    await assert.rejects(stat(path.join(stage, '_pagekiln')));
    await assert.rejects(stat(path.join(stage, '_worker.js', 'cloudflare-worker.mjs')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('GitHub Pages uses a public snapshot for mixed builds and rejects a mixed root without one', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pagekiln-deploy-github-static-'));
  try {
    const out = path.join(root, 'dist');
    await mkdir(path.join(out, 'public'), { recursive: true });
    await mkdir(path.join(out, 'server'), { recursive: true });
    await writeFile(path.join(out, 'public', 'index.html'), '<!doctype html>');
    await writeFile(path.join(out, 'server', 'index.js'), 'private server');
    await writeFile(path.join(out, '_worker.js'), 'private worker');
    const mixed = await deploy(root, {
      config: { deployment: { targets: ['github-pages'], github: { remote: 'origin', branch: 'gh-pages' } } },
      out
    }, ['--dry-run']);
    assert.equal(mixed.results[0].args[3], 'dist/public');
    assert.equal(mixed.results[0].source, 'dist/public');

    await mkdir(path.join(out, 'dist', 'public'), { recursive: true });
    await writeFile(path.join(out, 'dist', 'public', 'index.html'), '<!doctype html>');
    const exact = await deploy(root, {
      config: { deployment: { targets: ['github-pages'], staticDirectory: 'dist/public', github: { remote: 'origin', branch: 'gh-pages' } } },
      out
    }, ['--dry-run']);
    assert.equal(exact.results[0].source, 'dist/dist/public');

    await rm(path.join(out, 'public'), { recursive: true, force: true });
    await assert.rejects(() => deploy(root, {
      config: { deployment: { targets: ['github-pages'], github: { remote: 'origin', branch: 'gh-pages' } } },
      out
    }, ['--dry-run']), /pure static dist/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
