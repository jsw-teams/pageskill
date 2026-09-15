import { promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { publicPathFromUrl } from '../lib/static-security.ts';
import type { RuntimeBuildAdapter, RuntimeBuildContext } from '../runtime-contract.ts';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

async function walk(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch((error: any) => {
    if (error?.code === 'ENOENT') return [];
    throw error;
  });
  const files: string[] = [];
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}

async function readFirst(candidates: string[], label: string): Promise<string> {
  for (const candidate of candidates) {
    try { return await fs.readFile(candidate, 'utf8'); } catch { /* try the next compiled location */ }
  }
  throw new Error(`${label} is missing; run npm run compile-runtime`);
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

function contentType(file: string): string {
  return CONTENT_TYPES[path.extname(file).toLocaleLowerCase()] || 'application/octet-stream';
}

/** Provide the same safe public asset surface that Pages' ASSETS binding does. */
async function localAssetResponse(publicRoot: string, request: Request): Promise<Response> {
  const publicPath = publicPathFromUrl(request.url);
  if (!publicPath) return new Response('Not found', { status: 404 });
  const relative = publicPath.replace(/^\/+/, '') || 'index.html';
  let file = path.resolve(publicRoot, relative);
  if (file !== publicRoot && !file.startsWith(`${publicRoot}${path.sep}`)) return new Response('Bad path', { status: 400 });
  try {
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const body = await fs.readFile(file);
    return new Response(body, { status: 200, headers: { 'content-type': contentType(file), 'cache-control': 'no-store' } });
  } catch {
    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
}

async function requestBody(request: any): Promise<Uint8Array | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return new Uint8Array(Buffer.concat(chunks as any));
}

function requestHeaders(request: any): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers || {})) {
    if (value === undefined) continue;
    headers.set(name, Array.isArray(value) ? value.join(', ') : String(value));
  }
  return headers;
}

async function loadPreviewWorker(outputDirectory: string): Promise<{ fetch: (request: Request, env: Record<string, unknown>, executionContext: Record<string, unknown>) => Response | Promise<Response> }> {
  const file = path.join(outputDirectory, '_worker.js');
  try { await fs.access(file); } catch { throw new Error('Generated Worker is missing; run page g before starting the runtime preview.'); }
  const module = await import(`${pathToFileURL(file).href}?pageskill-preview=${Date.now()}`);
  const worker = module.default;
  if (!worker || typeof worker.fetch !== 'function') throw new Error('Generated Worker does not expose a Fetch handler.');
  return worker;
}

/** Run the generated Fetch contract directly on Node for local development. */
async function startNativePreview(context: Pick<RuntimeBuildContext, 'outputDirectory'> & { port: number }): Promise<unknown> {
  const publicRoot = path.resolve(context.outputDirectory);
  const worker = await loadPreviewWorker(publicRoot);
  const assets = { fetch: (request: Request) => localAssetResponse(publicRoot, request) };
  const environment = { ASSETS: assets };
  const server = createServer(async (incoming: any, outgoing: any) => {
    try {
      const method = String(incoming.method || 'GET').toUpperCase();
      const host = String(incoming.headers?.host || `127.0.0.1:${context.port}`);
      const url = new URL(incoming.url || '/', `http://${host}`);
      const body = await requestBody(incoming);
      const init: Record<string, unknown> = { method, headers: requestHeaders(incoming) };
      if (body !== undefined && body.length) { init.body = body; init.duplex = 'half'; }
      const request = new Request(url, init as RequestInit);
      const response = await worker.fetch(request, environment, { waitUntil: (promise: Promise<unknown>) => { void promise.catch(() => {}); } });
      outgoing.statusCode = response.status;
      response.headers.forEach((value, name) => outgoing.setHeader(name, value));
      outgoing.end(method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      outgoing.statusCode = 500;
      outgoing.setHeader('content-type', 'text/plain; charset=utf-8');
      outgoing.end(error instanceof Error ? error.message : String(error));
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port: context.port }, () => resolve());
  });
  console.log(`Pageskill native preview: http://127.0.0.1:${context.port}`);
  return server;
}

async function build(context: RuntimeBuildContext): Promise<void> {
  const discoveryLiteral = JSON.stringify(context.discovery);
  const runtimeCandidates = [path.join(moduleDirectory, '..', 'fetch-router.js'), path.join(moduleDirectory, 'fetch-router.js')];
  const securityCandidates = [path.join(moduleDirectory, '..', 'lib', 'static-security.js'), path.join(moduleDirectory, 'lib', 'static-security.js')];
  await context.writeOutput('_pageskill/fetch-router.js', await readFirst(runtimeCandidates, 'compiled Fetch router'));
  await context.writeOutput('_pageskill/lib/static-security.js', await readFirst(securityCandidates, 'compiled static-security runtime'));

  let routerImport = '';
  if (context.backend) {
    const backendEntry = path.join(context.backendRuntimeDirectory, 'backend', 'handler.js');
    try { await fs.access(backendEntry); } catch { throw new Error('backend/handler.ts runtime is missing; run npm run compile-backend'); }
    for (const file of await walk(context.backendRuntimeDirectory)) {
      if (!file.endsWith('.js')) continue;
      const relative = file.slice(context.backendRuntimeDirectory.length + 1).replaceAll(path.sep, '/');
      await context.writeOutput(`_pageskill/${relative}`, await fs.readFile(file));
    }
    routerImport = `import { router } from './_pageskill/backend/handler.js';\n`;
  }
  const registry = {
    activeLocales: context.activeLocales,
    contentKeys: context.contentKeys
  };
  const worker = `import { createSiteFetchHandler } from './_pageskill/fetch-router.js';\n${routerImport}\nconst site = ${JSON.stringify(registry)};\nconst fetchHandler = createSiteFetchHandler({ ${context.backend ? 'router, ' : ''}defaultLocale: ${JSON.stringify(context.defaultLocale)}, staticDirectory: '', discovery: ${discoveryLiteral} });\n\nexport { fetchHandler };\nexport default {\n  async fetch(request, env, executionContext) {\n    const runtimeEnv = Object.create(env);\n    runtimeEnv.PAGESKILL_SITE = site;\n    return fetchHandler(request, runtimeEnv, executionContext);\n  }\n};\n`;
  await context.writeOutput('_worker.js', worker);
}

export const adapter: RuntimeBuildAdapter = {
  id: 'cloudflare-pages',
  build,
  startPreview: context => startNativePreview({ outputDirectory: context.outputDirectory, port: context.port })
};

export default adapter;
