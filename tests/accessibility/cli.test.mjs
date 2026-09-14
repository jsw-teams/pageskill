import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../..', import.meta.url));
const cli = path.join(root, 'src', 'bin', 'pageskill.mjs');

function run(...args) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
  return { ...result, output: `${result.stdout || ''}${result.stderr || ''}` };
}

test('CLI exposes only the supported generate and preview commands', () => {
  const help = run('--help');
  assert.equal(help.status, 0);
  assert.match(help.output, /Usage: pageskill <g\|s>/);
  assert.doesNotMatch(help.output, /pageskill d|dry-run/);
  for (const command of ['d', 'deploy', 'check', 'a11y']) {
    const result = run(command);
    assert.notEqual(result.status, 0);
    assert.match(result.output, /Unknown command/);
  }
});
