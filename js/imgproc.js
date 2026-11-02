/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — the image engine (Img). Everything written here, with no library.

   An image is { w, h, data: Uint8Array } (gray levels); a mask is a Uint8Array
   of the same size with 1 inside. Coordinates: x along a row (column), y down
   the image (row).

   · resample: to a common physical size of pixel, by the average over the
     area each new pixel covers (Wolberg 1990) when it shrinks, bilinear when
     it grows.
   · Otsu's threshold (1979) on a 256-bin histogram of the observed range.
   · holes filled from the border (4-neighborhood), small specks removed,
     closing with a disk, connected components (8-neighborhood).
   · properties of a region: area, perimeter by the weighted count of
     boundary configurations (Benkrid and Crookes 2000), equivalent diameter,
     axes and eccentricity from the second central moments, convex hull and
     solidity, extent.
   · the outline as a radial envelope r(θ) from the centroid; the spines are
     the narrow peaks above its gray-scale opening (Serra 1982), which is the
     outline of the body without spines (the corpus), each spine as high as
     its tip above the chord between its two feet; Feret diameters of the
     corpus by rotating calipers (Shamos 1978).
   · texture: gray-level co-occurrence matrix (Haralick, Shanmugam and
     Dinstein 1973) over the inside of the corpus, counting only the pairs of
     pixels that both lie inside.
   · peaks of a sequence with a minimum height above their surroundings
     (prominence) and a minimum distance between them.
   The file has no DOM: the tests load it by itself. */
