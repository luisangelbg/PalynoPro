/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — global state and shared utilities.
   No ES modules: everything hangs from window, so the app also works when
   index.html is opened with a double click (file://). */

const APP_VERSION = '1.0.0';
const APP_NAME = 'PalynoPro';

/* Everything the user chooses lives in `state.set`; the images (their files
   are never copied: the app keeps a reference to what the user opened) in
   `state.images`; what the blocks compute in `state.results`. A saved project
   keeps the settings, the list of images with their groups, calibration and
   exclusions, and the results, so it opens with its tables and figures; to
   look at the pictures again the same folder is opened. */
function emptyState() {
  return {
    meta: { title: '', analyst: '', lab: '', species: '', notes: '' },
    set: {
      refMm: 128,                 /* reference width of the frame (mm) */
      pattern: '',                /* how group and grain are read from the name ('' = the default) */
      tierLo: 0.6, tierHi: 1.8,   /* overview / detail, relative to the median magnification */
      targetUm: null,             /* µm per pixel of the analysis (null = automatic) */
      baseUm: 3, minHeightUm: 0.3,
      lumenWin: 1.5, lumenK: 0.15,
      maxCut: 0.02,               /* most of the outline that may be cut by the frame */
      solidity: 0.95,             /* overview: least solidity of the body of a turgid grain */
      fragFactor: 0.6, aggFactor: 1.3,   /* overview: fragments and aggregates, relative to the typical grain */
      minGrainUm: 15, maxGrainUm: 200,
      vars: null,                 /* variables of the multivariate block (null = the default set) */
      unit: 'grain',
      ntree: 500, nperm: 999, seed: 1,
      reportLang: null,           /* language of the report: 'es', 'en' or null (that of the screen) */
    },
    groups: {},                   /* code → name */
    images: [],
    results: { images: {}, fertility: null, stats: null },
    example: null,
  };
}
const state = emptyState();
window.state = state;

const STEPS = [
  { n: 1, es: 'Inicio', en: 'Home', ready: true },
  { n: 2, es: 'Imágenes y calibración', en: 'Images and calibration', ready: true },
  { n: 3, es: 'Contorno y tamaño', en: 'Outline and size', ready: true },
  { n: 4, es: 'Ornamentación', en: 'Ornamentation', ready: true },
  { n: 5, es: 'Fertilidad', en: 'Fertility', ready: true },
  { n: 6, es: 'Estadística multivariada', en: 'Multivariate statistics', ready: true },
  { n: 7, es: 'Informe', en: 'Report', ready: true },
];

/* ---------------- the measures of a grain ----------------
   key, label (es, en), unit, block, in the default multivariate set */
const METRICS = [
  { k: 'corp_d', es: 'Diámetro del cuerpo', en: 'Body diameter', u: 'µm', b: 3, d: 2, mv: true },
  { k: 'corp_fmax', es: 'Diámetro mayor del cuerpo (Feret)', en: 'Body major diameter (Feret)', u: 'µm', b: 3, d: 2, mv: true },
  { k: 'corp_fmin', es: 'Diámetro menor del cuerpo (Feret)', en: 'Body minor diameter (Feret)', u: 'µm', b: 3, d: 2, mv: true },
  { k: 'corp_aspect', es: 'Elongación del cuerpo (mayor/menor)', en: 'Body elongation (major/minor)', u: '', b: 3, d: 3, mv: false },
  { k: 'corp_circ', es: 'Circularidad del cuerpo', en: 'Body circularity', u: '', b: 3, d: 3, mv: true },
  { k: 'env_d', es: 'Diámetro con espinas', en: 'Diameter with spines', u: 'µm', b: 3, d: 2, mv: false },
  { k: 'spininess', es: 'Área de espinas / área del cuerpo', en: 'Spine area / body area', u: '', b: 4, d: 4, mv: true },
  { k: 'sp_n', es: 'Espinas en el contorno', en: 'Spines on the outline', u: '', b: 4, d: 1, mv: false },
  { k: 'sp_h', es: 'Altura media de espina', en: 'Mean spine height', u: 'µm', b: 4, d: 3, mv: true },
  { k: 'sp_spacing', es: 'Espaciado entre espinas', en: 'Spacing between spines', u: 'µm', b: 4, d: 2, mv: false },
  { k: 'sp_density', es: 'Densidad de espinas', en: 'Spine density', u: '/100 µm', b: 4, d: 2, mv: true },
  { k: 'lum_d', es: 'Diámetro de lumen (mediana)', en: 'Lumen diameter (median)', u: 'µm', b: 4, d: 3, mv: true },
  { k: 'lum_density', es: 'Densidad de lúmenes', en: 'Lumen density', u: '/100 µm²', b: 4, d: 1, mv: true },
  { k: 'lum_cv', es: 'Variación del lumen (CV)', en: 'Lumen variation (CV)', u: '', b: 4, d: 3, mv: false },
  { k: 'tx_contrast', es: 'Textura: contraste', en: 'Texture: contrast', u: '', b: 4, d: 2, mv: true },
  { k: 'tx_homogeneity', es: 'Textura: homogeneidad', en: 'Texture: homogeneity', u: '', b: 4, d: 4, mv: true },
  { k: 'tx_entropy', es: 'Textura: entropía', en: 'Texture: entropy', u: '', b: 4, d: 3, mv: false },
  { k: 'tx_correlation', es: 'Textura: correlación', en: 'Texture: correlation', u: '', b: 4, d: 4, mv: false },
  { k: 'tx_energy', es: 'Textura: energía', en: 'Texture: energy', u: '', b: 4, d: 4, mv: false },
];
const metric = k => METRICS.find(m => m.k === k);
/* the unit apart, so that uppercase labels do not turn µm into MM */
const metricDt = k => { const m = metric(k); if (!m) return esc(k); return esc(T(m.es, m.en)) + (m.u ? ' <span class="nocase">(' + esc(m.u) + ')</span>' : ''); };
const metricLabel = (k, withUnit) => { const m = metric(k); if (!m) return k; const t = T(m.es, m.en); return withUnit && m.u ? t + ' (' + m.u + ')' : t; };

/* ---------------- DOM ---------------- */
function el(id) { return document.getElementById(id); }
function els(sel, root) { return [...(root || document).querySelectorAll(sel)]; }
function mk(tag, attrs, html) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'style') n.setAttribute('style', attrs[k]);
    else if (k.startsWith('on') && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  }
  if (html != null) n.innerHTML = html;
  return n;
}
function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function L2(es, en) { return `<span data-l="es">${es}</span><span data-l="en">${en}</span>`; }
function showMessage(container, type, text, fix) {
  if (typeof container === 'string') container = el(container);
  if (!container) return null;
  const div = mk('div', { class: 'msg msg-' + type }, text + (fix ? `<div class="msg-fix">${fix}</div>` : ''));
  if (window.LABG) LABG.messageRole(div, type);
  container.appendChild(div);
  return div;
}
function clearMessages(container) { if (typeof container === 'string') container = el(container); if (container) container.innerHTML = ''; }
function toast(text, type) { if (window.LABG) LABG.toast(text, { type: type || 'info' }); }
function statTiles(container, tiles) {
  if (typeof container === 'string') container = el(container);
  if (!container) return;
  container.innerHTML = '';
  container.classList.add('results-summary');
  tiles.forEach(t => {
    if (!t) return;
    const [label, value, sub, level] = Array.isArray(t) ? t : [t.label, t.value, t.sub, t.level];
    const d = mk('div', { class: 'stat-tile' + (level ? ' ' + level : '') });
    d.innerHTML = `<div class="stat-label">${label}</div><div class="stat-value">${value}</div>` + (sub ? `<div class="stat-sub">${sub}</div>` : '');
    container.appendChild(d);
  });
}
/* columns: [{ key, label, get?, fmt?, num?, html?, cls? }] */
function buildTable(container, columns, rows, opts) {
  opts = opts || {};
  if (typeof container === 'string') container = el(container);
  if (!container) return null;
  container.innerHTML = '';
  const table = mk('table');
  if (opts.className) table.className = opts.className;
  if (opts.caption) table.appendChild(mk('caption', null, opts.caption));
  const thead = mk('thead'), trh = mk('tr');
  columns.forEach(c => { const th = mk('th', { class: c.num ? 'num' : null, scope: 'col' }); th.innerHTML = c.label != null ? c.label : c.key; trh.appendChild(th); });
  thead.appendChild(trh); table.appendChild(thead);
  const tbody = mk('tbody');
  rows.forEach(r => {
    const tr = mk('tr');
    if (r && r._class) tr.className = r._class;
    if (r && r._id) tr.dataset.id = r._id;
    columns.forEach((c, ci) => {
      const td = mk(ci === 0 && opts.rowHead ? 'th' : 'td', { class: [c.num ? 'num' : '', c.cls || ''].join(' ').trim() || null, scope: ci === 0 && opts.rowHead ? 'row' : null });
      let v = c.get ? c.get(r) : r[c.key];
      if (c.html) { td.innerHTML = v == null || v === '' ? '—' : v; tr.appendChild(td); return; }
      if (c.fmt && v != null && v !== '') v = c.fmt(v);
      td.textContent = (v === null || v === undefined || v === '' || (typeof v === 'number' && !isFinite(v))) ? '—' : v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  if (opts.foot) { const tf = mk('tfoot'); tf.innerHTML = opts.foot; table.appendChild(tf); }
  container.appendChild(table);
  return table;
}

/* ---------------- numbers ---------------- */
function fmtNum(v, d) {
  if (v === null || v === undefined || v === '' || (typeof v === 'number' && !isFinite(v))) return '—';
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs < 1e-4 || abs >= 1e9) { const e = n.toExponential(d != null ? d : 2); return e.startsWith('-') ? '−' + e.slice(1) : e; }
  const s = n.toLocaleString('en-US', { maximumFractionDigits: d != null ? d : 3, useGrouping: abs >= 1e4 });
  if (/^-0(\.0*)?$/.test(s)) return s.slice(1);
  return s.startsWith('-') ? '−' + s.slice(1) : s;
}
function fmtFixed(v, d) {
  if (v == null || v === '' || !isFinite(v)) return '—';
  const s = Number(v).toFixed(d == null ? 3 : d);
  if (/^-0(\.0*)?$/.test(s)) return s.slice(1);
  return s.startsWith('-') ? '−' + s.slice(1) : s;
}
function fmtP(p) { if (p == null || !isFinite(p)) return '—'; if (p < 0.001) return '< 0.001'; return p.toFixed(3); }
function pEq(p) { const s = fmtP(p); return s.startsWith('<') ? 'p ' + s : 'p = ' + s; }
function fmtMS(m, s, d) { if (m == null || !isFinite(m)) return '—'; return fmtFixed(m, d == null ? 2 : d) + (s != null && isFinite(s) ? ' ± ' + fmtFixed(s, d == null ? 2 : d) : ''); }
/* a percentage: «95 %» in Spanish, «95%» in English (lang: the language of the text, by default that of the screen) */
const pctSign = lang => ((lang || I18N.lang) === 'en' ? '%' : ' %');
function fmtPct(v, d, lang) { return v == null || !isFinite(v) ? '—' : fmtFixed(100 * v, d == null ? 1 : d) + pctSign(lang); }
const num = v => { if (v == null || v === '') return NaN; return Number(String(v).trim().replace(/\s+/g, '').replace(',', '.')); };

/* ---------------- files ---------------- */
function download(content, filename, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = mk('a', { href: url, download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function slug(s) {
  return String(s || 'palynopro').replace(/\.[^.]+$/, '').normalize('NFD').replace(new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g'), '')
    .replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'palynopro';
}
function csvOf(columns, rows) {
  const q = v => { const s = v == null || (typeof v === 'number' && !isFinite(v)) ? '' : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return String.fromCharCode(0xFEFF) + [columns.map(c => q(c.label)).join(',')].concat(rows.map(r => columns.map(c => q(c.get ? c.get(r) : r[c.key])).join(','))).join('\n');
}

/* ---------------- step navigation ---------------- */
function goStep(n) {
  n = String(n);
  if (!el('panel-' + n)) return;
  els('.step-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + n));
  els('.step-btn').forEach(b => b.classList.toggle('active', b.dataset.step === n));
  document.body.classList.toggle('on-home', n === '1');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const btn = stepBtn(n);
  if (window.LABG) { LABG.setCurrentStep(n); if (btn) LABG.announce(T('Bloque ', 'Block ') + stepName(n)); }
  refreshStepMarks();
  refreshStepFooters();
  document.dispatchEvent(new CustomEvent('stepchange', { detail: { step: Number(n) } }));
}
const stepBtn = n => document.querySelector('.step-btn[data-step="' + n + '"]');
const stepOn = n => { const b = stepBtn(n); return !!b && !b.disabled; };
const currentStep = () => Number((document.querySelector('.step-panel.active') || { id: 'panel-1' }).id.replace('panel-', ''));
function stepName(n) { const s = STEPS.find(x => String(x.n) === String(n)); return s ? s.n + ' · ' + T(s.es, s.en) : String(n); }

/* a block is done when it has its result */
const DONE = {
  2: () => state.images.some(r => r.calib && r.calib.umPerPx > 0),
  3: () => Object.keys(state.results.images).length > 0,
  4: () => Object.values(state.results.images).some(r => r.metrics && isFinite(r.metrics.sp_n)),
  5: () => !!state.results.fertility,
  6: () => !!state.results.stats,
  7: () => !!state.results.reportMade,
};
function refreshStepMarks() { if (!window.LABG) return; STEPS.forEach(s => { if (s.n > 1) LABG.markStep(s.n, stepOn(s.n) && DONE[s.n] && DONE[s.n]() ? 'done' : null); }); }
function refreshStepFooters() {
  if (!window.LABG) return;
  els('.step-panel').forEach(p => {
    const n = Number(p.id.replace('panel-', ''));
    const i = STEPS.findIndex(s => s.n === n);
    if (i < 0) return;
    let f = p.querySelector(':scope > .step-footer');
    if (!f) {
      f = mk('nav', { class: 'step-footer no-print' });
      f.innerHTML = '<button type="button" class="btn btn-secondary prev"></button><button type="button" class="btn btn-primary next"></button>';
      f.addEventListener('click', e => { const b = e.target.closest('button[data-to]'); if (b && !b.disabled) goStep(b.dataset.to); });
      p.appendChild(f);
    } else p.appendChild(f);
    f.setAttribute('aria-label', T('Bloques', 'Blocks'));
    const prev = STEPS.slice(0, i).reverse().find(s => stepOn(s.n)), next = STEPS.slice(i + 1).find(s => stepOn(s.n));
    const label = s => L2(s.n + ' · ' + s.es, s.n + ' · ' + s.en);
    const bp = f.querySelector('.prev'), bn = f.querySelector('.next');
    bp.hidden = !prev;
    if (prev) { bp.dataset.to = prev.n; bp.innerHTML = `← <span><small>${L2('Anterior', 'Previous')}</small>${label(prev)}</span>`; }
    bn.hidden = !next;
    if (next) { bn.dataset.to = next.n; bn.innerHTML = `<span><small>${L2('Siguiente', 'Next')}</small>${label(next)}</span> →`; }
  });
}
function blockDone() { refreshStepMarks(); refreshStepFooters(); }

/* ---------------- groups, grains, images ---------------- */
const included = r => !r.exclude && r.calib && r.calib.umPerPx > 0;
const groupName = code => state.groups[code] || code || T('sin grupo', 'no group');
const groupCodes = () => [...new Set(state.images.filter(r => r.group).map(r => r.group))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const unitOf = r => (r.group || '?') + '·' + (r.grain || r.stem);

/* ---------------- the project ---------------- */
function projectObject() {
  const images = state.images.map(r => ({ name: r.name, stem: r.stem, group: r.group, grain: r.grain, mag: r.mag, indexUmPerPx: r.indexUmPerPx, manualUmPerPx: r.manualUmPerPx, tier: r.tier, tierAuto: r.tierAuto, tierManual: r.tierManual, groupFrom: r.groupFrom, grainFrom: r.grainFrom, isOverview: r.isOverview, captionRow: r.captionRow, nativeUm: r.nativeUm, thumb: r.thumb, exclude: r.exclude, note: r.note, w: r.w, h: r.h, meta: r.meta, calib: r.calib && { umPerPx: r.calib.umPerPx, source: r.calib.source, bar: r.calib.bar, barUm: r.calib.barUm, nice: r.calib.nice, ok: r.calib.ok, replaced: r.calib.replaced }, synth: r.src && r.src.kind === 'synth' ? r.synthIndex : null }));
  const res = {};
  state.images.forEach(r => { const v = state.results.images[r.id]; if (!v) return; res[r.name] = { metrics: v.metrics, qc: v.qc, error: v.error, radial: v.radial && Array.from(v.radial, x => Math.round(x * 100) / 100), base: v.base && Array.from(v.base, x => Math.round(x * 100) / 100), peaks: v.peaks, workUm: v.workUm, center: v.center }; });
  return { app: APP_NAME, format: 1, version: APP_VERSION, saved: new Date().toISOString(), data: { meta: state.meta, set: state.set, groups: state.groups, images, example: state.example, results: { images: res, fertility: state.results.fertility } } };
}
function saveProjectFile() {
  const name = slug(state.meta.title || T('proyecto', 'project')) + '.palynopro.json';
  download(JSON.stringify(projectObject(), null, 1), name, 'application/json');
  /* what the file does not keep, said where it is saved: the comparison of Block 6 (it comes out the same again with its seed) and the ✎ edits of the figures (they stay in this browser) */
  toast(T('Proyecto guardado: ', 'Project saved: ') + name + T('. No guarda los resultados del Bloque 6 (al abrirlo, «Comparar los grupos» los repite iguales) ni las ediciones ✎ de las figuras, que se quedan en este navegador.', '. It does not keep the results of Block 6 (on opening it, "Compare the groups" repeats them the same) nor the ✎ edits of the figures, which stay in this browser.'), 'success');
}
function hasData() { return state.images.length > 0; }

/* ---------------- colors of the groups ---------------- */
const SERIES = ['var(--chart1)', 'var(--chart2)', 'var(--chart3)', 'var(--chart4)', 'var(--chart5)', 'var(--chart6)', 'var(--chart7)', 'var(--chart8)', 'var(--chart9)', 'var(--chart10)'];
const seriesColor = i => SERIES[((i % SERIES.length) + SERIES.length) % SERIES.length];
const groupColor = code => seriesColor(Math.max(0, groupCodes().indexOf(code)));

/* ---------------- common bar of the LABG Suite ---------------- */
function paintCommonBar() { if (!window.LABG) return; LABG.theme.paint(); const nav = el('stepper'); if (nav) nav.setAttribute('aria-label', T('Bloques', 'Blocks')); }
document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
  if (!window.LABG) return;
  LABG.theme.init('palynopro.theme');
  const tb = el('themeBtn');
  if (tb) tb.addEventListener('click', () => LABG.theme.toggle());
  if (LABG.work) {
    LABG.work.scene = 'cluster';
    LABG.work.tips = [
      ['El tamaño de un píxel depende del ancho con que se guardó la foto: a la misma magnificación, una imagen de 1280 px tiene píxeles del doble que una de 2560 px.', 'The size of a pixel depends on the width at which the picture was saved: at the same magnification a 1280-px image has pixels twice as large as a 2560-px one.'],
      ['Un grano fotografiado dos veces es una sola unidad: la validación cruzada deja fuera el grano completo, no la foto.', 'A grain photographed twice is a single unit: cross-validation leaves out the whole grain, not the picture.'],
      ['El cuerpo (corpus) se mide sin espinas: es la silueta que queda al recortar todo pico más angosto que la base de una espina.', 'The body is measured without spines: it is the outline left after cutting every peak narrower than the base of a spine.'],
      ['Cada barra de escala se comprueba: su largo por el tamaño del píxel debe dar una longitud redonda (10, 20, 50 µm…).', 'Every scale bar is checked: its length times the pixel size must give a round length (10, 20, 50 µm…).'],
    ];
  }
  const hb = el('helpBtn');
  if (hb) hb.addEventListener('click', () => LABG.showShortcuts());
  LABG.shortcuts([
    { keys: ['Ctrl', 'S'], es: 'Guardar el proyecto (JSON)', en: 'Save the project (JSON)' },
    { keys: ['Ctrl', 'O'], es: 'Abrir un proyecto', en: 'Open a project' },
  ]);
  LABG.bindStepKeys(goStep);
  LABG.guardUnload(hasData);
  LABG.setCurrentStep((document.querySelector('.step-btn.active') || {}).dataset?.step || '1');
  document.addEventListener('themechange', paintCommonBar);
  document.addEventListener('langchange', () => { paintCommonBar(); refreshStepMarks(); refreshStepFooters(); });
  paintCommonBar(); refreshStepMarks(); refreshStepFooters();
}, 0));
document.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 's') { e.preventDefault(); saveProjectFile(); }
  else if (k === 'o') { const f = el('projectFile'); if (f) { e.preventDefault(); f.click(); } }
});

/* a long computation once the waiting layer is painted */
async function withWork(title, task) {
  if (!(window.LABG && LABG.work && LABG.work.run)) return task({ update() {}, message() {} });
  return LABG.work.run({ title, delay: 250 }, task);
}
const yieldPaint = () => (window.LABG && LABG.nextPaint ? LABG.nextPaint() : new Promise(r => setTimeout(r, 0)));
const Prefs = {
  get(k, d) { try { const v = localStorage.getItem('palynopro.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('palynopro.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};
function debounce(f, ms) { let h = null; return function () { const a = arguments; clearTimeout(h); h = setTimeout(() => f.apply(null, a), ms == null ? 180 : ms); }; }
function niceNum(x, round) {
  if (!(x > 0)) return 1;
  const e = Math.floor(Math.log10(x)), f = x / Math.pow(10, e);
  const nf = round ? (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) : (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10);
  return nf * Math.pow(10, e);
}
function verdict(level, html) {
  const mark = level === 'ok' ? '✓' : level === 'bad' ? '✕' : level === 'warn' ? '!' : 'i';
  return `<div class="verdict ${level}" role="${level === 'bad' ? 'alert' : 'status'}"><span class="vd-mark" aria-hidden="true">${mark}</span><div>${html}</div></div>`;
}
/* the head of a block */
function panelHead(n, es, en, subEs, subEn) {
  return `<div class="panel-title"><span class="pt-num" aria-hidden="true">${n}</span><div><h2>${L2(es, en)}</h2><p>${L2(subEs, subEn)}</p></div></div>`;
}

Object.assign(window, {
  APP_VERSION, APP_NAME, STEPS, METRICS, metric, metricLabel, metricDt, emptyState, el, els, mk, esc, L2, showMessage, clearMessages, toast, statTiles, buildTable,
  fmtNum, fmtFixed, fmtP, pEq, fmtMS, fmtPct, pctSign, num, download, slug, csvOf, goStep, stepBtn, stepOn, stepName, currentStep, refreshStepMarks, refreshStepFooters, blockDone,
  included, groupName, groupCodes, unitOf, projectObject, saveProjectFile, hasData, SERIES, seriesColor, groupColor, withWork, yieldPaint, Prefs, debounce, niceNum, verdict, panelHead,
});
