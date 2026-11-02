/* PalynoPro — manual de usuario: dibuja la portada (es/00a-portada.html).
   Una sola ilustración vectorial original, hecha con los propios motores de la app sobre su ejemplo SIMULADO (los
   tres morfotipos que dibuja js/synth.js; no son fotos de ninguna planta), para que la portada no sea un adorno sino
   una figura correcta:
     – al centro, en un campo oscuro de micrografía de barrido, el grano 01 del morfotipo B tal como lo mide la app:
       Synth lo dibuja, Calib lo calibra por la magnificación y Img.analyze lee su contorno en 720 direcciones; con
       ese perfil se dibujan, en vectores, las espinas, el cuerpo con su retículo (muros claros, lúmenes oscuros, en
       perspectiva de esfera), unos radios desde el centro, el contorno con espinas (ámbar), el cuerpo sin espinas
       (azul, discontinuo), las puntas de las espinas encontradas (rojo) y el diámetro del cuerpo medido;
     – debajo, el perfil radial del mismo grano (radio contra dirección), como lo dibuja la app;
     – la franja de los siete colores de los bloques, los mismos del manual;
     – al pie, tres viñetas: los tres morfotipos simulados con sus parámetros (Synth.GROUPS), la panorámica del
       morfotipo B clasificada por Img.overview (turgentes y colapsados) y los componentes principales de los 24
       granos medidos (las fotos repetidas de un grano se promedian, Multi.pca con las variables por omisión).
   Fondo blanco, como las demás portadas de la suite; el grano va en un campo oscuro de micrografía.
   Sin azar libre: todo sale de las semillas fijas del ejemplo.
   REGLA: nunca se usan aquí las micrografías del usuario; sólo el ejemplo simulado.
   Uso, desde la carpeta de la app (tarda cerca de un minuto: mide los 30 granos del ejemplo):
     node manual/herramientas/genera-portada.js
   La edición inglesa (en/00a-portada.html: el mismo dibujo con los textos en inglés):  … genera-portada.js --idioma en */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const APP = path.resolve(__dirname, '..', '..');

/* the app's engines, loaded as validation/3_imagen.js loads them */
const box = { console, Math, JSON, Date, Number, String, Array, Object, Map, Set, Float64Array, Float32Array, Uint8Array, Int32Array, Uint32Array, Uint16Array, Infinity, NaN, isFinite, parseFloat, parseInt };
box.window = box; vm.createContext(box);
['js/stats.js', 'js/imgproc.js', 'js/calib.js', 'js/synth.js', 'js/multi.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(APP, f), 'utf8'), box, { filename: f }));
const { Img, Calib, Synth, Multi } = box;

const EN = process.argv.includes('--idioma') && process.argv[process.argv.indexOf('--idioma') + 1] === 'en';
const L = (es, en) => (EN ? en : es);
const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);

/* ---------------- palette (css/style.css of the app, on white paper) ---------------- */
const PB = { tinta: '#141c22', gris: '#5d666e', acero: '#2f5f7a', aceroOsc: '#23485d', ambar: '#b5601d', exina: '#d9a35b', oro: '#8f6a1c', oroLin: '#b98d2c' };
const GRUPO = ['#2f5f7a', '#c0602a', '#2f7d4f'];   /* chart1–3: the colours of groups A, B and C in the app */
const BLOQUES = ['#2f5f7a', '#b5601d', '#2f7d4f', '#8e3f8e', '#b33b55', '#5a6bb5', '#8a5a22'];

/* ---------------- measuring as the app does ---------------- */
const lista = Synth.exampleList(8);
function medir(it) {
  const s = it.make(), cal = Calib.calibrate({ mag: it.mag }, s.img);
  const rows = Calib.captionRow(s.img, cal.bar), im = Img.toScale(Img.crop(s.img, 0, 0, s.img.w, rows), cal.umPerPx, 0.1);
  return { s, cal, r: Img.analyze(im, { baseUm: 3, minHeightUm: 0.3, lumen: { winUm: 1.5, k: 0.15 } }), im };
}
const itB = lista.find(it => it.group === 'B' && it.name === '01_B.png');
const G0 = medir(itB), R = G0.r, um = R.umPerPx;
const verdad = G0.s.truth[0];

