import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = await fs.realpath(process.cwd());
const target = path.resolve(root, 'src', 'runtime');
if (target !== path.join(root, 'src', 'runtime') || !target.startsWith(`${root}${path.sep}`)) {
  throw new Error('Refusing to clean an unexpected runtime output path.');
}
await fs.rm(target, { recursive: true, force: true });
