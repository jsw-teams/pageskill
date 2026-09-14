import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
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

async function writeWranglerConfig(root: string, backend: boolean): Promise<void> {
  const aiBinding = process.env.PAGESKILL_PREVIEW_REMOTE_AI === '1' ? '\n[ai]\nbinding = "AI"\n' : '';
  const d1 = backend ? '\n[[d1_databases]]\nbinding = "COMMENTS_DB"\ndatabase_name = "pageskill-comments"\ndatabase_id = "local"\nmigrations_dir = "migrations"\n' : '';
  await fs.writeFile(path.join(root, 'wrangler.toml'), `name = "pageskill-preview"\ncompatibility_date = "2026-09-14"\npages_build_output_dir = "dist/public"\n${aiBinding}${d1}`);
}

async function runWrangler(root: string, args: string[]): Promise<number> {
  const executable = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
  try { await fs.access(executable); } catch { throw new Error('Wrangler is missing; run npm install before using the Cloudflare Pages Runtime Adapter.'); }
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [executable, ...args], { cwd: root, shell: false, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('close', code => resolve(code ?? 1));
  });
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
  prepare: context => writeWranglerConfig(context.root, context.backend),
  build,
  applyLocalMigrations: async context => {
    if (!context.backend) return;
    const code = await runWrangler(context.root, ['d1', 'migrations', 'apply', 'pageskill-comments', '--local']);
    if (code !== 0) throw new Error(`Cloudflare D1 migrations exited with code ${code}`);
  },
  startPreview: context => {
    const executable = path.join(context.root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
    return spawn(process.execPath, [executable, 'pages', 'dev', context.outputDirectory, '--local', '--port', String(context.port)], {
      cwd: context.root,
      shell: false,
      stdio: 'inherit',
      windowsHide: true
    });
  }
};

export default adapter;
