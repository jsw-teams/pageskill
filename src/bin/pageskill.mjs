#!/usr/bin/env node

import { createContext, refreshContext, build, check } from '../runtime/compiler.js';
import { promises as fs } from 'node:fs';
import { watch } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { deploy, deployHelp } from '../deploy.mjs';
import { classifyPublicUrl, publicPathFromUrl } from '../runtime/lib/static-security.js';

const args = process.argv.slice(2);
const requestedCommand = args[0] || '';
const commandArgs = args.slice(1);
const root = process.env.PAGESKILL_SITE_ROOT || process.cwd();
const publicCommands = new Set(['g', 's', 'd']);
const helpFlags = new Set(['--help', '-h']);

async function packageVersion() {
  const packageManifest = JSON.parse(await fs.readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  return String(packageManifest.version);
}

async function printHelp({ deployment = false } = {}) {
  console.log(`Pageskill ${await packageVersion()}

Usage: pageskill <g|s|d> [options]

  g [--profile]    Generate dist/ and validate source contracts
  s [port]          Serve a local incremental preview (default: 4173)
  d [--dry-run]     Validate, generate, and deploy from config.yml
  --help, -h        Show this help

${deployment ? `\n${deployHelp()}` : ''}`);
}

function rejectUnexpectedArgs(command, values, allowed) {
  for (const value of values) if (!allowed.has(value)) throw new Error(`Unknown ${command} option or argument: ${value}`);
}

function parseGenerateArgs(values) {
  rejectUnexpectedArgs('g', values, new Set(['--profile']));
  return { profile: values.includes('--profile') };
}

function parseServeArgs(values) {
  let portValue = '4173';
  let positionalPort = false;
  let optionPort = false;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--port') {
      if (optionPort || positionalPort || index + 1 >= values.length) throw new Error('Preview port must be provided once as --port <number> or a positional number.');
      portValue = values[++index];
      optionPort = true;
      continue;
    }
    if (value.startsWith('--port=')) {
      if (optionPort || positionalPort) throw new Error('Preview port must be provided once as --port <number> or a positional number.');
      portValue = value.slice('--port='.length);
      optionPort = true;
      continue;
    }
    if (/^\d+$/.test(value)) {
      if (optionPort || positionalPort) throw new Error('Preview port must be provided once as --port <number> or a positional number.');
      portValue = value;
      positionalPort = true;
      continue;
    }
    throw new Error(`Unknown s option or argument: ${value}`);
  }
  const port = Number(portValue);
  if (!/^\d+$/.test(String(portValue)) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid preview port: ${portValue}`);
  return { port };
}

function parseDeployArgs(values) {
  rejectUnexpectedArgs('d', values, new Set(['--dry-run']));
  return { dryRun: values.includes('--dry-run') };
}

function contentType(file) {
  const extension = path.extname(file).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2'
  })[extension] || 'application/octet-stream';
}

function staticDirectory(ctx) {
  const deployment = ctx.config?.deployment;
  if (!deployment || typeof deployment !== 'object') return '';
  if (Object.prototype.hasOwnProperty.call(deployment, 'staticDirectory') && deployment.staticDirectory != null && deployment.staticDirectory !== '') {
    return String(deployment.staticDirectory);
  }
  const sites = deployment.openaiSites;
  if (sites && typeof sites === 'object' && sites.staticDirectory) return String(sites.staticDirectory);
  return deployment.enabled === false ? '' : 'public';
}

async function publicRoot(ctx) {
  const outputRoot = path.resolve(ctx.out);
  const deployment = ctx.config?.deployment;
  if (deployment?.enabled === false) return outputRoot;
  const sites = deployment?.openaiSites;
  const hasExplicit = Boolean(deployment && typeof deployment === 'object' && (
    Object.prototype.hasOwnProperty.call(deployment, 'staticDirectory') && deployment.staticDirectory != null && deployment.staticDirectory !== ''
    || sites && typeof sites === 'object' && sites.staticDirectory
  ));
  const configured = staticDirectory(ctx).replaceAll('\\', '/');
  const relative = configured;
  const candidate = configured
    ? path.resolve(outputRoot, relative)
    : path.join(outputRoot, 'public');
  const candidateRelative = path.relative(outputRoot, candidate);
  if (candidateRelative.startsWith('..') || path.isAbsolute(candidateRelative)) return outputRoot;
  if (!hasExplicit) {
    try {
      const stat = await fs.lstat(candidate);
      if (!stat.isDirectory() || stat.isSymbolicLink()) return stat.isSymbolicLink() ? candidate : outputRoot;
      return candidate;
    } catch { return outputRoot; }
  }
  return candidate;
}

function isSafeRealFile(realRoot, realFile, ctx) {
  const relative = path.relative(realRoot, realFile);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return false;
  const publicPath = `http://127.0.0.1/${relative.replaceAll('\\', '/')}`;
  return classifyPublicUrl(publicPath, { staticDirectory: staticDirectory(ctx) }).ok;
}

