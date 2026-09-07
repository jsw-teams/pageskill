import { classifyPublicUrl, publicPathFromUrl } from './lib/static-security.ts';

export type RouteContext<Environment = Record<string, unknown>, ExecutionContext = unknown> = {
  request: Request;
  url: URL;
  params: Readonly<Record<string, string>>;
  env: Environment;
  executionContext: ExecutionContext;
};

export type RouteHandler<Environment = Record<string, unknown>, ExecutionContext = unknown> = (
  context: RouteContext<Environment, ExecutionContext>
) => Response | Promise<Response>;

type Route<Environment, ExecutionContext> = {
  method: string;
  pattern: string;
  segments: string[];
  handler: RouteHandler<Environment, ExecutionContext>;
};

function pathSegments(pathname: string): string[] | null {
  try {
    return pathname.split('/').filter(Boolean).map(segment => decodeURIComponent(segment));
  } catch {
    return null;
  }
}

function match(pattern: string[], pathname: string[]): Record<string, string> | null {
  if (pattern.length !== pathname.length) return null;
  const params: Record<string, string> = {};
  for (let index = 0; index < pattern.length; index += 1) {
    const expected = pattern[index];
    const actual = pathname[index];
    if (expected.startsWith(':')) params[expected.slice(1)] = actual;
    else if (expected !== actual) return null;
  }
  return params;
}

export class Router<Environment = Record<string, unknown>, ExecutionContext = unknown> {
  readonly routes: Route<Environment, ExecutionContext>[] = [];

  on(method: string, pattern: string, handler: RouteHandler<Environment, ExecutionContext>): this {
    if (!pattern.startsWith('/')) throw new TypeError(`Route pattern must start with "/": ${pattern}`);
    if (typeof handler !== 'function') throw new TypeError('Route handler must be a function');
    const segments = pathSegments(new URL(pattern, 'https://pagekiln.invalid').pathname);
    if (!segments) throw new TypeError(`Route pattern is not valid: ${pattern}`);
    this.routes.push({ method: method.toUpperCase(), pattern, segments, handler });
    return this;
  }

  get(pattern: string, handler: RouteHandler<Environment, ExecutionContext>): this { return this.on('GET', pattern, handler); }
  post(pattern: string, handler: RouteHandler<Environment, ExecutionContext>): this { return this.on('POST', pattern, handler); }
  all(pattern: string, handler: RouteHandler<Environment, ExecutionContext>): this { return this.on('*', pattern, handler); }

  async match(request: Request, env: Environment, executionContext: ExecutionContext): Promise<Response | null> {
    const url = new URL(request.url);
    const segments = pathSegments(url.pathname);
    if (!segments) return new Response('Bad request', { status: 400 });
    const method = request.method.toUpperCase();
    for (const route of this.routes) {
      if (route.method !== '*' && route.method !== method && !(method === 'HEAD' && route.method === 'GET')) continue;
      const params = match(route.segments, segments);
      if (!params) continue;
      const response = await route.handler({ request, url, params, env, executionContext });
      if (!(response instanceof Response)) throw new TypeError(`Route ${route.method} ${route.pattern} did not return a Response`);
      return method === 'HEAD' ? new Response(null, response) : response;
    }
    return null;
  }
}

type AssetBinding = { fetch(request: Request): Response | Promise<Response> };

export type SiteFetchOptions<Environment = Record<string, unknown>, ExecutionContext = unknown> = {
  router?: Router<Environment, ExecutionContext>;
  defaultLocale?: string;
  staticDirectory?: string;
  assets?: (request: Request, env: Environment) => Response | Promise<Response>;
};

function publicAssetRequest(request: Request, staticDirectory = ''): Request | null {
  const pathname = publicPathFromUrl(request.url, { staticDirectory });
  if (!pathname) return null;
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, request);
}

