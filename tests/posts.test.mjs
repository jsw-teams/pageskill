import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateContentMetrics } from '../src/runtime/lib/content-metrics.js';
import { parseIsoTimestamp } from '../src/runtime/lib/content-dates.js';
import { documentSchemaDiagnostics, loadDocument } from '../src/runtime/compiler/documents.js';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('content metrics count CJK characters and language words without Markdown noise', () => {
  const english = calculateContentMetrics('Hello, world! This is a test.');
  assert.deepEqual(english, { words: 6, cjkCharacters: 0, totalUnits: 6, readingMinutes: 1 });

  const simplified = calculateContentMetrics('这是一个测试。');
  assert.deepEqual(simplified, { words: 0, cjkCharacters: 6, totalUnits: 6, readingMinutes: 1 });

  const traditional = calculateContentMetrics('繁體中文');
  assert.equal(traditional.cjkCharacters, 4);
  assert.equal(traditional.words, 0);

  const mixed = calculateContentMetrics('中文 and English');
  assert.deepEqual(mixed, { words: 2, cjkCharacters: 2, totalUnits: 4, readingMinutes: 1 });

  const fence = String.fromCharCode(96).repeat(3);
  const inline = String.fromCharCode(96);
  const withCode = calculateContentMetrics('Visible words.\n\n' + fence + 'js\nconst veryLongIdentifier = true;\n' + fence + '\n\n' + inline + 'inline code' + inline + ' [label](https://example.com) https://example.com');
  assert.equal(withCode.words, 3);
  assert.equal(withCode.cjkCharacters, 0);
  assert.equal(withCode.totalUnits, 3);
});

test('Japanese and Korean scripts count as CJK reading characters', () => {
  const metrics = calculateContentMetrics('日本語テスト 한국어');
  assert.equal(metrics.cjkCharacters, 9);
  assert.equal(metrics.words, 0);
});

test('reading time uses configured rates and never displays zero', () => {
  assert.equal(calculateContentMetrics('', { wordsPerMinute: 2, cjkCharactersPerMinute: 2 }).readingMinutes, 1);
  const large = calculateContentMetrics('one two three four five', { wordsPerMinute: 2, cjkCharactersPerMinute: 2 });
  assert.deepEqual(large, { words: 5, cjkCharacters: 0, totalUnits: 5, readingMinutes: 3 });
  assert.equal(calculateContentMetrics('中文', { wordsPerMinute: 220, cjkCharactersPerMinute: 2 }).readingMinutes, 1);
  assert.equal(calculateContentMetrics('中文中', { wordsPerMinute: 220, cjkCharactersPerMinute: 2 }).readingMinutes, 2);
});

test('update dates accept strict ISO dates or timezone datetimes only', () => {
  assert.notEqual(parseIsoTimestamp('2026-09-12'), undefined);
  assert.notEqual(parseIsoTimestamp('2026-09-12T14:30+08:00'), undefined);
  assert.notEqual(parseIsoTimestamp('2026-09-12T14:30:00Z'), undefined);
  assert.equal(parseIsoTimestamp('2026-02-30'), undefined);
  assert.equal(parseIsoTimestamp('yesterday'), undefined);
  assert.equal(parseIsoTimestamp('2026-09-12T14:30'), undefined);
  assert.ok(parseIsoTimestamp('2026-09-12') < parseIsoTimestamp('2026-09-13'));
});

test('post update validation runs during document checks and rejects invalid order', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'pageskill-post-validation-'));
  try {
    const file = path.join(root, 'content', 'posts', 'invalid', 'en.md');
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, '---\ntitle: Invalid\ndate: 2026-09-20\nupdate: yesterday\n---\nBody\n', 'utf8');
    const config = {
      defaultLocale: 'en',
      activeLocales: ['en'],
      content: { collections: { posts: { contentType: 'post', schema: { date: 'string', update: 'string' } } } }
    };
    const invalid = await loadDocument(root, file, config);
    assert.match(documentSchemaDiagnostics(config, invalid).join('\n'), /update.*valid ISO/);

    await writeFile(file, '---\ntitle: Invalid order\ndate: 2026-09-20\nupdate: 2026-09-12\n---\nBody\n', 'utf8');
    const invalidOrder = await loadDocument(root, file, config);
    assert.match(documentSchemaDiagnostics(config, invalidOrder).join('\n'), /update.*earlier than.*date/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
