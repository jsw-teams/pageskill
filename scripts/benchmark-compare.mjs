import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toolRoot = process.env.PAGESKILL_COMPARE_TOOL_ROOT || '';
const hugoBinary = process.env.HUGO_BIN || (toolRoot ? path.join(toolRoot, 'hugo.exe') : 'hugo');
const nodeBinary = process.execPath;
const benchmarkDate = new Date().toISOString().slice(0, 10);

function round(value) {
  return Math.round(value * 100) / 100;
}

function parseSizes(args) {
  const value = args.find(arg => arg.startsWith('--sizes='))?.slice('--sizes='.length);
  const sizes = (value ? value.split(',') : ['100']).map(Number).filter(Number.isInteger);
  if (!sizes.length || sizes.some(size => size < 1)) throw new Error('Use --sizes=100 with positive integers.');
  return sizes;
}

function parseScenario(args) {
  const value = args.find(arg => arg.startsWith('--scenario='))?.slice('--scenario='.length) || 'full';
  if (!['cold', 'full'].includes(value)) throw new Error('Use --scenario=cold or --scenario=full.');
  return value;
}

async function packageVersion(packageName) {
  if (!toolRoot) return null;
  try {
    const packageFile = path.join(toolRoot, 'node_modules', ...packageName.split('/'), 'package.json');
    return JSON.parse(await fs.readFile(packageFile, 'utf8')).version;
  } catch {
    return null;
  }
}

async function commandVersion(command, args, cwd) {
  const result = await runCommand(command, args, cwd, {}, { captureOutput: true });
  const output = `${result.stdout}\n${result.stderr}`.trim().split(/\r?\n/).filter(Boolean);
  return { version: output.at(-1) || 'unknown', code: result.code };
}

function toolCommand(binaryName) {
  if (!toolRoot) return binaryName;
  const file = path.join(toolRoot, 'node_modules', '.bin', process.platform === 'win32' ? `${binaryName}.cmd` : binaryName);
  return file;
}

function commandLabel(command, args) {
  return [command, ...args].join(' ');
}

function runCommand(command, args, cwd, env = {}, options = {}) {
  return new Promise((resolve) => {
    const started = performance.now();
    let stdout = '';
    let stderr = '';
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      shell: process.platform === 'win32',
      windowsHide: true
    });
    const collect = (target, chunk) => {
      if (!options.captureOutput) return;
      const next = target + chunk.toString();
      return next.length > 12000 ? next.slice(-12000) : next;
    };
    child.stdout.on('data', chunk => { stdout = collect(stdout, chunk) || stdout; });
    child.stderr.on('data', chunk => { stderr = collect(stderr, chunk) || stderr; });
    child.on('error', error => resolve({ code: -1, ms: round(performance.now() - started), stdout, stderr: `${stderr}\n${error.message}` }));
    child.on('close', code => resolve({ code: code ?? -1, ms: round(performance.now() - started), stdout, stderr }));
  });
}

async function writeBatch(files) {
  for (let index = 0; index < files.length; index += 256) {
    await Promise.all(files.slice(index, index + 256).map(([file, value]) => fs.mkdir(path.dirname(file), { recursive: true }).then(() => fs.writeFile(file, value))));
  }
}

function markdownDocument(index) {
  return `---\ntitle: Benchmark document ${index}\ndescription: A generated Markdown document for a reproducible static build benchmark.\n---\n\n# Benchmark document ${index}\n\nThis is the same plain Markdown body used by every tool in this comparison.\n`;
}

function pageskillConfig() {
  return `siteUrl: https://example.test\ndefaultLocale: en\nactiveLocales:\n  - en\nsiteName:\n  en: Benchmark\ndescription:\n  en: Reproducible static build benchmark.\nbranding:\n  showAttribution: false\ntheme:\n  name: default\n  preset: aurora\n  nav:\n    links: []\ncontent:\n  collections:\n    pages:\n      pattern: document\n      route: /:locale/:id/\nsearch:\n  enabled: true\n  shardSize: 500\narchive:\n  enabled: false\nllms:\n  enabled: true\n  title:\n    en: Benchmark\n  description:\n    en: Reproducible static build benchmark.\n  full:\n    enabled: false\ndeployment:\n  enabled: true\n`;
}

function pageskillTheme() {
  return `name: default\nversion: 1\nmodule: theme.js\nstyle: style.css\npatterns: [document]\nblocks: []\n`;
}

