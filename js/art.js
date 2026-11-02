/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — pictures (Art). Drawn from numbers, in SVG, with the colors of
   the theme: the logo, the scene of the home page and the vignettes of the
   blocks. Nothing here is a photograph. */
(function () {
  'use strict';
  const TAU = 2 * Math.PI, r1 = v => Math.round(v * 10) / 10;
  function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  let seq = 0;

  /* an echinate grain: spines around a disc */
  function spiky(cx, cy, R, n, h, base, phase) {
    let d = '';
    for (let k = 0; k < n; k++) {
      const a = phase + k * TAU / n, da = base / R / 2;
      const p1 = [cx + R * Math.cos(a - da), cy + R * Math.sin(a - da)], p2 = [cx + (R + h) * Math.cos(a), cy + (R + h) * Math.sin(a)], p3 = [cx + R * Math.cos(a + da), cy + R * Math.sin(a + da)];
      d += `M${r1(p1[0])} ${r1(p1[1])}L${r1(p2[0])} ${r1(p2[1])}L${r1(p3[0])} ${r1(p3[1])}Z`;
    }
    return d;
  }
  /* cells of a reticulum inside a circle: a jittered lattice, each cell a polygon */
  function reticulum(cx, cy, R, cell, seed) {
    const r = rnd(seed), pts = [];
    for (let y = -R; y <= R; y += cell) for (let x = -R; x <= R; x += cell) {
      const px = x + (r() - 0.5) * cell * 0.7, py = y + (r() - 0.5) * cell * 0.7;
      if (px * px + py * py < (R * 0.97) * (R * 0.97)) pts.push([px, py]);
    }
    let d = '';
    pts.forEach(p => {
      const dist = Math.hypot(p[0], p[1]) / R, z = Math.sqrt(Math.max(0, 1 - dist * dist));
      const s = cell * 0.36 * (0.45 + 0.55 * z), ang = Math.atan2(p[1], p[0]);
      const sides = 5 + Math.floor(r() * 2);
      let poly = '';
      for (let k = 0; k < sides; k++) {
        const t = k * TAU / sides + r() * 0.4;
        const ex = Math.cos(t) * s, ey = Math.sin(t) * s * (0.55 + 0.45 * z);
        const x = cx + p[0] + ex * Math.cos(ang) - ey * Math.sin(ang), y = cy + p[1] + ex * Math.sin(ang) + ey * Math.cos(ang);
        poly += (k ? 'L' : 'M') + r1(x) + ' ' + r1(y);
      }
      d += poly + 'Z';
    });
    return d;
  }

  const A = {};
  A.logo = function (size) {
    const id = 'pplg' + (++seq), s = size || 30;
    return `<svg viewBox="0 0 32 32" width="${s}" height="${s}" aria-hidden="true"><defs><radialGradient id="${id}" cx="40%" cy="36%" r="70%"><stop offset="0" stop-color="var(--primary-dark)"/><stop offset="1" stop-color="var(--primary)"/></radialGradient></defs>` +
      `<path d="${spiky(16, 16, 10.2, 14, 4.6, 2.6, 0.12)}" fill="var(--accent)"/><circle cx="16" cy="16" r="10.6" fill="url(#${id})"/>` +
      `<path d="${reticulum(16, 16, 10.2, 3.4, 5)}" fill="var(--card-bg)" opacity=".42"/><circle cx="12.8" cy="12.2" r="2.4" fill="#fff" opacity=".35"/></svg>`;
  };

  /* the scene of the home page: a grain as an electron microscope shows it,
     turning slowly, with the measures the app takes laid over it */
  A.hero = function () {
    const id = 'pph' + (++seq), W = 560, H = 420, cx = 268, cy = 205, R = 138;
    const spikes = spiky(cx, cy, R - 2, 34, 22, 15, 0.05);
    const ret = reticulum(cx, cy, R - 6, 15, 11);
    /* face spines: bright cones seen from above */
    const r = rnd(21);
    let face = '';
    for (let k = 0; k < 46; k++) {
      const t = r() * TAU, q = Math.sqrt(r()) * 0.86, x = cx + Math.cos(t) * q * R, y = cy + Math.sin(t) * q * R, z = Math.sqrt(1 - q * q), s = 3 + 4 * z;
      face += `<circle class="glint" style="animation-delay:${(r() * 3.6).toFixed(2)}s" cx="${r1(x)}" cy="${r1(y)}" r="${r1(s)}" fill="url(#${id}sp)"/>`;
    }
    /* the corpus outline and two calipers, as the app measures them */
    const corpus = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--primary)" stroke-width="2" stroke-dasharray="6 5"/>`;
    const fy = cy + R + 34;
    const caliper = `<g class="art-pri-s" stroke-width="1.6"><path d="M${cx - R} ${cy + 12}V${fy + 6}M${cx + R} ${cy + 12}V${fy + 6}"/><path d="M${cx - R} ${fy}H${cx + R}" marker-start="url(#${id}ar)" marker-end="url(#${id}ar)"/></g>` +
      `<text class="art-txt" x="${cx}" y="${fy - 6}" text-anchor="middle" font-size="13" font-weight="700">70.6 µm</text>`;
    const tips = [0.05, 0.05 + 3 * TAU / 34, 0.05 + 7 * TAU / 34, 0.05 + 12 * TAU / 34, 0.05 + 30 * TAU / 34].map(a => `<circle class="pulse" cx="${r1(cx + (R + 20) * Math.cos(a))}" cy="${r1(cy + (R + 20) * Math.sin(a))}" r="7" fill="none" stroke="var(--accent)" stroke-width="2"/><circle cx="${r1(cx + (R + 20) * Math.cos(a))}" cy="${r1(cy + (R + 20) * Math.sin(a))}" r="2.8" fill="var(--accent)"/>`).join('');
    const bar = `<g><rect x="40" y="38" width="120" height="5" rx="1" class="art-hi"/><text x="100" y="62" text-anchor="middle" font-size="12" class="art-hi" font-family="system-ui,sans-serif">20 µm</text></g>`;
    return `<svg class="hero-grain" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="${id}b" cx="38%" cy="32%" r="78%"><stop offset="0" stop-color="#7d8790"/><stop offset=".62" stop-color="#9aa4ad"/><stop offset=".9" stop-color="#d7dde2"/><stop offset="1" stop-color="#eef2f4"/></radialGradient>
        <radialGradient id="${id}sp" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#b9c2c9"/></radialGradient>
        <linearGradient id="${id}bm" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity="0"/><stop offset=".5" stop-color="var(--primary)" stop-opacity=".55"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient>
        <radialGradient id="${id}bg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#2a3036"/><stop offset="1" stop-color="#0d1013"/></radialGradient>
        <clipPath id="${id}c"><rect x="16" y="14" width="${W - 32}" height="${H - 28}" rx="18"/></clipPath>
        <marker id="${id}ar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="var(--primary)"/></marker>
      </defs>
      <rect x="16" y="14" width="${W - 32}" height="${H - 28}" rx="18" fill="url(#${id}bg)"/>
      <g clip-path="url(#${id}c)">
        <path d="M30 90 C 120 120, 160 70, 250 30" stroke="#06080a" stroke-width="3" fill="none" opacity=".8"/>
        <path d="M400 410 C 430 330, 500 300, 560 270" stroke="#06080a" stroke-width="3" fill="none" opacity=".8"/>
        <g class="turn"><path d="${spikes}" fill="#c9d1d7"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${id}b)"/><path d="${ret}" fill="#3a4047" opacity=".72"/>${face}${tips}</g>
        <rect class="beam" x="16" y="${cy - R - 40}" width="${W - 32}" height="26" fill="url(#${id}bm)"/>
        ${bar}
      </g>
      ${corpus}${caliper}
    </svg>`;
  };

  /* vignettes of the blocks */
  A.card = function (n) {
    const id = 'ppc' + (++seq);
    const frame = inner => `<svg viewBox="0 0 220 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
    const grain = (cx, cy, R, n, h) => `<path d="${spiky(cx, cy, R - 1, n, h, R * 0.22, 0.1)}" class="art-mid"/><circle cx="${cx}" cy="${cy}" r="${R}" class="art-sem"/><path d="${reticulum(cx, cy, R - 2, Math.max(4, R / 5), cx + cy)}" class="art-mid" opacity=".5"/>`;
    if (n === 2) return frame(`<rect x="30" y="10" width="160" height="92" rx="6" class="art-sem"/>${grain(110, 50, 26, 18, 6)}<rect x="122" y="88" width="40" height="3" class="art-hi"/><text x="142" y="99" font-size="7" text-anchor="middle" class="art-hi" font-family="system-ui">10 µm</text><rect x="30" y="84" width="160" height="18" fill="none" stroke="var(--accent)" stroke-dasharray="3 3"/>`);
    if (n === 3) return frame(`${grain(110, 54, 32, 20, 7)}<circle cx="110" cy="54" r="32" fill="none" class="art-pri-s" stroke-width="2" stroke-dasharray="4 3"/><path d="M78 102H142M78 98V106M142 98V106" class="art-acc-s" stroke-width="2"/>`);
    if (n === 4) {
      let d = 'M10 80', k = 0;
      for (let x = 10; x <= 210; x += 2) { const peak = Math.max(0, Math.cos((x - 10) / 200 * TAU * 9)); d += 'L' + x + ' ' + r1(80 - 8 * Math.sin(x / 31) - 34 * Math.pow(peak, 18)); k++; }
      return frame(`<path d="M10 92H210" class="art-line"/><path d="${d}" class="art-pri-s" stroke-width="2"/><path d="M10 82 C 60 76, 120 86, 210 80" class="art-acc-s" stroke-width="1.6" stroke-dasharray="4 3"/>`);
    }
    if (n === 5) {
      let g = '';
      [[40, 36, 0], [92, 30, 0], [150, 40, 1], [190, 74, 0], [60, 82, 1], [118, 80, 0]].forEach(([x, y, c]) => {
        g += c ? `<ellipse cx="${x}" cy="${y}" rx="17" ry="9" transform="rotate(25 ${x} ${y})" class="art-mid"/><path d="M${x - 10} ${y - 2}Q${x} ${y + 6} ${x + 10} ${y + 2}" class="art-ink" stroke-width="1.2"/>` : grain(x, y, 14, 12, 4);
      });
      return frame(`<rect x="6" y="6" width="208" height="100" rx="8" class="art-soft"/>${g}`);
    }
    if (n === 6) {
      const r = rnd(9);
      let g = '';
      [[70, 60, 'var(--chart1)'], [130, 46, 'var(--chart2)'], [118, 82, 'var(--chart3)']].forEach(([x, y, c]) => {
        g += `<ellipse cx="${x}" cy="${y}" rx="30" ry="17" transform="rotate(-20 ${x} ${y})" fill="${c}" fill-opacity=".12" stroke="${c}" stroke-width="1.4"/>`;
        for (let k = 0; k < 9; k++) g += `<circle cx="${r1(x + (r() - 0.5) * 40)}" cy="${r1(y + (r() - 0.5) * 22)}" r="2.8" fill="${c}"/>`;
      });
      return frame(`<path d="M20 100H210M20 10V100" class="art-line"/>${g}`);
    }
    if (n === 7) return frame(`<rect x="64" y="10" width="62" height="88" rx="4" class="art-card" stroke="var(--border-strong)"/><rect x="94" y="16" width="62" height="88" rx="4" class="art-card" stroke="var(--border-strong)"/><path d="M102 30H148M102 38H140M102 46H146" class="art-line" stroke-width="2"/><rect x="102" y="56" width="44" height="26" rx="3" class="art-soft"/><path d="M104 78L114 66L124 72L134 60L144 64" class="art-pri-s" stroke-width="1.8"/><circle cx="76" cy="30" r="7" class="art-acc"/>`);
    return frame(grain(110, 56, 34, 22, 7));
  };
  /* the picture of the place to drop files */
  A.drop = () => `<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="12" y="20" width="96" height="72" rx="6" class="art-sem"/><path d="${spiky(60, 54, 21, 16, 5, 5, 0.1)}" class="art-mid"/><circle cx="60" cy="54" r="21" class="art-mid" opacity=".9"/><rect x="58" y="10" width="92" height="72" rx="6" class="art-card" stroke="var(--border-strong)"/><path d="M104 60V30M92 42L104 30L116 42" class="art-pri-s" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  window.Art = A;
})();
