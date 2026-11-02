/* PalynoPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán. Free software under the GNU GPL v3 or later; see LICENSE. */
/* Runs the automatic tests without a browser:  node tests/run_node.js
   It loads the same files, in the same order, as tests/index.html, on a
   document that does nothing; the tests that need a real page say so and are
   skipped here. The files to load are read from tests/index.html itself, so
   the two lists cannot drift apart. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const here = __dirname;
const noop = () => {};
globalThis.window = globalThis;
globalThis.document = { addEventListener: noop, dispatchEvent: noop, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], documentElement: { lang: 'es', setAttribute: noop, getAttribute: () => null }, body: null };
globalThis.atob = s => Buffer.from(s, 'base64').toString('binary');
globalThis.localStorage = { getItem: () => null, setItem: noop };
globalThis.CustomEvent = function (type, init) { this.type = type; this.detail = init && init.detail; };
const page = fs.readFileSync(path.join(here, 'index.html'), 'utf8');
const files = [...page.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
files.forEach(f => vm.runInThisContext(fs.readFileSync(path.join(here, f), 'utf8'), { filename: f }));
(async () => {
const R = globalThis.TESTS;
await Promise.all(R.async);
R.failed.forEach(f => console.log('✘ ' + f));
console.log((R.fail ? R.fail + ' fallan de ' : '') + (R.pass + R.fail) + ' pruebas' + (R.fail ? '' : ', todas pasan') + ' (sin las que necesitan página)');
process.exit(R.fail ? 1 : 0);
})();