async function outputPath(ctx, requestUrl) {
  const security = classifyPublicUrl(requestUrl || '/', { staticDirectory: staticDirectory(ctx) });
  if (!security.ok) return { file: null, status: security.reason === 'invalid' ? 400 : 404 };
  const pathname = publicPathFromUrl(requestUrl || '/', { staticDirectory: staticDirectory(ctx) });
  if (!pathname) return { file: null, status: 404 };
  const relative = pathname === '/'
    ? 'index.html'
    : `${pathname.replace(/^\/+/, '')}${pathname.endsWith('/') ? 'index.html' : ''}`;
  const outputRoot = path.resolve(ctx.out);
  const sourceRoot = await publicRoot(ctx);
  const file = path.resolve(sourceRoot, relative);
  if (file !== sourceRoot && !file.startsWith(`${sourceRoot}${path.sep}`)) return { file: null, status: 404 };
  let realRoot;
  try { realRoot = await fs.realpath(outputRoot); } catch { realRoot = outputRoot; }
  try {
    const realFile = await fs.realpath(file);
    if (!isSafeRealFile(realRoot, realFile, ctx)) return { file: null, status: 404 };
    return { file: realFile, status: 200 };
  } catch (error) {
    if (error?.code === 'ENOENT') return { file, status: 200 };
    return { file: null, status: 404 };
  }
}

async function readPublicOutput(ctx, relative) {
  const outputRoot = path.resolve(ctx.out);
  const sourceRoot = await publicRoot(ctx);
  const candidate = path.resolve(sourceRoot, relative);
  if (candidate !== sourceRoot && !candidate.startsWith(`${sourceRoot}${path.sep}`)) return null;
  let realRoot;
  try { realRoot = await fs.realpath(outputRoot); } catch { realRoot = outputRoot; }
  try {
    const realFile = await fs.realpath(candidate);
    if (!isSafeRealFile(realRoot, realFile, ctx)) return null;
    return await fs.readFile(realFile);
  } catch {
    return null;
  }
}

