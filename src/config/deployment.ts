import { safeRelativePath } from './paths.ts';

export const DEPLOYMENT_TARGET_LABELS: Record<string, string> = {
  'cloudflare-pages': 'Cloudflare Pages',
  'cloudflare-workers': 'Cloudflare Workers',
  'github-pages': 'GitHub Pages',
  vps: 'VPS',
  'openai-sites': 'OpenAI Sites'
};

export type ResolvedDeploymentConfig = {
  enabled: boolean;
  staticDirectory: string;
  publicDirectory: string;
  backend: boolean;
  targets: string[];
  cloudflare: Record<string, any>;
  github: Record<string, any>;
  vps: Record<string, any>;
  openaiSites: Record<string, any>;
};

function objectOrEmpty(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

export function normalizeDeploymentTarget(value: unknown, source = 'config.yml: deployment.targets'): string {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(DEPLOYMENT_TARGET_LABELS, raw)) throw new Error(`${source} contains unsupported target "${String(value)}"; use one of ${Object.keys(DEPLOYMENT_TARGET_LABELS).join(', ')}`);
  return raw;
}

export function normalizeStaticDirectory(config: Record<string, any>, source = 'config.yml'): string {
  const deployment = objectOrEmpty(config.deployment);
  const value = deployment.staticDirectory;
  if (value === undefined || value === null || value === '') return 'public';
  const label = `${source}: deployment.staticDirectory`;
  if (typeof value !== 'string') throw new Error(`${label} must be a relative path`);
  const normalized = safeRelativePath(value, label, { rejectDoubleDot: true });
  if (!normalized) throw new Error(`${label} must be a non-empty relative path`);
  if (normalized.toLowerCase() === 'dist') throw new Error(`${label} cannot use the private dist bundle root; choose "public" or another public subdirectory`);
  const first = normalized.split('/')[0].toLowerCase();
  if (new Set(['server', '_pageskill', '.pageskill', 'assets']).has(first)) throw new Error(`${label} cannot use reserved public directory "${normalized}"`);
  return normalized;
}

export function resolveDeploymentConfig(config: Record<string, any>): ResolvedDeploymentConfig {
  const deployment = objectOrEmpty(config.deployment);
  const cloudflare = objectOrEmpty(deployment.cloudflare);
  const workers = objectOrEmpty(cloudflare.workers);
  const openaiSitesValue = deployment.openaiSites;
  const enabled = deployment.enabled !== false;
  if (deployment.targets !== undefined && deployment.targets !== null && !Array.isArray(deployment.targets)) {
    throw new Error('config.yml: deployment.targets must be an array of canonical target names');
  }
  if (openaiSitesValue && typeof openaiSitesValue === 'object' && !Array.isArray(openaiSitesValue) && Object.prototype.hasOwnProperty.call(openaiSitesValue, 'staticDirectory')) {
    throw new Error('config.yml: deployment.openaiSites.staticDirectory was removed; use deployment.staticDirectory');
  }
  if (Object.prototype.hasOwnProperty.call(deployment, 'dynamicRoutes')) {
    throw new Error('config.yml: deployment.dynamicRoutes was removed; register runtime paths with backend/handler.ts');
  }
  const targetsRaw = Array.isArray(deployment.targets) ? deployment.targets : [];
  const targets = [...new Set(targetsRaw.filter(value => value !== undefined && value !== null && String(value).trim()).map(value => normalizeDeploymentTarget(value)))];
  const publicDirectory = enabled ? normalizeStaticDirectory(config) : '';
  return {
    enabled,
    staticDirectory: publicDirectory,
    publicDirectory,
    backend: enabled && deployment.backend !== false,
    targets,
    // These are stable command defaults, not site-instance data, so ordinary
    // sites do not need to repeat provider boilerplate.
    cloudflare: {
      apiTokenEnv: 'CLOUDFLARE_API_TOKEN',
      ...cloudflare,
      workers: { name: 'pageskill-site', compatibilityDate: '2026-08-10', ...workers }
    },
    github: { tokenEnv: 'GITHUB_TOKEN', ...objectOrEmpty(deployment.github) },
    vps: { port: 22, ...objectOrEmpty(deployment.vps) },
    openaiSites: objectOrEmpty(openaiSitesValue)
  };
}
