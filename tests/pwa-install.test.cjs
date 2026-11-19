// SPDX-License-Identifier: GPL-3.0-or-later
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function setup() {
  const window = new EventTarget();
  const button = new EventTarget();
  button.hidden = true;
  const errors = [];
  vm.runInNewContext(readFileSync('pwa-install.js', 'utf8'), {
    window,
    document: { getElementById: () => button },
    console: { error: (...args) => errors.push(args) },
  });
  return { window, button, errors };
}

function offer(window, prompt) {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = prompt;
  window.dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
}

test('el botón utiliza cada oferta una sola vez y vuelve a aparecer con una nueva', async () => {
  const { window, button } = setup();
  let calls = 0;
  assert.equal(button.hidden, true);
  offer(window, async () => { calls++; });
  assert.equal(button.hidden, false);
  button.dispatchEvent(new Event('click'));
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(button.hidden, true);
  button.dispatchEvent(new Event('click'));
  assert.equal(calls, 1);
  offer(window, async () => { calls++; });
  assert.equal(button.hidden, false);
  window.dispatchEvent(new Event('appinstalled'));
  assert.equal(button.hidden, true);
  button.dispatchEvent(new Event('click'));
  assert.equal(calls, 1);
});

test('informa si falla el diálogo y espera otra oferta', async () => {
  const { window, button, errors } = setup();
  offer(window, async () => { throw new Error('fallo'); });
  button.dispatchEvent(new Event('click'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(button.hidden, true);
  assert.equal(errors.length, 1);
  offer(window, async () => {});
  assert.equal(button.hidden, false);
});
