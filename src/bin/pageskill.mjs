#!/usr/bin/env node

import { createContext, refreshContext, build, check } from '../runtime/compiler.js';
import { createSiteFetchHandler } from '../runtime/fetch-router.js';
import { promises as fs } from 'node:fs';
import { watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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

function runTypeScriptCompiler(projectFile, outDirectory, label) {
  const compiler = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  return new Promise(async (resolve, reject) => {
    try { await fs.access(compiler); } catch { reject(new Error(`${label} compiler is missing; run npm install first.`)); return; }
    const child = spawn(process.execPath, [compiler, '-p', path.join(root, projectFile), '--outDir', outDirectory], {
      cwd: root,
      shell: false,
      stdio: 'inherit'
    });
    child.once('error', error => reject(new Error(`${label} compiler failed to start: ${error.message}`)));
    child.once('close', code => code === 0 ? resolve() : reject(new Error(`${label} compiler exited with code ${code}`)));
  });
}

async function compileGeneratedProject(projectFile, outputDirectory, label) {
  const cacheRoot = path.join(root, '.pagekiln');
  const output = path.join(root, outputDirectory);
  const token = `${process.pid}-${Date.now()}`;
  const temporary = path.join(cacheRoot, `${path.basename(outputDirectory)}-next-${token}`);
  const backup = path.join(cacheRoot, `${path.basename(outputDirectory)}-previous-${token}`);
  await fs.mkdir(cacheRoot, { recursive: true });
  await fs.rm(temporary, { recursive: true, force: true });
  try {
    await runTypeScriptCompiler(projectFile, temporary, label);
  } catch (error) {
    await fs.rm(temporary, { recursive: true, force: true });
    throw error;
  }
  let movedExisting = false;
  try {
    await fs.rename(output, backup);
    movedExisting = true;
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      await fs.rm(temporary, { recursive: true, force: true });
      throw error;
    }
  }
  try {
    await fs.rename(temporary, output);
  } catch (error) {
    if (movedExisting) await fs.rename(backup, output).catch(() => {});
    await fs.rm(temporary, { recursive: true, force: true });
    throw error;
  }
  if (movedExisting) await fs.rm(backup, { recursive: true, force: true });
}

async function filesUnder(directory) {
  const files = [];
  const visit = async current => {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(file);
      else files.push(file);
    }
  };
  await visit(directory);
  return files;
}

function moduleGenerationSpecifier(specifier, generation) {
  const hash = specifier.indexOf('#');
  const query = hash >= 0 ? specifier.slice(0, hash) : specifier;
  const fragment = hash >= 0 ? specifier.slice(hash) : '';
  return query + (query.includes('?') ? '&' : '?') + 'pageskill=' + generation + fragment;
}

