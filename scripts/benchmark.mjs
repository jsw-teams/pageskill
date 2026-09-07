import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { createServer as createTcpServer } from 'node:net';
import { request as httpRequest } from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createContext, refreshContext, build } from '../src/compiler.ts';

const BENCHMARK_THEME = `export default {
  patterns: {
    landing: { name: 'landing', contexts: ['page'], render: content => content },
    document: { name: 'document', contexts: ['page'], render: content => content },
    docs: { name: 'docs', contexts: ['page', 'docs'], render: content => content },
    blog: { name: 'blog', contexts: ['post'], render: content => content }
  },
  blocks: {
    hero: {
      name: 'hero',
      schema: { tone: 'string' },
      render: (node, context) => '<section class="hero">' + context.renderNodes(node.children) + '</section>'
    },
    pipeline: {
      name: 'pipeline',
      schema: {},
      render: (node, context) => '<section class="pipeline">' + context.renderNodes(node.children) + '</section>'
    },
    'post-list': {
      name: 'post-list',
      schema: { limit: 'number' },
      dependencies: (_node, context) => ['collection:posts:' + context.doc.locale],
      render: (node, context) => '<section class="post-list">' + context.collection('posts').slice(0, Number(node.attrs.limit || 6)).map(post => '<article><h3>' + context.escapeHtml(post.title) + '</h3><p>' + context.escapeHtml(post.excerpt || post.description) + '</p></article>').join('') + '</section>'
    }
  }
};`;

const args = process.argv.slice(2);
const requested = args.map(Number).filter(Number.isFinite);
const sizes = requested.length ? requested : [100];
if (sizes.some(size => size < 1 || size > 1000)) throw new Error('The scale fixture accepts 1–1,000 posts per locale.');
const locales = args.includes('--locales=3') ? ['zh-sg', 'zh-tw', 'en'] : ['en'];
const withImage = args.includes('--images');
const quick = args.includes('--quick');
const incrementalOnly = args.includes('--incremental');
const logicalCpus = os.cpus().length;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const devCli = path.join(projectRoot, 'src', 'bin', 'pageskill.mjs');
const machine = { node: process.version, platform: process.platform, release: os.release(), arch: process.arch, cpu: os.cpus()[0]?.model || 'unknown', logicalCpus, totalMemoryGiB: round(os.totalmem() / 1024 / 1024 / 1024) };

function round(value) { return Math.round(value * 100) / 100; }
function siteOutputs(profile) { return Math.max(0, Number(profile.changedOutputs || 0) - 1); }
function rssMiB() { return process.memoryUsage().rss / 1024 / 1024; }

async function windowsGpuProbe() {
  if (process.platform !== 'win32') return { status: 'unsupported', sampleCount: 0, averagePercent: null, peakPercent: null, note: 'GPU Engine counters are only available on Windows; the Pageskill compiler does not issue GPU work.' };
  const script = '$pidValue=$env:PAGEKILN_GPU_PID; $counter="\\GPU Engine(pid_"+$pidValue+"_*)\\Utilization Percentage"; try { $values=@((Get-Counter -Counter $counter -SampleInterval 1 -MaxSamples 1 -ErrorAction Stop).CounterSamples | ForEach-Object { [double]$_.CookedValue }); if($values.Count){ [pscustomobject]@{sampleCount=$values.Count;averagePercent=(($values | Measure-Object -Average).Average);peakPercent=(($values | Measure-Object -Maximum).Maximum)} | ConvertTo-Json -Compress } else { "{}" } } catch { "{}" }';
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { env: { ...process.env, PAGEKILN_GPU_PID: String(process.pid) }, stdio: ['ignore', 'pipe', 'ignore'] });
      let output = '';
      child.stdout.on('data', chunk => { output += String(chunk); });
      child.on('error', reject);
      child.on('close', code => code === 0 ? resolve(output.trim()) : reject(new Error(`GPU probe exited with ${code}`)));
    });
    const parsed = JSON.parse(String(result || '{}'));
    const sampleCount = Math.max(0, Number(parsed.sampleCount || 0));
    return sampleCount ? { status: 'sampled', sampleCount, averagePercent: round(Number(parsed.averagePercent || 0)), peakPercent: round(Number(parsed.peakPercent || 0)), note: 'Windows GPU Engine utilization observed for the benchmark process.' } : { status: 'not-observed', sampleCount: 0, averagePercent: null, peakPercent: null, note: 'No GPU Engine instance was observed for the benchmark process; this workload is CPU/static-build work.' };
  } catch (error) {
    return { status: 'unavailable', sampleCount: 0, averagePercent: null, peakPercent: null, note: `Windows GPU Engine probe unavailable: ${error instanceof Error ? error.message : String(error)}` };
  }
}