/* the 24 grains of the example (30 one-grain pictures), averaged by grain, for the PCA */
const VARS = ['corp_d', 'corp_fmax', 'corp_fmin', 'corp_circ', 'spininess', 'sp_h', 'sp_density', 'lum_d', 'lum_density', 'tx_contrast', 'tx_homogeneity'];
const porGrano = new Map();
lista.filter(it => !it.overview).forEach(it => {
  const { r } = medir(it);
  if (r.error) return;
  const v = { corp_d: r.corpus.diameterUm, corp_fmax: r.corpus.feretMaxUm, corp_fmin: r.corpus.feretMinUm, corp_circ: r.corpus.circularity, spininess: r.spininess,
    sp_h: r.spines.heightUm, sp_density: r.spines.density, lum_d: r.lumina ? r.lumina.medianDiameterUm : NaN, lum_density: r.lumina ? r.lumina.densityPer100um2 : NaN,
    tx_contrast: r.texture ? r.texture.contrast : NaN, tx_homogeneity: r.texture ? r.texture.homogeneity : NaN };
  const k = it.group + it.grain;
  if (!porGrano.has(k)) porGrano.set(k, { g: it.group, v: [] });
  porGrano.get(k).v.push(VARS.map(x => v[x]));
});
const granos = [...porGrano.values()].map(o => ({ g: o.g, x: VARS.map((_, j) => o.v.reduce((s, r) => s + r[j], 0) / o.v.length) })).filter(o => o.x.every(isFinite));
const P = Multi.pca(granos.map(o => o.x));

/* the overview of morphotype B, classified */
const itF = lista.find(it => it.overview && it.group === 'B');
const F = itF.make();
const imF = Img.toScale(Img.crop(F.img, 0, 0, F.img.w, Calib.captionRow(F.img, Calib.findBar(F.img))), F.umPerPx, F.umPerPx);
const O = Img.overview(imF, { minUm: 15, maxUm: 200, solidity: 0.95, fragFactor: 0.6, aggFactor: 1.3 });

const W = 850, H = 1100;
let s = `<defs>
  <radialGradient id="fondo" cx="50%" cy="46%" r="72%"><stop offset="0" stop-color="#eef3f6"/><stop offset="0.6" stop-color="#fbfcfd"/><stop offset="1" stop-color="#ffffff"/></radialGradient>
  <linearGradient id="oro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d6ae55"/><stop offset="0.5" stop-color="#9c7320"/><stop offset="1" stop-color="#cfa548"/></linearGradient>
  <radialGradient id="campo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#2b3138"/><stop offset="0.8" stop-color="#1c2126"/><stop offset="1" stop-color="#121519"/></radialGradient>
  <radialGradient id="halo" cx="50%" cy="50%" r="50%"><stop offset="0.7" stop-color="#2f5f7a" stop-opacity="0.16"/><stop offset="1" stop-color="#2f5f7a" stop-opacity="0"/></radialGradient>
  <radialGradient id="cuerpo" cx="42%" cy="40%" r="62%"><stop offset="0" stop-color="#7f8a94"/><stop offset="0.72" stop-color="#6c7781"/><stop offset="1" stop-color="#aab4bc"/></radialGradient>
  <radialGradient id="espina" cx="50%" cy="50%" r="50%"><stop offset="0.55" stop-color="#d8dee3"/><stop offset="1" stop-color="#9ea8b0"/></radialGradient>
  <radialGradient id="cono" cx="40%" cy="38%" r="60%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#b9c2c9"/></radialGradient>
  <clipPath id="ocular"><circle cx="425" cy="528" r="170"/></clipPath>
</defs>
<rect width="${W}" height="${H}" fill="url(#fondo)"/>
<rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="url(#oro)" stroke-width="2.2"/>
<rect x="36" y="36" width="${W - 72}" height="${H - 72}" fill="none" stroke="#b98d2c" stroke-width="0.7" opacity="0.7"/>`;

