/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — the drawing kit of the figures (Fig).
   Three charts cover the app: `xy` (points, lines, steps, fitted curves,
   error bars and bands on two numeric axes), `bars` (grouped, stacked or lying-down bars
   by category) and `heat` (a surface as a grid of shaded cells). All return
   SVG text whose colors are CSS variables of the
   theme, and carry the marks that the Figure Studio and the editor of the
   suite read: data-plot, data-xr and data-yr on the SVG; data-role on axes,
   grid, ticks and axis titles; a legend with data-role="legend" and data-li
   on each entry.
   A file has no theme: `svgString` writes every color, line and letter into
   a copy of the figure, read with the light theme put for an instant, and
   the PNG is drawn from that copy. */
(function () {
  'use strict';
  const r1 = v => Math.round(v * 10) / 10;
  const e = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const PAL = i => (window.seriesColor ? seriesColor(i) : 'currentColor');
  let seq = 0;

  /* about n round values covering [a, b] */
  function ticks(a, b, n) {
    if (!(b > a)) b = a + 1;
    const step = niceNum((b - a) / (n || 5), true);
    const t0 = Math.ceil(a / step - 1e-9) * step, out = [];
    for (let v = t0; v <= b + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return { ticks: out, step };
  }
  const fmtT = (v, step) => { const d = step >= 1 ? 0 : Math.min(6, Math.ceil(-Math.log10(step) - 1e-9)); const s = v.toFixed(d); return s.startsWith('-') ? '−' + s.slice(1) : s; };
  const textW = (s, font) => String(s).length * font * 0.56;

  function legend(items, x, y, font) {
    if (!items || !items.length) return '';
    let g = '<g data-role="legend" class="fg-leg">';
    items.forEach((it, i) => {
      const yy = y + i * (font + 8), ym = yy - font / 2 + 2;
      if (it.shape === 'rect') g += `<rect data-li="${i}" x="${x}" y="${r1(yy - font + 2)}" width="${font + 2}" height="${font - 1}" rx="2" fill="${it.color}"/>`;
      else {
        if (it.line !== false) g += `<line data-li="${i}" x1="${x}" x2="${x + font + 6}" y1="${r1(ym)}" y2="${r1(ym)}" stroke="${it.color}" stroke-width="2.4"${it.dash ? ` stroke-dasharray="${it.dash}"` : ''}/>`;
        if (it.marker) g += marker(it.marker, x + (font + 6) / 2, ym, 3.6, it.color, ` data-li="${i}"`);
      }
      g += `<text data-li="${i}" class="txt" x="${x + font + 12}" y="${r1(yy)}" font-size="${font}">${e(it.label)}</text>`;
    });
    return g + '</g>';
  }
  /* one point of a series; `title` is what the pointer reads on it */
  function marker(shape, x, y, r, color, extra, title) {
    extra = extra || '';
    const end = tag => (title ? `><title>${e(title)}</title></${tag}>` : '/>');
    if (shape === 'square') return `<rect${extra} x="${r1(x - r)}" y="${r1(y - r)}" width="${r1(2 * r)}" height="${r1(2 * r)}" fill="${color}"${end('rect')}`;
    if (shape === 'tri') return `<path${extra} d="M${r1(x)} ${r1(y - r * 1.2)}L${r1(x + r * 1.1)} ${r1(y + r * 0.8)}H${r1(x - r * 1.1)}Z" fill="${color}"${end('path')}`;
    if (shape === 'diamond') return `<path${extra} d="M${r1(x)} ${r1(y - r * 1.25)}L${r1(x + r * 1.25)} ${r1(y)}L${r1(x)} ${r1(y + r * 1.25)}L${r1(x - r * 1.25)} ${r1(y)}Z" fill="${color}"${end('path')}`;
    if (shape === 'ring') return `<circle${extra} cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="var(--card-bg)" stroke="${color}" stroke-width="1.6"${end('circle')}`;
    return `<circle${extra} cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${color}"${end('circle')}`;
  }
  const SHAPES = ['circle', 'square', 'tri', 'diamond', 'ring'];

  function wrap(o, W, H, F, body, xr, yr) {
    const ttl = o.title ? `<text class="ttl" data-role="title" x="${F.x0}" y="20" font-size="${(o.font || 12) + 1}">${e(o.title)}</text>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" class="fig" viewBox="0 0 ${Math.ceil(W)} ${Math.ceil(H)}" width="${Math.ceil(W)}" height="${Math.ceil(H)}" role="img" ` +
      `data-plot="${r1(F.x0)} ${r1(F.y0)} ${r1(F.w)} ${r1(F.h)}"${xr ? ` data-xr="${xr[0]} ${xr[1]}"` : ''}${yr ? ` data-yr="${yr[0]} ${yr[1]}"` : ''} aria-label="${e(o.aria || o.title || '')}">${ttl}${body}</svg>`;
  }

  /* ---------------- points, lines, steps and curves ----------------
     o.series: [{ name, color, pts: [{ x, y, lo?, hi? }], line, markers, step,
     dash, width, shape, band: [{ x, lo, hi }], fn, from, to, legend }]
     o.refs: [{ x | y, label, dash }]   o.xRange / o.yRange / o.yZero / o.xZero */
  function xy(o) {
    /* on a logarithmic vertical axis everything is placed by its log10 */
    const lg = v => (o.yLog ? (v > 0 ? Math.log10(v) : NaN) : v);
    const font = o.font || 12, Sr = o.series.map((s, i) => {
      const t = Object.assign({ color: PAL(i), shape: SHAPES[i % SHAPES.length] }, s);
      if (o.yLog) {
        if (t.pts) t.pts = t.pts.map(p => Object.assign({}, p, { y: lg(p.y), lo: lg(p.lo), hi: lg(p.hi), title: p.title || fmtNum(p.x, 3) + ', ' + fmtNum(p.y, 3) }));
        if (t.band) t.band = t.band.map(p => ({ x: p.x, lo: lg(p.lo), hi: lg(p.hi) }));
        if (t.fn) { const f = t.fn; t.fn = x => lg(f(x)); }
      }
      return t;
    });
    if (o.yLog && o.refs) o.refs = o.refs.map(r => (isFinite(r.y) ? Object.assign({}, r, { y: lg(r.y) }) : r));
    if (o.yLog && o.yRange) o.yRange = o.yRange.map(lg);
    const named = Sr.filter(s => s.name && s.legend !== false);
    const legendW = o.legend !== false && named.length ? 26 + Math.max(...named.map(s => textW(s.name, font))) + 12 : 0;
    const W = (o.width || 560) + legendW, H = o.height || 360;
    const F = { x0: 60, y0: o.title ? 34 : 14, w: W - 60 - 16 - legendW, h: H - (o.title ? 34 : 14) - 48 };
    const xs = [], ys = [];
    Sr.forEach(s => {
      (s.pts || []).forEach(p => { if (isFinite(p.x) && isFinite(p.y)) { xs.push(p.x); ys.push(p.y); if (isFinite(p.lo)) ys.push(p.lo); if (isFinite(p.hi)) ys.push(p.hi); } });
      (s.band || []).forEach(p => { if (isFinite(p.x)) { xs.push(p.x); if (isFinite(p.lo)) ys.push(p.lo); if (isFinite(p.hi)) ys.push(p.hi); } });
      if (s.fn && isFinite(s.from) && isFinite(s.to)) xs.push(s.from, s.to);
    });
    (o.refs || []).forEach(r => { if (isFinite(r.x)) xs.push(r.x); if (isFinite(r.y)) ys.push(r.y); });
    let xa = o.xRange ? o.xRange[0] : Math.min(...xs), xb = o.xRange ? o.xRange[1] : Math.max(...xs);
    if (!isFinite(xa) || !isFinite(xb)) { xa = 0; xb = 1; }
    if (o.xZero && !o.xRange) xa = Math.min(0, xa);
    if (!(xb > xa)) { xb = xa + 1; }
    if (!o.xRange) { const p = (xb - xa) * 0.04; if (!(o.xZero && xa === 0)) xa -= p; xb += p; }
    /* curves given as functions are sampled once the horizontal range is known */
    Sr.forEach(s => {
      if (!s.fn) return;
      const a = isFinite(s.from) ? s.from : xa, b = isFinite(s.to) ? s.to : xb, n = s.samples || 240;
      s.curve = [];
      for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n, y = s.fn(x); if (isFinite(y)) { s.curve.push({ x, y }); ys.push(y); } }
    });
    let ya = o.yRange ? o.yRange[0] : Math.min(...ys), yb = o.yRange ? o.yRange[1] : Math.max(...ys);
    if (!isFinite(ya) || !isFinite(yb)) { ya = 0; yb = 1; }
    if (o.yZero && !o.yRange) ya = Math.min(0, ya);
    if (!(yb > ya)) yb = ya + 1;
    if (!o.yRange) { const p = (yb - ya) * 0.05; if (!(o.yZero && ya === 0)) ya -= p; yb += p; }
    const TX = ticks(xa, xb, o.xTicks || 6);
    let TY = ticks(ya, yb, o.yTicks || 5);
    if (o.yLog) { TY = { ticks: [], step: 1 }; for (let k = Math.ceil(ya - 1e-9); k <= Math.floor(yb + 1e-9); k++) TY.ticks.push(k); }
    const yTick = t => (o.yLog ? fmtNum(Math.pow(10, t), 3) : fmtT(t, TY.step));
    const X = v => F.x0 + (v - xa) / (xb - xa) * F.w, Y = v => F.y0 + F.h - (v - ya) / (yb - ya) * F.h;
    const id = 'fgc' + (++seq);
    let g = `<defs><clipPath id="${id}"><rect x="${F.x0}" y="${F.y0 - 1}" width="${r1(F.w)}" height="${r1(F.h + 2)}"/></clipPath></defs>`;
    TX.ticks.forEach(t => { if (t < xa - 1e-9 || t > xb + 1e-9) return; g += `<line class="grid" data-role="grid" x1="${r1(X(t))}" x2="${r1(X(t))}" y1="${F.y0}" y2="${F.y0 + F.h}"/><text class="tick" data-role="xtick" x="${r1(X(t))}" y="${F.y0 + F.h + 16}" font-size="${font - 1}" text-anchor="middle">${fmtT(t, TX.step)}</text>`; });
    TY.ticks.forEach(t => { if (t < ya - 1e-9 || t > yb + 1e-9) return; g += `<line class="grid" data-role="grid" x1="${F.x0}" x2="${r1(F.x0 + F.w)}" y1="${r1(Y(t))}" y2="${r1(Y(t))}"/><text class="tick" data-role="ytick" x="${F.x0 - 7}" y="${r1(Y(t) + 4)}" font-size="${font - 1}" text-anchor="end">${yTick(t)}</text>`; });
    (o.refs || []).forEach(r => {
      if (isFinite(r.y)) g += `<line class="fg-ref" x1="${F.x0}" x2="${r1(F.x0 + F.w)}" y1="${r1(Y(r.y))}" y2="${r1(Y(r.y))}"${r.dash ? ` stroke-dasharray="${r.dash}"` : ''}/>` + (r.label ? `<text class="mut" x="${r1(F.x0 + F.w - 3)}" y="${r1(Y(r.y) - 4)}" font-size="${font - 2}" text-anchor="end">${e(r.label)}</text>` : '');
      if (isFinite(r.x)) g += `<line class="fg-ref" x1="${r1(X(r.x))}" x2="${r1(X(r.x))}" y1="${F.y0}" y2="${F.y0 + F.h}"${r.dash ? ` stroke-dasharray="${r.dash}"` : ''}/>` + (r.label ? `<text class="mut" x="${r1(X(r.x) + 4)}" y="${F.y0 + 11}" font-size="${font - 2}">${e(r.label)}</text>` : '');
    });
    let inside = '', marks = '';
    Sr.forEach(s => {
      const c = s.color;
      if (s.band && s.band.length > 1) {
        const up = s.band.map(p => `${r1(X(p.x))} ${r1(Y(p.hi))}`), dn = s.band.slice().reverse().map(p => `${r1(X(p.x))} ${r1(Y(p.lo))}`);
        inside += `<path d="M${up.join('L')}L${dn.join('L')}Z" fill="${c}" fill-opacity="0.14" stroke="none"/>`;
      }
      const P = (s.pts || []).filter(p => isFinite(p.x) && isFinite(p.y));
      const pathOf = (pts, step) => {
        if (pts.length < 2) return '';
        let d = `M${r1(X(pts[0].x))} ${r1(Y(pts[0].y))}`;
        for (let i = 1; i < pts.length; i++) d += step ? `H${r1(X(pts[i].x))}V${r1(Y(pts[i].y))}` : `L${r1(X(pts[i].x))} ${r1(Y(pts[i].y))}`;
        return d;
      };
      if (s.curve && s.curve.length > 1) inside += `<path class="fg-curve" d="${pathOf(s.curve)}" fill="none" stroke="${c}" stroke-width="${s.width || 2.2}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`;
      if (s.line && P.length > 1) inside += `<path class="fg-line" d="${pathOf(P, s.step)}" fill="none" stroke="${c}" stroke-width="${s.width || 2}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round"/>`;
      if (s.markers !== false && !s.curveOnly) P.forEach(p => {
        const px = X(p.x), py = Y(p.y);
        if (isFinite(p.lo) && isFinite(p.hi)) marks += `<path class="fg-err" d="M${r1(px)} ${r1(Y(p.hi))}V${r1(Y(p.lo))}M${r1(px - 3)} ${r1(Y(p.hi))}H${r1(px + 3)}M${r1(px - 3)} ${r1(Y(p.lo))}H${r1(px + 3)}" stroke="${c}"/>`;
        marks += marker(s.shape, px, py, s.r || 3.4, c, '', (s.name ? s.name + ' · ' : '') + (p.title || fmtNum(p.x, 3) + ', ' + fmtNum(p.y, 3)));
      });
    });
    g += `<g clip-path="url(#${id})">${inside}</g>${marks}`;
    g += `<line class="ax" data-role="axis" x1="${F.x0}" x2="${r1(F.x0 + F.w)}" y1="${F.y0 + F.h}" y2="${F.y0 + F.h}"/><line class="ax" data-role="axis" x1="${F.x0}" x2="${F.x0}" y1="${F.y0}" y2="${F.y0 + F.h}"/>`;
    if (o.ylab) g += `<text class="flab" data-role="ylab" transform="translate(15 ${r1(F.y0 + F.h / 2)}) rotate(-90)" font-size="${font}" text-anchor="middle">${e(o.ylab)}</text>`;
    if (o.xlab) g += `<text class="flab" data-role="xlab" x="${r1(F.x0 + F.w / 2)}" y="${H - 8}" font-size="${font}" text-anchor="middle">${e(o.xlab)}</text>`;
    if (legendW) g += legend(named.map(s => ({ label: s.name, color: s.color, dash: s.dash, line: !!(s.line || s.curve), marker: s.markers !== false && s.pts && s.pts.length && !s.curveOnly ? s.shape : null })), F.x0 + F.w + 16, F.y0 + 14, font);
    return wrap(o, W, H, F, g, [xa, xb], [ya, yb]);
  }

  /* ---------------- bars by category ----------------
     o.categories: [label]; o.series: [{ name, color, values, lo, hi, err }];
     o.stacked piles the series; o.letters: a text above each category (or,
     when grouped, above each bar: [[…], …] by series). */
  function bars(o) {
    if (o.horizontal) return hbars(o);
    const font = o.font || 12, cats = o.categories, Sr = o.series.map((s, i) => Object.assign({ color: PAL(i) }, s));
    const legendW = (Sr.length > 1 || o.forceLegend) && o.legend !== false ? 26 + Math.max(...Sr.map(s => textW(s.name, font))) + 12 : 0;
    const longest = Math.max(...cats.map(c => textW(c, font - 1)));
    const slot = o.stacked ? 46 : Sr.length * 24 + 18;
    const W = o.width || Math.max(380, 76 + cats.length * slot + legendW), rotate = o.rotate != null ? o.rotate : longest > (W - 76 - legendW) / cats.length - 6;
    const H = o.height || 320, bottom = rotate ? Math.min(110, 30 + longest * 0.62) : 46;
    const F = { x0: 60, y0: o.title ? 34 : 16, w: W - 60 - 14 - legendW, h: H - (o.title ? 34 : 16) - bottom };
    const tops = cats.map((_, i) => (o.stacked ? Sr.reduce((a, s) => a + (+s.values[i] || 0), 0)
      : Math.max(...Sr.map(s => { const v = +s.values[i] || 0; return s.hi && isFinite(s.hi[i]) ? s.hi[i] : s.err && isFinite(s.err[i]) ? v + s.err[i] : v; }))));
    let ymax = o.yMax != null ? o.yMax : Math.max(0, ...tops) * (o.letters ? 1.12 : 1.05) || 1;
    if (o.refLine != null) ymax = Math.max(ymax, o.refLine);
    const ymin = o.yMin != null ? o.yMin : 0, TY = ticks(ymin, ymax, 5);
    const top = o.yMax != null ? o.yMax : Math.max(ymax, TY.ticks[TY.ticks.length - 1]);
    const Y = v => F.y0 + F.h - (v - ymin) / (top - ymin) * F.h;
    const cw = F.w / cats.length, bw = o.stacked ? Math.min(46, cw * 0.62) : Math.min(34, (cw - 10) / Sr.length), gw = o.stacked ? bw : bw * Sr.length;
    let g = '';
    TY.ticks.forEach(t => { if (t > top + 1e-9) return; g += `<line class="grid" data-role="grid" x1="${F.x0}" x2="${r1(F.x0 + F.w)}" y1="${r1(Y(t))}" y2="${r1(Y(t))}"/><text class="tick" data-role="ytick" x="${F.x0 - 7}" y="${r1(Y(t) + 4)}" font-size="${font - 1}" text-anchor="end">${fmtT(t, TY.step)}</text>`; });
    cats.forEach((c, i) => {
      const cx = F.x0 + (i + 0.5) * cw;
      let base = ymin;
      Sr.forEach((s, k) => {
        const v = +s.values[i];
        if (!isFinite(v)) return;
        const x = o.stacked ? cx - bw / 2 : cx - gw / 2 + k * bw, y1 = o.stacked ? base + v : v, ya = Y(Math.max(ymin, y1)), yb = Y(o.stacked ? base : ymin);
        if (v > 0 || !o.stacked) g += `<rect class="fg-bar" x="${r1(x + 1)}" y="${r1(ya)}" width="${r1(bw - 2)}" height="${r1(Math.max(0, yb - ya))}" rx="${o.stacked ? 0 : 2}" fill="${s.color}"><title>${e(c + ' · ' + s.name + ': ' + fmtNum(v, 3))}</title></rect>`;
        if (!o.stacked) {
          const hasCI = s.lo && s.hi && isFinite(s.lo[i]) && isFinite(s.hi[i]);
          let topY = ya;
          if (hasCI || (s.err && isFinite(s.err[i]) && s.err[i] > 0)) {
            const xm = x + bw / 2, a = Y(hasCI ? s.hi[i] : v + s.err[i]), b = Y(Math.max(ymin, hasCI ? s.lo[i] : v - s.err[i]));
            g += `<path class="fg-err" d="M${r1(xm)} ${r1(a)}V${r1(b)}M${r1(xm - 3)} ${r1(a)}H${r1(xm + 3)}M${r1(xm - 3)} ${r1(b)}H${r1(xm + 3)}"/>`;
            topY = a;
          }
          const lt = o.letters && (Array.isArray(o.letters[0]) ? o.letters[k] && o.letters[k][i] : Sr.length === 1 ? o.letters[i] : null);
          if (lt) g += `<text class="txt" x="${r1(x + bw / 2)}" y="${r1(topY - 5)}" font-size="${font}" font-weight="700" text-anchor="middle">${e(lt)}</text>`;
        } else if (o.values && v >= (top - ymin) * 0.06) g += `<text x="${r1(cx)}" y="${r1((ya + yb) / 2 + 4)}" font-size="${font - 2}" text-anchor="middle" fill="${s.ink || 'var(--on-chart)'}">${fmtNum(v, o.valueDigits != null ? o.valueDigits : 0)}</text>`;
        base += v;
      });
      g += rotate
        ? `<text class="tick" data-role="xtick" transform="translate(${r1(cx + 3)} ${F.y0 + F.h + 13}) rotate(-35)" font-size="${font - 1}" text-anchor="end">${e(c)}</text>`
        : `<text class="tick" data-role="xtick" x="${r1(cx)}" y="${F.y0 + F.h + 16}" font-size="${font - 1}" text-anchor="middle">${e(c)}</text>`;
    });
    if (o.refLine != null) g += `<line class="fg-ref" x1="${F.x0}" x2="${r1(F.x0 + F.w)}" y1="${r1(Y(o.refLine))}" y2="${r1(Y(o.refLine))}" stroke-dasharray="5 4"/>` + (o.refLabel ? `<text class="mut" x="${r1(F.x0 + F.w - 3)}" y="${r1(Y(o.refLine) - 4)}" font-size="${font - 2}" text-anchor="end">${e(o.refLabel)}</text>` : '');
    g += `<line class="ax" data-role="axis" x1="${F.x0}" x2="${r1(F.x0 + F.w)}" y1="${r1(Y(ymin))}" y2="${r1(Y(ymin))}"/><line class="ax" data-role="axis" x1="${F.x0}" x2="${F.x0}" y1="${F.y0}" y2="${F.y0 + F.h}"/>`;
    if (o.ylab) g += `<text class="flab" data-role="ylab" transform="translate(15 ${r1(F.y0 + F.h / 2)}) rotate(-90)" font-size="${font}" text-anchor="middle">${e(o.ylab)}</text>`;
    if (o.xlab) g += `<text class="flab" data-role="xlab" x="${r1(F.x0 + F.w / 2)}" y="${H - 6}" font-size="${font}" text-anchor="middle">${e(o.xlab)}</text>`;
    if (legendW) g += legend(Sr.map(s => ({ label: s.name, color: s.color, shape: 'rect' })), F.x0 + F.w + 16, F.y0 + 14, font);
    return wrap(o, W, H, F, g, null, [ymin, top]);
  }
  /* bars lying down, one series: for long category names (the names of the
     variables), which read whole on the left instead of slanted below.
     o.categories go from the bottom up; o.ylab names the value axis (below). */
  function hbars(o) {
    const font = o.font || 12, cats = o.categories, s = Object.assign({ color: PAL(0) }, o.series[0]);
    const left = Math.round(16 + Math.min(260, Math.max(...cats.map(c => textW(c, font - 1))))), row = 24;
    const W = o.width || Math.max(420, left + 300), H = o.height || (o.title ? 34 : 14) + cats.length * row + 48;
    const F = { x0: left, y0: o.title ? 34 : 14, w: W - left - 18, h: H - (o.title ? 34 : 14) - 48 };
    const vmax = Math.max(0, ...s.values.map(v => +v || 0)) * 1.05 || 1, TX = ticks(0, vmax, 5);
    const top = Math.max(vmax, TX.ticks[TX.ticks.length - 1]);
    const X = v => F.x0 + v / top * F.w, ch = F.h / cats.length, bh = Math.min(18, ch * 0.66);
    let g = '';
    TX.ticks.forEach(t => { if (t > top + 1e-9) return; g += `<line class="grid" data-role="grid" x1="${r1(X(t))}" x2="${r1(X(t))}" y1="${F.y0}" y2="${F.y0 + F.h}"/><text class="tick" data-role="xtick" x="${r1(X(t))}" y="${F.y0 + F.h + 16}" font-size="${font - 1}" text-anchor="middle">${fmtT(t, TX.step)}</text>`; });
    cats.forEach((c, i) => {
      const cy = F.y0 + F.h - (i + 0.5) * ch, v = +s.values[i];
      if (isFinite(v)) g += `<rect class="fg-bar" x="${F.x0}" y="${r1(cy - bh / 2)}" width="${r1(Math.max(0, X(v) - F.x0))}" height="${r1(bh)}" rx="2" fill="${s.color}"><title>${e(c + ' · ' + s.name + ': ' + fmtNum(v, 3))}</title></rect>`;
      g += `<text class="tick" data-role="ytick" x="${F.x0 - 7}" y="${r1(cy + 4)}" font-size="${font - 1}" text-anchor="end">${e(c)}</text>`;
    });
    g += `<line class="ax" data-role="axis" x1="${F.x0}" x2="${r1(F.x0 + F.w)}" y1="${F.y0 + F.h}" y2="${F.y0 + F.h}"/><line class="ax" data-role="axis" x1="${F.x0}" x2="${F.x0}" y1="${F.y0}" y2="${F.y0 + F.h}"/>`;
    if (o.ylab) g += `<text class="flab" data-role="xlab" x="${r1(F.x0 + F.w / 2)}" y="${H - 8}" font-size="${font}" text-anchor="middle">${e(o.ylab)}</text>`;
    return wrap(o, W, H, F, g, [0, top], null);
  }

  /* ---------------- figures for files ---------------- */
  const PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity',
    'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'visibility', 'display', 'letter-spacing', 'paint-order'];
  const SKIP = new Set(['defs', 'title', 'desc', 'style', 'script', 'clipPath']);
  /* run f with the light theme, without painting */
  function withLight(f) {
    const root = document.documentElement, prev = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'light');
    try { return f(); } finally { if (prev == null) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', prev); }
  }
  /* a standalone SVG text of a figure on the page */
  function svgString(svg, opts) {
    const o = Object.assign({ light: true, background: '#ffffff' }, opts || {});
    const run = () => {
      const clone = svg.cloneNode(true);
      const a = [svg, ...svg.querySelectorAll('*')], b = [clone, ...clone.querySelectorAll('*')];
      a.forEach((n, i) => {
        const c = b[i];
        if (!c || SKIP.has(n.tagName)) return;
        const cs = getComputedStyle(n);
        PROPS.forEach(p => {
          const v = cs.getPropertyValue(p);
          if (v === '' || v == null) return;
          if (p === 'display' && v !== 'none') return;
          if (p === 'visibility' && v !== 'hidden') return;
          c.setAttribute(p, v);
        });
        c.removeAttribute('tabindex'); c.removeAttribute('class');
      });
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const vb = (clone.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
      if (vb.length === 4) { clone.setAttribute('width', vb[2]); clone.setAttribute('height', vb[3]); }
      if (o.background && vb.length === 4) {
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('x', vb[0]); r.setAttribute('y', vb[1]); r.setAttribute('width', vb[2]); r.setAttribute('height', vb[3]); r.setAttribute('fill', o.background);
        clone.insertBefore(r, clone.firstChild);
      }
      if (window.FigEdit && FigEdit.strip) try { FigEdit.strip(clone); } catch (err) { /* the editor is optional */ }
      return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
    };
    return o.light ? withLight(run) : run();
  }
  /* PNG of a figure at `scale` times its size */
  function pngBlob(svg, scale, opts) {
    const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    return pngOf(svgString(svg, opts), vb[2] || svg.getBoundingClientRect().width, vb[3] || svg.getBoundingClientRect().height, scale);
  }
  /* the same from the text of a standalone SVG, of w × h */
  function pngOf(s, w, h, scale) {
    const k = scale || 3;
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        const g = cv.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
        g.drawImage(im, 0, 0, cv.width, cv.height);
        cv.toBlob(b => (b ? res(b) : rej(new Error('PNG'))), 'image/png');
      };
      im.onerror = () => rej(new Error('SVG'));
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    });
  }
  async function save(svg, name, fmt) {
    if (!svg) return;
    if (fmt === 'png') download(await pngBlob(svg, 3), name + '.png');
    else download(svgString(svg), name + '.svg', 'image/svg+xml;charset=utf-8');
  }
  /* the frame of one figure: its title, the two export buttons and the canvas */
  function block(id, es, en, extra) {
    return `<div class="fig-block" data-name="${e(es)}"><div class="fig-head"><h4>${L2(es, en)}</h4><div class="fig-tools">${extra || ''}` +
      `<button type="button" class="btn btn-ghost btn-sm fig-dl" data-fmt="svg">SVG</button><button type="button" class="btn btn-ghost btn-sm fig-dl" data-fmt="png">PNG</button></div></div>` +
      `<div class="fig-canvas" id="${id}"></div></div>`;
  }
  /* every figure now on the page that has something drawn, for the report and the package */
  function mounted(root) {
    return [...(root || document).querySelectorAll('.fig-block')].map(b => ({ block: b, svg: b.querySelector('.fig-canvas svg'), name: b.dataset.name || '' })).filter(f => f.svg);
  }
  if (typeof document !== 'undefined') document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('.fig-dl');
    if (!b) return;
    const blk = b.closest('.fig-block'), svg = blk && blk.querySelector('.fig-canvas svg');
    if (!svg) { toast(T('Todavía no hay figura.', 'There is no figure yet.')); return; }
    const h = blk.querySelector('.fig-head h4 [data-l="' + I18N.lang + '"]') || blk.querySelector('.fig-head h4');
    save(svg, slug((h ? h.textContent : blk.dataset.name || T('figura', 'figure')).trim()), b.dataset.fmt).catch(err => toast(T('No se pudo exportar: ', 'Could not export: ') + err.message, 'error'));
  });

  /* ---------------- a surface as a grid of cells ----------------
     o.xs, o.ys: the values along the two axes; o.z[j][i]: the value at ys[j]
     and xs[i]; o.fmt(v): what is written in a cell; o.zLog: shade by the
     logarithm of the value. The shade is the opacity of one color of the
     theme, so the surface reads the same in light and in dark. */
  function heat(o) {
    const font = o.font || 12, nx = o.xs.length, ny = o.ys.length, W = o.width || 560, H = o.height || 380;
    const F = { x0: 62, y0: o.title ? 34 : 14, w: W - 62 - 16, h: H - (o.title ? 34 : 14) - 48 };
    const tr = v => (o.zLog ? Math.log10(v) : v), good = v => isFinite(v) && (!o.zLog || v > 0);
    const vals = [];
    o.z.forEach(r => r.forEach(v => { if (good(v)) vals.push(tr(v)); }));
    const lo = Math.min(...vals), hi = Math.max(...vals), cw = F.w / nx, ch = F.h / ny, c = o.color || 'var(--primary)';
    let g = '';
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const v = o.z[j][i], ok = good(v), u = ok ? (hi > lo ? (tr(v) - lo) / (hi - lo) : 0.5) : 0, x = F.x0 + i * cw, y = F.y0 + F.h - (j + 1) * ch, label = ok && o.fmt ? o.fmt(v) : ok ? fmtNum(v, 3) : '—';
      g += `<rect class="fg-cell" x="${r1(x)}" y="${r1(y)}" width="${r1(cw)}" height="${r1(ch)}" fill="${c}" fill-opacity="${ok ? Math.round((0.05 + 0.9 * u) * 100) / 100 : 0}"><title>${e((o.xname || 'x') + ' ' + o.xs[i] + ', ' + (o.yname || 'y') + ' ' + o.ys[j] + ': ' + label)}</title></rect>`;
      if (cw >= textW(label, font - 2) + 4 && ch >= font + 2) g += `<text class="${u > 0.5 ? 'fg-on' : 'txt'}" x="${r1(x + cw / 2)}" y="${r1(y + ch / 2 + (font - 2) * 0.36)}" font-size="${font - 2}" text-anchor="middle">${e(label)}</text>`;
    }
    o.xs.forEach((v, i) => { g += `<text class="tick" data-role="xtick" x="${r1(F.x0 + (i + 0.5) * cw)}" y="${F.y0 + F.h + 16}" font-size="${font - 1}" text-anchor="middle">${e(v)}</text>`; });
    o.ys.forEach((v, j) => { g += `<text class="tick" data-role="ytick" x="${F.x0 - 7}" y="${r1(F.y0 + F.h - (j + 0.5) * ch + 4)}" font-size="${font - 1}" text-anchor="end">${e(v)}</text>`; });
    g += `<rect class="ax" data-role="axis" x="${F.x0}" y="${F.y0}" width="${r1(F.w)}" height="${r1(F.h)}" fill="none"/>`;
    if (o.ylab) g += `<text class="flab" data-role="ylab" transform="translate(15 ${r1(F.y0 + F.h / 2)}) rotate(-90)" font-size="${font}" text-anchor="middle">${e(o.ylab)}</text>`;
    if (o.xlab) g += `<text class="flab" data-role="xlab" x="${r1(F.x0 + F.w / 2)}" y="${H - 6}" font-size="${font}" text-anchor="middle">${e(o.xlab)}</text>`;
    return wrap(o, W, H, F, g, null, null);
  }

  /* ---------------- points by group, with ellipses and arrows ----------------
     o.points: [{ x, y, g (group key), title }]; o.groups: [{ key, name, color }]
     o.ellipse: confidence level of a normal ellipse per group (e.g. 0.95), or 0
     o.arrows: [{ x, y, label }] (a biplot: drawn from the origin, scaled to fit) */
  function scatter(o) {
    const font = o.font || 12, G = o.groups.map((g, i) => Object.assign({ color: PAL(i), shape: SHAPES[i % SHAPES.length] }, g));
    const legendW = o.legend !== false && G.length > 1 ? 26 + Math.max(...G.map(g => textW(g.name, font))) + 12 : 0;
    const W = (o.width || 560) + legendW, H = o.height || 420;
    const F = { x0: 60, y0: o.title ? 34 : 14, w: W - 60 - 16 - legendW, h: H - (o.title ? 34 : 14) - 48 };
    const pts = o.points.filter(p => isFinite(p.x) && isFinite(p.y));
    const ell = [];
    const chi = o.ellipse ? -2 * Math.log(1 - o.ellipse) : 0;   /* chi-square with 2 df */
    if (chi) G.forEach(g => {
      const P = pts.filter(p => p.g === g.key);
      if (P.length < 3) return;
      const mx = P.reduce((s, p) => s + p.x, 0) / P.length, my = P.reduce((s, p) => s + p.y, 0) / P.length;
      let sxx = 0, syy = 0, sxy = 0;
      P.forEach(p => { sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; sxy += (p.x - mx) * (p.y - my); });
      sxx /= P.length - 1; syy /= P.length - 1; sxy /= P.length - 1;
      const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
      const l1 = tr / 2 + disc, l2 = Math.max(0, tr / 2 - disc), ang = Math.atan2(l1 - sxx, sxy || 1e-12);
      const path = [];
      for (let k = 0; k <= 72; k++) { const t = k / 72 * 2 * Math.PI, ex = Math.sqrt(chi * l1) * Math.cos(t), ey = Math.sqrt(chi * l2) * Math.sin(t); path.push([mx + ex * Math.cos(ang) - ey * Math.sin(ang), my + ex * Math.sin(ang) + ey * Math.cos(ang)]); }
      ell.push({ g, path });
    });
    const xs = pts.map(p => p.x).concat(...ell.map(e => e.path.map(q => q[0]))), ys = pts.map(p => p.y).concat(...ell.map(e => e.path.map(q => q[1])));
    let xa = Math.min(...xs), xb = Math.max(...xs), ya = Math.min(...ys), yb = Math.max(...ys);
    if (!isFinite(xa)) { xa = -1; xb = 1; ya = -1; yb = 1; }
    const px = (xb - xa) * 0.06 || 1, py = (yb - ya) * 0.06 || 1;
    xa -= px; xb += px; ya -= py; yb += py;
    const TX = ticks(xa, xb, 6), TY = ticks(ya, yb, 5);
    const X = v => F.x0 + (v - xa) / (xb - xa) * F.w, Y = v => F.y0 + F.h - (v - ya) / (yb - ya) * F.h;
    let g = '';
    TX.ticks.forEach(t => { if (t < xa || t > xb) return; g += `<line class="grid" data-role="grid" x1="${r1(X(t))}" x2="${r1(X(t))}" y1="${F.y0}" y2="${F.y0 + F.h}"/><text class="tick" data-role="xtick" x="${r1(X(t))}" y="${F.y0 + F.h + 16}" font-size="${font - 1}" text-anchor="middle">${fmtT(t, TX.step)}</text>`; });
    TY.ticks.forEach(t => { if (t < ya || t > yb) return; g += `<line class="grid" data-role="grid" x1="${F.x0}" x2="${r1(F.x0 + F.w)}" y1="${r1(Y(t))}" y2="${r1(Y(t))}"/><text class="tick" data-role="ytick" x="${F.x0 - 7}" y="${r1(Y(t) + 4)}" font-size="${font - 1}" text-anchor="end">${fmtT(t, TY.step)}</text>`; });
    if (xa < 0 && xb > 0) g += `<line class="fg-ref" x1="${r1(X(0))}" x2="${r1(X(0))}" y1="${F.y0}" y2="${F.y0 + F.h}"/>`;
    if (ya < 0 && yb > 0) g += `<line class="fg-ref" x1="${F.x0}" x2="${r1(F.x0 + F.w)}" y1="${r1(Y(0))}" y2="${r1(Y(0))}"/>`;
    ell.forEach(e => { g += `<path d="M${e.path.map(q => r1(X(q[0])) + ' ' + r1(Y(q[1]))).join('L')}Z" fill="${e.g.color}" fill-opacity="0.08" stroke="${e.g.color}" stroke-width="1.4"/>`; });
    pts.forEach(p => { const gg = G.find(x => x.key === p.g) || G[0]; g += marker(gg.shape, X(p.x), Y(p.y), o.r || 4.2, gg.color, '', (gg.name ? gg.name + ' · ' : '') + (p.title || '')); });
    if (o.arrows && o.arrows.length) {
      const m = Math.max(...o.arrows.map(a => Math.hypot(a.x, a.y))) || 1, span = Math.min(xb - px, -xa - px, yb - py, -ya - py) * 0.92;
      const k = span > 0 ? span / m : 1;
      g += `<defs><marker id="fga${seq + 1}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8Z" class="fg-arrowhead"/></marker></defs>`;
      seq++;
      /* the label goes past the tip, kept inside the frame (names of variables
         are long) and moved down a line while it covers one already placed */
      const placed = [];
      o.arrows.forEach(a => {
        const x2 = X(a.x * k), y2 = Y(a.y * k), w = textW(a.label, font - 2), fh = font - 1;
        const lx = Math.max(F.x0 + 2, Math.min(F.x0 + F.w - w - 2, a.x >= 0 ? x2 + 4 : x2 - 4 - w));
        const ly0 = Math.max(F.y0 + fh, Math.min(F.y0 + F.h - 3, y2 + (a.y >= 0 ? -4 : 12)));
        let ly = ly0;
        for (let t = 0; t < placed.length * 2 && placed.some(b => lx < b.x + b.w && b.x < lx + w && Math.abs(b.y - ly) < fh); t++) ly = ly + fh > F.y0 + F.h - 3 ? ly - 2 * fh : ly + fh;
        placed.push({ x: lx, y: ly, w });
        /* a label that had to move keeps a thin line to the tip of its arrow */
        const lead = Math.abs(ly - ly0) > 1 ? `<line class="fg-ref" x1="${r1(x2)}" y1="${r1(y2)}" x2="${r1(a.x >= 0 ? lx - 1 : lx + w + 1)}" y2="${r1(ly - fh / 3)}"/>` : '';
        g += `<line class="fg-arrow" x1="${r1(X(0))}" y1="${r1(Y(0))}" x2="${r1(x2)}" y2="${r1(y2)}" marker-end="url(#fga${seq})"/>${lead}<text class="txt halo" x="${r1(lx)}" y="${r1(ly)}" font-size="${font - 2}">${e(a.label)}</text>`;
      });
    }
    g += `<line class="ax" data-role="axis" x1="${F.x0}" x2="${r1(F.x0 + F.w)}" y1="${F.y0 + F.h}" y2="${F.y0 + F.h}"/><line class="ax" data-role="axis" x1="${F.x0}" x2="${F.x0}" y1="${F.y0}" y2="${F.y0 + F.h}"/>`;
    if (o.ylab) g += `<text class="flab" data-role="ylab" transform="translate(15 ${r1(F.y0 + F.h / 2)}) rotate(-90)" font-size="${font}" text-anchor="middle">${e(o.ylab)}</text>`;
    if (o.xlab) g += `<text class="flab" data-role="xlab" x="${r1(F.x0 + F.w / 2)}" y="${H - 8}" font-size="${font}" text-anchor="middle">${e(o.xlab)}</text>`;
    if (legendW) g += legend(G.map(x => ({ label: x.name, color: x.color, line: false, marker: x.shape })), F.x0 + F.w + 16, F.y0 + 14, font);
    return wrap(o, W, H, F, g, [xa, xb], [ya, yb]);
  }

  /* ---------------- boxes by group, with every point ----------------
     o.groups: [{ name, values, color }]; o.letters: a text over each box,
     above its highest point so an outlier never hides it */
  function box(o) {
    const font = o.font || 12, G = o.groups.map((g, i) => Object.assign({ color: PAL(i) }, g, { values: (g.values || []).filter(isFinite) }));
    const longest = Math.max(...G.map(g => textW(g.name, font - 1)));
    const W = o.width || Math.max(380, 80 + G.length * 58), rotate = longest > (W - 80) / G.length - 6;
    const H = o.height || 340, bottom = rotate ? Math.min(120, 30 + longest * 0.62) : 46;
    const F = { x0: 62, y0: o.title ? 34 : 16, w: W - 62 - 14, h: H - (o.title ? 34 : 16) - bottom };
    const all = [].concat(...G.map(g => g.values));
    let ya = Math.min(...all), yb = Math.max(...all);
    if (!isFinite(ya)) { ya = 0; yb = 1; }
    const pad = (yb - ya) * (o.letters ? 0.14 : 0.06) || 1;
    ya -= (yb - ya) * 0.05 || 0.5; yb += pad;
    const TY = ticks(ya, yb, 5), Y = v => F.y0 + F.h - (v - ya) / (yb - ya) * F.h, cw = F.w / G.length;
    let g = '';
    TY.ticks.forEach(t => { if (t < ya || t > yb) return; g += `<line class="grid" data-role="grid" x1="${F.x0}" x2="${r1(F.x0 + F.w)}" y1="${r1(Y(t))}" y2="${r1(Y(t))}"/><text class="tick" data-role="ytick" x="${F.x0 - 7}" y="${r1(Y(t) + 4)}" font-size="${font - 1}" text-anchor="end">${fmtT(t, TY.step)}</text>`; });
    const q = (v, p) => { const s = v.slice().sort((a, b) => a - b), h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (h - lo) * ((s[Math.min(s.length - 1, lo + 1)]) - s[lo]); };
    let jit = 7;
    G.forEach((gr, i) => {
      const cx = F.x0 + (i + 0.5) * cw, bw = Math.min(30, cw * 0.5), v = gr.values;
      if (v.length) {
        const q1 = q(v, 0.25), md = q(v, 0.5), q3 = q(v, 0.75), iqr = q3 - q1;
        const lo = Math.min(...v.filter(x => x >= q1 - 1.5 * iqr)), hi = Math.max(...v.filter(x => x <= q3 + 1.5 * iqr));
        g += `<path class="fg-err" d="M${r1(cx)} ${r1(Y(hi))}V${r1(Y(q3))}M${r1(cx)} ${r1(Y(q1))}V${r1(Y(lo))}M${r1(cx - bw / 4)} ${r1(Y(hi))}H${r1(cx + bw / 4)}M${r1(cx - bw / 4)} ${r1(Y(lo))}H${r1(cx + bw / 4)}"/>`;
        g += `<rect x="${r1(cx - bw / 2)}" y="${r1(Y(q3))}" width="${r1(bw)}" height="${r1(Math.max(1, Y(q1) - Y(q3)))}" rx="3" fill="${gr.color}" fill-opacity="0.22" stroke="${gr.color}" stroke-width="1.5"><title>${e(gr.name + ' · n = ' + v.length + ' · ' + fmtNum(md, 3))}</title></rect>`;
        g += `<line x1="${r1(cx - bw / 2)}" x2="${r1(cx + bw / 2)}" y1="${r1(Y(md))}" y2="${r1(Y(md))}" stroke="${gr.color}" stroke-width="2.6"/>`;
        v.forEach(x => { jit = (jit * 9301 + 49297) % 233280; g += `<circle cx="${r1(cx + (jit / 233280 - 0.5) * bw * 0.8)}" cy="${r1(Y(x))}" r="2.6" fill="${gr.color}" fill-opacity="0.75"><title>${e(gr.name + ': ' + fmtNum(x, 3))}</title></circle>`; });
        if (o.letters && o.letters[i]) g += `<text class="txt" x="${r1(cx)}" y="${r1(Y(Math.max(...v)) - 7)}" font-size="${font}" font-weight="700" text-anchor="middle">${e(o.letters[i])}</text>`;
      }
      g += rotate ? `<text class="tick" data-role="xtick" transform="translate(${r1(cx + 3)} ${F.y0 + F.h + 13}) rotate(-35)" font-size="${font - 1}" text-anchor="end">${e(gr.name)}</text>`
        : `<text class="tick" data-role="xtick" x="${r1(cx)}" y="${F.y0 + F.h + 16}" font-size="${font - 1}" text-anchor="middle">${e(gr.name)}</text>`;
    });
    g += `<line class="ax" data-role="axis" x1="${F.x0}" x2="${r1(F.x0 + F.w)}" y1="${F.y0 + F.h}" y2="${F.y0 + F.h}"/><line class="ax" data-role="axis" x1="${F.x0}" x2="${F.x0}" y1="${F.y0}" y2="${F.y0 + F.h}"/>`;
    if (o.ylab) g += `<text class="flab" data-role="ylab" transform="translate(15 ${r1(F.y0 + F.h / 2)}) rotate(-90)" font-size="${font}" text-anchor="middle">${e(o.ylab)}</text>`;
    return wrap(o, W, H, F, g, null, [ya, yb]);
  }

  window.Fig = { xy, bars, heat, scatter, box, legend, marker, ticks, svgString, pngBlob, pngOf, save, withLight, block, mounted, SHAPES };
})();
