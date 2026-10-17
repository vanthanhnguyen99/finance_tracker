const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createLoader } = require('./load-ts.cjs');
const { parseAppearance, parseTransparency, THEME_BOOTSTRAP_SCRIPT } = createLoader()('lib/theme.ts');

test('untrusted or missing theme cookies resolve to system preferences', () => {
  for (const value of [undefined, '', 'LIGHT', '<script>', 'unknown']) {
    assert.equal(parseAppearance(value), 'system');
    assert.equal(parseTransparency(value), 'system');
  }
  assert.equal(parseAppearance('dark'), 'dark');
  assert.equal(parseAppearance('light'), 'light');
  assert.equal(parseTransparency('reduced'), 'reduced');
  assert.equal(parseTransparency('standard'), 'standard');
});

test('the pre-paint script is standalone and honors theme, transparency and high contrast', () => {
  for (const appearance of ['light', 'dark', 'system']) {
    for (const transparency of ['standard', 'reduced', 'system']) {
      for (const osDark of [false, true]) {
        for (const highContrast of [false, true]) {
          const dataset = { appearance, transparencyPreference: transparency, visualStyle: 'glass' };
          let chromeColor;
          const context = { document: { documentElement: { dataset }, querySelector: () => ({ setAttribute: (_, value) => { chromeColor = value; } }) }, matchMedia: query => ({ matches: query.includes('color-scheme') ? osDark : query.includes('contrast') ? highContrast : true }) };
          vm.runInNewContext(THEME_BOOTSTRAP_SCRIPT, context);
          const dark = appearance === 'dark' || (appearance === 'system' && osDark);
          assert.equal(dataset.colorMode, dark ? 'dark' : 'light');
          assert.equal(dataset.transparency, highContrast || transparency !== 'standard' ? 'reduced' : 'standard');
          assert.equal(chromeColor, dark ? '#101622' : '#F4F6FB');
        }
      }
    }
  }
});
