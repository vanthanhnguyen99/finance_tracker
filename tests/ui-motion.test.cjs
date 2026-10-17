const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./load-ts.cjs');
const { cssTimeToMilliseconds } = createLoader()('lib/ui-motion.ts');

test('route timing survives production CSS normalization from milliseconds to seconds', () => {
  for (const [source, optimized, expected] of [['220ms', '.22s', 220], ['280ms', '.28s', 280], ['140ms', '.14s', 140]]) {
    assert.equal(cssTimeToMilliseconds(source), expected);
    assert.equal(cssTimeToMilliseconds(optimized), expected);
  }
  assert.equal(cssTimeToMilliseconds(' 0s '), 0);
  assert.equal(cssTimeToMilliseconds('0ms'), 0);
  assert.equal(cssTimeToMilliseconds(''), 0);
});
