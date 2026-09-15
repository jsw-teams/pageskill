import assert from 'node:assert/strict';
import test from 'node:test';
import cloudflarePages from '../src/runtime/runtime-adapters/cloudflare-pages.js';

test('Cloudflare adapter leaves host bindings and migrations outside Pageskill', () => {
  assert.equal(cloudflarePages.prepare, undefined);
  assert.equal(cloudflarePages.applyLocalMigrations, undefined);
  assert.equal(typeof cloudflarePages.build, 'function');
  assert.equal(typeof cloudflarePages.startPreview, 'function');
});
