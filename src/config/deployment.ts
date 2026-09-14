import { safeRelativePath } from './paths.ts';

/** Optional runtime selection. The Core compiler remains useful without one. */
export type ResolvedDeploymentConfig = {
  adapter?: string;
  enabled: boolean;
  staticDirectory: 'public';
  publicDirectory: 'public';
  backend: boolean;
};

function objectOrEmpty(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

/** Validate the platform-neutral runtime selection without naming a host. */
export function validateDeploymentConfig(config: Record<string, any>, source = 'config.yml'): void {
  if (Object.prototype.hasOwnProperty.call(config, 'deployment')) {
    throw new Error(`${source}: deployment was removed; configure an optional runtime adapter under runtime.adapter`);
  }
  const runtime = config.runtime;
  if (runtime === undefined || runtime === null) return;
  if (!runtime || typeof runtime !== 'object' || Array.isArray(runtime)) throw new Error(`${source}: runtime must be a mapping`);
  const value = objectOrEmpty(runtime);
  for (const key of Object.keys(value)) if (!['adapter', 'backend', 'staticDirectory'].includes(key)) {
    throw new Error(`${source}: runtime.${key} is not supported; runtime adapters own platform-specific options`);
  }
  if (value.adapter !== undefined && (typeof value.adapter !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value.adapter))) {
    throw new Error(`${source}: runtime.adapter must be a safe adapter id`);
  }
  if (value.backend !== undefined && typeof value.backend !== 'boolean') throw new Error(`${source}: runtime.backend must be boolean`);
  if (value.staticDirectory !== undefined && value.staticDirectory !== 'public') throw new Error(`${source}: runtime.staticDirectory is fixed to "public"`);
}

export function resolveDeploymentConfig(config: Record<string, any>): ResolvedDeploymentConfig {
  validateDeploymentConfig(config);
  const runtime = objectOrEmpty(config.runtime);
  const adapter = typeof runtime.adapter === 'string' && runtime.adapter ? runtime.adapter : undefined;
  return {
    ...(adapter ? { adapter } : {}),
    enabled: Boolean(adapter),
    staticDirectory: 'public',
    publicDirectory: 'public',
    backend: Boolean(adapter && runtime.backend !== false)
  };
}

export function normalizeStaticDirectory(config: Record<string, any>, source = 'config.yml'): 'public' {
  const value = objectOrEmpty(config.runtime).staticDirectory;
  if (value !== undefined && value !== 'public') throw new Error(`${source}: runtime.staticDirectory is fixed to "public"`);
  safeRelativePath('public', `${source}: runtime.staticDirectory`);
  return 'public';
}
