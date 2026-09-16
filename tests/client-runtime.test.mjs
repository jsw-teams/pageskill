import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const components = path.join(root, 'themes', 'default', 'components');

async function scriptsUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await scriptsUnder(target));
    else if (entry.name === 'script.js') files.push(target);
  }
  return files;
}

test('browser Components export mount functions for the generated Client Runtime', async () => {
  const files = await scriptsUnder(components);
  assert.ok(files.length >= 6);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.match(source, /export function mount\(/, path.relative(root, file));
    assert.doesNotMatch(source, /window\.ComponentClient|DOMContentLoaded/, path.relative(root, file));
  }
});

test('database and model work remain behind a named configured API boundary', async () => {
  const clientRuntime = await readFile(path.join(root, 'src', 'compiler.ts'), 'utf8');
  const commentsDefinition = await readFile(path.join(components, 'comments', 'index.ts'), 'utf8');
  const comments = await readFile(path.join(components, 'comments', 'script.js'), 'utf8');
  const browserSource = `${clientRuntime}\n${comments}`;
  assert.match(comments, /runtime\.apiJson\(/);
  assert.match(commentsDefinition, /api: 'comments'/);
  assert.match(clientRuntime, /apiDefinitions/);
  assert.match(clientRuntime, /apiTarget/);
  assert.match(clientRuntime, /assetJson/);
  assert.match(clientRuntime, /if \(component\.api\)/);
  assert.doesNotMatch(clientRuntime, /component\.mode/);
  assert.match(clientRuntime, /target\.origin !== base\.origin/);
  assert.match(clientRuntime, /headers\.set\('authorization', 'Bearer '/);
  assert.match(clientRuntime, /x-api-key/);
  assert.match(clientRuntime, /assets\/pageskill\/client\.js/);
  assert.doesNotMatch(comments, /\/api\/comments|data-api/);
  assert.doesNotMatch(browserSource, /COMMENTS_DB|D1Database|TRANSLATION_MODEL|\.AI\.run|SELECT\s|INSERT\s|UPDATE\s+comment_translations/i);
});