function pageskillThemeModule() {
  return `export default { patterns: { document: { name: 'document', contexts: ['page'], render: content => '<article>' + content + '</article>' } }, blocks: {} };\n`;
}

async function createFixture(tool, size, runRoot) {
  const root = path.join(runRoot, `${tool}-${size}`);
  await fs.rm(root, { recursive: true, force: true });
  await fs.mkdir(root, { recursive: true });
  const bodyFiles = Array.from({ length: size }, (_, index) => [`doc-${String(index).padStart(5, '0')}.md`, markdownDocument(index)]);

  if (['astro', 'vitepress'].includes(tool)) await fs.symlink(path.join(toolRoot, 'node_modules'), path.join(root, 'node_modules'), 'junction');

  if (tool === 'pageskill') {
    await fs.mkdir(path.join(root, 'content/pages'), { recursive: true });
    await fs.mkdir(path.join(root, 'themes/default'), { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(root, 'config.yml'), pageskillConfig()),
      fs.writeFile(path.join(root, 'themes/default/theme.yml'), pageskillTheme()),
      fs.writeFile(path.join(root, 'themes/default/theme.js'), pageskillThemeModule()),
      fs.writeFile(path.join(root, 'themes/default/style.css'), 'body{font-family:system-ui}\n')
    ]);
    await writeBatch(bodyFiles.map(([file]) => {
      const stem = file.replace('.md', '');
      const title = stem.slice(4);
      return [path.join(root, 'content/pages', `${stem}/en.md`), `---\ntitle: Benchmark document ${title}\ndescription: A generated Markdown document for a reproducible static build benchmark.\npattern: document\n---\n\n# Benchmark document ${title}\n\nThis is the same plain Markdown body used by every tool in this comparison.\n`];
    }));
    return {
      root,
      output: 'dist',
      input: path.join(root, 'content/pages', bodyFiles[0][0].replace('.md', ''), 'en.md'),
      documents: bodyFiles.map(([file]) => file.replace('.md', ''))
    };
  }

  if (tool === 'astro') {
    await fs.mkdir(path.join(root, 'src/pages'), { recursive: true });
    await fs.writeFile(path.join(root, 'astro.config.mjs'), "export default {};\n");
    await writeBatch(bodyFiles.map(([file, value]) => [path.join(root, 'src/pages', file), value]));
    return { root, output: 'dist', input: path.join(root, 'src/pages', bodyFiles[0][0]), documents: bodyFiles.map(([file]) => file.replace('.md', '')) };
  }

  if (tool === 'eleventy') {
    await fs.mkdir(path.join(root, 'content'), { recursive: true });
    await fs.writeFile(path.join(root, '.eleventy.cjs'), "module.exports = { dir: { input: 'content', output: '_site' }, templateFormats: ['md'], markdownTemplateEngine: 'liquid' };\n");
    await writeBatch(bodyFiles.map(([file, value]) => [path.join(root, 'content', file), value]));
    return { root, output: '_site', input: path.join(root, 'content', bodyFiles[0][0]), documents: bodyFiles.map(([file]) => file.replace('.md', '')) };
  }

  if (tool === 'vitepress') {
    await fs.mkdir(path.join(root, 'docs/.vitepress'), { recursive: true });
    await fs.writeFile(path.join(root, 'docs/.vitepress/config.mjs'), "export default { title: 'Benchmark', description: 'Reproducible static build benchmark', cleanUrls: true };\n");
    await writeBatch(bodyFiles.map(([file, value]) => [path.join(root, 'docs', file), value]));
    return { root, output: 'docs/.vitepress/dist', input: path.join(root, 'docs', bodyFiles[0][0]), documents: bodyFiles.map(([file]) => file.replace('.md', '')) };
  }

  if (tool === 'docusaurus') {
    await fs.mkdir(path.join(root, 'docs'), { recursive: true });
    await fs.mkdir(path.join(root, 'src/css'), { recursive: true });
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'pageskill-comparison-fixture', private: true }));
    await fs.symlink(path.join(toolRoot, 'node_modules'), path.join(root, 'node_modules'), 'junction');
    const presetPath = path.join(toolRoot, 'node_modules', '@docusaurus', 'preset-classic');
    const cssPath = path.join(root, 'src/css/custom.css');
    await fs.writeFile(path.join(root, 'docusaurus.config.cjs'), `module.exports = { title: 'Benchmark', url: 'https://example.test', baseUrl: '/', organizationName: 'benchmark', projectName: 'benchmark', onBrokenLinks: 'ignore', presets: [[${JSON.stringify(presetPath)}, { docs: { routeBasePath: '/', sidebarPath: false }, blog: false, theme: { customCss: ${JSON.stringify(cssPath)} } }]] };\n`);
    await fs.writeFile(path.join(root, 'src/css/custom.css'), '');
    await writeBatch(bodyFiles.map(([file, value]) => [path.join(root, 'docs', file), value]));
    return { root, output: 'build', input: path.join(root, 'docs', bodyFiles[0][0]), documents: bodyFiles.map(([file]) => file.replace('.md', '')) };
  }

  if (tool === 'hugo') {
    await fs.mkdir(path.join(root, 'content'), { recursive: true });
    await fs.mkdir(path.join(root, 'layouts/_default'), { recursive: true });
    await fs.writeFile(path.join(root, 'hugo.toml'), `baseURL = 'https://example.test/'\ndisableKinds = ['taxonomy', 'term', 'RSS', 'sitemap', 'robotsTXT']\n`);
    await fs.writeFile(path.join(root, 'layouts/_default/single.html'), '<!doctype html><html><head><title>{{ .Title }}</title></head><body>{{ .Content }}</body></html>\n');
    await writeBatch(bodyFiles.map(([file, value]) => [path.join(root, 'content', file), value]));
    return { root, output: 'public', input: path.join(root, 'content', bodyFiles[0][0]), documents: bodyFiles.map(([file]) => file.replace('.md', '')) };
  }

  throw new Error(`Unknown benchmark tool: ${tool}`);
}