function assetRequest(request: Request, defaultLocale: string, staticDirectory = ''): Request {
  const publicRequest = publicAssetRequest(request, staticDirectory) || request;
  const url = new URL(publicRequest.url);
  if (url.pathname === '/') url.pathname = '/index.html';
  else if (url.pathname.endsWith('/')) url.pathname += 'index.html';
  return new Request(url, publicRequest);
}

function assetRequests(request: Request, defaultLocale: string, staticDirectory = ''): Request[] {
  const publicRequest = publicAssetRequest(request, staticDirectory) || request;
  const standard = assetRequest(publicRequest, defaultLocale, staticDirectory);
  const original = new Request(publicRequest);
  // Pages' ASSETS binding owns directory-index and trailing-slash resolution.
  // Ask for the published URL first; translating `/` to `index.html` before
  // the binding sees it can turn Pages' canonical 308 into a self-redirect.
  const candidates = [original, standard];
  const normalizedStaticDirectory = String(staticDirectory).replace(/^\/+|\/+$/g, '');
  const standardPathname = new URL(standard.url).pathname;
  const staticPrefix = normalizedStaticDirectory ? `/${normalizedStaticDirectory}/` : '';
  if (normalizedStaticDirectory && !standardPathname.startsWith(staticPrefix)) {
    const staticUrl = new URL(standard.url);
    staticUrl.pathname = `/${normalizedStaticDirectory}${staticUrl.pathname}`;
    candidates.push(new Request(staticUrl, request));
  }
  const archivedUrl = new URL(standard.url);
  if (archivedUrl.pathname !== '/dist' && !archivedUrl.pathname.startsWith('/dist/')) archivedUrl.pathname = `/dist${archivedUrl.pathname}`;
  candidates.push(new Request(archivedUrl, request));
  const seen = new Set<string>();
  return candidates.filter(candidate => {
    const key = candidate.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isSelfRedirect(request: Request, response: Response): boolean {
  if (response.status < 300 || response.status >= 400) return false;
  const location = response.headers.get('location');
  if (!location) return false;
  try {
    const source = new URL(request.url);
    const target = new URL(location, source);
    return target.origin === source.origin && target.pathname === source.pathname && target.search === source.search;
  } catch {
    return false;
  }
}

export function createSiteFetchHandler<Environment = Record<string, unknown>, ExecutionContext = unknown>(
  options: SiteFetchOptions<Environment, ExecutionContext> = {}
) {
  const defaultLocale = options.defaultLocale || 'en';
  return async (request: Request, env: Environment, executionContext: ExecutionContext): Promise<Response> => {
    const dynamic = options.router ? await options.router.match(request, env, executionContext) : null;
    if (dynamic) return dynamic;
    const method = request.method.toUpperCase();
    const security = classifyPublicUrl(request.url, { staticDirectory: options.staticDirectory });
    if (!security.ok) {
      const status = security.reason === 'invalid' ? 400 : 404;
      const response = new Response(status === 400 ? 'Bad request' : 'Not found', {
        status,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
      });
      return method === 'HEAD' ? new Response(null, response) : response;
    }
    if (method !== 'GET' && method !== 'HEAD') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
      });
    }
    const explicitAssets = options.assets;
    if (explicitAssets) {
      const response = await explicitAssets(assetRequest(request, defaultLocale, options.staticDirectory), env);
      return method === 'HEAD' ? new Response(null, response) : response;
    }
    const binding = (env as Record<string, unknown> | undefined)?.ASSETS as AssetBinding | undefined;
    if (binding && typeof binding.fetch === 'function') {
      let response = new Response('Not found', { status: 404 });
      for (const candidate of assetRequests(request, defaultLocale, options.staticDirectory)) {
        response = await binding.fetch(candidate);
        if (isSelfRedirect(request, response)) {
          response = new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
          continue;
        }
        if (response.status !== 404) return method === 'HEAD' ? new Response(null, response) : response;
      }
      return method === 'HEAD' ? new Response(null, response) : response;
    }
    const response = new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
    return method === 'HEAD' ? new Response(null, response) : response;
  };
}