/* corner ornaments: a small echinate grain in each corner (the three morphotypes and the lab default) */
const granito = (x, y, r, n, h, color, op) => {
  let d = '';
  for (let k = 0; k <= 4 * n; k++) {
    const a = k / (4 * n) * 2 * Math.PI, f = (k % 4 === 0) ? 1 + h : 1, rr = r * f;
    d += (k ? 'L' : 'M') + f1(x + rr * Math.cos(a)) + ' ' + f1(y + rr * Math.sin(a));
  }
  return `<path d="${d}Z" fill="${color}" opacity="${op == null ? 1 : op}"/>`;
};
[[62, 62, 24], [W - 62, 62, 32], [62, H - 62, 22], [W - 62, H - 62, 26]].forEach(([x, y, n]) => { s += granito(x, y, 8.5, n, 0.32, PB.oroLin, 0.9) + `<circle cx="${x}" cy="${y}" r="5" fill="#fff" opacity="0.35"/>`; });

/* ---------------- title ---------------- */
s += `<text x="${W / 2}" y="104" text-anchor="middle" font-family="Jost" font-weight="500" font-size="12.5" letter-spacing="5.5" fill="${PB.oro}">${L('LABG SUITE · CIENCIA ABIERTA EN EL NAVEGADOR', 'LABG SUITE · OPEN SCIENCE IN THE BROWSER')}</text>
<text x="${W / 2}" y="194" text-anchor="middle" font-family="Cormorant" font-weight="600" font-size="86" fill="${PB.tinta}">Palyno<tspan fill="${PB.ambar}">Pro</tspan></text>
<line x1="${W / 2 - 70}" y1="220" x2="${W / 2 + 70}" y2="220" stroke="${PB.oroLin}" stroke-width="1.4"/>`;
const LEMA_ES = 'De la micrografía electrónica a la clave polínica', LEMA_EN = 'From the electron micrograph to the pollen key';
s += EN
  ? `
<text x="${W / 2}" y="258" text-anchor="middle" font-family="Cormorant" font-weight="600" font-size="38" fill="${PB.tinta}">User’s Manual</text>
<text x="${W / 2}" y="287" text-anchor="middle" font-family="Cormorant" font-style="italic" font-weight="500" font-size="25" fill="${PB.oro}">Manual de usuario</text>
<text x="${W / 2}" y="316" text-anchor="middle" font-family="Jost" font-weight="400" font-size="15" fill="${PB.tinta}" opacity="0.9">${LEMA_EN}</text>
<text x="${W / 2}" y="335" text-anchor="middle" font-family="Cormorant" font-style="italic" font-weight="500" font-size="14" fill="${PB.gris}">${LEMA_ES}</text>`
  : `
<text x="${W / 2}" y="258" text-anchor="middle" font-family="Cormorant" font-weight="600" font-size="38" fill="${PB.tinta}">Manual de usuario</text>
<text x="${W / 2}" y="287" text-anchor="middle" font-family="Cormorant" font-style="italic" font-weight="500" font-size="25" fill="${PB.oro}">User’s Manual</text>
<text x="${W / 2}" y="316" text-anchor="middle" font-family="Jost" font-weight="400" font-size="15" fill="${PB.tinta}" opacity="0.9">${LEMA_ES}</text>
<text x="${W / 2}" y="335" text-anchor="middle" font-family="Cormorant" font-style="italic" font-weight="500" font-size="14" fill="${PB.gris}">${LEMA_EN}</text>`;