const specs = {
  pageskill: { command: nodeBinary, args: [path.join(projectRoot, 'src/bin/pageskill.mjs'), 'build'], env: root => ({ PAGESKILL_SITE_ROOT: root }), version: async () => JSON.parse(await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8')).version, commandText: 'node src/bin/pageskill.mjs build' },
  astro: { command: toolCommand('astro'), args: ['build'], version: () => packageVersion('astro'), commandText: 'astro build' },
  eleventy: { command: toolCommand('eleventy'), args: ['--input=content', '--output=_site'], version: () => packageVersion('@11ty/eleventy'), commandText: 'eleventy --input=content --output=_site' },
  vitepress: { command: toolCommand('vitepress'), args: ['build', 'docs'], version: () => packageVersion('vitepress'), commandText: 'vitepress build docs' },
  docusaurus: { command: toolCommand('docusaurus'), args: ['build'], version: () => packageVersion('@docusaurus/core'), commandText: 'docusaurus build' },
  hugo: { command: hugoBinary, args: ['build', '--destination', 'public', '--quiet'], version: async () => (await commandVersion(hugoBinary, ['version'], projectRoot)).version, commandText: 'hugo build --destination public --quiet' }
};

async function listFiles(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async entry => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(file) : [file];
    }));
    return nested.flat();
  } catch {
    return [];
  }
}

async function outputStats(root, output, deletedStem) {
  const files = await listFiles(path.join(root, output));
  return {
    htmlFiles: files.filter(file => file.toLowerCase().endsWith('.html') && path.basename(file).toLowerCase() !== '404.html').length,
    totalFiles: files.length,
    deletedOutputPresent: files.some(file => path.basename(file).startsWith(deletedStem) || file.includes(`${path.sep}${deletedStem}${path.sep}`))
  };
}

