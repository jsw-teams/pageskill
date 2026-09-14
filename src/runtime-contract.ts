/** Platform-neutral server contracts used by optional Components. */

export type CacheSetOptions = {
  /** Maximum lifetime in seconds. A missing value means adapter default. */
  ttlSeconds?: number;
  /** Absolute expiry in milliseconds, useful when a runtime already has one. */
  expiresAt?: number;
};

export interface CacheProvider {
  get<T = unknown>(key: string): Promise<T | null> | T | null;
  set<T = unknown>(key: string, value: T, options?: CacheSetOptions): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  /** Invalidate an exact key or a glob containing `*`. */
  invalidate(pattern: string): Promise<void> | void;
}

export interface StorageProvider {
  get<T = unknown>(key: string): Promise<T | null> | T | null;
  put<T = unknown>(key: string, value: T): Promise<void> | void;
  delete(key: string): Promise<void> | void;
}

export interface AIProvider {
  generate(input: { system?: string; prompt: string; metadata?: Record<string, string> }): Promise<string>;
}

export type FunctionContext<Environment = unknown> = {
  request: Request;
  url: URL;
  params: Record<string, string>;
  env: Environment;
  executionContext?: { waitUntil?: (promise: Promise<unknown>) => void };
  storage?: StorageProvider;
  cache?: CacheProvider;
  ai?: AIProvider;
};

export type ServerFunction<Environment = unknown> = (context: FunctionContext<Environment>) => Response | Promise<Response>;

export type RuntimeAdapter<Environment = unknown> = {
  id: string;
  createContext?: (request: Request, environment: Environment, params?: Record<string, string>) => FunctionContext<Environment> | Promise<FunctionContext<Environment>>;
  handle?: ServerFunction<Environment>;
};

/** Build and local-preview hooks owned by a platform Runtime Adapter. */
export type RuntimeBuildContext = {
  root: string;
  outputDirectory: string;
  backendRuntimeDirectory: string;
  backend: boolean;
  defaultLocale: string;
  activeLocales: string[];
  contentKeys: string[];
  discovery: Record<string, unknown>;
  writeOutput: (relative: string, data: string | Uint8Array) => Promise<void>;
};

export type RuntimePrepareContext = Pick<RuntimeBuildContext, 'root' | 'outputDirectory' | 'backend'>;

export type RuntimeBuildAdapter = {
  id: string;
  prepare?: (context: RuntimePrepareContext) => Promise<void> | void;
  build?: (context: RuntimeBuildContext) => Promise<void> | void;
  applyLocalMigrations?: (context: Pick<RuntimeBuildContext, 'root' | 'backend'>) => Promise<void> | void;
  startPreview?: (context: Pick<RuntimeBuildContext, 'root' | 'outputDirectory' | 'backend'> & { port: number }) => Promise<unknown> | unknown;
};

type MemoryEntry = { value: unknown; expiresAt?: number };

/** Small deterministic adapter for local development and tests. */
export class MemoryCacheProvider implements CacheProvider {
  private readonly entries = new Map<string, MemoryEntry>();

  get<T = unknown>(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T = unknown>(key: string, value: T, options: CacheSetOptions = {}): void {
    const ttl = Number(options.ttlSeconds);
    const expiresAt = options.expiresAt !== undefined
      ? Number(options.expiresAt)
      : Number.isFinite(ttl) && ttl >= 0 ? Date.now() + ttl * 1000 : undefined;
    this.entries.set(key, { value, ...(expiresAt !== undefined ? { expiresAt } : {}) });
  }

  delete(key: string): void { this.entries.delete(key); }

  invalidate(pattern: string): void {
    const expression = new RegExp(`^${String(pattern).split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
    for (const key of this.entries.keys()) if (expression.test(key)) this.entries.delete(key);
  }

  clear(): void { this.entries.clear(); }
}

/** Coalesce concurrent work for one logical cache identity. */
export class SingleFlight {
  private readonly pending = new Map<string, Promise<unknown>>();

  run<T>(key: string, work: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) return existing as Promise<T>;
    const promise = Promise.resolve().then(work);
    this.pending.set(key, promise);
    void promise.finally(() => {
      if (this.pending.get(key) === promise) this.pending.delete(key);
    }).catch(() => {});
    return promise;
  }
}
