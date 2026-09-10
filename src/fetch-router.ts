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

/** A public discovery link emitted by the renderer and attached by the runtime. */
export type SiteDiscoveryLink = {
  href: string;
  rel: string;
  type?: string;
};

/** Runtime switches generated from config.yml and the actual public outputs. */
export type SiteDiscoveryOptions = {
  links?: SiteDiscoveryLink[];
  markdown?: boolean;
  contentTypes?: Record<string, string>;
  contentSignal?: string;
};

export type SiteFetchOptions<Environment = Record<string, unknown>, ExecutionContext = unknown> = {
  router?: Router<Environment, ExecutionContext>;
  defaultLocale?: string;
  staticDirectory?: string;
  assets?: (request: Request, env: Environment) => Response | Promise<Response>;
  discovery?: SiteDiscoveryOptions;
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

/** Return the generated Markdown mirror for a document route when one exists. */
function markdownAssetRequest(request: Request, staticDirectory = ''): Request | null {
  const publicRequest = publicAssetRequest(request, staticDirectory) || request;
  const url = new URL(publicRequest.url);
  const pathname = url.pathname;
  // Machine-readable endpoints and non-HTML assets must keep their original
  // representation even when a client sends a broad Accept header.
  if (pathname.startsWith('/.well-known/') || /\.(?:css|gif|ico|jpe?g|js|json|mjs|png|svg|txt|webmanifest|webp|woff2?|xml)$/i.test(pathname)) return null;
  if (pathname === '/') url.pathname = '/index.md';
  else if (pathname.endsWith('/')) url.pathname = `${pathname.slice(0, -1)}.md`;
  else if (/\.html$/i.test(pathname)) url.pathname = pathname.replace(/\.html$/i, '.md');
  else url.pathname = `${pathname}.md`;
  return new Request(url, publicRequest);
}

function acceptsMarkdown(request: Request): boolean {
  const accept = request.headers.get('accept') || '';
  return accept.split(',').some(value => {
    const [media, ...parameters] = value.trim().toLowerCase().split(';');
    if (media !== 'text/markdown') return false;
    const quality = parameters.find(parameter => parameter.trim().startsWith('q='));
    return quality ? Number(quality.trim().slice(2)) > 0 : true;
  });
}

function wantsMarkdown(request: Request, options: { discovery?: SiteDiscoveryOptions }): boolean {
  return options.discovery?.markdown === true && acceptsMarkdown(request);
}

function assetRequests(request: Request, defaultLocale: string, staticDirectory = '', markdown = false): Request[] {
  const publicRequest = publicAssetRequest(request, staticDirectory) || request;
  const standard = assetRequest(publicRequest, defaultLocale, staticDirectory);
  const original = new Request(publicRequest);
  // Pages' ASSETS binding owns directory-index and trailing-slash resolution.
  // Ask for the published URL first; translating `/` to `index.html` before
  // the binding sees it can turn Pages' canonical 308 into a self-redirect.
  const preferredMarkdown = markdown ? markdownAssetRequest(publicRequest, staticDirectory) : null;
  const candidates = preferredMarkdown ? [preferredMarkdown, original, standard] : [original, standard];
  const normalizedStaticDirectory = String(staticDirectory).replace(/^\/+|\/+$/g, '');
  const preferredPathname = preferredMarkdown ? new URL(preferredMarkdown.url).pathname : new URL(standard.url).pathname;
  const staticPrefix = normalizedStaticDirectory ? `/${normalizedStaticDirectory}/` : '';
  if (normalizedStaticDirectory && !preferredPathname.startsWith(staticPrefix)) {
    const staticUrl = new URL(preferredMarkdown?.url || standard.url);
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

function isBackendNamespace(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}

function notFoundResponse(method: string): Response {
  const response = new Response('Not found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
  });
  return method === 'HEAD' ? new Response(null, response) : response;
}

function appendVary(headers: Headers, value: string) {
  const values = (headers.get('vary') || '').split(',').map(entry => entry.trim()).filter(Boolean);
  if (!values.some(entry => entry.toLocaleLowerCase() === value.toLocaleLowerCase())) values.push(value);
  headers.set('vary', values.join(', '));
}

/** Reject header values that could break the generated RFC 8288 field. */
function validLinkPart(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value) && !/[\u0000-\u001f<>"\\]/.test(value);
}

/** Serialize renderer-owned discovery links into one Link response header. */
function discoveryLinkHeader(links: SiteDiscoveryLink[] = []): string {
  return links.filter(link => validLinkPart(link.href) && validLinkPart(link.rel) && (!link.type || validLinkPart(link.type)))
    .map(link => `<${link.href}>; rel="${link.rel}"${link.type ? `; type="${link.type}"` : ''}`).join(', ');
}

/** Add generated discovery metadata without replacing headers from a handler. */
function withDiscoveryHeaders(response: Response, options: SiteDiscoveryOptions | undefined, request: Request, negotiatedMarkdown = false): Response {
  if (!options) return response;
  const headers = new Headers(response.headers);
  const link = discoveryLinkHeader(options.links);
  if (link) headers.append('link', link);
  if (options.contentSignal) headers.set('content-signal', options.contentSignal);
  if (options.markdown === true && !request.url.includes('/.well-known/')) appendVary(headers, 'Accept');
  if (negotiatedMarkdown) {
    headers.set('content-type', 'text/markdown; charset=utf-8');
    headers.delete('content-encoding');
    headers.delete('content-range');
    headers.delete('transfer-encoding');
  }
  const pathname = new URL(request.url).pathname;
  const configuredType = options.contentTypes?.[pathname];
  if (configuredType && response.status >= 200 && response.status < 300) headers.set('content-type', configuredType);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function createSiteFetchHandler<Environment = Record<string, unknown>, ExecutionContext = unknown>(
  options: SiteFetchOptions<Environment, ExecutionContext> = {}
) {
  const defaultLocale = options.defaultLocale || 'en';
  return async (request: Request, env: Environment, executionContext: ExecutionContext): Promise<Response> => {
    const dynamic = options.router ? await options.router.match(request, env, executionContext) : null;
    if (dynamic) return withDiscoveryHeaders(dynamic, options.discovery, request);
    const method = request.method.toUpperCase();
    const security = classifyPublicUrl(request.url, { staticDirectory: options.staticDirectory });
    if (!security.ok) {
      const status = security.reason === 'invalid' ? 400 : 404;
      const response = new Response(status === 400 ? 'Bad request' : 'Not found', {
        status,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
      });
      return withDiscoveryHeaders(method === 'HEAD' ? new Response(null, response) : response, options.discovery, request);
    }
    // `/api` is the reserved same-origin backend namespace. Once Router.match
    // returns null, never let an accidentally similarly named static file
    // answer the request. Other paths may still fall through to assets.
    if (isBackendNamespace(security.pathname)) return withDiscoveryHeaders(notFoundResponse(method), options.discovery, request);
    if (method !== 'GET' && method !== 'HEAD') {
      return withDiscoveryHeaders(new Response('Method not allowed', {
        status: 405,
        headers: { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
      }), options.discovery, request);
    }
    const explicitAssets = options.assets;
    if (explicitAssets) {
      const markdown = wantsMarkdown(request, options);
      let response: Response | undefined;
      if (markdown) {
        const candidate = markdownAssetRequest(request, options.staticDirectory);
        if (candidate) {
          const preferred = await explicitAssets(candidate, env);
          if (preferred.status !== 404) response = preferred;
        }
      }
      response ||= await explicitAssets(assetRequest(request, defaultLocale, options.staticDirectory), env);
      const headResponse = method === 'HEAD' ? new Response(null, response) : response;
      return withDiscoveryHeaders(headResponse, options.discovery, request, Boolean(markdown && response.status >= 200 && response.status < 300 && response.headers.get('content-type')?.toLocaleLowerCase().startsWith('text/markdown')));
    }
    const binding = (env as Record<string, unknown> | undefined)?.ASSETS as AssetBinding | undefined;
    if (binding && typeof binding.fetch === 'function') {
      let response = new Response('Not found', { status: 404 });
      const markdown = wantsMarkdown(request, options);
      for (const candidate of assetRequests(request, defaultLocale, options.staticDirectory, markdown)) {
        response = await binding.fetch(candidate);
        if (isSelfRedirect(request, response)) {
          response = new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
          continue;
        }
        if (response.status !== 404) {
          const negotiated = Boolean(markdown && new URL(candidate.url).pathname.endsWith('.md') && response.status >= 200 && response.status < 300);
          return withDiscoveryHeaders(method === 'HEAD' ? new Response(null, response) : response, options.discovery, request, negotiated);
        }
      }
      return withDiscoveryHeaders(method === 'HEAD' ? new Response(null, response) : response, options.discovery, request);
    }
    return withDiscoveryHeaders(notFoundResponse(method), options.discovery, request);
  };
}
