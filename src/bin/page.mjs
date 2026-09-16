#!/usr/bin/env node

import { promises as fs, watch } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createContext, refreshContext, build, check } from '../runtime/compiler.js';
import { auditGeneratedSite, formatAccessibilitySummary, hasAccessibilityErrors, writeBrowserPdf } from '../runtime/accessibility/index.js';
import { accessibilityReportHtml } from '../runtime/accessibility/report.js';

const args = process.argv.slice(2);
const command = args[0] || '';
const commandArgs = args.slice(1);
const root = path.resolve(process.env.PAGESKILL_SITE_ROOT || process.cwd());

async function packageVersion() {
  const packageFile = new URL('../../package.json', import.meta.url);
  const manifest = JSON.parse(await fs.readFile(packageFile, 'utf8'));
  return String(manifest.version);
}

async function printHelp() {
  console.log(`Pageskill ${await packageVersion()}

Usage: page <g|c|s> [options]

  g [--profile]     Generate and validate the site without browser startup.
  c                 Run the complete browser and axe accessibility audit.
  s [port]           Start the local static preview.
  s --port <port>   Start the preview on an explicit port.
  --help, -h        Show this help.
`);
}

function rejectUnexpected(commandName, values, allowed) {
  for (const value of values) if (!allowed.has(value)) throw new Error(`Unknown ${commandName} option or argument: ${value}`);
}

function parseGenerateArgs(values) {
  rejectUnexpected('g', values, new Set(['--profile']));
  return { profile: values.includes('--profile') };
}

