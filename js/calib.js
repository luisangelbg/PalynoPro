/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — the size of a pixel (Calib).

   The magnification of an electron micrograph refers to a reference frame: a
   field as wide as the reference width (128 mm in the instruments that write
   the "$CM_" side files) divided by the magnification. So

       µm per pixel = reference width (µm) / (magnification × image width in px)

   which depends on the width in pixels of the saved image: the same
   magnification saved at 1280 px has pixels twice as large as at 2560 px.

   Every image is checked against its own scale bar: the bar is found as a run
   of saturated pixels repeated over several rows near the bottom, and its
   length times the computed size of a pixel must give a round length (1, 2, 5
   × 10^k µm). An image whose bar does not give a round length is flagged.

   Order of the sources, from the strongest: a size typed by the user or read
   from the index → the size of a pixel written by the instrument → the
   magnification and the reference width → none (the image is measured in
   pixels and kept out of the comparisons). */
(function () {
  'use strict';
  const C = {};
  C.REF_WIDTH_MM = 128;

  C.fromMag = (mag, widthPx, refMm) => (mag > 0 && widthPx > 0 ? (refMm || C.REF_WIDTH_MM) * 1000 / (mag * widthPx) : NaN);

  /* the nearest round length (1, 2, 5 × 10^k) and how far it is, as a fraction */
  C.nice = v => {
    if (!(v > 0)) return { value: NaN, err: Infinity };
    const e = Math.floor(Math.log10(v));
    let best = null;
    for (let k = e - 1; k <= e + 1; k++) [1, 2, 5].forEach(m => {
      const c = m * Math.pow(10, k), err = Math.abs(v - c) / c;
      if (!best || err < best.err) best = { value: c, err };
    });
    return best;
  };

  /* The scale bar: within the bottom `frac` of the image, a run of at least
     `minFrac` of the width of pixels ≥ `level`, repeated with the same start
     and length (± 2 px) over 3 rows or more. Returns the longest such bar:
     { x, y, len, rows } in the pixels of the image, or null. */
  C.findBar = function (img, opts) {
    const o = Object.assign({ frac: 0.2, minFrac: 0.02, maxFrac: 0.45, level: 235, fill: 0.95 }, opts || {});
    const { w, h, data } = img, y0 = Math.floor(h * (1 - o.frac)), minLen = Math.max(8, Math.round(w * o.minFrac)), maxLen = Math.round(w * o.maxFrac);
    /* every run of each row (a run may skip one or two darker pixels: noise, compression) */
    const rows = [];
    for (let y = y0; y < h; y++) {
      const list = [], row = y * w;
      let run = 0, start = 0, gap = 0;
      for (let x = 0; x <= w; x++) {
        const on = x < w && data[row + x] >= o.level;
        if (on) { if (!run) start = x; run += gap + 1; gap = 0; }
        else if (run && gap < 2 && x < w) gap++;
        else { if (run >= minLen && run <= maxLen) list.push({ x: start, len: run }); run = 0; gap = 0; }
      }
      rows.push(list);
    }
    /* bands: the same run (start and length ± 2 px) over consecutive rows */
    const bands = [], open = [];
    rows.forEach((list, i) => {
      const next = [];
      list.forEach(r => {
        const b = open.find(q => Math.abs(q.x - r.x) <= 2 && Math.abs(q.len - r.len) <= 2 && q.last === i - 1);
        if (b) { b.last = i; b.n++; b.lens.push(r.len); next.push(b); }
        else { const nb = { x: r.x, len: r.len, first: i, last: i, n: 1, lens: [r.len] }; bands.push(nb); next.push(nb); }
      });
      open.length = 0; open.push(...next);
    });
    /* a bar is a solid rectangle: nearly every pixel of the band is bright */
    let found = null;
    bands.forEach(b => {
      if (b.n < 3 || b.n > Math.max(6, h * 0.03)) return;
      const len = Math.round(b.lens.reduce((s, v) => s + v, 0) / b.lens.length);
      let on = 0, tot = 0;
      for (let y = y0 + b.first; y <= y0 + b.last; y++) for (let x = b.x; x < Math.min(w, b.x + len); x++) { tot++; if (data[y * w + x] >= o.level) on++; }
      if (on / tot < o.fill) return;
      if (!found || len > found.len) found = { x: b.x, y: y0 + b.first, len, rows: b.n };
    });
    return found;
  };

  /* Where the caption of the instrument starts: just above the scale bar
     (the labels sit next to or under it); else a dark band at the bottom;
     else nothing to cut. Returns the first row to leave out (h = none). */
  C.captionRow = function (img, bar) {
    const { w, h, data } = img;
    if (bar === undefined) bar = C.findBar(img);
    if (bar) return Math.max(Math.floor(h * 0.6), bar.y - Math.max(4, Math.round(h * 0.012)));
    let y = h - 1, dark = 0;
    while (y > h * 0.7) {
      let s = 0;
      for (let x = 0; x < w; x += 2) s += data[y * w + x];
      if (s / Math.ceil(w / 2) < 6) { dark++; y--; } else break;
    }
    return dark >= h * 0.03 ? y + 1 : h;
  };

  /* the calibration of one image: { umPerPx, source, bar, barUm, nice, ok, replaced } */
  C.calibrate = function (rec, img, opts) {
    return C.withBar(rec, img ? img.w : 0, img ? C.findBar(img) : null, opts);
  };
  /* The same from a bar already found (or none) and the width of the image in
     pixels: what the settings change (a magnification, the reference width)
     is computed again without reading the pixels. */
  C.withBar = function (rec, widthPx, bar, opts) {
    const o = Object.assign({ refMm: C.REF_WIDTH_MM }, opts || {});
    let umPerPx = NaN, source = 'none';
    if (rec.manualUmPerPx > 0) { umPerPx = rec.manualUmPerPx; source = 'manual'; }
    else if (rec.indexUmPerPx > 0) { umPerPx = rec.indexUmPerPx; source = 'index'; }
    else if (rec.meta && rec.meta.umPerPx > 0) { umPerPx = rec.meta.umPerPx; source = 'instrument'; }
    else if (rec.mag > 0) { umPerPx = C.fromMag(rec.mag, widthPx, o.refMm); source = 'magnification'; }
    bar = bar || null;
    let barUm = NaN, nice = null, ok = null;
    if (bar && umPerPx > 0) {
      barUm = bar.len * umPerPx;
      nice = C.nice(barUm);
      ok = nice.err <= 0.04;
    }
    /* a pixel size from an index or the file that the bar contradicts, while the
       magnification agrees with it, is a copied error: the magnification wins,
       and the record says so */
    let replaced = null;
    if (ok === false && (source === 'index' || source === 'instrument') && rec.mag > 0) {
      const um2 = C.fromMag(rec.mag, widthPx, o.refMm), n2 = C.nice(bar.len * um2);
      if (n2.err <= 0.04) { replaced = { source, umPerPx }; umPerPx = um2; source = 'magnification'; barUm = bar.len * um2; nice = n2; ok = true; }
    }
    return { umPerPx, source, bar, barUm, nice, ok, replaced };
  };

  /* From a bar the user knows (its length in µm) and its length in pixels */
  C.fromBar = (lenPx, lenUm) => (lenPx > 0 && lenUm > 0 ? lenUm / lenPx : NaN);

  /* The kind of image, from its magnification against the middle of the set:
     well below → overview (many grains), well above → detail of the surface. */
  C.suggestTier = function (mag, medianMag, lo, hi) {
    if (!(mag > 0) || !(medianMag > 0)) return 'standard';
    const r = mag / medianMag;
    if (r <= (lo || 0.6)) return 'overview';
    if (r >= (hi || 1.8)) return 'detail';
    return 'standard';
  };

  window.Calib = C;
})();