/* ---------------- the measured grain in its SEM field ---------------- */
const CX = 425, CY = 528, RAD = 170;
const n = R.radial.length;
const baseMedia = R.base.reduce((t, v) => t + v, 0) / n;
const ESC = 102 / baseMedia;                       /* svg px per image px: the body about 102 px in radius */
const PXUM = ESC / um;                              /* svg px per µm */
const ang = j => (j + 0.5) / n * 2 * Math.PI;
const ptR = (arr, j, k) => [CX + arr[j] * ESC * (k || 1) * Math.cos(ang(j)), CY + arr[j] * ESC * (k || 1) * Math.sin(ang(j))];
const anillo = (arr, paso) => { let d = ''; for (let j = 0; j < n; j += paso || 1) { const [x, y] = ptR(arr, j); d += (j ? 'L' : 'M') + f1(x) + ' ' + f1(y); } return d + 'Z'; };
const dEnv = anillo(R.radial, 1), dBase = anillo(R.base, 2);
s += `<circle cx="${CX}" cy="${CY}" r="${RAD + 26}" fill="url(#halo)"/>
<circle cx="${CX}" cy="${CY}" r="${RAD}" fill="url(#campo)"/>`;
let g = '';
/* a crack in the mount, as Synth draws it */
g += `<path d="M${CX - 150} ${CY - 120} C ${CX - 120} ${CY - 40}, ${CX - 168} ${CY + 30}, ${CX - 128} ${CY + 150}" fill="none" stroke="#0b0d10" stroke-width="1.6" opacity="0.9"/>`;
/* the spines and the outline: the measured envelope, filled */
g += `<path d="${dEnv}" fill="url(#espina)"/>`;
g += `<clipPath id="cuerpoClip"><path d="${dBase}"/></clipPath><path d="${dBase}" fill="url(#cuerpo)"/>`;
/* the reticulum: a jittered hexagonal net laid on the sphere (orthographic view), bright muri over dark lumina */
{
  const Rb = baseMedia * ESC * 1.01, mesh = verdad.mesh * PXUM, Rr = Synth.rng(20261101);
  const hx = mesh, hy = mesh * Math.sqrt(3) / 2, J = mesh * 0.18;
  const jit = new Map(), vtx = (i, j) => { const k = i + ',' + j; if (!jit.has(k)) jit.set(k, [(Rr() - 0.5) * 2 * J, (Rr() - 0.5) * 2 * J]); return jit.get(k); };
  const proy = (u, v) => { const d = Math.hypot(u, v), phi = d / Rb; if (phi >= Math.PI / 2 * 0.985) return null; const k = d > 0 ? Rb * Math.sin(phi) / d : 1; return [CX + u * k, CY + v * k]; };
  let d = '';
  const lim = Rb * Math.PI / 2;
  for (let j = -Math.ceil(lim / hy) - 1; j <= Math.ceil(lim / hy) + 1; j++) for (let i = -Math.ceil(lim / hx) - 1; i <= Math.ceil(lim / hx) + 1; i++) {
    const cu = i * hx + (j & 1 ? hx / 2 : 0), cv = j * hy;
    if (Math.hypot(cu, cv) > lim) continue;
    const ps = [];
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 6 + k * Math.PI / 3, r0 = mesh / Math.sqrt(3);
      const vu = cu + r0 * Math.cos(a), vv = cv + r0 * Math.sin(a), [ju, jv] = vtx(Math.round(vu * 8), Math.round(vv * 8));
      const p = proy(vu + ju, vv + jv); if (!p) { ps.length = 0; break; } ps.push(p);
    }
    if (ps.length === 6) d += 'M' + ps.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
  }
  g += `<g clip-path="url(#cuerpoClip)"><path d="${d}" fill="#3e474f" fill-opacity="0.62" stroke="#e3e8ec" stroke-width="1.15" stroke-linejoin="round" stroke-opacity="0.85"/>`;
  /* spines on the face, seen from above: bright cones, smaller towards the rim */
  for (let k = 0; k < 26; k++) {
    const t = Rr() * 2 * Math.PI, q = Math.sqrt(Rr()) * 0.9, phi = q * Math.PI / 2, rr = Rb * Math.sin(phi);
    const r0 = (1.6 + 0.9 * Rr()) * PXUM * 0.55 * Math.cos(phi * 0.9);
    g += `<circle cx="${f1(CX + rr * Math.cos(t))}" cy="${f1(CY + rr * Math.sin(t))}" r="${f1(Math.max(1.2, r0))}" fill="url(#cono)"/>`;
  }
  /* a soft rim light, as secondary electrons brighten the edge */
  g += `<path d="${dBase}" fill="none" stroke="#e8ecef" stroke-opacity="0.5" stroke-width="5"/></g>`;
}
/* the overlays of the app: radii, outline with spines, body without spines, tips of the spines */
for (let k = 0; k < 16; k++) { const j = Math.round(k * n / 16 + n / 64) % n; const [x, y] = ptR(R.radial, j); g += `<line x1="${CX}" y1="${CY}" x2="${f1(x)}" y2="${f1(y)}" stroke="#ffffff" stroke-opacity="0.32" stroke-width="0.7"/>`; }
g += `<circle cx="${CX}" cy="${CY}" r="2.2" fill="#ffffff" opacity="0.8"/>`;
g += `<path d="${dEnv}" fill="none" stroke="#f0a020" stroke-width="1.3"/>`;
g += `<path d="${dBase}" fill="none" stroke="#19b4e8" stroke-width="1.9" stroke-dasharray="6 4"/>`;
R.peaks.forEach(j => { const [x, y] = ptR(R.radial, j); g += `<circle cx="${f1(x)}" cy="${f1(y)}" r="2.6" fill="#e8384f" stroke="#1c2126" stroke-width="0.5"/>`; });
/* the measured corpus diameter, under the grain */
{
  const D = R.corpus.diameterUm * PXUM, y = CY + baseMedia * ESC + 30;
  g += `<g stroke="#19b4e8" stroke-width="1.1"><line x1="${f1(CX - D / 2)}" y1="${f1(y)}" x2="${f1(CX + D / 2)}" y2="${f1(y)}"/><line x1="${f1(CX - D / 2)}" y1="${f1(y - 5)}" x2="${f1(CX - D / 2)}" y2="${f1(y + 5)}"/><line x1="${f1(CX + D / 2)}" y1="${f1(y - 5)}" x2="${f1(CX + D / 2)}" y2="${f1(y + 5)}"/></g>`;
  g += `<text x="${CX}" y="${f1(y - 5)}" text-anchor="middle" font-family="Jost" font-size="9" fill="#e8ecef">${L('cuerpo', 'body')} ${f1(R.corpus.diameterUm)} µm</text>`;
}
s += `<g clip-path="url(#ocular)">${g}</g>`;
s += `<circle cx="${CX}" cy="${CY}" r="${RAD}" fill="none" stroke="url(#oro)" stroke-width="1.6"/>
<circle cx="${CX}" cy="${CY}" r="${RAD + 7}" fill="none" stroke="#b98d2c" stroke-width="0.6" opacity="0.7"/>`;
/* scale bar of 10 µm inside the field */
s += `<line x1="${f1(CX - 5 * PXUM)}" y1="${CY - 142}" x2="${f1(CX + 5 * PXUM)}" y2="${CY - 142}" stroke="#e8ecef" stroke-width="2.4"/>
<text x="${CX}" y="${CY - 148}" text-anchor="middle" font-family="Jost" font-size="9" fill="#e8ecef">10 µm</text>`;
/* legends outside the field */
s += `<g font-family="Jost" font-size="10" fill="${PB.tinta}">
<line x1="${CX + 190}" y1="${CY - 121}" x2="${CX + 204}" y2="${CY - 121}" stroke="#e08a10" stroke-width="2"/><text x="${CX + 210}" y="${CY - 117.5}">${L('contorno', 'outline')}</text>
<line x1="${CX + 190}" y1="${CY - 101}" x2="${CX + 204}" y2="${CY - 101}" stroke="#1597c4" stroke-width="2" stroke-dasharray="4 2.5"/><text x="${CX + 210}" y="${CY - 97.5}">${L('cuerpo', 'body')}</text>
<circle cx="${CX + 197}" cy="${CY - 81}" r="3.4" fill="#e8384f"/><text x="${CX + 210}" y="${CY - 77.5}">${L('espinas', 'spines')}</text></g>
<text x="${CX - 192}" y="${CY - 116}" text-anchor="end" font-family="Cormorant" font-style="italic" font-size="17" fill="${PB.tinta}">${L('Morfotipo B', 'Morphotype B')}</text>
<text x="${CX - 192}" y="${CY - 99}" text-anchor="end" font-family="Jost" font-size="10" fill="${PB.oro}">${R.spines.n} ${L('espinas medidas', 'spines measured')}</text>
<text x="${CX - 192}" y="${CY - 85}" text-anchor="end" font-family="Jost" font-size="8.5" fill="${PB.gris}">${L('ejemplo simulado', 'simulated example')}</text>`;