async function develop(port) {
  let ctx = await createContext(root);
  await build(ctx);
  let timer;
  let building = false;
  const changedFiles = new Set();
  const liveClients = new Set();
  const liveReloadScript = `<script>(()=>{const source=new EventSource('/__pagekiln/live');source.onmessage=()=>location.reload()})()</script>`;
  const notifyReload = () => { for (const client of liveClients) { try { client.write('data: reload\\n\\n'); } catch { liveClients.delete(client); } } };
  const flush = async () => {
    if (building) return;
    building = true;
    try {
      while (changedFiles.size) {
        const changes = [...changedFiles];
        changedFiles.clear();
        try {
          await refreshContext(ctx, changes);
          await build(ctx);
          notifyReload();
          console.log(`Rebuilt ${ctx.docs.length} documents (${changes.length} changed files) in ${Math.round(ctx.profile.total)}ms`);
        } catch (error) {
          console.error(error);
        }
      }
    } finally {
      building = false;
    }
  };
  const rebuild = file => {
    if (file) changedFiles.add(String(file));
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), 80);
  };
  const watcher = watch(root, { recursive: true }, (_event, file) => {
    const candidate = String(file || '');
    if (!candidate) return;
    const absolute = path.isAbsolute(candidate) ? candidate : path.join(root, candidate);
    const relative = path.relative(root, absolute).replaceAll('\\', '/');
    if (!relative || relative.startsWith('../') || ['dist/', '.pagekiln/', 'node_modules/', 'src/runtime/'].some(prefix => relative.startsWith(prefix))) return;
    if (relative === 'config.yml' || relative === 'AGENTS.md' || relative.startsWith('content/') || relative.startsWith('themes/')) rebuild(relative);
  });
  const server = createServer(async (request, response) => {
    let requestUrl;
    try { requestUrl = new URL(request.url || '/', 'http://127.0.0.1'); }
    catch {
      response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      response.end('Bad request');
      return;
    }
    if (requestUrl.pathname === '/__pagekiln/live') {
      response.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive' });
      response.write(': connected\\n\\n');
      liveClients.add(response);
      request.on('close', () => liveClients.delete(response));
      return;
    }
    const result = await outputPath(ctx, request.url || '/');
    if (!result.file) {
      response.writeHead(result.status, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      response.end(result.status === 400 ? 'Bad request' : 'Not found');
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      response.end('Method not allowed');
      return;
    }
    try {
      const data = await fs.readFile(result.file);
      response.writeHead(200, { 'content-type': contentType(result.file), 'cache-control': 'no-store' });
      if (request.method === 'HEAD') { response.end(); return; }
      if (result.file.endsWith('.html')) {
        const html = data.toString();
        const liveHtml = html.includes('</body>') ? html.replace('</body>', `${liveReloadScript}</body>`) : `${html}${liveReloadScript}`;
        response.end(Buffer.from(liveHtml));
      } else response.end(data);
    } catch {
      const data = await readPublicOutput(ctx, '404.html');
      if (data) {
        response.writeHead(404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        if (request.method === 'HEAD') response.end();
        else response.end(data);
      } else {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
        response.end('Not found');
      }
    }
  });
  server.on('close', () => { watcher.close(); for (const client of liveClients) client.end(); liveClients.clear(); });
  server.listen({ port, host: '127.0.0.1' }, () => console.log(`Pageskill preview server: http://127.0.0.1:${port}`));
}

async function generate(profile = false) {
  const ctx = await createContext(root);
  await build(ctx);
  await check(ctx);
  console.log(`Generated ${ctx.docs.length} documents in ${Math.round(ctx.profile.total)}ms`);
  if (profile) console.log(JSON.stringify(ctx.profile, null, 2));
}

async function main() {
  if (!requestedCommand) {
    await printHelp();
    return;
  }
  if (helpFlags.has(requestedCommand)) {
    if (commandArgs.length) throw new Error(`Unknown option or argument: ${commandArgs[0]}`);
    await printHelp();
    return;
  }
  if (!publicCommands.has(requestedCommand)) throw new Error(`Unknown command: ${requestedCommand}. Run pageskill --help for available commands.`);
  if (commandArgs.length === 1 && helpFlags.has(commandArgs[0])) {
    await printHelp({ deployment: requestedCommand === 'd' });
    return;
  }
  if (commandArgs.some(value => helpFlags.has(value))) throw new Error(`Help must be requested by itself for pageskill ${requestedCommand}.`);

  if (requestedCommand === 'g') {
    const options = parseGenerateArgs(commandArgs);
    await generate(options.profile);
    return;
  }
  if (requestedCommand === 's') {
    const options = parseServeArgs(commandArgs);
    await develop(options.port);
    return;
  }
  const options = parseDeployArgs(commandArgs);
  const ctx = await createContext(root);
  await build(ctx);
  await check(ctx);
  await deploy(root, ctx, options.dryRun ? ['--dry-run'] : []);
}

try {
  await main();
} catch (error) {
  console.error(`Error: ${error?.message || String(error)}`);
  process.exitCode = 1;
}
