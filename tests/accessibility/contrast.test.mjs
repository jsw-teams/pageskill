import assert from 'node:assert/strict';
import test from 'node:test';
import { contrastRatio, parseColor } from '../../src/runtime/accessibility/contrast.js';

test('contrast helpers calculate WCAG relative luminance ratios', () => {
  assert.deepEqual(parseColor('#fff'), [1, 1, 1]);
  assert.deepEqual(parseColor('rgb(0, 128, 255)'), [0, 128 / 255, 1]);
  assert.equal(contrastRatio('#000', '#fff'), 21);
  assert.ok((contrastRatio('#244b3d', '#faf8f3') || 0) >= 4.5);
});