/* ---------------- the radial profile ---------------- */
{
  const x0 = 175, x1 = 675, y0 = 738, y1 = 830;
  const vals = [].concat(Array.from(R.radial), Array.from(R.base)).map(v => v * um);
  const lo = Math.floor(Math.min(...vals) - 1), hi = Math.ceil(Math.max(...vals) + 0.5);
  const gx = j => x0 + (j + 0.5) / n * (x1 - x0), gy = v => y1 - (v * um - lo) / (hi - lo) * (y1 - y0);
  const linea = (arr, paso) => { let d = ''; for (let j = 0; j < n; j += paso) d += (j ? 'L' : 'M') + f1(gx(j)) + ' ' + f1(gy(arr[j])); return d; };
  let p = `<rect x="${x0}" y="${y0 - 6}" width="${x1 - x0}" height="${y1 - y0 + 6}" fill="#ffffff" stroke="${PB.oroLin}" stroke-opacity="0.5" stroke-width="0.6"/>`;
  [0, 90, 180, 270, 360].forEach(a => { const x = x0 + a / 360 * (x1 - x0); p += `<line x1="${f1(x)}" y1="${y1}" x2="${f1(x)}" y2="${y1 + 4}" stroke="${PB.tinta}" stroke-opacity="0.5"/><text x="${f1(x)}" y="${y1 + 14}" text-anchor="middle" font-family="Jost" font-size="7.5" fill="${PB.gris}">${a}°</text>`; });
  [lo, hi].forEach(v => { p += `<text x="${x0 - 5}" y="${f1(y1 - (v - lo) / (hi - lo) * (y1 - y0) + 3)}" text-anchor="end" font-family="Jost" font-size="7.5" fill="${PB.gris}">${v}</text>`; });
  p += `<path d="${linea(R.radial, 1)}" fill="none" stroke="${PB.ambar}" stroke-width="1.1"/>`;
  p += `<path d="${linea(R.base, 2)}" fill="none" stroke="${PB.acero}" stroke-width="1.8" stroke-dasharray="5 3"/>`;
  R.peaks.forEach(j => { p += `<circle cx="${f1(gx(j))}" cy="${f1(gy(R.radial[j]))}" r="1.9" fill="#d12a44"/>`; });
  p += `<text x="${x0 - 22}" y="${(y0 + y1) / 2}" text-anchor="middle" font-family="Jost" font-size="7.5" fill="${PB.gris}" transform="rotate(-90 ${x0 - 22} ${(y0 + y1) / 2})">${L('radio (µm)', 'radius (µm)')}</text>`;
  p += `<text x="${W / 2}" y="${y0 - 12}" text-anchor="middle" font-family="Jost" font-weight="500" font-size="8.5" letter-spacing="2" fill="${PB.oro}">${L('PERFIL RADIAL · 720 DIRECCIONES', 'RADIAL PROFILE · 720 DIRECTIONS')}</text>`;
  s += p;
}

