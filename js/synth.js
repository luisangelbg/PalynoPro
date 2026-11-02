/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — simulated micrographs (Synth).
   Pictures of pollen grains drawn from numbers, in the manner of a secondary
   electron image: a dark mount, a body (corpus) shaded brighter towards its
   edge, a reticulum of cells with bright walls, spines (echinae) on the
   outline and on the face, noise, and the caption of the instrument with a
   scale bar of known length. Every picture carries the truth it was drawn
   from (corpus axes, number and height of the spines that stand on the
   outline, reticulum mesh), so the engines can be checked against it. They
   are NOT measurements of any real plant. Seeded: the same seed draws the
   same picture. */
(function () {
  'use strict';
  const S = {};
  const TAU = 2 * Math.PI;

  function rng(seed) {
    let a = (seed >>> 0) ^ 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = 0xdeadbeef;
    const next = () => {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
    for (let i = 0; i < 12; i++) next();
    return next;
  }
  const gauss = r => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r()); };
  S.rng = rng;

  /* the caption: a white bar of `barPx` and blocks that stand for its letters */
  function caption(img, barPx, r) {
    const { w, h, data } = img, y = Math.round(h * 0.915), th = Math.max(3, Math.round(h * 0.005));
    const x0 = Math.round(w * 0.44);
    for (let yy = y; yy < y + th; yy++) for (let x = x0; x < x0 + barPx && x < w; x++) data[yy * w + x] = 255;
    const ty = Math.round(h * 0.94), tH = Math.max(6, Math.round(h * 0.03));
    [[0.07, 0.07], [0.19, 0.12], [x0 / w + barPx / w / 2 - 0.035, 0.07], [0.68, 0.1]].forEach(([fx, fw]) => {
      const xa = Math.round(w * fx), xb = Math.round(w * (fx + fw));
      for (let x = xa; x < xb; x += Math.max(4, Math.round(w * 0.012))) {
        const gw = Math.max(2, Math.round(w * 0.006)), gh = tH * (0.6 + 0.4 * r());
        for (let yy = ty; yy < ty + gh && yy < h; yy++) for (let xx = x; xx < x + gw && xx < w; xx++) data[yy * w + xx] = 250;
      }
    });
  }

  /* One grain on a picture.
     g: { cx, cy (px), a, b (corpus semi-axes, µm), rot (rad), spines (number on
     the outline), hUm (spine height), baseUm (base width), face (spines on the
     face), mesh (reticulum cell, µm), wall (wall, fraction of a cell),
     collapsed (fold depth 0–1) } */
  function drawGrain(img, umPerPx, g, r, truth) {
    const { w, h, data } = img;
    const A = g.a / umPerPx, B = g.b / umPerPx, cs = Math.cos(g.rot || 0), sn = Math.sin(g.rot || 0);
    const cell = Math.max(3, (g.mesh || 2.5) / umPerPx), wall = g.wall || 0.18;
    /* the outline of the corpus in polar form, with a fold if collapsed */
    const fold = g.collapsed || 0, foldAng = r() * TAU;
    const cr = Math.cos(g.rot || 0), sr = Math.sin(g.rot || 0), cf = Math.cos(foldAng), sf = Math.sin(foldAng);
    /* radius of the corpus in the direction (ux, uy), a unit vector: no trigonometry inside the loop */
    const rcu = (ux, uy) => {
      const x = ux * cr + uy * sr, y = -ux * sr + uy * cr;
      let rr = 1 / Math.sqrt((x * x) / (A * A) + (y * y) / (B * B));
      if (fold > 0) { const d = ux * cf + uy * sf; if (d > 0.55) rr *= 1 - fold * Math.pow((d - 0.55) / 0.45, 1.6); }
      return rr;
    };
    const rc = th => rcu(Math.cos(th), Math.sin(th));
    /* spines on the outline: angles evenly spread with a jitter */
    const n = g.spines || 0, sp = [];
    const off = r() * TAU;
    for (let k = 0; k < n; k++) sp.push({ th: off + (k + (r() - 0.5) * 0.45) * TAU / n, h: Math.max(0.2, g.hUm * (1 + 0.15 * gauss(r))) / umPerPx, b: (g.baseUm || 2.5) / umPerPx });
    /* reticulum: jittered seeds on a grid, in a typed array */
    const R0 = Math.max(A, B) * 1.02 + (g.hUm || 0) / umPerPx * 1.6 + 4;
    const G = Math.ceil(R0 / 0.35 / cell) + 2, side = 2 * G + 1, seedArr = new Float32Array(side * side * 2);
    const seedR = rng((g.seed || 7) * 7919 + 13);
    for (let j = -G; j <= G; j++) for (let i = -G; i <= G; i++) { const k = 2 * ((j + G) * side + (i + G)); seedArr[k] = (i + seedR()) * cell; seedArr[k + 1] = (j + seedR()) * cell; }
    const x0 = Math.max(0, Math.floor(g.cx - R0)), x1 = Math.min(w - 1, Math.ceil(g.cx + R0));
    const y0 = Math.max(0, Math.floor(g.cy - R0)), y1 = Math.min(h - 1, Math.ceil(g.cy + R0));
    sp.forEach(s => { s.base = rc(s.th); s.half = (s.b / 2) / s.base; });
    const maxH = sp.reduce((m, s) => Math.max(m, s.h), 0);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x - g.cx, dy = y - g.cy, d = Math.sqrt(dx * dx + dy * dy) || 1e-9, ux = dx / d, uy = dy / d, R = rcu(ux, uy);
      if (d > R + maxH + 2) continue;
      let v = -1;
      if (d <= R) {
        const z = Math.sqrt(Math.max(0, 1 - (d / R) * (d / R))), st = 0.35 + 0.65 * z;
        const sx = (dx * cs + dy * sn) / st, sy = (-dx * sn + dy * cs) / st;
        const ci = Math.floor(sx / cell), cj = Math.floor(sy / cell);
        let d1 = Infinity, d2 = Infinity;
        for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
          if (i < -G || i > G || j < -G || j > G) continue;
          const k = 2 * ((j + G) * side + (i + G)), dd = Math.hypot(sx - seedArr[k], sy - seedArr[k + 1]);
          if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd;
        }
        const onWall = (d2 - d1) < wall * cell;
        v = 92 + 70 * (1 - z) + (onWall ? 48 : -6) - (fold > 0 && ux * cf + uy * sf > 0.6 ? 25 * fold : 0);
      }
      /* spines on the outline: triangles standing on it (only near the outline) */
      if (d >= R - 2) for (const s of sp) {
        const th = Math.atan2(dy, dx), dth = Math.atan2(Math.sin(th - s.th), Math.cos(th - s.th));
        if (Math.abs(dth) > s.half * 1.2) continue;
        const along = d - s.base;
        if (along < -2 || along > s.h) continue;
        const lim = s.half * (1 - Math.max(0, along) / s.h);
        if (Math.abs(dth) <= lim) v = Math.max(v, 170 + 60 * (along / s.h));
      }
      if (v >= 0) data[y * w + x] = Math.max(0, Math.min(255, Math.round(v)));
    }
    /* spines on the face: bright cones seen from above, stamped */
    for (let k = 0; k < (g.face || 0); k++) {
      const t = r() * TAU, q = Math.sqrt(r()) * 0.85, rad = (0.35 + 0.4 * r()) * (g.baseUm || 2.5) / umPerPx;
      const fx = g.cx + Math.cos(t) * q * A * cs - Math.sin(t) * q * B * sn, fy = g.cy + Math.cos(t) * q * A * sn + Math.sin(t) * q * B * cs;
      for (let y = Math.max(0, Math.floor(fy - rad)); y <= Math.min(h - 1, Math.ceil(fy + rad)); y++) for (let x = Math.max(0, Math.floor(fx - rad)); x <= Math.min(w - 1, Math.ceil(fx + rad)); x++) {
        const dd = Math.hypot(x - fx, y - fy);
        if (dd < rad) data[y * w + x] = Math.max(data[y * w + x], Math.round(215 - 60 * dd / rad));
      }
    }
    if (truth) truth.push({ cx: g.cx, cy: g.cy, a: g.a, b: g.b, spines: n, spineHeights: sp.map(s => s.h * umPerPx), meanHeightUm: sp.length ? sp.reduce((t, s) => t + s.h, 0) / sp.length * umPerPx : NaN, collapsed: fold, mesh: g.mesh, touches: (g.cx - R0 < 0 || g.cy - R0 < 0 || g.cx + R0 > w || g.cy + R0 > h) });
  }

  function background(w, h, r, level) {
    const data = new Uint8Array(w * h), L = level == null ? 38 : level;
    for (let i = 0; i < w * h; i++) data[i] = L;
    /* a crack in the mount, as in many preparations */
    let x = r() * w, y = 0;
    const dir = r() < 0.5 ? 1 : -1;
    while (y < h) { for (let t = -1; t <= 1; t++) { const xx = Math.round(x) + t; if (xx >= 0 && xx < w) data[Math.floor(y) * w + xx] = 10; } y += 1; x += dir * (0.3 + 0.4 * Math.sin(y / 40)); }
    return { w, h, data };
  }
  function noise(img, r, sd) { const { data } = img, k = sd * 2; for (let i = 0; i < data.length; i++) data[i] = Math.max(0, Math.min(255, Math.round(data[i] + k * (r() + r() + r() - 1.5)))); }

  /* a micrograph of one grain at magnification `mag`, saved `w` px wide
     (field: 128 mm / mag). → { img, mag, umPerPx, truth: [grain], barUm } */
  S.single = function (o) {
    o = Object.assign({ w: 1280, h: 960, mag: 1000, seed: 1, a: 32, b: 32, rot: 0, spines: 26, hUm: 2.2, baseUm: 2.6, face: 30, mesh: 2.4, wall: 0.2, noise: 7 }, o || {});
    const r = rng(o.seed), umPerPx = 128000 / (o.mag * o.w);
    const img = background(o.w, o.h, r);
    const truth = [];
    drawGrain(img, umPerPx, Object.assign({}, o, { cx: o.w * (0.47 + 0.06 * r()), cy: o.h * (0.44 + 0.04 * r()), seed: o.seed }), r, truth);
    const barUm = [1, 2, 5, 10, 20, 50, 100, 200, 500].find(v => v / umPerPx >= o.w * 0.06) || 10;
    noise(img, r, o.noise);
    caption(img, Math.round(barUm / umPerPx), r);
    return { img, mag: o.mag, umPerPx, truth, barUm, barPx: Math.round(barUm / umPerPx) };
  };

  /* an overview with many grains; a fraction of them collapsed */
  S.field = function (o) {
    o = Object.assign({ w: 1280, h: 960, mag: 150, seed: 11, n: 14, collapsedFrac: 0.3, a: 32, spines: 26, hUm: 2.2, mesh: 2.4 }, o || {});
    const r = rng(o.seed), umPerPx = 128000 / (o.mag * o.w);
    const img = background(o.w, o.h, r);
    const truth = [], placed = [];
    const R = o.a / umPerPx * 1.25;
    let tries = 0;
    while (placed.length < o.n && tries++ < 4000) {
      const cx = R * 0.6 + r() * (o.w - 1.2 * R), cy = R * 0.6 + r() * (o.h * 0.86 - 1.2 * R);
      if (placed.some(p => Math.hypot(p[0] - cx, p[1] - cy) < 2.4 * R)) continue;
      placed.push([cx, cy]);
      const col = r() < o.collapsedFrac;
      const a = o.a * (0.9 + 0.2 * r()), b = col ? a * (0.55 + 0.15 * r()) : a * (0.93 + 0.07 * r());
      drawGrain(img, umPerPx, { cx, cy, a, b, rot: r() * TAU, spines: o.spines, hUm: o.hUm, baseUm: 2.6, face: 10, mesh: o.mesh, wall: 0.2, collapsed: col ? 0.5 + 0.3 * r() : 0, seed: placed.length + o.seed * 31 }, r, truth);
    }
    const barUm = [10, 20, 50, 100, 200, 500].find(v => v / umPerPx >= o.w * 0.06) || 100;
    noise(img, r, 6);
    caption(img, Math.round(barUm / umPerPx), r);
    return { img, mag: o.mag, umPerPx, truth, barUm, barPx: Math.round(barUm / umPerPx) };
  };

  /* The example set: three simulated morphotypes that differ in size, in the
     number and height of their spines and in the mesh of the reticulum. Each
     has grains photographed twice (two images, one grain), an overview and a
     detail. → [{ name, group, groupName, grain, mag, make() }] */
  S.GROUPS = [
    { code: 'A', es: 'Morfotipo A (simulado)', en: 'Morphotype A (simulated)', a: 31, ab: 0.97, spines: 24, hUm: 2.0, mesh: 2.2, collapsed: 0.15 },
    { code: 'B', es: 'Morfotipo B (simulado)', en: 'Morphotype B (simulated)', a: 35, ab: 0.95, spines: 32, hUm: 2.8, mesh: 2.6, collapsed: 0.35 },
    { code: 'C', es: 'Morfotipo C (simulado)', en: 'Morphotype C (simulated)', a: 33, ab: 0.90, spines: 22, hUm: 1.7, mesh: 3.4, collapsed: 0.1 },
  ];
  S.exampleList = function (perGroup) {
    const n = perGroup || 8, out = [];
    S.GROUPS.forEach((G, gi) => {
      for (let k = 1; k <= n; k++) {
        const seed = 1000 * (gi + 1) + k, r = rng(seed);
        const p = { a: G.a * (1 + 0.05 * gauss(r)), spines: Math.max(8, Math.round(G.spines * (1 + 0.1 * gauss(r)))), hUm: G.hUm * (1 + 0.1 * gauss(r)), mesh: G.mesh * (1 + 0.08 * gauss(r)), rot: r() * TAU };
        p.b = p.a * G.ab * (1 + 0.02 * gauss(r));
        const grain = String(k).padStart(2, '0');
        /* makeAt(W): the same scene drawn W px wide (same field), for a quick preview */
        const mk = (suffix, w, mag, s) => ({ name: grain + suffix + '_' + G.code + '.png', group: G.code, groupName: [G.es, G.en], grain, mag, w,
          makeAt: W => S.single(Object.assign({ w: W, h: W * 3 / 4, mag, seed: s }, p, { seed: s, face: 25 })),
          make: () => S.single(Object.assign({ w, h: w * 3 / 4, mag, seed: s }, p, { seed: s, face: 25 })) });
        out.push(mk('', 1280, 1000, seed));
        if (k % 3 === 0) out.push(mk('a', 1280, 1000, seed + 500));
      }
      const field = W => S.field({ w: W, h: W * 3 / 4, seed: 77 + gi, mag: 150, a: G.a, spines: G.spines, hUm: G.hUm, mesh: G.mesh, collapsedFrac: G.collapsed, n: 14 });
      out.push({ name: '90_' + G.code + '.png', group: G.code, groupName: [G.es, G.en], grain: '90', mag: 150, w: 1280, overview: true, makeAt: field, make: () => field(1280) });
    });
    return out;
  };

  window.Synth = S;
})();