function stopChild(child) {
  if (!child || child.killed) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
  child.stdout?.destroy();
  child.stderr?.destroy();
  child.unref();
}

async function freePort() {
  const server = createTcpServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function waitForPage(url, predicate, timeoutMs = 8000) {
  const started = performance.now();
  while (performance.now() - started < timeoutMs) {
    try {
      const response = await new Promise((resolve, reject) => {
        const request = httpRequest(url, { agent: false, headers: { connection: 'close', 'cache-control': 'no-cache' } }, incoming => {
          let body = '';
          incoming.setEncoding('utf8');
          incoming.on('data', chunk => { body += chunk; });
          incoming.on('end', () => { incoming.destroy(); resolve({ ok: (incoming.statusCode || 0) >= 200 && (incoming.statusCode || 0) < 300, body }); });
          incoming.on('error', reject);
        });
        request.on('error', reject);
        request.end();
      });
      if (response.ok && predicate(response.body)) return { body: response.body, ms: round(performance.now() - started) };
    } catch { /* dev server is still starting or rebuilding */ }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Preview did not produce the expected page within ${timeoutMs}ms: ${url}`);
}

function waitForLiveReload(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    let settled = false;
    let request;
    const finish = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); request?.destroy(); error ? reject(error) : resolve(value); };
    const timer = setTimeout(() => finish(new Error(`Preview did not emit a live-reload event within ${timeoutMs}ms`)), timeoutMs);
    request = httpRequest(url, { agent: false, headers: { accept: 'text/event-stream', connection: 'close' } }, incoming => {
      let buffer = '';
      incoming.setEncoding('utf8');
      incoming.on('data', chunk => { buffer += chunk; if (buffer.includes('data: reload')) finish(null, { received: true, ms: round(performance.now() - started), at: performance.now() }); });
      incoming.on('error', error => finish(error));
      incoming.on('close', () => { if (!settled) finish(new Error('Preview live-reload connection closed before an event.')); });
    });
    request.on('error', error => finish(error));
    request.end();
  });
}

async function previewLiveUpdate(root, file) {
  const port = await freePort();
  const url = `http://127.0.0.1:${port}/en/`;
  const child = spawn(process.execPath, [devCli, 's', String(port)], { cwd: projectRoot, env: { ...process.env, PAGESKILL_SITE_ROOT: root }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.resume();
  child.stderr.resume();
  try {
    const initial = await waitForPage(url, body => body.includes('Benchmark home') && body.includes('/__pagekiln/live'));
    const reload = waitForLiveReload(`http://127.0.0.1:${port}/__pagekiln/live`);
    const started = performance.now();
    await writeFile(file, home('en').replaceAll('Benchmark home', 'Live update home'));
    const reloadEvent = await reload;
    const updated = await waitForPage(url, body => body.includes('Live update home'));
    return { serverReadyMs: initial.ms, editToReloadMs: round(reloadEvent.at - started), editToAppliedMs: round(performance.now() - started), liveReloadApplied: reloadEvent.received, applied: updated.body.includes('Live update home') };
  } finally {
    stopChild(child);
  }
}

function benchmarkDetails(count, documentsCold) {
  const scenarioNames = quick
    ? ['coldPublish', 'noChangePreview', 'previewLiveUpdate']
    : incrementalOnly
      ? ['coldPublish', 'noChangePreview', 'previewLiveUpdate', 'editOnePost', 'publishOnePost', 'deleteOnePost']
      : ['coldPublish', 'noChangePreview', 'previewLiveUpdate', 'editOnePost', 'publishOnePost', 'deleteOnePost', 'editTheme', 'editSiteSetting'];
  return {
    script: 'scripts/benchmark.mjs',
    version: 3,
    name: 'content-scale',
    command: `npm run bench -- ${args.join(' ')}`.trim(),
    purpose: 'Measure 100-page build time, process resources, incremental updates, and whether the dev preview applies an edited page.',
    workload: {
      postsPerLocale: count,
      locales,
      pagesPerLocale: 2,
      documentsCold,
      documentFormula: `${count} translated post file(s) × ${locales.length} locale(s) + home + guide per locale`,
      contentShapes: ['landing home with hero and latest-product-note Block', 'docs page with a pipeline Block and GFM table', 'dated product note with a <more> excerpt boundary', 'optional Sharp image variant'],
      generatedContract: ['HTML routes', 'post archive', 'RSS feed', 'sitemap with hreflang', 'local search index', 'llms index', 'catalog', '404', 'deployment files'],
      images: withImage ? { enabled: true, source: 'content/assets/source.png', variant: 'assets/benchmark.webp, 64×64 WebP' } : { enabled: false },
      temporaryRoot: true,
      removedAfterRun: true
    },
    scenarios: {
      coldPublish: 'createContext + build a new site from an empty output directory',
      noChangePreview: 'reuse the completed BuildContext with no input change; models an unchanged dev refresh',
      previewLiveUpdate: 'start pageskill s, edit one page, wait for its SSE reload event, and verify the served route contains the new content',
      editOnePost: 'edit one translated post, refresh that path, and rebuild dependent outputs',
      publishOnePost: 'add one new translated post, update archive/feed/search/home outputs, and rebuild',
      deleteOnePost: 'remove one complete translated post and clean stale route/output files',
      editTheme: 'change the theme CSS and rebuild the theme-owned output surface',
      editSiteSetting: 'change one localized site setting and rebuild the affected site surface'
    },
    executedScenarios: scenarioNames,
    timing: {
      clock: 'performance.now()',
      cpu: 'process.cpuUsage() delta divided by measured wall time; both one-core and whole-machine percentages are reported',
      memory: 'sampled process.memoryUsage().rss during the measured operation plus process.resourceUsage().maxRSS',
      gpu: 'Windows GPU Engine counter probe for the benchmark process; unsupported or not-observed is reported instead of inferred',
      coldPublish: 'includes discovery, context creation, validation, parsing, rendering, asset work, and writes',
      noChangePreview: 'reuses the in-process BuildContext and persisted manifest',
      incremental: 'reuses the same BuildContext; excludes process startup and temporary fixture creation',
      maxRssMiB: 'process.resourceUsage().maxRSS (KiB) / 1024 = peak Node-process resident memory'
    },
    interpretation: {
      coldPublishMs: 'time to publish a new content repository',
      noChangePreviewMs: 'time for a no-op preview rebuild',
      previewLiveUpdate: 'server startup time and edit-to-served-content time for a real dev preview process',
      editOnePostMs: 'time and output count for one real content edit',
      publishOnePostMs: 'time for adding one product note in every active locale',
      deleteOnePostMs: 'time for deleting one product note and cleaning its route',
      editThemeMs: 'cost of changing the theme surface',
      editSiteSettingMs: 'cost of changing a site-level setting'
    },
    resources: {
      fields: ['cpu', 'memory', 'gpu'],
      source: 'process.resourceUsage().maxRSS',
      memorySourceUnit: 'KiB',
      memoryReportedUnit: 'MiB',
      memoryConversion: 'maxRSS / 1024',
      meaning: 'CPU is process CPU time; memory is sampled resident memory and process peak resident memory; GPU is only reported when an OS counter observes this process.'
    }
  };
}

async function measured(task, options = {}) {
  const started = performance.now();
  const cpuBefore = process.cpuUsage();
  const rssBefore = rssMiB();
  let peakRss = rssBefore;
  const sampler = setInterval(() => { peakRss = Math.max(peakRss, rssMiB()); }, 10);
  const gpuProbe = options.gpu ? windowsGpuProbe() : Promise.resolve({ status: 'not-requested', sampleCount: 0, averagePercent: null, peakPercent: null });
  const context = await task();
  const finished = performance.now();
  clearInterval(sampler);
  peakRss = Math.max(peakRss, rssMiB());
  const cpuAfter = process.cpuUsage(cpuBefore);
  const elapsedMs = Math.max(0.01, finished - started);
  const cpuTotalMs = (cpuAfter.user + cpuAfter.system) / 1000;
  const gpu = await gpuProbe;
  return {
    ms: round(elapsedMs),
    profile: { ...context.profile },
    context,
    resources: {
      wallMs: round(elapsedMs),
      cpu: { userMs: round(cpuAfter.user / 1000), systemMs: round(cpuAfter.system / 1000), totalMs: round(cpuTotalMs), percentOfOneCore: round(cpuTotalMs / elapsedMs * 100), percentOfMachine: round(cpuTotalMs / elapsedMs / logicalCpus * 100) },
      memory: { rssBeforeMiB: round(rssBefore), rssAfterMiB: round(rssMiB()), peakObservedRssMiB: round(peakRss), processPeakRssMiB: round(process.resourceUsage().maxRSS / 1024) },
      gpu
    }
  };
}

function siteConfig() {
  return `siteUrl: https://example.test
defaultLocale: en
activeLocales:
${locales.map(locale => `  - ${locale}`).join('\n')}
siteName:
  en: Benchmark site
theme:
  name: default
plugins:
  search:
    enabled: true
    provider: Pageskill
  privacyConsent:
    enabled: true
    provider: Pageskill
content:
  collections:
    pages:
      pattern: document
      route: /:locale/:id/
    posts:
      pattern: blog
      route: /:locale/posts/:id/
      date: true
      feed: true
      archive: true
search:
  shardSize: 500
archive:
  pageSize: 50
  collection: posts
feed:
  collection: posts
  limit: 20
llms:
  title: Benchmark site
  description: A static content scale fixture.
  full:
    enabled: true
    shardSize: 250
privacy:
  cookieConsent:
    enabled: true
deployment:
  backend: false
${withImage ? 'images:\n  variants:\n    - source: source.png\n      output: assets/benchmark.webp\n      width: 64\n      height: 64\n      format: webp\n' : ''}`;
}

function home(locale) {
  return `---
title: Benchmark home
description: A product site content workload.
pattern: landing
---

:::hero{tone="brand"}
# Benchmark home

This page represents a small product site home.
:::

:::post-list{limit="6"}
:::
`;
}

function guide(locale) {
  return `---
title: Benchmark guide
description: A documentation page with reusable structure and a table.
pattern: docs
---

# Benchmark guide

:::pipeline
### Install
Run the compiler.

### Publish
Write a post and build.
:::

| Input | Output |
| --- | --- |
| Markdown | Static HTML |
`;
}

function post(index, locale, label = 'Benchmark') {
  return `---
title: ${label} post ${index}
description: A content-scale product note for ${locale}.
date: 2026-08-08
pattern: blog
tags: [benchmark, content]
---

# ${label} post ${index}

This paragraph is the product-note card excerpt shown before the more marker.

<more>

## Published content

This section represents the full product-note body that is rendered on the note route.

| Field | Value |
| --- | --- |
| Locale | ${locale} |
| Entry | content/posts/post-${index}/${locale}.md |
`;
}

async function prepareFixture(root, count) {
  await mkdir(path.join(root, 'content/pages/home'), { recursive: true });
  await mkdir(path.join(root, 'content/pages/guide'), { recursive: true });
  await mkdir(path.join(root, 'content/posts'), { recursive: true });
  await mkdir(path.join(root, 'themes/default/scripts'), { recursive: true });
  await writeFile(path.join(root, 'config.yml'), siteConfig());
  await writeFile(path.join(root, 'themes/default/theme.yml'), `name: default
module: theme.js
style: style.css
plugins:
  search:
    enabled: true
    script: scripts/search.js
  privacyConsent:
    enabled: true
    script: scripts/cookie-consent.js
`);
  await writeFile(path.join(root, 'themes/default/style.css'), 'body{font-family:system-ui}\n');
  await writeFile(path.join(root, 'themes/default/theme.js'), BENCHMARK_THEME);
  await writeFile(path.join(root, 'themes/default/scripts/search.js'), '/* benchmark local-search resource */\n');
  await writeFile(path.join(root, 'themes/default/scripts/cookie-consent.js'), '/* benchmark consent resource */\n');
  for (const locale of locales) {
    await writeFile(path.join(root, `content/pages/home/${locale}.md`), home(locale));
    await writeFile(path.join(root, `content/pages/guide/${locale}.md`), guide(locale));
  }
  for (let index = 0; index < count; index += 1) {
    const directory = path.join(root, 'content/posts', `post-${index}`);
    await mkdir(directory, { recursive: true });
    for (const locale of locales) await writeFile(path.join(directory, `${locale}.md`), post(index, locale));
  }
  if (withImage) {
    await mkdir(path.join(root, 'content/assets'), { recursive: true });
    await writeFile(path.join(root, 'content/assets/source.png'), await readFile(new URL('../content/assets/favicon-32x32.png', import.meta.url)));
  }
}

for (const count of sizes) {
  const root = await mkdtemp(path.join(os.tmpdir(), `pagekiln-scale-${count}-`));
  try {
    await prepareFixture(root, count);
    const cold = await measured(async () => build(await createContext(root)), { gpu: true });
    const unchanged = await measured(async () => build(cold.context));
    const result = {
      benchmark: benchmarkDetails(count, cold.profile.documents),
      machine,
      requestedPostsPerLocale: count,
      locales: locales.length,
      documentsCold: cold.profile.documents,
      fixture: withImage ? 'content-scale+image' : 'content-scale',
      coldPublishMs: cold.ms,
      coldResources: cold.resources,
      coldSiteOutputs: siteOutputs(cold.profile),
      noChangePreviewMs: unchanged.ms,
      noChangePreviewResources: unchanged.resources,
      noChangeSiteOutputs: siteOutputs(unchanged.profile),
      unchangedImagesProcessed: unchanged.profile.imagesProcessed,
      unchangedImageCacheHits: unchanged.profile.imageCacheHits,
      maxRssMiB: round(process.resourceUsage().maxRSS / 1024),
      coldProfile: cold.profile,
      noChangePreviewProfile: unchanged.profile
    };
    if (quick) {
      const previewStarted = performance.now();
      result.previewLiveUpdate = await previewLiveUpdate(root, path.join(root, 'content/pages/home/en.md'));
      result.previewLiveUpdateMs = round(performance.now() - previewStarted);
      console.log(JSON.stringify(result));
      continue;
    }

    const editFile = path.join(root, 'content/posts/post-0', `${locales[0]}.md`);
    await writeFile(editFile, post(0, locales[0], 'Edited'));
    const edited = await measured(async () => {
      await refreshContext(cold.context, [editFile]);
      return build(cold.context);
    });
    result.editOnePostMs = edited.ms;
    result.editOnePostSiteOutputs = siteOutputs(edited.profile);
    result.editOnePostProfile = edited.profile;

    const publishedDirectory = path.join(root, 'content/posts', `post-${count}`);
    await mkdir(publishedDirectory, { recursive: true });
    const publishedFiles = [];
    for (const locale of locales) {
      const file = path.join(publishedDirectory, `${locale}.md`);
      publishedFiles.push(file);
      await writeFile(file, post(count, locale, 'Published'));
    }
    const published = await measured(async () => {
      await refreshContext(edited.context, publishedFiles);
      return build(edited.context);
    });
    result.publishOnePostMs = published.ms;
    result.publishOnePostSiteOutputs = siteOutputs(published.profile);
    result.publishOnePostProfile = published.profile;

    const deletedDirectory = path.join(root, 'content/posts', 'post-1');
    const deletedFiles = locales.map(locale => path.join(deletedDirectory, `${locale}.md`));
    await rm(deletedDirectory, { recursive: true, force: true });
    const deleted = await measured(async () => {
      await refreshContext(published.context, deletedFiles);
      return build(published.context);
    });
    result.deleteOnePostMs = deleted.ms;
    result.deleteOnePostSiteOutputs = siteOutputs(deleted.profile);
    result.deleteOnePostProfile = deleted.profile;

    if (incrementalOnly) {
      const previewStarted = performance.now();
      result.previewLiveUpdate = await previewLiveUpdate(root, path.join(root, 'content/pages/home/en.md'));
      result.previewLiveUpdateMs = round(performance.now() - previewStarted);
      result.maxRssMiB = round(process.resourceUsage().maxRSS / 1024);
      console.log(JSON.stringify(result));
      continue;
    }

    const themeFile = path.join(root, 'themes/default/style.css');
    await writeFile(themeFile, 'body{font-family:system-ui;color:#123}\n');
    const themeChanged = await measured(async () => {
      await refreshContext(deleted.context, [themeFile]);
      return build(deleted.context);
    });
    result.editThemeMs = themeChanged.ms;
    result.editThemeSiteOutputs = siteOutputs(themeChanged.profile);
    result.editThemeProfile = themeChanged.profile;

    const configFile = path.join(root, 'config.yml');
    const configChanged = (await readFile(configFile, 'utf8')).replace('Benchmark site', 'Benchmark site / updated');
    await writeFile(configFile, configChanged);
    const siteSettingChanged = await measured(async () => {
      await refreshContext(themeChanged.context, [configFile]);
      return build(themeChanged.context);
    });
    result.editSiteSettingMs = siteSettingChanged.ms;
    result.editSiteSettingSiteOutputs = siteOutputs(siteSettingChanged.profile);
    result.editSiteSettingProfile = siteSettingChanged.profile;
    const previewStarted = performance.now();
    result.previewLiveUpdate = await previewLiveUpdate(root, path.join(root, 'content/pages/home/en.md'));
    result.previewLiveUpdateMs = round(performance.now() - previewStarted);
    result.maxRssMiB = round(process.resourceUsage().maxRSS / 1024);
    console.log(JSON.stringify(result));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
