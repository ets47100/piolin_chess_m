// SPDX-License-Identifier: GPL-3.0-or-later
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function setup() {
  const window = new EventTarget();
  window.matchMedia = () => ({ matches: false });
  const elements = new Map(['install-dialog', 'install-status', 'install-app', 'install-native', 'install-shortcut']
    .map(id => [id, new EventTarget()]));
  elements.get('install-dialog').showModal = function () { this.open = true; };
  vm.runInNewContext(readFileSync('pwa-install.js', 'utf8'), {
    window, document: { getElementById: id => elements.get(id) }, navigator: {},
  });
  return {
    window,
    click: id => elements.get(id).dispatchEvent(new Event('click')),
    status: () => elements.get('install-status').textContent,
    dialog: elements.get('install-dialog'),
  };
}

function offer(window, prompt) {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = prompt;
  window.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
}

test('el menú permanece disponible y el diálogo nativo usa cada oferta una vez', async () => {
  const { window, click, dialog, status } = setup();
  click('install-app');
  assert.ok(dialog.open);
  click('install-shortcut');
  assert.match(status(), /Crear acceso directo/);
  click('install-native');
  assert.match(status(), /menú del navegador/);
  let calls = 0;
  offer(window, async () => { calls++; });
  click('install-native');
  click('install-native');
  assert.equal(calls, 1);
  window.dispatchEvent(new Event('appinstalled'));
  click('install-native');
  assert.match(status(), /ya está instalado/);
});

test('si falla el diálogo ofrece el menú del navegador', async () => {
  const { window, click, status } = setup();
  offer(window, async () => { throw new Error('fallo'); });
  click('install-native');
  await new Promise(resolve => setImmediate(resolve));
  assert.match(status(), /menú del navegador/);
});
