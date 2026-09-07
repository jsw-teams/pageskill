import test from 'node:test';
import assert from 'node:assert/strict';
import { Router, createSiteFetchHandler } from '../src/fetch-router.ts';

test('Fetch router matches methods and decoded parameters', async () => {
  const router = new Router();
  router.get('/api/items/:id', ({ params }) => Response.json({ id: params.id }));
  const response = await router.match(new Request('https://example.test/api/items/a%20b'), {}, {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: 'a b' });
  assert.equal(await router.match(new Request('https://example.test/api/items/a', { method: 'POST' }), {}, {}), null);
});

test('shared site handler runs dynamic routes and delegates static assets', async () => {
  const router = new Router();
  router.get('/api/health', () => new Response('ok'));
  const fetched = [];
  const handler = createSiteFetchHandler({
    router,
    defaultLocale: 'en',
    assets(request) { fetched.push(new URL(request.url).pathname); return new Response('asset'); }
  });
  assert.equal(await (await handler(new Request('https://example.test/api/health'), {}, {})).text(), 'ok');
  assert.equal(await (await handler(new Request('https://example.test/'), {}, {})).text(), 'asset');
  assert.deepEqual(fetched, ['/index.html']);
});

test('site handler falls back to the archive dist asset prefix', async () => {
  const requested = [];
  const handler = createSiteFetchHandler({ defaultLocale: 'en' });
  const response = await handler(new Request('https://example.test/'), {
    ASSETS: {
      fetch(request) {
        const pathname = new URL(request.url).pathname;
        requested.push(pathname);
        return pathname === '/dist/index.html' ? new Response('asset') : new Response('missing', { status: 404 });
      }
    }
  }, {});
  assert.equal(await response.text(), 'asset');
  assert.deepEqual(requested, ['/', '/index.html', '/dist/index.html']);
});

test('site handler checks the configured static asset directory', async () => {
  const requested = [];
  const handler = createSiteFetchHandler({ defaultLocale: 'en', staticDirectory: 'static' });
  const response = await handler(new Request('https://example.test/'), {
    ASSETS: {
      fetch(request) {
        const pathname = new URL(request.url).pathname;
        requested.push(pathname);
        return pathname === '/static/index.html' ? new Response('asset') : new Response('missing', { status: 404 });
      }
    }
  }, {});
  assert.equal(await response.text(), 'asset');
  assert.deepEqual(requested, ['/', '/index.html', '/static/index.html']);
});

test('static aliases are stripped before public asset lookup', async () => {
  const requested = [];
  const handler = createSiteFetchHandler({ defaultLocale: 'en', staticDirectory: 'static' });
  const env = {
    ASSETS: {
      fetch(request) {
        const pathname = new URL(request.url).pathname;
        requested.push(pathname);
        return pathname === '/index.html' ? new Response('asset') : new Response('missing', { status: 404 });
      }
    }
  };
  const distResponse = await handler(new Request('https://example.test/dist/'), env, {});
  assert.equal(await distResponse.text(), 'asset');
  const staticResponse = await handler(new Request('https://example.test/static/'), env, {});
  assert.equal(await staticResponse.text(), 'asset');
  assert.deepEqual(requested, ['/', '/index.html', '/', '/index.html']);
});

test('site handler skips a Pages self-redirect and continues to an asset candidate', async () => {
  const requested = [];
  const handler = createSiteFetchHandler({ defaultLocale: 'en' });
  const response = await handler(new Request('https://example.test/'), {
    ASSETS: {
      fetch(request) {
        const pathname = new URL(request.url).pathname;
        requested.push(pathname);
        if (pathname === '/') return new Response(null, { status: 308, headers: { location: '/' } });
        return pathname === '/index.html' ? new Response('asset') : new Response('missing', { status: 404 });
      }
    }
  }, {});
  assert.equal(await response.text(), 'asset');
  assert.deepEqual(requested, ['/', '/index.html']);
});

test('site handler never returns a same-path asset redirect when no candidate exists', async () => {
  const handler = createSiteFetchHandler({ defaultLocale: 'en' });
  const response = await handler(new Request('https://example.test/missing/'), {
    ASSETS: { fetch: () => new Response(null, { status: 308, headers: { location: '/missing/' } }) }
  }, {});
  assert.equal(response.status, 404);
});

test('static fallback exposes only GET and HEAD, while dynamic routes run first', async () => {
  const router = new Router();
  router.post('/server/health', () => new Response('dynamic'));
  const requested = [];
  const handler = createSiteFetchHandler({
    router,
    assets(request) { requested.push(new URL(request.url).pathname); return new Response('asset'); }
  });

  assert.equal(await (await handler(new Request('https://example.test/server/health', { method: 'POST' }), {}, {})).text(), 'dynamic');
  assert.equal((await handler(new Request('https://example.test/assets/app.js', { method: 'POST' }), {}, {})).status, 405);
  const head = await handler(new Request('https://example.test/assets/app.js', { method: 'HEAD' }), {}, {});
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.deepEqual(requested, ['/assets/app.js']);
});

test('static fallback rejects private roots and encoded traversal before asset lookup', async () => {
  const requested = [];
  const handler = createSiteFetchHandler({
    staticDirectory: 'static',
    assets(request) { requested.push(new URL(request.url).pathname); return new Response('asset'); }
  });
  for (const pathname of [
    '/server/index.js',
    '/_pagekiln/backend/handler.js',
    '/.pagekiln/catalog.json',
    '/dist/server/index.js',
    '/static/_pagekiln/backend/handler.js',
    '/dist/static/server/index.js',
    '/%2e%2e/server/index.js',
    '/assets/%2fsecret.js',
    '/assets/%5csecret.js',
    '/assets/app.js:secret',
    '/assets/server./index.js'
  ]) {
    const response = await handler(new Request(`https://example.test${pathname}`), {}, {});
    assert.notEqual(response.status, 200, pathname);
  }
  const privateHead = await handler(new Request('https://example.test/_pagekiln/backend/handler.js', { method: 'HEAD' }), {}, {});
  assert.equal(privateHead.status, 404);
  assert.equal(await privateHead.text(), '');
  assert.deepEqual(requested, []);
});