/* ---------------- the strip of the seven block colours ---------------- */
BLOQUES.forEach((c, i) => { s += `<rect x="${f1(150 + i * 79.3)}" y="868" width="76" height="6" fill="${c}"/>`; });

/* ---------------- three vignettes ---------------- */
const vin = (x, titulo, gg) => `<g transform="translate(${x} 886)"><rect width="176" height="110" rx="6" fill="#f7f9fb" stroke="#b98d2c" stroke-opacity="0.7" stroke-width="0.8"/>${gg}<text x="88" y="101" text-anchor="middle" font-family="Jost" font-weight="500" font-size="8.5" letter-spacing="2" fill="${PB.oro}">${titulo}</text></g>`;
/* 1 · the three simulated morphotypes, drawn from their parameters (Synth.GROUPS) */
{
  let gg = '';
  Synth.GROUPS.forEach((Gp, i) => {
    const x = 32 + i * 56, y = 46, r = Gp.a * 0.62;
    gg += granito(x, y, r, Gp.spines, Gp.hUm * 0.62 / r * 1.6, GRUPO[i]);
    gg += `<ellipse cx="${x}" cy="${y}" rx="${f1(r)}" ry="${f1(r * Gp.ab)}" fill="${GRUPO[i]}"/><circle cx="${f1(x - r * 0.3)}" cy="${f1(y - r * 0.32)}" r="${f1(r * 0.28)}" fill="#fff" opacity="0.28"/>`;
    gg += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-family="Jost" font-weight="600" font-size="11" fill="#fff">${Gp.code}</text>`;
    gg += `<text x="${x}" y="${y + 36}" text-anchor="middle" font-family="Jost" font-size="6.8" fill="${PB.tinta}">${Gp.spines} ${L('esp.', 'sp.')} · ${f1(Gp.hUm)} µm</text>`;
  });
  s += vin(130, L('TRES MORFOTIPOS', 'THREE MORPHOTYPES'), gg);
}
/* 2 · the overview of morphotype B, classified by solidity (Img.overview) */
{
  const sx = 160 / O.w, sy = 68 / (O.h), k = Math.min(sx, sy), ox = 8 + (160 - O.w * k) / 2, oy = 6;
  const COL = { turgid: '#3fa86a', atypical: '#d6334d', aggregate: '#9b7be0', fragment: '#e0b030', edge: '#9aa4ac' };
  let gg = `<rect x="${f1(ox)}" y="${oy}" width="${f1(O.w * k)}" height="${f1(O.h * k)}" rx="3" fill="#1c2126"/>`;
  O.grains.forEach(gr => {
    const r = gr.diameterUm / F.umPerPx / 2 * k, a = gr.cls === 'atypical' ? 0.62 : 1;
    gg += `<ellipse cx="${f1(ox + gr.cx * k)}" cy="${f1(oy + gr.cy * k)}" rx="${f1(r)}" ry="${f1(r * a)}" fill="${COL[gr.cls] || '#9aa4ac'}" stroke="#ffffff" stroke-opacity="0.5" stroke-width="0.4"/>`;
  });
  const cont = O.grains.filter(x => x.cls === 'turgid' || x.cls === 'atypical'), col = cont.filter(x => x.cls === 'atypical').length;
  gg += `<text x="88" y="${f1(oy + O.h * k + 10)}" text-anchor="middle" font-family="Jost" font-size="7" fill="${PB.tinta}">${col} / ${cont.length} ${L('colapsados', 'collapsed')}</text>`;
  s += vin(337, L('LA FERTILIDAD', 'FERTILITY'), gg);
}
/* 3 · principal components of the 24 measured grains */
{
  const sc = P.scores, xs = sc.map(r => r[0]), ys = sc.map(r => r[1]);
  const mx = Math.max(...xs.map(Math.abs)) * 1.12, my = Math.max(...ys.map(Math.abs)) * 1.15;
  const gx = v => 88 + v / mx * 70, gy = v => 42 - v / my * 32;
  let gg = `<line x1="16" y1="42" x2="160" y2="42" stroke="${PB.tinta}" stroke-opacity="0.25" stroke-width="0.6"/><line x1="88" y1="9" x2="88" y2="76" stroke="${PB.tinta}" stroke-opacity="0.25" stroke-width="0.6"/>`;
  granos.forEach((o, i) => { gg += `<circle cx="${f1(gx(xs[i]))}" cy="${f1(gy(ys[i]))}" r="2.6" fill="${GRUPO['ABC'.indexOf(o.g)]}" fill-opacity="0.9"/>`; });
  gg += `<text x="88" y="86" text-anchor="middle" font-family="Jost" font-size="7" fill="${PB.tinta}">${L('CP', 'PC')}1 ${f1(P.pct[0])}${L(' %', '%')} · ${L('CP', 'PC')}2 ${f1(P.pct[1])}${L(' %', '%')}</text>`;
  s += vin(544, L('LA COMPARACIÓN', 'THE COMPARISON'), gg);
}

/* ---------------- footer ---------------- */
s += `<text x="${W / 2}" y="1030" text-anchor="middle" font-family="Jost" font-weight="400" font-size="12" letter-spacing="2.5" fill="${PB.tinta}" opacity="0.9">LUIS ÁNGEL BARRERA-GUZMÁN</text>
<text x="${W / 2}" y="1049" text-anchor="middle" font-family="Jost" font-weight="400" font-size="10" letter-spacing="1.5" fill="${PB.oro}">${L('PRIMERA EDICIÓN · 2026 · VERSIÓN 1.0', 'FIRST ENGLISH EDITION · 2026 · VERSION 1.0')}</text>`;

const html = `<!doctype html>
<html lang="${L('es', 'en')}">
<head>
<meta charset="utf-8">
<title>${L('PalynoPro · Manual de usuario · Portada', 'PalynoPro · User’s Manual · Cover')}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,500;0,600;1,500&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../manual.css">
<!-- dibujada por herramientas/genera-portada.js${L('', ' --idioma en')}: no se edita a mano -->
</head>
<body>
<section class="page cover" aria-label="${L('Portada', 'Cover')}">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${L('Portada del manual de PalynoPro: un grano de polen equinado y reticulado del ejemplo simulado, medido por la app, con su contorno, su cuerpo sin espinas y las puntas de las espinas; su perfil radial y tres viñetas (los tres morfotipos, la fertilidad y la comparación)', 'Cover of the PalynoPro manual: an echinate, reticulate pollen grain of the simulated example, measured by the app, with its outline, its body without spines and the tips of the spines; its radial profile and three vignettes (the three morphotypes, fertility and the comparison)')}">
${s}
</svg>
</section>
</body>
</html>
`;
fs.writeFileSync(path.join(APP, 'manual', EN ? 'en' : 'es', '00a-portada.html'), html);
console.log('portada:', itB.name, '· cuerpo', f2(R.corpus.diameterUm), 'µm (dibujado', f2(2 * Math.sqrt(verdad.a * verdad.b)) + ') · espinas', R.spines.n, 'de', verdad.spines,
  '· granos para el ACP', granos.length, '· CP1', f1(P.pct[0]), '% · panorámica', O.grains.length, 'regiones ·', (html.length / 1024).toFixed(0) + ' KB');
