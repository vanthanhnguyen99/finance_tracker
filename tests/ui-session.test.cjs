const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./load-ts.cjs');

function fixture(t, blocked = false) {
  const previous = Object.getOwnPropertyDescriptor(global, 'sessionStorage');
  const storage = {};
  Object.defineProperties(storage, {
    getItem: { value: key => { if (blocked) throw new Error('blocked'); return storage[key] ?? null; } },
    setItem: { value: (key, value) => { if (blocked) throw new Error('blocked'); storage[key] = String(value); } },
    removeItem: { value: key => { delete storage[key]; } }
  });
  Object.defineProperty(global, 'sessionStorage', { configurable: true, value: storage });
  t.after(() => { if (previous) Object.defineProperty(global, 'sessionStorage', previous); else delete global.sessionStorage; });
  return { storage, ui: createLoader()('lib/ui-session.ts') };
}

test('UI session preserves raw decimal input and scopes drafts by account', t => {
  const { ui } = fixture(t);
  ui.activateUiUser('alice'); ui.writeUiSession('alice', 'drafts', { amount: '12,34', note: 'private' });
  assert.deepEqual(ui.readUiSession('alice', 'drafts', null), { amount: '12,34', note: 'private' });
  assert.equal(ui.readUiSession('bob', 'drafts', null), null);
});
test('switching accounts clears previous persisted drafts and navigation metadata', t => {
  const { ui, storage } = fixture(t);
  ui.activateUiUser('alice'); ui.writeUiSession('alice', 'drafts', { note: 'private' });
  ui.writeUiSession('alice', 'history-href', '/history?q=private'); ui.activateUiUser('bob');
  assert.equal(ui.readUiSession('alice', 'drafts', null), null);
  assert.equal(Object.keys(storage).some(key => key.includes(':alice:')), false);
});
test('a late save response cannot restore private drafts after logout or account switch', t => {
  const { ui, storage } = fixture(t);
  ui.activateUiUser('alice'); ui.clearUiSession();
  ui.writeUiSession('alice', 'drafts', { note: 'late response' });
  assert.deepEqual(Object.keys(storage), []);
  ui.activateUiUser('bob'); ui.writeUiSession('alice', 'drafts', { note: 'late response' });
  assert.equal(ui.readUiSession('alice', 'drafts', null), null);
});
test('blocked storage retains drafts in memory and still clears them on logout', t => {
  const { ui } = fixture(t, true);
  ui.activateUiUser('alice'); ui.writeUiSession('alice', 'drafts', { amount: '45,67' });
  assert.deepEqual(ui.readUiSession('alice', 'drafts', null), { amount: '45,67' });
  ui.clearUiSession(); assert.equal(ui.readUiSession('alice', 'drafts', null), null);
});
test('malformed persisted UI state falls back safely without losing the memory copy', t => {
  const { ui, storage } = fixture(t);
  ui.activateUiUser('alice'); ui.writeUiSession('alice', 'drafts', { amount: '12,34' });
  storage['finance-ui:v1:alice:drafts'] = '{broken';
  assert.deepEqual(ui.readUiSession('alice', 'drafts', null), { amount: '12,34' });
  storage['finance-ui:v1:alice:unknown'] = '{broken';
  assert.equal(ui.readUiSession('alice', 'unknown', null), null);
});
