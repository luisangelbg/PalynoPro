/* PalynoPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán. Free software under the GNU GPL v3 or later; see LICENSE. */
/* The harness of the automatic tests. The same test files run in the page
   tests/index.html (double click) and, without a browser, with
   `node tests/run_node.js`. Every line must come out right. */
(function () {
  'use strict';
  const HAS_DOM = typeof document !== 'undefined' && !!document.body && typeof document.createElement === 'function';
  const out = HAS_DOM ? document.getElementById('out') : null;
  const R = { pass: 0, fail: 0, failed: [], section: '', async: [] };
  const safe = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function line(cls, html) { if (!out) return; const d = document.createElement('div'); d.className = cls; d.innerHTML = html; out.appendChild(d); }
  function sec(title) { R.section = title; if (out) { const h = document.createElement('h2'); h.textContent = title; out.appendChild(h); } }
  function t(name, cond, info) {
    const ok = !!cond;
    if (ok) R.pass++; else { R.fail++; R.failed.push(R.section + ' · ' + name + (info != null ? '  →  ' + info : '')); }
    line('t ' + (ok ? 'ok' : 'bad'), (ok ? '✔ ' : '✘ ') + safe(name) + (info != null && !ok ? '  →  ' + safe(info) : ''));
    return ok;
  }
  /* a and b agree within an absolute tolerance */
  function near(name, a, b, tol) {
    tol = tol == null ? 1e-9 : tol;
    const d = Math.abs(a - b);
    return t(name + '  (' + (typeof a === 'number' ? +a.toPrecision(10) : a) + ' ≈ ' + b + ')', d <= tol || (Number.isNaN(a) && Number.isNaN(b)), 'dif ' + d);
  }
  /* a and b agree within a relative tolerance */
  function rel(name, a, b, tol) {
    tol = tol == null ? 1e-9 : tol;
    const d = Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
    return t(name + '  (' + (typeof a === 'number' ? +a.toPrecision(10) : a) + ' ≈ ' + b + ')', d <= tol, 'dif. rel. ' + d);
  }
  /* every pair of a list agrees: one line for the whole list */
  function all(name, pairs, tol) {
    let worst = 0, where = '';
    pairs.forEach((p, i) => { const d = Math.abs(p[0] - p[1]); if (!(d <= worst)) { worst = d; where = p[2] != null ? p[2] : i; } });
    return t(name + '  (' + pairs.length + ')', worst <= (tol == null ? 0 : tol), 'peor diferencia ' + worst + ' en ' + where);
  }
  /* asynchronous test files register their promise here */
  /* every test file runs in turn (later(async () => {…})), so its lines and sections stay in order */
  let chain = Promise.resolve();
  const later = fn => { chain = chain.then(fn).catch(e => t("error inesperado", false, e && e.stack || e)); R.async.push(chain); return chain; };
  Object.assign(window, { HAS_DOM, TESTS: R, sec, t, near, rel, all, later });
})();