function parseServeArgs(values) {
  let portValue = '4173';
  let supplied = false;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--port') {
      if (supplied || index + 1 >= values.length) throw new Error('Preview port must be provided once as --port <number> or a positional number.');
      portValue = values[++index];
      supplied = true;
    } else if (value.startsWith('--port=')) {
      if (supplied) throw new Error('Preview port must be provided once as --port <number> or a positional number.');
      portValue = value.slice('--port='.length);
      supplied = true;
    } else if (/^\d+$/.test(value)) {
      if (supplied) throw new Error('Preview port must be provided once as --port <number> or a positional number.');
      portValue = value;
      supplied = true;
    } else throw new Error(`Unknown s option or argument: ${value}`);
  }
  const port = Number(portValue);
  if (!/^\d+$/.test(String(portValue)) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid preview port: ${portValue}`);
  return { port };
}

function parseCArgs(values) {
  rejectUnexpected('c', values, new Set());
}

async function writeAccessibilityReport(report) {
  const directory = path.join(root, '.pageskill', 'reports', 'accessibility');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(directory, 'summary.json'), `${JSON.stringify(report.summary, null, 2)}\n`, 'utf8');
  const htmlFile = path.join(directory, 'index.html');
  await fs.writeFile(htmlFile, accessibilityReportHtml(report, 'html'), 'utf8');
  const printFile = path.join(directory, '.report-print.html');
  try {
    await fs.writeFile(printFile, accessibilityReportHtml(report, 'pdf'), 'utf8');
    await writeBrowserPdf(printFile, path.join(directory, 'report.pdf'));
  } finally {
    await fs.rm(printFile, { force: true });
  }
}

async function audit(ctx, options = {}) {
  const report = await auditGeneratedSite(ctx, options);
  await writeAccessibilityReport(report);
  console.log(`Accessibility\n  ${report.pages} pages\n  ${report.diagnostics.filter(item => item.level === 'error').length} errors\n  ${report.diagnostics.filter(item => item.level === 'warning').length} warnings\n\nReport:\n  .pageskill/reports/accessibility/report.pdf\n  .pageskill/reports/accessibility/index.html\n  .pageskill/reports/accessibility/report.json\n  .pageskill/reports/accessibility/summary.json\n  .pageskill/reports/accessibility/screenshots/`);
  if (hasAccessibilityErrors(report)) throw new Error(formatAccessibilitySummary(report));
  return report;
}

function spawnProcess(commandName, values, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(commandName, values, { cwd: root, shell: false, stdio: options.stdio || 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('close', code => resolve(code ?? 1));
  });
}

async function compileProject(projectFile, outputDirectory, label) {
  const compiler = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  try { await fs.access(compiler); } catch { throw new Error(`${label} compiler is missing; run npm install first.`); }
  const code = await spawnProcess(process.execPath, [compiler, '-p', path.join(root, projectFile), '--outDir', path.join(root, outputDirectory)]);
  if (code !== 0) throw new Error(`${label} compiler exited with code ${code}`);
}

async function startPreview(ctx, port) {
  return startStaticPreview(ctx.out, port);
}

function staticContentType(file) {
  const extension = path.extname(file).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
  })[extension] || 'application/octet-stream';
}

async function startStaticPreview(publicRoot, port) {
  publicRoot = path.resolve(publicRoot);
  const server = createServer(async (request, response) => {
    let pathname = '/';
    try { pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname; } catch { /* use root */ }
    let decoded;
    try { decoded = decodeURIComponent(pathname); } catch { decoded = ''; }
    const relative = String(decoded || '/').replace(/^\/+/, '');
    const candidate = path.resolve(publicRoot, relative || '.');
    if (candidate !== publicRoot && !candidate.startsWith(`${publicRoot}${path.sep}`)) {
      response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Bad path');
      return;
    }
    const candidates = pathname.endsWith('/') ? [path.join(candidate, 'index.html')] : [candidate];
    let file;
    for (const value of candidates) {
      try { if ((await fs.stat(value)).isFile()) { file = value; break; } } catch { /* continue */ }
    }
    if (!file) file = path.join(publicRoot, '404.html');
    try {
      const body = await fs.readFile(file);
      response.writeHead(file.endsWith('404.html') ? 404 : 200, { 'content-type': staticContentType(file), 'cache-control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port }, resolve);
  });
  return server;
}

async function generate(profile = false) {
  const ctx = await createContext(root);
  await build(ctx);
  await check(ctx);
  if (profile) console.log(`Profile: ${JSON.stringify(ctx.profile)}`);
  return ctx;
}

async function checkSite() {
  const ctx = await generate(false);
  await audit(ctx);
  return ctx;
}

function sourceRelative(file) {
  return path.relative(root, path.resolve(root, file)).replaceAll('\\', '/');
}

function shouldWatch(relative) {
  const normalized = relative.toLocaleLowerCase();
  return normalized === 'config.yml' || normalized.startsWith('config/') || normalized === 'agents.md' || normalized.startsWith('content/') || normalized.startsWith('themes/') || normalized === 'site/theme.yml';
}

async function serve(port) {
  let ctx = await createContext(root);
  await build(ctx);
  await check(ctx);
  let child = await startPreview(ctx, port);
  let timer;
  let building = false;
  const changes = new Set();

  const restartPreview = async () => {
    if (child?.close && !child.exitCode) await new Promise(resolve => child.close(resolve));
    else if (child && child.exitCode === null) child.kill('SIGINT');
    await new Promise(resolve => setTimeout(resolve, 250));
    child = await startPreview(ctx, port);
  };

  const flush = async () => {
    if (building) return;
    building = true;
    try {
      while (changes.size) {
        const files = [...changes];
        changes.clear();
        try {
          if (files.some(file => file.startsWith('themes/') && file.endsWith('.ts'))) await compileProject('tsconfig.theme.json', '.pageskill/theme-runtime', 'Theme');
          ctx = await refreshContext(ctx, files);
          await build(ctx);
          await check(ctx);
          await restartPreview();
          console.log(`Rebuilt ${ctx.docs.length} documents (${files.length} changed files) in ${Math.round(ctx.profile.total)}ms`);
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error));
        }
      }
    } finally { building = false; }
  };

  const watcher = watch(root, { recursive: true }, (_event, filename) => {
    const value = String(filename || '');
    if (!value) return;
    const relative = sourceRelative(value);
    if (!relative || relative.startsWith('../') || relative.startsWith('dist/') || relative.startsWith('.pageskill/') || relative.startsWith('node_modules/') || relative.startsWith('src/runtime/')) return;
    if (!shouldWatch(relative)) return;
    changes.add(relative);
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), 100);
  });

  await new Promise(resolve => {
    const stop = () => resolve();
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  });
  watcher.close();
  clearTimeout(timer);
  if (child?.close && !child.exitCode) await new Promise(resolve => child.close(resolve));
  else if (child && child.exitCode === null) child.kill('SIGINT');
}

async function main() {
  if (command === '--help' || command === '-h' || !command) { await printHelp(); return; }
  if (command === 'g') { await generate(parseGenerateArgs(commandArgs).profile); return; }
  if (command === 's') { await serve(parseServeArgs(commandArgs).port); return; }
  if (command === 'c') { parseCArgs(commandArgs); await checkSite(); return; }
  throw new Error(`Unknown command: ${command}. Use "page g", "page c", or "page s".`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