function rewriteBackendModuleImports(source, generation) {
  const rewrite = (full, prefix, quote, specifier) => {
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) return full;
    return prefix + quote + moduleGenerationSpecifier(specifier, generation) + quote;
  };
  let rewritten = source.replace(/(\bfrom\s*)(['"])([^'"]+)\2/g, rewrite);
  rewritten = rewritten.replace(/(\bimport\s*)(['"])([^'"]+)\2/g, rewrite);
  return rewritten.replace(/(\bimport\s*\(\s*)(['"])([^'"]+)\2/g, rewrite);
}

async function prepareBackendGeneration(generation) {
  const runtimeRoot = path.join(root, '.pagekiln', 'backend-runtime');
  const generationRoot = path.join(root, '.pagekiln', 'backend-generations', generation);
  await fs.rm(generationRoot, { recursive: true, force: true });
  await fs.cp(runtimeRoot, generationRoot, { recursive: true });
  for (const file of await filesUnder(generationRoot)) {
    const extension = path.extname(file).toLowerCase();
    if (extension !== '.js' && extension !== '.mjs') continue;
    const source = await fs.readFile(file, 'utf8');
    await fs.writeFile(file, rewriteBackendModuleImports(source, generation));
  }
  return path.join(generationRoot, 'backend', 'handler.js');
}

async function loadPreviewRouter(ctx) {
  if (ctx.config?.deployment?.backend === false) return undefined;
  try { await fs.access(path.join(root, 'backend', 'handler.ts')); } catch { return undefined; }
  const entry = path.join(root, '.pagekiln', 'backend-runtime', 'backend', 'handler.js');
  try { await fs.access(entry); } catch { throw new Error('backend/handler.ts exists but its JavaScript runtime is missing; run npm run compile-backend'); }
  const generation = Date.now().toString(36) + '-' + Math.random().toString(16).slice(2);
  const generationEntry = await prepareBackendGeneration(generation);
  const loaded = await import(pathToFileURL(generationEntry).href + '?pageskill=' + generation);
  if (!loaded.router || typeof loaded.router.match !== 'function') throw new Error('backend/handler.ts must export a Router as "router"');
  return loaded.router;
}

async function localAssetResponse(ctx, request, liveReloadScript) {
  const result = await outputPath(ctx, request.url);
  if (!result.file) return new Response(result.status === 400 ? 'Bad request' : 'Not found', { status: result.status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  try {
    const data = await fs.readFile(result.file);
    const headers = { 'content-type': contentType(result.file), 'cache-control': 'no-store' };
    if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
    if (result.file.endsWith('.html')) {
      const html = data.toString();
      const liveHtml = html.includes('</body>') ? html.replace('</body>', `${liveReloadScript}</body>`) : `${html}${liveReloadScript}`;
      return new Response(liveHtml, { status: 200, headers });
    }
    return new Response(data, { status: 200, headers });
  } catch {
    const data = await readPublicOutput(ctx, '404.html');
    return data
      ? new Response(request.method === 'HEAD' ? null : data, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
      : new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  }
}

function localFetchRequest(request, port) {
  const method = String(request.method || 'GET').toUpperCase();
  const init = { method, headers: new Headers(request.headers) };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = request;
    init.duplex = 'half';
  }
  return new Request(new URL(request.url || '/', `http://127.0.0.1:${port}`), init);
}

async function writeFetchResponse(response, nodeResponse) {
  const headers = {};
  response.headers.forEach((value, key) => { headers[key] = value; });
  nodeResponse.writeHead(response.status, headers);
  nodeResponse.end(Buffer.from(await response.arrayBuffer()));
}

async function develop(port) {
  let ctx = await createContext(root);
  await build(ctx);
  let timer;
  let building = false;
  const changedFiles = new Set();
  const liveClients = new Set();
  const liveReloadScript = `<script>(()=>{const source=new EventSource('/__pagekiln/live');source.onmessage=()=>location.reload()})()</script>`;
  let backendRouter = await loadPreviewRouter(ctx);
  let fetchHandler = createSiteFetchHandler({
    router: backendRouter,
    defaultLocale: String(ctx.config.defaultLocale || 'en'),
    staticDirectory: staticDirectory(ctx),
    assets: request => localAssetResponse(ctx, request, liveReloadScript)
  });
  const notifyReload = () => { for (const client of liveClients) { try { client.write('data: reload\n\n'); } catch { liveClients.delete(client); } } };
  const flush = async () => {
    if (building) return;
    building = true;
    try {
      while (changedFiles.size) {
        const changes = [...changedFiles];
        changedFiles.clear();
        try {
          if (changes.some(file => { const value = String(file).toLocaleLowerCase(); return value.startsWith('themes/') && value.endsWith('.ts'); })) await compileGeneratedProject('tsconfig.theme.json', '.pagekiln/theme-runtime', 'Theme');
          if (changes.some(file => { const value = String(file).toLocaleLowerCase(); return value.startsWith('backend/') && value.endsWith('.ts'); })) await compileGeneratedProject('tsconfig.backend.json', '.pagekiln/backend-runtime', 'Backend');
          await refreshContext(ctx, changes);
          await build(ctx);
          backendRouter = await loadPreviewRouter(ctx);
          fetchHandler = createSiteFetchHandler({
            router: backendRouter,
            defaultLocale: String(ctx.config.defaultLocale || 'en'),
            staticDirectory: staticDirectory(ctx),
            assets: request => localAssetResponse(ctx, request, liveReloadScript)
          });
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
    if (relative === 'config.yml' || relative === 'AGENTS.md' || relative.startsWith('content/') || relative.startsWith('themes/') || relative.startsWith('backend/')) rebuild(relative);
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
      response.write(': connected\n\n');
      liveClients.add(response);
      request.on('close', () => liveClients.delete(response));
      return;
    }
    try {
      await writeFetchResponse(await fetchHandler(localFetchRequest(request, port), new Proxy({}, { get: (_target, key) => process.env[String(key)] }), undefined), response);
    } catch (error) {
      console.error(error);
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      response.end('Internal server error');
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