function xmlEscape(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function routeFromOutputFile(relative) {
  const normalized = relative.replaceAll('\\', '/');
  if (normalized === 'index.html') return '/';
  if (normalized.endsWith('/index.html')) return `/${normalized.slice(0, -'index.html'.length)}`;
  return `/${normalized.replace(/\.html$/, '')}/`;
}

async function documentRoutes(fixture) {
  const outputRoot = path.join(fixture.root, fixture.output);
  const files = (await listFiles(outputRoot))
    .filter(file => file.toLowerCase().endsWith('.html') && path.basename(file).toLowerCase() !== '404.html')
    .map(file => path.relative(outputRoot, file).replaceAll('\\', '/'));
  return new Map(fixture.documents.map(stem => {
    const matches = files.filter(relative => relative === `${stem}/index.html`
      || relative.endsWith(`/${stem}/index.html`)
      || relative === `${stem}.html`
      || relative.endsWith(`/${stem}.html`));
    return [stem, matches.length ? routeFromOutputFile(matches[0]) : `/${stem}/`];
  }));
}

async function writeSiteContract(fixture) {
  const outputRoot = path.join(fixture.root, fixture.output);
  const routes = await documentRoutes(fixture);
  const entries = fixture.documents.map(stem => ({
    id: stem,
    collection: 'pages',
    locale: 'en',
    title: `Benchmark document ${stem.slice(4)}`,
    description: 'A generated Markdown document for a reproducible static build benchmark.',
    url: routes.get(stem) || `/${stem}/`,
    text: 'This is the same plain Markdown body used by every tool in this comparison.'
  }));
  const urls = entries.map(entry => `<url><loc>${xmlEscape(`https://example.test${entry.url}`)}</loc></url>`).join('');
  const catalog = {
    version: 1,
    contract: 'pagekiln-static-site-contract-v1',
    site: { name: 'Benchmark', defaultLocale: 'en', locales: ['en'] },
    collections: [{ name: 'pages', count: entries.length }],
    features: {
      search: true,
      sitemap: true,
      robots: true,
      notFound: true,
      llms: true,
      agentDiscovery: true,
      cookieConsentDisclosure: true,
      staticDeployment: true
    },
    routes: entries.map(({ id, url, title }) => ({ id, url, title }))
  };
  const agent = {
    version: 1,
    site: { name: 'Benchmark', defaultLocale: 'en', locales: ['en'] },
    crawl: { robots: '/robots.txt', sitemap: '/sitemap.xml', search: '/assets/search-index.en.json', llms: '/llms.txt', catalog: '/.pagekiln/catalog.json' },
    privacy: { consentRequiredForOptional: true, optionalCookiesDefault: false, withdrawalAvailable: true, storage: 'cookie', retentionDays: 365, categories: ['essential', 'analytics'] },
    generatedBy: { name: 'common-static-site-contract', version: 1, static: true, siteUrl: 'https://example.test' }
  };
  const manifest = { name: 'Benchmark', short_name: 'Benchmark', start_url: '/', display: 'minimal-ui', theme_color: '#17232d' };
  const notFound = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Not found · Benchmark</title></head><body><main><h1>Page not found</h1><p>Return to <a href="/">the benchmark site</a>.</p></main></body></html>\n';
  const files = new Map([
    ['404.html', notFound],
    ['robots.txt', 'User-agent: *\nAllow: /\nSitemap: https://example.test/sitemap.xml\n'],
    ['sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`],
    ['assets/search-index.en.json', JSON.stringify({ version: 1, locale: 'en', count: entries.length, entries })],
    ['llms.txt', `Benchmark\n\nReproducible static build benchmark.\n\n${entries.map(entry => `- [${entry.title}](https://example.test${entry.url}): ${entry.description}`).join('\n')}\n`],
    ['.pagekiln/catalog.json', JSON.stringify(catalog, null, 2)],
    ['.well-known/agent.json', JSON.stringify(agent, null, 2)],
    ['site.webmanifest', JSON.stringify(manifest, null, 2)],
    ['deployment/static.json', JSON.stringify({ version: 1, staticOutput: '.', targets: ['cdn', 'cloudflare-pages', 'cloudflare-workers-assets', 'vps'], handler: 'static-assets-first' }, null, 2)]
  ]);
  for (const [relative, value] of files) {
    const target = path.join(outputRoot, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, `${value}${value.endsWith('\n') ? '' : '\n'}`);
  }
  return { name: 'pagekiln-static-site-contract-v1', artifacts: [...files.keys()] };
}

async function runBuild(tool, fixture, scenario) {
  const spec = specs[tool];
  const env = spec.env ? spec.env(fixture.root) : {};
  const result = await runCommand(spec.command, spec.args, fixture.root, env, { captureOutput: true });
  if (result.code !== 0) return { scenario, ms: result.ms, cliMs: result.ms, siteContractMs: 0, code: result.code, stderr: result.stderr.trim().slice(-1000) };
  const contractStarted = performance.now();
  const siteContract = await writeSiteContract(fixture);
  const siteContractMs = round(performance.now() - contractStarted);
  return { scenario, ms: round(result.ms + siteContractMs), cliMs: result.ms, siteContractMs, code: result.code, siteContract, stderr: result.stderr.trim().slice(-1000) };
}

async function replaceInput(file, value) {
  const source = await fs.readFile(file, 'utf8');
  await fs.writeFile(file, source.replace('same plain Markdown body', 'changed plain Markdown body'));
  return value;
}

async function runTool(tool, size, scenario, runRoot) {
  const fixture = await createFixture(tool, size, runRoot);
  const spec = specs[tool];
  const version = await spec.version();
  const startedAt = new Date().toISOString();
  const outputDirectory = path.join(fixture.root, fixture.output);
  const result = { tool, version, size, fixture: 'same plain Markdown body + common static site contract, one locale, no images', command: spec.commandText, startedAt, scenarios: [] };
  await fs.rm(outputDirectory, { recursive: true, force: true });
  const measuredBuild = async name => {
    const buildResult = await runBuild(tool, fixture, name);
    buildResult.output = await outputStats(fixture.root, fixture.output, 'never-matches');
    return buildResult;
  };
  result.scenarios.push(await measuredBuild('cold'));
  if (scenario === 'full') {
    result.scenarios.push(await measuredBuild('no-change-cli'));
    await replaceInput(fixture.input, size);
    result.scenarios.push(await measuredBuild('change-one-cli'));
    const deletedStem = tool === 'pageskill' ? path.basename(path.dirname(fixture.input)) : path.basename(fixture.input).replace(/\.md$/, '');
    await fs.rm(fixture.input, { force: true });
    fixture.documents = fixture.documents.filter(stem => stem !== deletedStem);
    const deletion = await runBuild(tool, fixture, 'delete-one-cli');
    deletion.output = await outputStats(fixture.root, fixture.output, deletedStem);
    result.scenarios.push(deletion);
  }
  result.finishedAt = new Date().toISOString();
  console.log(JSON.stringify(result));
  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const sizes = parseSizes(args);
  const scenario = parseScenario(args);
  const requestedTools = args.find(arg => arg.startsWith('--tools='))?.slice('--tools='.length).split(',').filter(Boolean);
  const tools = requestedTools?.length ? requestedTools : Object.keys(specs);
  const unknownTools = tools.filter(tool => !specs[tool]);
  if (unknownTools.length) throw new Error(`Unknown tools: ${unknownTools.join(', ')}`);
  if (tools.some(tool => tool !== 'pageskill') && !toolRoot) throw new Error('Set PAGESKILL_COMPARE_TOOL_ROOT to the temporary dependency directory before comparing installed Node tools.');
  const compareRunBase = process.env.PAGESKILL_COMPARE_RUN_ROOT || os.tmpdir();
  await fs.mkdir(compareRunBase, { recursive: true });
  const runRoot = await fs.mkdtemp(path.join(compareRunBase, 'pagekiln-compare-run-'));
  const results = [];
  try {
    for (const size of sizes) for (const tool of tools) results.push(await runTool(tool, size, scenario, runRoot));
  } finally {
    if (!args.includes('--keep')) await fs.rm(runRoot, { recursive: true, force: true });
  }
  const outputFile = path.join(projectRoot, '.pagekiln', 'benchmark-comparison.json');
  let reportResults = results;
  if (args.includes('--append')) {
    try {
      const previous = JSON.parse(await fs.readFile(outputFile, 'utf8'));
      const currentKeys = new Set(results.map(result => `${result.tool}:${result.size}`));
      reportResults = [...(Array.isArray(previous.results) ? previous.results.filter(result => !currentKeys.has(`${result.tool}:${result.size}`)) : []), ...results];
    } catch {
      reportResults = results;
    }
  }
  const output = {
    measured: benchmarkDate,
    machine: { node: process.version, platform: process.platform, release: os.release(), arch: process.arch, cpu: os.cpus()[0]?.model || 'unknown', logicalCpus: os.cpus().length, totalMemoryGiB: round(os.totalmem() / 1024 / 1024 / 1024) },
    methodology: 'Same generated Markdown body and document count; one locale, static output, no images. Pageskill search, llms, deployment, sitemap, robots, 404, catalog, Agent metadata, and manifest stay enabled. Every tool receives the same post-build static site contract (search index, sitemap, robots, llms, catalog, Agent metadata, not-found page, consent disclosure, manifest, and static deployment manifest), and contract time is included in ms. Each scenario launches the tool CLI as a fresh process; no-change-cli and change-one-cli measure a fresh CLI rebuild, not a long-lived watch context.',
    results: reportResults
  };
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Comparison report: ${outputFile}`);
}

await main();
