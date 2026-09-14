import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

class FakeD1 {
  constructor(comment) {
    this.comments = new Map([[comment.id, { ...comment }]]);
    this.translations = new Map();
  }

  prepare(query) {
    return new FakeStatement(this, query);
  }
}

class FakeStatement {
  constructor(database, query) {
    this.database = database;
    this.query = query;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    if (this.query.includes('FROM comment_translations')) {
      const [commentId, targetLocale, sourceHash, version] = this.values;
      return this.database.translations.get(`${commentId}:${targetLocale}:${sourceHash}:${version}`) || null;
    }
    if (this.query.includes('FROM comments WHERE id')) {
      return this.database.comments.get(this.values[0]) || null;
    }
    return null;
  }

  async all() {
    if (this.query.includes('FROM comments WHERE content_key')) {
      const [contentKey] = this.values;
      return { results: [...this.database.comments.values()].filter(comment => comment.content_key === contentKey) };
    }
    return { results: [] };
  }

  async run() {
    if (this.query.includes('INSERT INTO comment_translations')) {
      const [commentId, targetLocale, sourceHash, version, claimId, timestamp] = this.values;
      const key = `${commentId}:${targetLocale}:${sourceHash}:${version}`;
      if (!this.database.translations.has(key)) this.database.translations.set(key, {
        comment_id: commentId,
        target_locale: targetLocale,
        source_hash: sourceHash,
        translation_version: version,
        translated_body: '',
        status: 'pending',
        claim_id: claimId,
        model: '',
        created_at: timestamp,
        updated_at: timestamp
      });
      return {};
    }
    if (this.query.includes('UPDATE comment_translations SET translated_body')) {
      const [translatedBody, model, timestamp, commentId, targetLocale, sourceHash, version, claimId] = this.values;
      const key = `${commentId}:${targetLocale}:${sourceHash}:${version}`;
      const row = this.database.translations.get(key);
      if (row && row.claim_id === claimId) Object.assign(row, { translated_body: translatedBody, model, status: 'ready', updated_at: timestamp });
      return {};
    }
    if (this.query.includes('UPDATE comment_translations SET status')) {
      const [timestamp, commentId, targetLocale, sourceHash, version, claimId] = this.values;
      const key = `${commentId}:${targetLocale}:${sourceHash}:${version}`;
      const row = this.database.translations.get(key);
      if (row && row.claim_id === claimId) Object.assign(row, { status: 'failed', updated_at: timestamp });
      return {};
    }
    return {};
  }
}

test('Comments translation uses content identity, persistent L2, and one AI call per source hash', async () => {
  const module = await import(pathToFileURL(path.join(root, '.pageskill', 'backend-runtime', 'backend', 'handler.js')).href);
  const comment = {
    id: 'comment-1',
    content_key: 'posts:first',
    author_name: 'Reader',
    body: 'same source comment',
    source_locale: 'en',
    status: 'visible',
    created_at: '2026-09-15T00:00:00.000Z'
  };
  const database = new FakeD1(comment);
  let aiCalls = 0;
  const env = {
    COMMENTS_DB: database,
    AI: { run: async () => { aiCalls += 1; await new Promise(resolve => setTimeout(resolve, 15)); return { response: 'translated comment' }; } },
    PAGESKILL_SITE: { activeLocales: ['en', 'zh-tw'], contentKeys: ['posts:first', 'posts:second', 'releases:v4'] }
  };
  const request = () => new Request('https://example.com/api/comments/comment-1/translate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ targetLocale: 'zh-tw' })
  });

  const responses = await Promise.all(Array.from({ length: 20 }, () => module.router.match(request(), env, undefined)));
  assert.equal(responses.every(response => response?.status === 200), true);
  assert.equal(aiCalls, 1);
  assert.equal((await responses[0].json()).body, 'translated comment');

  database.comments.get('comment-1').body = 'changed source comment';
  const changed = await module.router.match(request(), env, undefined);
  assert.equal(changed?.status, 200);
  assert.equal((await changed.json()).body, 'translated comment');
  assert.equal(aiCalls, 2);
  assert.equal(database.translations.size, 2);
});

test('Comments capability discovery reflects bindings and accepts arbitrary generated content identities', async () => {
  const module = await import(pathToFileURL(path.join(root, '.pageskill', 'backend-runtime', 'backend', 'handler.js')).href);
  const env = { PAGESKILL_SITE: { activeLocales: ['en'], contentKeys: ['posts:first', 'posts:second', 'releases:v4'] } };
  const response = await module.router.match(new Request('https://example.com/api/comments/capabilities'), env, undefined);
  assert.deepEqual(await response.json(), { comments: false, translation: false });
});