(function () {
  'use strict';
  const I = {};
  const TAU = 2 * Math.PI;

  /* ============================ resampling ============================ */
  /* one axis: n0 → n1 samples of a line read with get(i) */
  function weights(n0, n1) {
    const W = [];
    const s = n0 / n1;
    if (s >= 1) {
      for (let i = 0; i < n1; i++) {
        const a = i * s, b = (i + 1) * s, list = [];
        for (let k = Math.floor(a); k < Math.ceil(b) && k < n0; k++) {
          const ov = Math.min(b, k + 1) - Math.max(a, k);
          if (ov > 1e-12) list.push([k, ov / s]);
        }
        W.push(list);
      }
    } else {
      for (let i = 0; i < n1; i++) {
        const t = (i + 0.5) * s - 0.5, k = Math.floor(t), f = t - k;
        const k0 = Math.max(0, Math.min(n0 - 1, k)), k1 = Math.max(0, Math.min(n0 - 1, k + 1));
        W.push(k0 === k1 ? [[k0, 1]] : [[k0, 1 - f], [k1, f]]);
      }
    }
    return W;
  }
  I.resample = function (img, w1, h1) {
    const { w, h, data } = img;
    w1 = Math.max(1, Math.round(w1)); h1 = Math.max(1, Math.round(h1));
    if (w1 === w && h1 === h) return { w, h, data: new Uint8Array(data) };
    const WX = weights(w, w1), WY = weights(h, h1);
    const tmp = new Float32Array(w1 * h);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w1; x++) { let s = 0; const L = WX[x]; for (let j = 0; j < L.length; j++) s += data[row + L[j][0]] * L[j][1]; tmp[y * w1 + x] = s; }
    }
    const out = new Uint8Array(w1 * h1);
    for (let y = 0; y < h1; y++) {
      const L = WY[y];
      for (let x = 0; x < w1; x++) { let s = 0; for (let j = 0; j < L.length; j++) s += tmp[L[j][0] * w1 + x] * L[j][1]; out[y * w1 + x] = Math.max(0, Math.min(255, Math.round(s))); }
    }
    return { w: w1, h: h1, data: out };
  };
  /* to a physical size of pixel: from umPerPx to target (µm per pixel) */
  I.toScale = function (img, umPerPx, target) {
    const k = umPerPx / target;
    return Object.assign(I.resample(img, img.w * k, img.h * k), { umPerPx: umPerPx * img.w / Math.max(1, Math.round(img.w * k)), factor: k });
  };
  I.crop = function (img, x0, y0, x1, y1) {
    x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0); x1 = Math.min(img.w, x1 | 0); y1 = Math.min(img.h, y1 | 0);
    const w = Math.max(0, x1 - x0), h = Math.max(0, y1 - y0), out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) out.set(img.data.subarray((y0 + y) * img.w + x0, (y0 + y) * img.w + x0 + w), y * w);
    return { w, h, data: out };
  };

  /* ============================ threshold ============================ */
  /* Otsu (1979) on 256 bins spanning the observed range of `vals`; the
     threshold is the center of the bin that maximizes the variance between
     the two classes, and the foreground is what lies strictly above it. */
  I.otsu = function (vals) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < vals.length; i++) { const v = vals[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    if (!(hi > lo)) return lo;
    /* gray levels of 8 bits: one bin per level, so the threshold is a level and
       "above the threshold" never splits a level; other values: 256 bins */
    const integer = vals instanceof Uint8Array || vals instanceof Uint8ClampedArray;
    const nb = integer ? hi - lo + 1 : 256, width = integer ? 1 : (hi - lo) / nb, hist = new Float64Array(nb);
    for (let i = 0; i < vals.length; i++) { let b = integer ? vals[i] - lo : Math.floor((vals[i] - lo) / width); if (b >= nb) b = nb - 1; hist[b]++; }
    const c = i => (integer ? lo + i : lo + (i + 0.5) * width);
    const w1 = new Float64Array(nb), m1 = new Float64Array(nb), w2 = new Float64Array(nb), m2 = new Float64Array(nb);
    let s = 0, sm = 0;
    for (let i = 0; i < nb; i++) { s += hist[i]; sm += hist[i] * c(i); w1[i] = s; m1[i] = s > 0 ? sm / s : 0; }
    s = 0; sm = 0;
    for (let i = nb - 1; i >= 0; i--) { s += hist[i]; sm += hist[i] * c(i); w2[i] = s; m2[i] = s > 0 ? sm / s : 0; }
    let best = -1, bi = 0;
    for (let i = 0; i < nb - 1; i++) { const v = w1[i] * w2[i + 1] * (m1[i] - m2[i + 1]) * (m1[i] - m2[i + 1]); if (v > best) { best = v; bi = i; } }
    return c(bi);
  };

  /* ============================ binary operations ============================ */
  I.disk = function (r) {
    const out = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) out.push([dx, dy]);
    return out;
  };
  /* dilation / erosion with a list of offsets; outside the image counts as `border` */
  function morph(mask, w, h, offs, erode, border) {
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = erode ? 1 : 0;
      for (let k = 0; k < offs.length; k++) {
        const xx = x + offs[k][0], yy = y + offs[k][1];
        const m = xx < 0 || yy < 0 || xx >= w || yy >= h ? border : mask[yy * w + xx];
        if (erode ? !m : m) { v = erode ? 0 : 1; break; }
      }
      out[y * w + x] = v;
    }
    return out;
  }
  I.dilate = (mask, w, h, r) => morph(mask, w, h, I.disk(r), false, 0);
  I.erode = (mask, w, h, r, border) => morph(mask, w, h, I.disk(r), true, border == null ? 1 : border);
  /* closing as in the common definition: dilation, then erosion with the outside counted as inside */
  I.close = (mask, w, h, r) => I.erode(I.dilate(mask, w, h, r), w, h, r, 1);

  /* holes: background that cannot reach the border through 4-neighbors */
  I.fillHoles = function (mask, w, h) {
    const seen = new Uint8Array(w * h), stack = [];
    const push = i => { if (!mask[i] && !seen[i]) { seen[i] = 1; stack.push(i); } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i - x) / w;
      if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (y > 0) push(i - w); if (y < h - 1) push(i + w);
    }
    const out = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) out[i] = mask[i] || !seen[i] ? 1 : 0;
    return out;
  };

  /* connected components: conn 4 or 8 → { labels: Int32Array, n, sizes } */
  I.label = function (mask, w, h, conn) {
    const labels = new Int32Array(w * h), sizes = [0], stack = [];
    let n = 0;
    const eight = conn !== 4;
    for (let s = 0; s < w * h; s++) {
      if (!mask[s] || labels[s]) continue;
      n++; labels[s] = n; stack.push(s);
      let size = 0;
      while (stack.length) {
        const i = stack.pop(), x = i % w, y = (i - x) / w;
        size++;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          if (!eight && dx && dy) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (mask[j] && !labels[j]) { labels[j] = n; stack.push(j); }
        }
      }
      sizes.push(size);
    }
    return { labels, n, sizes };
  };
  I.removeSmall = function (mask, w, h, minSize, conn) {
    const L = I.label(mask, w, h, conn || 4), out = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) if (L.labels[i] && L.sizes[L.labels[i]] >= minSize) out[i] = 1;
    return out;
  };

  /* ============================ geometry ============================ */
  /* convex hull of points [x, y] (Andrew 1979), counter-clockwise */
  I.hull = function (pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
    upper.pop(); lower.pop();
    return lower.concat(upper);
  };
  I.polyArea = poly => { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
  I.polyPerimeter = poly => { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s; };
  /* the largest and the smallest caliper width of a convex polygon (Shamos 1978) */
  I.feret = function (poly) {
    const H = I.hull(poly);
    if (H.length < 2) return { max: 0, min: 0 };
    let max = 0, min = Infinity, angMax = 0, angMin = 0;
    for (let i = 0; i < H.length; i++) for (let j = i + 1; j < H.length; j++) {
      const d = Math.hypot(H[j][0] - H[i][0], H[j][1] - H[i][1]);
      if (d > max) { max = d; angMax = Math.atan2(H[j][1] - H[i][1], H[j][0] - H[i][0]); }
    }
    for (let i = 0; i < H.length; i++) {
      const a = H[i], b = H[(i + 1) % H.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1e-12) continue;
      let far = 0;
      for (const q of H) { const d = Math.abs((b[0] - a[0]) * (a[1] - q[1]) - (a[0] - q[0]) * (b[1] - a[1])) / L; if (d > far) far = d; }
      if (far < min) { min = far; angMin = Math.atan2(b[1] - a[1], b[0] - a[0]); }
    }
    return { max, min, angMax, angMin };
  };

  /* ============================ properties of a region ============================ */
  /* the perimeter of a binary image by the weighted count of the 4-neighborhood
     boundary configurations (the weights used widely since Benkrid and Crookes 2000) */
  function perimeterOf(img, w, h) {
    const W = new Float64Array(50);
    [5, 7, 15, 17, 25, 27].forEach(i => { W[i] = 1; });
    [21, 33].forEach(i => { W[i] = Math.SQRT2; });
    [13, 23].forEach(i => { W[i] = (1 + Math.SQRT2) / 2; });
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img[y * w + x]);
    const border = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!img[y * w + x]) continue;
      const er = at(x - 1, y) && at(x + 1, y) && at(x, y - 1) && at(x, y + 1);
      border[y * w + x] = er ? 0 : 1;
    }
    const b = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : border[y * w + x]);
    let total = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = 10 * (b(x - 1, y - 1) + b(x + 1, y - 1) + b(x - 1, y + 1) + b(x + 1, y + 1)) + 2 * (b(x, y - 1) + b(x - 1, y) + b(x + 1, y) + b(x, y + 1)) + b(x, y);
      if (v < 50) total += W[v];
    }
    return total;
  }
  /* region `id` of a labelling → its properties, in pixels */
  I.props = function (labels, w, h, id) {
    let area = 0, sx = 0, sy = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (labels[y * w + x] !== id) continue;
      area++; sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (!area) return null;
    const cx = sx / area, cy = sy / area, bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const sub = new Uint8Array(bw * bh), corners = [];
    let mxx = 0, myy = 0, mxy = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (labels[y * w + x] !== id) continue;
      sub[(y - y0) * bw + (x - x0)] = 1;
      const dx = x - cx, dy = y - cy;
      mxx += dx * dx; myy += dy * dy; mxy += dx * dy;
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || labels[y * w + x - 1] !== id || labels[y * w + x + 1] !== id || labels[(y - 1) * w + x] !== id || labels[(y + 1) * w + x] !== id;
      if (edge) corners.push([x - 0.5, y - 0.5], [x + 0.5, y - 0.5], [x - 0.5, y + 0.5], [x + 0.5, y + 0.5]);
    }
    mxx /= area; myy /= area; mxy /= area;
    const tr = mxx + myy, det = mxx * myy - mxy * mxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const l1 = tr / 2 + disc, l2 = Math.max(0, tr / 2 - disc);
    const H = I.hull(corners);
    /* pixel centers inside the hull, row by row */
    let convex = 0;
    for (let y = y0; y <= y1; y++) {
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < H.length; i++) {
        const a = H[i], b = H[(i + 1) % H.length];
        if ((a[1] - y) * (b[1] - y) > 0) continue;
        if (a[1] === b[1]) { lo = Math.min(lo, a[0], b[0]); hi = Math.max(hi, a[0], b[0]); continue; }
        const xx = a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
        lo = Math.min(lo, xx); hi = Math.max(hi, xx);
      }
      if (hi >= lo) convex += Math.max(0, Math.floor(hi + 1e-9) - Math.ceil(lo - 1e-9) + 1);
    }
    const perimeter = perimeterOf(sub, bw, bh);
    return {
      id, area, cx, cy, bbox: [x0, y0, x1 + 1, y1 + 1], perimeter,
      equivDiameter: Math.sqrt(4 * area / Math.PI),
      major: 4 * Math.sqrt(l1), minor: 4 * Math.sqrt(l2), eccentricity: l1 > 0 ? Math.sqrt(1 - l2 / l1) : 0,
      orientation: 0.5 * Math.atan2(2 * mxy, mxx - myy),
      convexArea: convex, solidity: convex ? area / convex : NaN, extent: area / (bw * bh),
      circularity: perimeter > 0 ? 4 * Math.PI * area / (perimeter * perimeter) : NaN,
      touches: x0 === 0 || y0 === 0 || x1 === w - 1 || y1 === h - 1,
    };
  };

  /* ============================ segmentation ============================ */
  /* the foreground of an image above Otsu's threshold, cleaned:
     → { mask, labels, n, sizes, threshold } over the rows [0, rows) */
  I.foreground = function (img, opts) {
    const o = Object.assign({ rows: img.h, closeR: 2, minFrac: 0.0004, minSize: 30, invert: false }, opts || {});
    const w = img.w, h = Math.max(1, Math.min(img.h, Math.round(o.rows))), N = w * h;
    const vals = img.data.subarray(0, N);
    const t = o.threshold != null ? o.threshold : I.otsu(vals);
    let mask = new Uint8Array(N);
    for (let i = 0; i < N; i++) mask[i] = o.invert ? (vals[i] < t ? 1 : 0) : (vals[i] > t ? 1 : 0);
    mask = I.fillHoles(mask, w, h);
    mask = I.removeSmall(mask, w, h, Math.max(o.minSize, Math.round(o.minFrac * N)), 4);
    if (o.closeR > 0) mask = I.close(mask, w, h, o.closeR);
    const L = I.label(mask, w, h, 8);
    return { mask, labels: L.labels, n: L.n, sizes: L.sizes, threshold: t, w, h };
  };
  /* the grain of an image with one grain: the largest region */
  I.segment = function (img, opts) {
    const F = I.foreground(img, opts);
    if (!F.n) return { error: 'none', threshold: F.threshold };
    let id = 1;
    for (let k = 2; k <= F.n; k++) if (F.sizes[k] > F.sizes[id]) id = k;
    const p = I.props(F.labels, F.w, F.h, id);
    const mask = new Uint8Array(F.w * F.h);
    for (let i = 0; i < mask.length; i++) mask[i] = F.labels[i] === id ? 1 : 0;
    return { region: p, mask, w: F.w, h: F.h, threshold: F.threshold, nRegions: F.n };
  };

  /* ============================ the outline ============================ */
  /* radial envelope: for nBins directions around (cx, cy), the farthest
     boundary pixel of the mask (its outer edge, + 0.5 px). Empty directions are
     filled by circular interpolation. */
  I.radial = function (mask, w, h, cx, cy, nBins) {
    nBins = nBins || 720;
    const r = new Float64Array(nBins).fill(-1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      if (x > 0 && x < w - 1 && y > 0 && y < h - 1 && mask[i - 1] && mask[i + 1] && mask[i - w] && mask[i + w]) continue;
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) + 0.5;
      let b = Math.floor(((Math.atan2(dy, dx) + TAU) % TAU) / TAU * nBins);
      if (b >= nBins) b = 0;
      if (d > r[b]) r[b] = d;
    }
    const have = [];
    for (let b = 0; b < nBins; b++) if (r[b] >= 0) have.push(b);
    if (!have.length) return r.fill(0);
    for (let b = 0; b < nBins; b++) {
      if (r[b] >= 0) continue;
      let k = 0;
      while (k < have.length && have[k] < b) k++;
      const a = have[(k - 1 + have.length) % have.length], c = have[k % have.length];
      const da = (b - a + nBins) % nBins, dc = (c - b + nBins) % nBins;
      r[b] = (r[a] * dc + r[c] * da) / (da + dc || 1);
    }
    return r;
  };
  /* circular moving average, min and max filters of half-width k */
  const circ = (x, i) => x[((i % x.length) + x.length) % x.length];
  I.smooth = function (x, k) {
    if (k < 1) return Float64Array.from(x);
    const n = x.length, out = new Float64Array(n);
    let s = 0;
    for (let i = -k; i <= k; i++) s += circ(x, i);
    for (let i = 0; i < n; i++) { out[i] = s / (2 * k + 1); s += circ(x, i + k + 1) - circ(x, i - k); }
    return out;
  };
  function circFilter(x, k, isMin) {
    const n = x.length, out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let v = isMin ? Infinity : -Infinity;
      for (let j = -k; j <= k; j++) { const u = circ(x, i + j); if (isMin ? u < v : u > v) v = u; }
      out[i] = v;
    }
    return out;
  }
  /* gray-scale opening: what is left of a profile when every peak narrower than 2k+1 is cut */
  I.open1 = (x, k) => circFilter(circFilter(x, k, true), k, false);

  /* peaks of a periodic sequence: local maxima (the middle of a plateau), then
     those closer than `distance` are dropped keeping the higher, then those
     whose prominence is below `prominence`. Prominence: the height above the
     higher of the two lowest points between the peak and the nearest higher
     ground on either side (within one turn). */
  I.peaks = function (x, opts) {
    const o = Object.assign({ prominence: 0, distance: 1, periodic: true }, opts || {});
    const n = x.length, at = i => (o.periodic ? circ(x, i) : x[i]);
    let cand = [];
    for (let i = 0; i < n; i++) {
      if (!o.periodic && (i === 0 || i === n - 1)) continue;
      if (!(at(i) > at(i - 1))) continue;
      let j = i;
      while (j - i < n && at(j + 1) === at(i)) j++;
      if (at(j + 1) < at(i)) cand.push(((Math.floor((i + j) / 2) % n) + n) % n);
    }
    cand = [...new Set(cand)];
    if (o.distance > 1 && cand.length) {
      const order = cand.slice().sort((a, b) => x[b] - x[a]), keep = new Set();
      const gap = (a, b) => { const d = Math.abs(a - b); return o.periodic ? Math.min(d, n - d) : d; };
      order.forEach(p => { for (const q of keep) if (gap(p, q) < o.distance) return; keep.add(p); });
      cand = cand.filter(p => keep.has(p));
    }
    const prom = p => {
      const v = x[p];
      let lmin = v, rmin = v;
      for (let k = 1; k < n; k++) { const u = at(p - k); if (!o.periodic && p - k < 0) break; if (u > v) break; if (u < lmin) lmin = u; }
      for (let k = 1; k < n; k++) { const u = at(p + k); if (!o.periodic && p + k >= n) break; if (u > v) break; if (u < rmin) rmin = u; }
      return v - Math.max(lmin, rmin);
    };
    return cand.map(p => ({ i: p, prominence: prom(p) })).filter(q => q.prominence >= o.prominence).sort((a, b) => a.i - b.i);
  };

  /* Spines and corpus from the radial envelope r (in pixels) and the size of a
     pixel. opts: baseUm — how wide a spine can be at its base, so wider bumps
     belong to the outline of the body (default 3 µm); minHeightUm — the least
     height of a spine (default 0.3 µm). */
  I.ornament = function (r, umPerPx, opts) {
    const o = Object.assign({ baseUm: 3, minHeightUm: 0.3, smoothBins: 0 }, opts || {});
    const n = r.length;
    const rs = I.smooth(r, o.smoothBins);
    const rMed = [...rs].sort((a, b) => a - b)[Math.floor(n / 2)];
    const binUm = TAU * rMed * umPerPx / n;
    const k = Math.max(2, Math.round(o.baseUm / binUm / 2));
    const base = I.smooth(I.open1(rs, k), Math.max(1, Math.round(k / 2)));
    const height = Float64Array.from(rs, (v, i) => v - base[i]);
    const minH = Math.max(o.minHeightUm / umPerPx, 1.5);
    const pk = I.peaks(height, { prominence: minH, distance: Math.max(2, k) }).filter(p => height[p.i] >= minH);
    /* The height of each spine is measured above the chord between its two
       feet, not above the opening: a flat opening sits on the higher of the
       two sides of a spine on a sloping outline (an elongated grain) and stays
       above the body wherever the window barely clears the spine and its
       closing fillets, so it took 4 to 12 % off the height. A foot is the
       lowest point of the outline between the peak and the first direction
       where the outline meets the opening again (within the window, and never
       past half the way to the next spine). */
    const nb = pk.length, peakH = new Float64Array(nb);
    const eps = 0.5;   // the outline is drawn to half a pixel
    const foot = (j, dir) => {
      const p = pk[j].i, q = pk[(j + dir + nb) % nb].i;
      const gap = nb > 1 ? ((dir > 0 ? q - p : p - q) + n) % n : n;
      const lim = Math.max(1, Math.min(2 * k, Math.floor(gap / 2)));
      let best = 1, bv = Infinity;
      for (let s = 1; s <= lim; s++) {
        const v = circ(rs, p + dir * s);
        if (v < bv) { bv = v; best = s; }
        if (v - circ(base, p + dir * s) <= eps) break;
      }
      return { s: best, v: bv };
    };
    for (let j = 0; j < nb; j++) {
      const L = foot(j, -1), R = foot(j, 1);
      const chord = (L.v * R.s + R.v * L.s) / (L.s + R.s);
      peakH[j] = Math.max(0, rs[pk[j].i] - chord);
    }
    const hUm = Array.from(peakH, v => v * umPerPx);
    /* the corpus: the polygon of the opened outline */
    const poly = [];
    for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * TAU; poly.push([base[i] * Math.cos(a), base[i] * Math.sin(a)]); }
    const area = I.polyArea(poly), per = I.polyPerimeter(poly), fer = I.feret(poly);
    const circumUm = per * umPerPx;
    const mean = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
    const sd = a => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1)); };
    return {
      r: rs, base, height, peaks: pk.map(p => p.i), peakHeights: peakH, k,
      nSpines: pk.length,
      spineHeightUm: mean(hUm), spineHeightSdUm: sd(hUm), spineHeights: hUm,
      spineSpacingUm: pk.length ? circumUm / pk.length : NaN,
      spineDensity: circumUm > 0 ? 100 * pk.length / circumUm : NaN,
      corpus: {
        areaUm2: area * umPerPx * umPerPx, perimeterUm: circumUm, diameterUm: Math.sqrt(4 * area / Math.PI) * umPerPx,
        feretMaxUm: fer.max * umPerPx, feretMinUm: fer.min * umPerPx, aspect: fer.min > 0 ? fer.max / fer.min : NaN,
        circularity: per > 0 ? 4 * Math.PI * area / (per * per) : NaN,
      },
      envelopeMaxUm: Math.max(...rs) * umPerPx,
    };
  };

  /* ============================ texture ============================ */
  /* a polygon (x, y) filled as a mask, by the centers of the pixels */
  I.fillPoly = function (poly, w, h) {
    const m = new Uint8Array(w * h);
    let ya = Infinity, yb = -Infinity;
    poly.forEach(p => { ya = Math.min(ya, p[1]); yb = Math.max(yb, p[1]); });
    for (let y = Math.max(0, Math.ceil(ya - 0.5)); y <= Math.min(h - 1, Math.floor(yb)); y++) {
      const yc = y, xs = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      xs.sort((p, q) => p - q);
      for (let j = 0; j + 1 < xs.length; j += 2) for (let x = Math.max(0, Math.ceil(xs[j])); x <= Math.min(w - 1, Math.floor(xs[j + 1])); x++) m[y * w + x] = 1;
    }
    return m;
  };
  /* Gray-level co-occurrence matrix over the pixels of `mask`, at the given
     distances (pixels) and the four directions 0°, 45°, 90°, 135°; symmetric
     and normalized. Gray levels are quantized to `levels` between the 1st
     and the 99th percentile inside the mask. Only pairs whose two pixels lie
     inside the mask are counted. Returns the mean of each property over
     distances and directions. */
  I.glcm = function (img, mask, opts) {
    const o = Object.assign({ levels: 32, distances: [2, 4] }, opts || {});
    const { w, h, data } = img, L = o.levels;
    const inside = [];
    for (let i = 0; i < w * h; i++) if (mask[i]) inside.push(data[i]);
    if (inside.length < 200) return { error: 'small', n: inside.length };
    inside.sort((a, b) => a - b);
    const lo = inside[Math.floor(0.01 * (inside.length - 1))], hi = inside[Math.floor(0.99 * (inside.length - 1))];
    const span = hi > lo ? hi - lo : 1;
    const q = new Int16Array(w * h).fill(-1);
    for (let i = 0; i < w * h; i++) if (mask[i]) q[i] = Math.max(0, Math.min(L - 1, Math.floor((data[i] - lo) / span * L)));
    const angles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4];
    const acc = { contrast: 0, homogeneity: 0, energy: 0, asm: 0, correlation: 0, entropy: 0, dissimilarity: 0 };
    let m = 0;
    o.distances.forEach(d => angles.forEach(a => {
      const dy = Math.round(Math.sin(a) * d), dx = Math.round(Math.cos(a) * d);
      const P = new Float64Array(L * L);
      let tot = 0;
      for (let y = Math.max(0, -dy); y < Math.min(h, h - dy); y++) for (let x = Math.max(0, -dx); x < Math.min(w, w - dx); x++) {
        const i = q[y * w + x], j = q[(y + dy) * w + x + dx];
        if (i < 0 || j < 0) continue;
        P[i * L + j]++; P[j * L + i]++; tot += 2;
      }
      if (!tot) return;
      let mu = 0;
      for (let i = 0; i < L; i++) for (let j = 0; j < L; j++) { P[i * L + j] /= tot; mu += i * P[i * L + j]; }
      let v = 0;
      for (let i = 0; i < L; i++) for (let j = 0; j < L; j++) v += (i - mu) * (i - mu) * P[i * L + j];
      let con = 0, hom = 0, asm = 0, cor = 0, ent = 0, dis = 0;
      for (let i = 0; i < L; i++) for (let j = 0; j < L; j++) {
        const p = P[i * L + j];
        if (!p) continue;
        con += p * (i - j) * (i - j); dis += p * Math.abs(i - j); hom += p / (1 + (i - j) * (i - j)); asm += p * p;
        cor += (i - mu) * (j - mu) * p; ent -= p * Math.log(p);
      }
      acc.contrast += con; acc.dissimilarity += dis; acc.homogeneity += hom; acc.asm += asm; acc.energy += Math.sqrt(asm);
      acc.correlation += v > 0 ? cor / v : 1; acc.entropy += ent; m++;
    }));
    Object.keys(acc).forEach(k => { acc[k] /= m || 1; });
    acc.n = inside.length;
    return acc;
  };

  /* ============================ several grains ============================ */
  /* every region of at least `minArea` pixels, with its properties */
  I.grains = function (img, opts) {
    const o = Object.assign({ minArea: 50 }, opts || {});
    const F = I.foreground(img, Object.assign({}, opts, { minSize: Math.max(30, o.minArea) }));
    const out = [];
    for (let k = 1; k <= F.n; k++) if (F.sizes[k] >= o.minArea) { const p = I.props(F.labels, F.w, F.h, k); if (p) out.push(p); }
    return { grains: out, threshold: F.threshold, w: F.w, h: F.h, labels: F.labels };
  };

  /* ============================ shape of a polygon ============================ */
  /* polygon in pixels → measures in µm: area, perimeter, equivalent diameter,
     Feret max / min, aspect, circularity, solidity (area / hull area) and
     convexity (hull perimeter / perimeter) */
  I.polyMetrics = function (poly, um) {
    const area = I.polyArea(poly), per = I.polyPerimeter(poly), H = I.hull(poly), ha = I.polyArea(H), hp = I.polyPerimeter(H), f = I.feret(poly);
    return {
      areaUm2: area * um * um, perimeterUm: per * um, diameterUm: Math.sqrt(4 * area / Math.PI) * um,
      feretMaxUm: f.max * um, feretMinUm: f.min * um, aspect: f.min > 0 ? f.max / f.min : NaN,
      circularity: per > 0 ? 4 * Math.PI * area / (per * per) : NaN, solidity: ha > 0 ? area / ha : NaN, convexity: per > 0 ? hp / per : NaN,
    };
  };
  const ring = (r, cx, cy) => { const n = r.length, out = []; for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * TAU; out.push([cx + r[i] * Math.cos(a), cy + r[i] * Math.sin(a)]); } return out; };
  I.ring = ring;

  /* ============================ lumina of the reticulum ============================ */
  /* The cells of a reticulum (lumina) are darker than the walls (muri) that
     bound them. A pixel inside `mask` belongs to a lumen when it is darker than
     the mean of its neighborhood (radius `winUm`) by more than `k` standard
     deviations of that neighborhood (local mean and variance from summed-area
     tables). Lumina are the 4-connected groups of such pixels that do not
     touch the edge of the mask, between minUm2 and maxUm2 in area.
     → { n, densityPer100um2, medianDiameterUm, meanDiameterUm, cvDiameter,
         diameters, areaUm2 (of the mask) } */
  I.lumina = function (img, mask, um, opts) {
    const o = Object.assign({ winUm: 1.5, k: 0.15, minUm2: 0.05, maxUm2: 12 }, opts || {});
    const { w, h, data } = img, S1 = new Float64Array((w + 1) * (h + 1)), S2 = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let r1 = 0, r2 = 0;
      for (let x = 0; x < w; x++) {
        const v = data[y * w + x]; r1 += v; r2 += v * v;
        S1[(y + 1) * (w + 1) + x + 1] = S1[y * (w + 1) + x + 1] + r1;
        S2[(y + 1) * (w + 1) + x + 1] = S2[y * (w + 1) + x + 1] + r2;
      }
    }
    const R = Math.max(2, Math.round(o.winUm / um)), dark = new Uint8Array(w * h);
    let maskArea = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      maskArea++;
      const xa = Math.max(0, x - R), xb = Math.min(w, x + R + 1), ya = Math.max(0, y - R), yb = Math.min(h, y + R + 1), n = (xb - xa) * (yb - ya);
      const s1 = S1[yb * (w + 1) + xb] - S1[ya * (w + 1) + xb] - S1[yb * (w + 1) + xa] + S1[ya * (w + 1) + xa];
      const s2 = S2[yb * (w + 1) + xb] - S2[ya * (w + 1) + xb] - S2[yb * (w + 1) + xa] + S2[ya * (w + 1) + xa];
      const m = s1 / n, sd = Math.sqrt(Math.max(0, s2 / n - m * m));
      if (data[i] < m - o.k * sd) dark[i] = 1;
    }
    const L = I.label(dark, w, h, 4), touch = new Uint8Array(L.n + 1);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const l = L.labels[y * w + x];
      if (!l) continue;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || !mask[y * w + x - 1] || !mask[y * w + x + 1] || !mask[(y - 1) * w + x] || !mask[(y + 1) * w + x]) touch[l] = 1;
    }
    const d = [], a2 = um * um, keep = new Uint8Array(L.n + 1);
    for (let l = 1; l <= L.n; l++) {
      if (touch[l]) continue;
      const area = L.sizes[l] * a2;
      if (area < o.minUm2 || area > o.maxUm2) continue;
      d.push(Math.sqrt(4 * area / Math.PI));
      keep[l] = 1;
    }
    let lumMask = null;
    if (o.returnMask) { lumMask = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) if (keep[L.labels[i]]) lumMask[i] = 1; }
    d.sort((p, q) => p - q);
    const n = d.length, mean = n ? d.reduce((s, v) => s + v, 0) / n : NaN;
    const sd = n > 1 ? Math.sqrt(d.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (n - 1)) : NaN;
    /* density without the edge bias: cells whose center lies farther than R0
       from the edge of the mask, over the area of that inner zone (a cell
       touching the edge has its center closer than its radius, so it is never
       counted, and neither is its share of the area). Distances by a 3-4
       chamfer transform (Borgefors 1986). */
    let density = NaN;
    if (n) {
      const dist = new Float32Array(w * h), BIG = 1e9;
      for (let i = 0; i < w * h; i++) dist[i] = mask[i] ? BIG : 0;
      const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : dist[y * w + x]);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!dist[i]) continue; dist[i] = Math.min(dist[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4); }
      for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!dist[i]) continue; dist[i] = Math.min(dist[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4); }
      const R0 = 3 * Math.max(3, d[Math.floor((n - 1) / 2)] / um);   /* three median diameters, in chamfer units (3 per px) */
      const sx = new Float64Array(L.n + 1), sy = new Float64Array(L.n + 1);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const l = L.labels[y * w + x]; if (keep[l]) { sx[l] += x; sy[l] += y; } }
      let cnt = 0, inner = 0;
      for (let l = 1; l <= L.n; l++) if (keep[l]) { const cx = Math.round(sx[l] / L.sizes[l]), cy = Math.round(sy[l] / L.sizes[l]); if (dist[cy * w + cx] >= R0) cnt++; }
      for (let i = 0; i < w * h; i++) if (dist[i] >= R0) inner++;
      density = inner > 0 ? 100 * cnt / (inner * a2) : NaN;
    }
    return { n, densityPer100um2: density, medianDiameterUm: n ? d[Math.floor((n - 1) / 2)] : NaN, meanDiameterUm: mean, cvDiameter: mean > 0 ? sd / mean : NaN, diameters: d, areaUm2: maskArea * a2, mask: lumMask };
  };

  /* ============================ one grain, complete ============================ */
  /* The whole analysis of an image with one grain, already at its working
     scale (img.umPerPx). opts: rows (caption row), nBins, baseUm, minHeightUm,
     glcmDistUm, margin (fraction of the corpus radius left out at its edge
     for the texture). */
  I.analyze = function (img, opts) {
    const o = Object.assign({ nBins: 720, baseUm: 3, minHeightUm: 0.3, glcmDistUm: [0.2, 0.4], margin: 0.18, levels: 32, texture: true }, opts || {});
    const um = img.umPerPx, F = I.foreground(img, { rows: o.rows != null ? o.rows : img.h });
    if (!F.n) return { error: 'none', threshold: F.threshold };
    /* the grain: the largest region whose center lies in the middle 70 % of the frame; else the largest */
    let id = 0, idAny = 1;
    for (let k = 1; k <= F.n; k++) if (F.sizes[k] > F.sizes[idAny]) idAny = k;
    const cent = [];
    for (let k = 1; k <= F.n; k++) cent.push({ k, sx: 0, sy: 0 });
    for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) { const l = F.labels[y * F.w + x]; if (l) { cent[l - 1].sx += x; cent[l - 1].sy += y; } }
    cent.forEach(c => {
      const s = F.sizes[c.k], cx = c.sx / s, cy = c.sy / s;
      if (cx > 0.15 * F.w && cx < 0.85 * F.w && cy > 0.15 * F.h && cy < 0.85 * F.h && s >= 0.3 * F.sizes[idAny] && (!id || s > F.sizes[id])) id = c.k;
    });
    if (!id) id = idAny;
    const p = I.props(F.labels, F.w, F.h, id);
    const mask = new Uint8Array(F.w * F.h);
    for (let i = 0; i < mask.length; i++) mask[i] = F.labels[i] === id ? 1 : 0;
    const r = I.radial(mask, F.w, F.h, p.cx, p.cy, o.nBins);
    const orn = I.ornament(r, um, { baseUm: o.baseUm, minHeightUm: o.minHeightUm });
    /* the directions where the outline is cut by the frame */
    const env = ring(orn.r, p.cx, p.cy), cut = env.map(q => q[0] <= 1.5 || q[1] <= 1.5 || q[0] >= F.w - 2.5 || q[1] >= F.h - 2.5);
    const cutFrac = cut.filter(Boolean).length / cut.length;
    const peaksOk = orn.peaks.filter(i => !cut[i] && !cut[(i + 1) % cut.length] && !cut[(i - 1 + cut.length) % cut.length]);
    const hAt = new Map(orn.peaks.map((i, j) => [i, orn.peakHeights[j]]));
    const hOk = peaksOk.map(i => hAt.get(i) * um);
    const corpusPoly = ring(orn.base, p.cx, p.cy);
    const envelope = I.polyMetrics(env, um), corpus = I.polyMetrics(corpusPoly, um);
    const freeCirc = corpus.perimeterUm * (1 - cutFrac);
    const mean = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
    const sdv = a => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1)); };
    const res = {
      threshold: F.threshold, nRegions: F.n, region: p, w: F.w, h: F.h, mask, umPerPx: um,
      radial: orn.r, base: orn.base, height: orn.height, peaks: peaksOk, cut, cutFrac,
      envelope, corpus,
      spines: { n: peaksOk.length, heightUm: mean(hOk), heightSdUm: sdv(hOk), heights: hOk, spacingUm: peaksOk.length ? freeCirc / peaksOk.length : NaN, density: freeCirc > 0 ? 100 * peaksOk.length / freeCirc : NaN, nAll: orn.nSpines },
      spininess: corpus.areaUm2 > 0 ? envelope.areaUm2 / corpus.areaUm2 - 1 : NaN,
    };
    if (o.texture) {
      /* the inside of the corpus, away from its edge, where the surface is (dark apertures left out) */
      const inner = ring(Float64Array.from(orn.base, v => v * (1 - o.margin)), p.cx, p.cy);
      const im = I.fillPoly(inner, F.w, F.h);
      for (let i = 0; i < im.length; i++) im[i] = im[i] && mask[i] ? 1 : 0;
      const dist = o.glcmDistUm.map(d => Math.max(1, Math.round(d / um)));
      res.texture = I.glcm({ w: F.w, h: F.h, data: img.data }, im, { levels: o.levels, distances: dist });
      res.texture.distancesPx = dist;
      res.lumina = I.lumina({ w: F.w, h: F.h, data: img.data }, im, um, o.lumen);
    }
    return res;
  };

  /* ============================ several grains, classified ============================ */
  /* overview: every region of a plausible size. Each is measured on the body
     without spines (spines lower the solidity of a healthy grain): a
     collapsed or folded grain loses solidity (area / area of its convex
     hull). Regions much smaller or larger than the typical grain are
     fragments or aggregates of touching grains and are not classified.
     opts: minUm, maxUm, solidity, fragFactor, aggFactor, refUm */
  I.overview = function (img, opts) {
    const o = Object.assign({ minUm: 8, maxUm: 400, rows: img.h, baseUm: 3, solidity: 0.95, fragFactor: 0.6, aggFactor: 1.3, refUm: null, fallbackUm: null }, opts || {});
    const um = img.umPerPx, F = I.foreground(img, { rows: o.rows });
    const minA = Math.PI * Math.pow(o.minUm / um / 2, 2), maxA = Math.PI * Math.pow(o.maxUm / um / 2, 2), out = [];
    for (let k = 1; k <= F.n; k++) {
      if (F.sizes[k] < minA || F.sizes[k] > maxA) continue;
      const p = I.props(F.labels, F.w, F.h, k);
      if (!p) continue;
      /* the body of each grain without its spines, from its own radial outline */
      const [x0, y0, x1, y1] = p.bbox, bw = x1 - x0, bh = y1 - y0, m = new Uint8Array(bw * bh);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (F.labels[y * F.w + x] === k) m[(y - y0) * bw + (x - x0)] = 1;
      const orn = I.ornament(I.radial(m, bw, bh, p.cx - x0, p.cy - y0, 360), um, { baseUm: o.baseUm });
      const pm = I.polyMetrics(I.ring(orn.base, 0, 0), um);
      out.push({ cx: p.cx, cy: p.cy, bbox: p.bbox, diameterUm: pm.diameterUm, areaUm2: pm.areaUm2, solidity: pm.solidity, aspect: pm.aspect,
        silhouetteSolidity: p.solidity, touches: p.touches });
    }
    /* classes: fragments and aggregates by size against the typical grain, then turgid or atypical by the solidity of the body */
    const free = out.filter(g => !g.touches).map(g => g.diameterUm).sort((a, b) => a - b);
    const ref = o.refUm > 0 ? o.refUm : free.length >= 3 ? free[Math.floor((free.length - 1) / 2)] : o.fallbackUm > 0 ? o.fallbackUm : NaN;
    out.forEach(g => {
      g.cls = g.touches ? 'edge' : ref > 0 && g.diameterUm < o.fragFactor * ref ? 'fragment' : ref > 0 && g.diameterUm > o.aggFactor * ref ? 'aggregate' : g.solidity >= o.solidity ? 'turgid' : 'atypical';
    });
    return { grains: out, refUm: ref, threshold: F.threshold, w: F.w, h: F.h, labels: F.labels };
  };

  window.Img = I;
})();
