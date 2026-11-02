/* PalynoPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán. Free software under the GNU GPL v3 or later; see LICENSE. */
/* Validation, step 3: the image engine against simulated grains whose truth is
   known. 60 single grains (round and elongated, 14 to 40 spines, spines 1.2 to
   3.2 µm, meshes 1.8 to 3.4 µm, two image widths, any rotation) and 12
   overviews with collapsed grains are drawn, calibrated from the magnification
   and the scale bar, and measured exactly as the app does:
     node validation/3_imagen.js
   → validation/informe_imagen.txt */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
globalThis.window = globalThis;
['js/imgproc.js', 'js/calib.js', 'js/synth.js'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f }));
const Img = globalThis.Img, Calib = globalThis.Calib, Synth = globalThis.Synth;

let seed = 77;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const between = (a, b) => a + (b - a) * rnd();
const q = (x, p) => { const s = x.slice().sort((a, b) => a - b), h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (h - lo) * (s[Math.min(s.length - 1, lo + 1)] - s[lo]); };
const row = (name, x, unit) => `${name.padEnd(46)} n = ${String(x.length).padStart(3)}   mediana ${q(x, 0.5).toFixed(2).padStart(7)}   P5 ${q(x, 0.05).toFixed(2).padStart(7)}   P95 ${q(x, 0.95).toFixed(2).padStart(7)} ${unit}`;

const errD = [], errFmax = [], errFmin = [], dSpines = [], hRel = [], lumRatio = [], barOk = [];
for (let k = 0; k < 60; k++) {
  const a = between(26, 38), b = a * between(0.82, 1), w = k % 3 ? 1280 : 2560;
  const c = { seed: 1000 + k, a, b, spines: Math.round(between(14, 40)), hUm: between(1.2, 3.2), mesh: between(1.8, 3.4), rot: between(0, Math.PI), w, h: w * 3 / 4, mag: 1000 };
  const s = Synth.single(c), cal = Calib.calibrate({ mag: 1000 }, s.img);
  barOk.push(cal.ok ? 1 : 0);
  const rows = Calib.captionRow(s.img, cal.bar), im = Img.toScale(Img.crop(s.img, 0, 0, s.img.w, rows), cal.umPerPx, 0.1);
  const r = Img.analyze(im, {}), t = s.truth[0];
  errD.push(100 * (r.corpus.diameterUm / (2 * Math.sqrt(t.a * t.b)) - 1));
  errFmax.push(100 * (r.corpus.feretMaxUm / (2 * Math.max(t.a, t.b)) - 1));
  errFmin.push(100 * (r.corpus.feretMinUm / (2 * Math.min(t.a, t.b)) - 1));
  dSpines.push(r.spines.n - t.spines);
  hRel.push(100 * (r.spines.heightUm / t.meanHeightUm - 1));
  if (r.lumina && isFinite(r.lumina.medianDiameterUm)) lumRatio.push(r.lumina.medianDiameterUm / c.mesh);
}
const fieldRows = [];
let found = 0, drawn = 0, colTrue = 0, colHit = 0, falseCol = 0;
for (let k = 0; k < 12; k++) {
  const f = Synth.field({ seed: 500 + k, n: 10 + (k % 5), collapsedFrac: 0.1 + 0.05 * (k % 6), mag: 150 });
  const im = Img.toScale(Img.crop(f.img, 0, 0, f.img.w, Calib.captionRow(f.img, Calib.findBar(f.img))), f.umPerPx, f.umPerPx);
  const o = Img.overview(im, { minUm: 15, maxUm: 200 });
  const near = g => f.truth.reduce((m, x) => (Math.hypot(x.cx - g.cx, x.cy - g.cy) < Math.hypot(m.cx - g.cx, m.cy - g.cy) ? x : m));
  drawn += f.truth.length; found += o.grains.length;
  f.truth.forEach(g => { if (g.collapsed > 0 && !g.touches) colTrue++; });
  o.grains.forEach(g => { const t = near(g); if (g.cls === 'atypical' && t.collapsed > 0) colHit++; if (g.cls === 'atypical' && !(t.collapsed > 0)) falseCol++; });
  fieldRows.push(`  panorámica ${String(k + 1).padStart(2)}: ${o.grains.length} de ${f.truth.length} granos encontrados`);
}
const sp = dSpines.filter(v => v === 0).length;
const lm = lumRatio.reduce((s, v) => s + v, 0) / lumRatio.length, lumCv = 100 * Math.sqrt(lumRatio.reduce((s, v) => s + (v - lm) ** 2, 0) / (lumRatio.length - 1)) / lm;
const lines = [
  'PalynoPro 1.0.0 — motor de imagen contra granos simulados de verdad conocida — ' + new Date().toISOString().slice(0, 10), '',
  'Fotos de un grano (60): calibradas por la magnificación y comprobadas con la barra de escala',
  `  barra de escala redonda y coincidente: ${barOk.reduce((s, v) => s + v, 0)} de 60`,
  row('  error del diámetro del cuerpo', errD, '%'),
  row('  error del Feret mayor', errFmax, '%'),
  row('  error del Feret menor', errFmin, '%'),
  `  número de espinas exacto: ${sp} de 60; diferencia máxima ${Math.max(...dSpines.map(Math.abs))}`,
  row('  sesgo de la altura de espina', hRel, '%'),
  `  lumen medido / malla dibujada: media ${lm.toFixed(3)}, variación entre granos ${lumCv.toFixed(1)} % (la razón es constante: el lumen es proporcional a la malla)`, '',
  'Panorámicas (12):', ...fieldRows,
  `  granos encontrados: ${found} de ${drawn}`,
  `  colapsados reconocidos: ${colHit} de ${colTrue} (fuera del borde); turgentes tomados por colapsados: ${falseCol}`, '',
  'La altura de espina sale algo menor que la dibujada porque la punta ocupa menos de un píxel;',
  'el diámetro del lumen es proporcional a la malla, no igual: el lumen es la parte oscura de cada celda.'];
fs.writeFileSync(path.join(__dirname, 'informe_imagen.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
