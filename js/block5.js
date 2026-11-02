/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — Block 5, fertility from the overviews: every grain, its
   silhouette and its solidity; the proportion of collapsed grains per group. */
(function () {
  'use strict';
  let sel = null;
  const views = () => state.images.filter(r => included(r) && r.tier === 'overview');

  function render() {
    const P = el('panel-5');
    P.innerHTML = panelHead(5, 'Fertilidad', 'Fertility', 'Granos turgentes y colapsados en las panorámicas, por grupo.', 'Turgid and collapsed grains in the overviews, by group.') +
      `<details class="why"><summary>${L2('Cómo se estima', 'How it is estimated')}</summary>${L2(
        '<p>En cada panorámica se separan todos los granos del fondo; los que tocan el borde de la foto se descartan porque su silueta está incompleta. De cada grano se toma el <b>cuerpo sin espinas</b> (las espinas bajan la solidez de un grano sano). Las regiones mucho más chicas que el grano típico son <b>fragmentos</b> o residuos del montaje; las mucho más grandes, <b>agregados</b> de granos que se tocan: ninguna de las dos se clasifica. Un grano bien formado es turgente y casi convexo: la <b>solidez</b> de su cuerpo (área / área de su envolvente convexa) es alta. Uno vacío o abortado se pliega y la pierde. La proporción de granos colapsados se informa con el intervalo de Wilson y los grupos se comparan con una prueba χ² de homogeneidad.</p><p>Es una <b>aproximación morfológica</b>: para afirmar viabilidad hace falta una prueba de tinción o de germinación. Con pocas panorámicas por grupo, tómalo como un estudio piloto.</p>',
        '<p>In every overview all grains are separated from the background; those touching the edge of the picture are discarded because their silhouette is incomplete. Of each grain the <b>body without spines</b> is taken (spines lower the solidity of a healthy grain). Regions much smaller than the typical grain are <b>fragments</b> or debris of the mount; much larger ones, <b>aggregates</b> of touching grains: neither is classified. A well-formed grain is turgid and almost convex: the <b>solidity</b> of its body (area / area of its convex hull) is high. An empty or aborted one folds and loses it. The proportion of collapsed grains is reported with the Wilson interval and groups are compared with a χ² test of homogeneity.</p><p>It is a <b>morphological proxy</b>: to claim viability a staining or germination test is needed. With few overviews per group, take it as a pilot study.</p>')}</details>
      <div class="card"><h2>${L2('Contar', 'Count')}</h2>
        <div class="setting-grid">
          <div class="field"><label for="b5Sol">${L2('Solidez mínima del cuerpo de un grano turgente', 'Least solidity of the body of a turgid grain')}</label><input type="text" id="b5Sol" class="num" inputmode="decimal" value="${state.set.solidity}"></div>
          <div class="field"><label for="b5Min">${L2('Diámetro mínimo de un grano (<span class="nocase">µm</span>)', 'Least diameter of a grain (<span class="nocase">µm</span>)')}</label><input type="text" id="b5Min" class="num" inputmode="decimal" value="${state.set.minGrainUm}"></div>
          <div class="field"><label for="b5Agg">${L2('Agregado: más grande que el grano típico (×)', 'Aggregate: larger than the typical grain (×)')}</label><input type="text" id="b5Agg" class="num" inputmode="decimal" value="${state.set.aggFactor}"></div>
          <div class="field"><label for="b5Frag">${L2('Fragmento: más chico que el grano típico (×)', 'Fragment: smaller than the typical grain (×)')}</label><input type="text" id="b5Frag" class="num" inputmode="decimal" value="${state.set.fragFactor}"></div>
          <div class="field"><label for="b5Max">${L2('Diámetro máximo de un grano (<span class="nocase">µm</span>)', 'Largest diameter of a grain (<span class="nocase">µm</span>)')}</label><input type="text" id="b5Max" class="num" inputmode="decimal" value="${state.set.maxGrainUm}"></div>
        </div>
        <div class="btn-row"><button type="button" class="btn btn-primary" id="b5Run">${L2('Contar en todas las panorámicas', 'Count in every overview')}</button><span class="hint" id="b5Count"></span></div>
        <div class="messages" id="b5Msg"></div>
      </div>
      <div id="b5Body"></div>`;
    el('b5Run').addEventListener('click', run);
    count(); renderBody();
  }
  function count() {
    const n = views().length, c = el('b5Count');
    if (c) c.innerHTML = n ? L2(`${n} panorámica(s)`, `${n} overview(s)`) : L2('No hay panorámicas: márcalas como «Panorámica» en el Bloque 2.', 'There are no overviews: mark them as “Overview” in Block 2.');
    const b = el('b5Run'); if (b) b.disabled = !n;
  }
  async function run() {
    const s = state.set;
    s.solidity = num(el('b5Sol').value) > 0 ? num(el('b5Sol').value) : 0.95;
    s.aggFactor = num(el('b5Agg').value) > 1 ? num(el('b5Agg').value) : 1.3;
    s.fragFactor = num(el('b5Frag').value) > 0 ? num(el('b5Frag').value) : 0.6;
    s.minGrainUm = num(el('b5Min').value) > 0 ? num(el('b5Min').value) : 15;
    s.maxGrainUm = num(el('b5Max').value) > 0 ? num(el('b5Max').value) : 200;
    clearMessages('b5Msg');
    const list = views(), per = [];
    await withWork(T('Contando granos', 'Counting grains'), async w => {
      for (let i = 0; i < list.length; i++) {
        w.update(i / list.length, list[i].name);
        await yieldPaint();
        try {
          const { o } = await Images.overview(list[i]);
          const C = k => o.grains.filter(g => g.cls === k), ok = o.grains.filter(g => g.cls === 'turgid' || g.cls === 'atypical');
          per.push({ id: list[i].id, name: list[i].name, group: list[i].group, n: ok.length, turgid: C('turgid').length, edge: C('edge').length, aggregate: C('aggregate').length, fragment: C('fragment').length, refUm: o.refUm,
            solidity: ok.map(g => g.solidity), diameters: ok.map(g => g.diameterUm) });
        } catch (e) { showMessage('b5Msg', 'warning', esc(list[i].name + ': ' + e.message)); }
      }
    });
    const G = groupCodes().filter(g => per.some(p => p.group === g));
    const groups = G.map(g => {
      const P = per.filter(p => p.group === g), n = P.reduce((s2, p) => s2 + p.n, 0), tu = P.reduce((s2, p) => s2 + p.turgid, 0), at = n - tu, w = Stats.wilson(at, n);
      const d = [].concat(...P.map(p => p.diameters));
      return { g, nImages: P.length, n, turgid: tu, atypical: at, pct: n ? at / n : NaN, lo: w.lo, hi: w.hi, diam: Stats.mean(d), diamSd: Stats.sd(d) };
    });
    /* χ² of homogeneity on the groups × (turgid, collapsed) table */
    const N = groups.reduce((s2, g) => s2 + g.n, 0), At = groups.reduce((s2, g) => s2 + g.atypical, 0);
    let chi = 0, small = 0;
    groups.forEach(g => { if (!g.n) return; [[g.atypical, At], [g.turgid, N - At]].forEach(([o, tot]) => { const e = g.n * tot / N; if (e < 5) small++; if (e > 0) chi += (o - e) * (o - e) / e; }); });
    const df = groups.filter(g => g.n).length - 1;
    state.results.fertility = { per, groups, chi, df, p: df > 0 ? Stats.pchisq(chi, df, true) : NaN, smallExpected: small, solidity: s.solidity };
    renderBody();
  }
  function renderBody() {
    const host = el('b5Body'), F = state.results.fertility;
    if (!host) return;
    if (!F || !F.per) { host.innerHTML = ''; blockDone(); return; }
    host.innerHTML = `<div class="card"><h2>${L2('Resultados', 'Results')}</h2><div id="b5Tiles"></div><div id="b5Verd"></div>
        <div class="table-scroll" id="b5Groups"></div><div class="table-tools"><button type="button" class="btn btn-ghost btn-sm" id="b5Csv">CSV</button></div>
        <div class="fig-grid">${Fig.block('b5FigPct', 'Granos colapsados por grupo', 'Collapsed grains by group')}${Fig.block('b5FigSol', 'Solidez del cuerpo de los granos', 'Solidity of the body of the grains')}</div></div>
      <div class="card"><h2>${L2('Revisión de cada panorámica', 'Check of every overview')}</h2>
        <div class="viewer"><div><div class="stage" id="b5Stage"></div>
          <div class="nav-row"><select id="b5Sel" aria-label="${esc(T('Panorámica', 'Overview'))}"></select></div>
          <div class="legend-inline"><span><span class="sw" style="background:#3fd17a"></span>${L2('turgente', 'turgid')}</span><span><span class="sw" style="background:#e8384f"></span>${L2('colapsado o deforme', 'collapsed or misshapen')}</span><span><span class="sw" style="background:#b48cf0"></span>${L2('agregado (no cuenta)', 'aggregate (not counted)')}</span><span><span class="sw" style="background:#f0c040"></span>${L2('fragmento (no cuenta)', 'fragment (not counted)')}</span><span><span class="sw" style="background:#9aa4ac"></span>${L2('toca el borde (no cuenta)', 'touches the edge (not counted)')}</span></div></div>
          <dl class="meta-list" id="b5Meta"></dl></div></div>`;
    const N = F.groups.reduce((s, g) => s + g.n, 0), at = F.groups.reduce((s, g) => s + g.atypical, 0);
    statTiles('b5Tiles', [[T('Panorámicas', 'Overviews'), F.per.length], [T('Granos contados', 'Grains counted'), N, F.per.reduce((s, p) => s + p.edge + p.aggregate + p.fragment, 0) + T(' fuera (borde, agregados, fragmentos)', ' left out (edge, aggregates, fragments)')],
      [T('Colapsados', 'Collapsed'), fmtPct(N ? at / N : NaN), at + ' / ' + N], [T('Prueba <span class="nocase">χ²</span>', '<span class="nocase">χ²</span> test'), fmtFixed(F.chi, 2), T('gl ', 'df ') + F.df + ' · ' + pEq(F.p)]]);
    el('b5Verd').innerHTML = (F.p < 0.05 ? verdict('ok', L2('La proporción de granos colapsados difiere entre grupos (χ²).', 'The proportion of collapsed grains differs between groups (χ²).')) : verdict('info', L2('No se detectó diferencia entre grupos en la proporción de granos colapsados (χ²).', 'No difference between groups was detected in the proportion of collapsed grains (χ²).'))) +
      (F.smallExpected ? verdict('warn', L2(`${F.smallExpected} celda(s) con frecuencia esperada menor que 5: la prueba χ² es aproximada; cuenta más panorámicas.`, `${F.smallExpected} cell(s) with expected frequency below 5: the χ² test is approximate; count more overviews.`)) : '') +
      verdict('info', L2('Recuerda: la solidez es una aproximación morfológica a la fertilidad, no una prueba de viabilidad.', 'Remember: solidity is a morphological proxy for fertility, not a viability test.'));
    buildTable('b5Groups', [{ label: L2('Grupo', 'Group'), html: true, get: r => `<span class="sw" style="background:${groupColor(r.g)}"></span>${esc(groupName(r.g))}` }, { label: L2('Panorámicas', 'Overviews'), key: 'nImages', num: true }, { label: L2('Granos', 'Grains'), key: 'n', num: true },
      { label: L2('Colapsados', 'Collapsed'), key: 'atypical', num: true }, { label: '%', num: true, get: r => fmtPct(r.pct) }, { label: L2('IC 95 % (Wilson)', '95% CI (Wilson)'), num: true, get: r => fmtPct(r.lo) + ' – ' + fmtPct(r.hi) },
      { label: L2('Diámetro (µm)', 'Diameter (µm)'), num: true, get: r => fmtMS(r.diam, r.diamSd, 1) }], F.groups);
    el('b5Csv').addEventListener('click', () => download(csvOf([{ label: 'grupo', key: 'g' }, { label: 'nombre', get: r => groupName(r.g) }, { label: 'panoramicas', key: 'nImages' }, { label: 'granos', key: 'n' }, { label: 'colapsados', key: 'atypical' }, { label: 'proporcion', key: 'pct' }, { label: 'ic_inf', key: 'lo' }, { label: 'ic_sup', key: 'hi' }, { label: 'diametro_media', key: 'diam' }, { label: 'diametro_de', key: 'diamSd' }], F.groups), T('palynopro_fertilidad.csv', 'palynopro_fertility.csv'), 'text/csv;charset=utf-8'));
    el('b5FigPct').innerHTML = Fig.bars({ categories: F.groups.map(g => g.g), series: [{ name: T('% colapsados', '% collapsed'), color: 'var(--accent)', values: F.groups.map(g => 100 * g.pct), lo: F.groups.map(g => 100 * g.lo), hi: F.groups.map(g => 100 * g.hi) }], ylab: T('Granos colapsados (%)', 'Collapsed grains (%)'), yMax: 100, aria: T('Porcentaje de granos colapsados por grupo con IC 95 %', 'Percentage of collapsed grains by group with 95% CI') });
    const sols = [].concat(...F.per.map(p => p.solidity)), bins = 25, lo = 0.75, wdt = 0.25 / bins, h = new Array(bins).fill(0);
    sols.forEach(v => { const b = Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / wdt))); h[b]++; });
    /* the outline of the histogram: each count from the left edge of its interval to the right one (a step
       holds a value until the next point), up from zero at 0.75 and down to zero at 1 */
    const hist = [{ x: lo, y: 0 }].concat(h.map((c, i) => ({ x: lo + i * wdt, y: c })), [{ x: 1, y: h[bins - 1] }, { x: 1, y: 0 }]);
    el('b5FigSol').innerHTML = Fig.xy({ width: 470, height: 300, xlab: T('Solidez del cuerpo', 'Solidity of the body'), ylab: T('Granos', 'Grains'), xRange: [0.75, 1], yZero: true, refs: [{ x: F.solidity, label: T('umbral', 'threshold') }],
      series: [{ name: T('Granos', 'Grains'), color: 'var(--primary)', pts: hist, line: true, step: true, markers: false, width: 2 }], legend: false, aria: T('Distribución de la solidez de los granos', 'Distribution of the solidity of the grains') });
    const se = el('b5Sel');
    se.innerHTML = F.per.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    se.addEventListener('change', () => show(se.value));
    show(sel && F.per.find(p => p.id === sel) ? sel : F.per[0].id);
    blockDone();
  }
  async function show(id) {
    const r = state.images.find(x => x.id === id), F = state.results.fertility, p = F && F.per.find(x => x.id === id);
    if (!r || !p) return;
    sel = id;
    el('b5Meta').innerHTML = `<dt>${L2('Panorámica', 'Overview')}</dt><dd>${esc(r.name)}</dd><dt>${L2('Grupo', 'Group')}</dt><dd>${esc(groupName(r.group))}</dd><dt>${L2('Granos completos', 'Complete grains')}</dt><dd>${p.n}</dd><dt>${L2('Turgentes', 'Turgid')}</dt><dd>${p.turgid}</dd><dt>${L2('Colapsados', 'Collapsed')}</dt><dd>${p.n - p.turgid}</dd><dt>${L2('En el borde', 'On the edge')}</dt><dd>${p.edge}</dd><dt>${L2('Agregados', 'Aggregates')}</dt><dd>${p.aggregate}</dd><dt>${L2('Fragmentos', 'Fragments')}</dt><dd>${p.fragment}</dd><dt>${L2('Grano típico', 'Typical grain')}</dt><dd>${fmtFixed(p.refUm, 1)} µm</dd>`;
    const stage = el('b5Stage');
    if (!Images.has(r)) { stage.innerHTML = `<div class="stage-empty">${L2('Abre otra vez la carpeta para ver la foto.', 'Open the folder again to see the picture.')}</div>`; return; }
    const { o, img } = await Images.overview(r);
    if (sel !== id) return;
    stage.innerHTML = '<canvas id="b5Canvas"></canvas>';
    const cv = el('b5Canvas'), g = Images.toCanvas(img, cv);
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', T('Granos de ', 'Grains of ') + r.name);
    const lw = Math.max(2, img.w / 500), shown = cv.clientWidth > 0 ? cv.clientWidth : Math.min(img.w, 640);
    o.grains.forEach(gr => {
      const rad = gr.diameterUm / img.umPerPx / 2 + 3;
      g.beginPath(); g.arc(gr.cx, gr.cy, rad, 0, 2 * Math.PI); g.lineWidth = lw;
      g.strokeStyle = { edge: '#9aa4ac', aggregate: '#b48cf0', fragment: '#f0c040', turgid: '#3fd17a', atypical: '#e8384f' }[gr.cls]; g.stroke();
      /* the solidity above the grain, or below it when the grain touches the top of the picture; always
         inside, at about 11 px as the picture is shown (the canvas is scaled down to the viewer) */
      const fs = Math.round(11 * img.w / shown), label = fmtFixed(gr.solidity, 3), color = g.strokeStyle;
      g.font = `600 ${fs}px system-ui, sans-serif`;
      const tw = g.measureText(label).width, x = Math.max(2, Math.min(img.w - tw - 2, gr.cx - tw / 2));
      let y = gr.cy - rad - fs * 0.3;
      if (y - fs < 2) y = gr.cy + rad + fs;
      y = Math.max(fs + 2, Math.min(img.h - 4, y));
      g.lineJoin = 'round'; g.lineWidth = fs / 4; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(label, x, y);
      g.fillStyle = color; g.fillText(label, x, y);
    });
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('imageschange', () => { count(); renderBody(); });
  document.addEventListener('langchange', renderBody);
  document.addEventListener('stepchange', e => { if (e.detail.step === 5) count(); });
  window.Block5 = { render, renderBody };
})();
