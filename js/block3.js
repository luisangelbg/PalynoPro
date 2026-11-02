/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — Block 3, outline and size. Every one-grain picture is measured
   once here (the same pass gives the ornamentation of Block 4). */
(function () {
  'use strict';
  let sel = null;
  const LAYERS = { mask: true, env: true, corpus: true, spines: true, feret: false };
  const SIZE_KEYS = ['corp_d', 'corp_fmax', 'corp_fmin', 'corp_aspect', 'corp_circ', 'env_d'];

  const targets = () => state.images.filter(r => included(r) && r.tier === 'standard');
  function render() {
    const P = el('panel-3');
    P.innerHTML = panelHead(3, 'Contorno y tamaño', 'Outline and size', 'El cuerpo de cada grano sin sus espinas: diámetros, elongación y circularidad.', 'The body of every grain without its spines: diameters, elongation and circularity.') +
      `<details class="why"><summary>${L2('Cómo se mide', 'How it is measured')}</summary>${L2(
        '<p>Cada foto se lleva al píxel común del análisis y se separa el grano del fondo con el umbral de Otsu; se rellenan los huecos y se toma el grano más grande del centro. Su contorno se lee como la distancia del centro al borde en 720 direcciones. Al recortar los picos más angostos que la base de una espina queda el <b>cuerpo</b>: de él salen el diámetro equivalente, las anchuras de <b>Feret</b> mayor y menor, la elongación y la circularidad.</p><p>Si el grano toca el borde de la foto o el rótulo, parte del contorno está cortada: esas fotos se marcan y no entran en las comparaciones de tamaño. Las fotos de un mismo grano se promedian.</p>',
        '<p>Each picture is brought to the common pixel of the analysis and the grain is separated from the background by Otsu’s threshold; holes are filled and the largest central grain is taken. Its outline is read as the distance from the center to the edge in 720 directions. Cutting the peaks narrower than the base of a spine leaves the <b>body</b>: from it come the equivalent diameter, the major and minor <b>Feret</b> widths, elongation and circularity.</p><p>If the grain touches the edge of the picture or the caption, part of the outline is cut: those pictures are flagged and do not enter the comparisons of size. Pictures of the same grain are averaged.</p>')}</details>
      <div class="card"><h2>${L2('Medir', 'Measure')}</h2>
        <div class="setting-grid">
          <div class="field"><label for="b3Base">${L2('Base máxima de una espina (<span class="nocase">µm</span>)', 'Largest base of a spine (<span class="nocase">µm</span>)')}</label><input type="text" id="b3Base" class="num" inputmode="decimal" value="${state.set.baseUm}"></div>
          <div class="field"><label for="b3MinH">${L2('Altura mínima de una espina (<span class="nocase">µm</span>)', 'Least height of a spine (<span class="nocase">µm</span>)')}</label><input type="text" id="b3MinH" class="num" inputmode="decimal" value="${state.set.minHeightUm}"></div>
          <div class="field"><label for="b3Cut">${L2('Contorno cortado aceptable (%)', 'Acceptable cut outline (%)')}</label><input type="text" id="b3Cut" class="num" inputmode="decimal" value="${100 * state.set.maxCut}"></div>
        </div>
        <div class="btn-row"><button type="button" class="btn btn-primary" id="b3Run">${L2('Medir todas las fotos de un grano', 'Measure every one-grain picture')}</button><span class="hint" id="b3Count"></span></div>
        <div class="messages" id="b3Msg"></div>
      </div>
      <div id="b3Body"></div>`;
    el('b3Run').addEventListener('click', run);
    count(); renderBody();
  }
  function count() {
    const n = targets().length, c = el('b3Count');
    if (c) c.innerHTML = n ? L2(`${n} foto(s) de un grano, al píxel de ${fmtNum(Images.target('standard'), 4)} µm`, `${n} one-grain picture(s), at a pixel of ${fmtNum(Images.target('standard'), 4)} µm`) : L2('Abre primero tus imágenes en el Bloque 2.', 'First open your images in Block 2.');
    const b = el('b3Run'); if (b) b.disabled = !n;
  }
  async function run() {
    const s = state.set;
    s.baseUm = num(el('b3Base').value) > 0 ? num(el('b3Base').value) : 3;
    s.minHeightUm = num(el('b3MinH').value) > 0 ? num(el('b3MinH').value) : 0.3;
    s.maxCut = num(el('b3Cut').value) >= 0 ? num(el('b3Cut').value) / 100 : 0.02;
    const list = targets(), t = Images.target('standard'), fails = [];
    clearMessages('b3Msg');
    state.results.images = {}; state.results.stats = null;
    const t0 = performance.now();
    await withWork(T('Midiendo los granos', 'Measuring the grains'), async w => {
      for (let i = 0; i < list.length; i++) {
        w.update(i / list.length, list[i].name + ' (' + (i + 1) + ' / ' + list.length + ')');
        await yieldPaint();
        try { const r = await Images.analyze(list[i], t); if (r.error) fails.push(list[i].name); } catch (e) { fails.push(list[i].name + ': ' + e.message); }
      }
    });
    const secs = (performance.now() - t0) / 1000;
    showMessage('b3Msg', fails.length ? 'warning' : 'success', L2(`${list.length - fails.length} de ${list.length} fotos medidas en ${fmtFixed(secs, 1)} s.`, `${list.length - fails.length} of ${list.length} pictures measured in ${fmtFixed(secs, 1)} s.`),
      fails.length ? L2('Sin grano reconocible: ', 'No recognizable grain: ') + esc(fails.slice(0, 6).join(' · ')) : null);
    document.dispatchEvent(new CustomEvent('measured'));
    renderBody();
  }

  function groupTable(units) {
    const G = groupCodes().filter(g => units.some(u => u.group === g));
    const rows = G.map(g => { const U = units.filter(u => u.group === g), o = { g, n: U.length }; SIZE_KEYS.forEach(k => { const v = U.map(u => u[k]).filter(isFinite); o[k] = Stats.mean(v); o[k + '_sd'] = Stats.sd(v); }); return o; });
    byGroupTable('b3Groups', rows, [{ keys: SIZE_KEYS }], k => (metric(k).d > 2 ? 3 : 2), L2('Media ± desviación estándar entre granos (las fotos de un grano se promedian).', 'Mean ± standard deviation among grains (the pictures of a grain are averaged).'));
    return rows;
  }
  /* A table by group with the groups as columns and the measures as rows, so it fits the page however
     many measures there are (a group per column, a measure per row). rows: [{ g, n, k, k_sd… }];
     sections: [{ title: [es, en] (optional), keys }]; dec(k): the decimals of each measure. Also Block 4. */
  function byGroupTable(id, rows, sections, dec, caption) {
    const host = el(id);
    if (!host) return;
    const head = `<th scope="col">${L2('Medida', 'Measure')}</th>` + rows.map(r => `<th scope="col" class="num"><span class="sw" style="background:${groupColor(r.g)}"></span>${esc(groupName(r.g))}<span class="th-n">n = ${r.n}</span></th>`).join('');
    const body = sections.map(sec => (sec.title ? `<tr class="row-sec"><th scope="colgroup" colspan="${rows.length + 1}">${L2(sec.title[0], sec.title[1])}</th></tr>` : '') +
      sec.keys.map(k => `<tr><th scope="row">${metricLabel(k, true)}</th>${rows.map(r => `<td class="num">${fmtMS(r[k], r[k + '_sd'], dec(k))}</td>`).join('')}</tr>`).join('')).join('');
    host.innerHTML = `<table class="by-group"><caption>${caption}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }
  function renderBody() {
    const host = el('b3Body');
    if (!host) return;
    const all = Images.rows({ usableOnly: false });
    /* the viewer also lists the one-grain pictures excluded here, so they can be included again */
    const excl = state.images.filter(r => r.exclude && r.tier === 'standard' && r.calib && r.calib.umPerPx > 0);
    const seen = new Set(all.map(r => r.id).concat(excl.map(r => r.id)));
    const view = state.images.filter(r => seen.has(r.id));
    if (!view.length) { host.innerHTML = ''; blockDone(); return; }
    if (!all.length) { host.innerHTML = viewerCard(); bindViewer(view); blockDone(); return; }
    const usable = all.filter(r => r.usable), units = Multi.byUnit(usable, SIZE_KEYS, r => r.unit, r => r.group);
    host.innerHTML = `<div class="card"><h2>${L2('Resultados', 'Results')}</h2><div id="b3Tiles"></div><div id="b3Verd"></div>
        <h3>${L2('Por grupo', 'By group')}</h3><div class="table-scroll" id="b3Groups"></div>
        <div class="table-tools"><button type="button" class="btn btn-ghost btn-sm" id="b3CsvG">CSV</button></div>
        <div class="fig-grid">${Fig.block('b3FigBox', 'Diámetro del cuerpo por grupo', 'Body diameter by group')}${Fig.block('b3FigFeret', 'Diámetros de Feret del cuerpo', 'Feret diameters of the body')}</div>
      </div>
      ${viewerCard(true)}`;
    const cut = all.filter(r => !r.usable).length;
    statTiles('b3Tiles', [
      [T('Fotos medidas', 'Pictures measured'), all.length],
      [T('Granos', 'Grains'), units.length, T('con contorno completo', 'with a complete outline')],
      [T('Contorno cortado', 'Cut outline'), cut, T('fuera de las comparaciones', 'left out of comparisons'), cut ? 'warn' : 'ok'],
      [T('Cuerpo (media)', 'Body (mean)'), fmtFixed(Stats.mean(units.map(u => u.corp_d).filter(isFinite)), 1) + ' µm', 'Feret ' + fmtFixed(Stats.mean(units.map(u => u.corp_fmax).filter(isFinite)), 1) + ' × ' + fmtFixed(Stats.mean(units.map(u => u.corp_fmin).filter(isFinite)), 1)],
    ]);
    const enl = all.filter(r => state.results.images[r.id].qc.flags.includes('enlarged')).length;
    el('b3Verd').innerHTML = (enl ? verdict('warn', L2(`${enl} foto(s) tenían menos resolución que el píxel del análisis y se ampliaron: sus medidas finas (espinas, lúmenes) son menos fiables.`, `${enl} picture(s) had less resolution than the pixel of the analysis and were enlarged: their fine measures (spines, lumina) are less reliable.`)) : '') +
      (cut ? verdict('info', L2(`${cut} foto(s) con más de ${fmtFixed(100 * state.set.maxCut, 0)} % del contorno cortado por el borde o el rótulo: revísalas abajo; no entran en las comparaciones.`, `${cut} picture(s) with more than ${fmtFixed(100 * state.set.maxCut, 0)}% of the outline cut by the edge or the caption: check them below; they do not enter the comparisons.`)) : '');
    const G = groupTable(units);
    const codes = G.map(r => r.g);
    el('b3FigBox').innerHTML = Fig.box({ width: Math.max(420, 90 + codes.length * 60), height: 340, ylab: metricLabel('corp_d', true), groups: codes.map(g => ({ name: g, color: groupColor(g), values: units.filter(u => u.group === g).map(u => u.corp_d) })), aria: T('Diámetro del cuerpo por grupo', 'Body diameter by group') });
    el('b3FigFeret').innerHTML = Fig.scatter({ width: 470, height: 360, xlab: metricLabel('corp_fmax', true), ylab: metricLabel('corp_fmin', true), ellipse: 0.95,
      groups: codes.map(g => ({ key: g, name: g, color: groupColor(g) })), points: units.map(u => ({ x: u.corp_fmax, y: u.corp_fmin, g: u.group, title: u.unit })), aria: T('Feret mayor contra menor por grano', 'Major against minor Feret by grain') });
    /* the table of pictures */
    const res = id => state.results.images[id];
    buildTable('b3Images', [{ label: L2('Foto', 'Picture'), key: 'name' }, { label: L2('Grupo', 'Group'), key: 'group' }, { label: L2('Grano', 'Grain'), key: 'grain' }]
      .concat(SIZE_KEYS.map(k => ({ label: metricLabel(k, true), num: true, get: r => r[k], fmt: v => fmtFixed(v, metric(k).d) })))
      .concat([{ label: L2('Cortado (%)', 'Cut (%)'), num: true, get: r => 100 * res(r.id).qc.cutFrac, fmt: v => fmtFixed(v, 1) }, { label: L2('Marcas', 'Flags'), html: true, get: r => flagHTML(res(r.id).qc.flags) }]), all.map(r => Object.assign({ _id: r.id, _class: r.usable ? '' : 'row-bad' }, r)));
    el('b3CsvG').addEventListener('click', () => download(csvOf([{ label: 'grupo', key: 'g' }, { label: 'nombre', get: r => groupName(r.g) }, { label: 'n_granos', key: 'n' }].concat(...SIZE_KEYS.map(k => [{ label: k + '_media', key: k }, { label: k + '_de', key: k + '_sd' }])), G), T('palynopro_tamano_por_grupo.csv', 'palynopro_size_by_group.csv'), 'text/csv;charset=utf-8'));
    el('b3CsvI').addEventListener('click', () => download(csvOf([{ label: 'foto', key: 'name' }, { label: 'grupo', key: 'group' }, { label: 'grano', key: 'grain' }, { label: 'usable', get: r => (r.usable ? 1 : 0) }].concat(METRICS.map(m => ({ label: m.k, key: m.k }))), all), T('palynopro_medidas_por_foto.csv', 'palynopro_measurements_by_picture.csv'), 'text/csv;charset=utf-8'));
    el('b3Images').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr) { show(tr.dataset.id); el('b3Stage').scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
    bindViewer(view);
    blockDone();
  }
  /* the viewer of every picture (with the table of pictures when there are results) */
  function viewerCard(withTable) {
    return `<div class="card"><h2>${L2('Revisión de cada foto', 'Check of every picture')}</h2>
        <div class="viewer">
          <div><div class="stage" id="b3Stage"><div class="stage-empty">${L2('Elige una foto.', 'Choose a picture.')}</div></div>
            <div class="nav-row"><button type="button" class="btn btn-ghost btn-sm" id="b3Prev">← ${L2('Anterior', 'Previous')}</button><select id="b3Sel" aria-label="${esc(T('Foto', 'Picture'))}"></select><button type="button" class="btn btn-ghost btn-sm" id="b3Next">${L2('Siguiente', 'Next')} →</button></div>
            <div class="layer-toggles" id="b3Layers"></div>
          </div>
          <div><dl class="meta-list" id="b3Meta"></dl><div class="btn-row"><button type="button" class="btn btn-secondary btn-sm" id="b3Excl"></button></div></div>
        </div>
        ${withTable ? `<details class="cite-more"><summary>${L2('Tabla de todas las fotos', 'Table of every picture')}</summary><div class="table-scroll tall" id="b3Images"></div><div class="table-tools"><button type="button" class="btn btn-ghost btn-sm" id="b3CsvI">CSV</button></div></details>` : ''}
      </div>`;
  }
  /* view: the measured pictures and the excluded ones, in the order they were opened */
  function bindViewer(view) {
    const selEl = el('b3Sel');
    selEl.innerHTML = view.map(r => { const res = state.results.images[r.id]; return `<option value="${r.id}">${esc(r.name)}${r.exclude ? ' — ' + esc(T('excluida', 'excluded')) : res && res.qc && res.qc.flags.includes('cut') ? ' ⚠' : ''}</option>`; }).join('');
    selEl.addEventListener('change', () => show(selEl.value));
    el('b3Prev').addEventListener('click', () => { const i = view.findIndex(r => r.id === sel); show(view[(i - 1 + view.length) % view.length].id); });
    el('b3Next').addEventListener('click', () => { const i = view.findIndex(r => r.id === sel); show(view[(i + 1) % view.length].id); });
    el('b3Layers').innerHTML = [['mask', '#4f8fb5', 'Grano (máscara)', 'Grain (mask)'], ['env', '#f0a020', 'Contorno con espinas', 'Outline with spines'], ['corpus', '#19b4e8', 'Cuerpo', 'Body'], ['spines', '#e8384f', 'Espinas', 'Spines'], ['feret', '#ffe14d', 'Feret', 'Feret']]
      .map(([k, c, es, en]) => `<label class="chk"><input type="checkbox" data-layer="${k}"${LAYERS[k] ? ' checked' : ''}> <span class="sw" style="background:${c}"></span>${L2(es, en)}</label>`).join('');
    el('b3Layers').addEventListener('change', e => { const k = e.target.dataset.layer; if (k) { LAYERS[k] = e.target.checked; show(sel); } });
    el('b3Excl').addEventListener('click', toggleExclude);
    show(sel && view.find(r => r.id === sel) ? sel : view[0].id);
  }
  /* excluding a picture drops its result; including it again measures it at once. Either may move the
     common pixel of the analysis (it follows the pictures included): then the rest must be measured again */
  async function toggleExclude() {
    const r = state.images.find(x => x.id === sel);
    if (!r) return;
    const before = Images.target('standard');
    r.exclude = !r.exclude;
    delete state.results.images[r.id]; state.results.stats = null;
    const t = Images.target('standard'), moved = Math.abs(t / before - 1) > 1e-9;
    if (!r.exclude) {
      try { await withWork(T('Midiendo la foto', 'Measuring the picture'), async () => { await yieldPaint(); await Images.analyze(r, t); }); }
      catch (e) { toast(e.message, 'warning'); }
    }
    count();
    toast(moved ? T('El píxel común del análisis cambió: vuelve a medir todas las fotos.', 'The common pixel of the analysis changed: measure every picture again.')
      : r.exclude ? T('Foto excluida', 'Picture excluded') : T('Foto incluida y medida', 'Picture included and measured'), moved ? 'warning' : undefined);
    document.dispatchEvent(new CustomEvent('measured'));
    renderBody();
  }
  function flagHTML(flags) {
    const F = { cut: ['contorno cortado', 'cut outline', 'warn'], enlarged: ['ampliada', 'enlarged', 'warn'] };
    return flags.length ? flags.map(f => `<span class="qc ${F[f][2]}">${L2(F[f][0], F[f][1])}</span>`).join(' ') : `<span class="qc ok">✓</span>`;
  }
  async function show(id) {
    const r = state.images.find(x => x.id === id), res = state.results.images[id];
    if (!r || (!res && !r.exclude)) return;
    sel = id;
    const s = el('b3Sel'); if (s) s.value = id;
    const head = `<dt>${L2('Foto', 'Picture')}</dt><dd>${esc(r.name)}</dd><dt>${L2('Grupo · grano', 'Group · grain')}</dt><dd>${esc(groupName(r.group))} · ${esc(r.grain || '—')}</dd>`;
    if (!res || !res.metrics) {
      /* excluded (no result) or without a grain that could be recognized */
      el('b3Meta').innerHTML = head + `<dt>${L2('Estado', 'Status')}</dt><dd>${r.exclude ? L2('Excluida: no entra en el análisis.', 'Excluded: it does not enter the analysis.') : L2('Sin grano reconocible.', 'No recognizable grain.')}</dd>`;
    } else {
      const m = res.metrics, q = res.qc;
      el('b3Meta').innerHTML = head +
        SIZE_KEYS.map(k => `<dt>${metricDt(k)}</dt><dd>${fmtFixed(m[k], metric(k).d)}</dd>`).join('') +
        `<dt>${L2('Contorno cortado', 'Cut outline')}</dt><dd>${fmtFixed(100 * q.cutFrac, 1)}${pctSign()}</dd><dt>${L2('Umbral (gris)', 'Threshold (gray)')}</dt><dd>${fmtFixed(q.threshold, 1)}</dd><dt>${L2('Marcas', 'Flags')}</dt><dd>${flagHTML(q.flags)}</dd>`;
    }
    el('b3Excl').innerHTML = r.exclude ? L2('Volver a incluir', 'Include again') : L2('Excluir esta foto', 'Exclude this picture');
    const stage = el('b3Stage');
    if (!Images.has(r)) { stage.innerHTML = `<div class="stage-empty">${L2('Abre otra vez la carpeta para ver la foto.', 'Open the folder again to see the picture.')}</div>`; return; }
    try {
      const { a, img } = await Images.inspect(r);
      if (sel !== id) return;
      stage.innerHTML = '<canvas id="b3Canvas"></canvas>';
      const cv = el('b3Canvas'), g = Images.toCanvas(img, cv);
      cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', T('Medición de ', 'Measurement of ') + r.name);
      drawOverlay(g, a, img, LAYERS);
    } catch (e) { stage.innerHTML = `<div class="stage-empty">${esc(e.message)}</div>`; }
  }
  /* the layers over a picture at its working scale */
  function drawOverlay(g, a, img, L) {
    if (a.error) return;
    const n = a.radial.length, cx = a.region.cx, cy = a.region.cy, lw = Math.max(1.5, img.w / 600);
    if (L.mask) {
      const id = g.getImageData(0, 0, img.w, img.h);
      for (let i = 0; i < a.mask.length; i++) if (a.mask[i]) { id.data[4 * i] = id.data[4 * i] * 0.55 + 30; id.data[4 * i + 1] = id.data[4 * i + 1] * 0.6 + 60; id.data[4 * i + 2] = Math.min(255, id.data[4 * i + 2] * 0.6 + 110); }
      g.putImageData(id, 0, 0);
    }
    const ring = (arr, color, dash, w) => { g.beginPath(); for (let i = 0; i <= n; i++) { const j = i % n, t = (j + 0.5) / n * 2 * Math.PI, x = cx + arr[j] * Math.cos(t), y = cy + arr[j] * Math.sin(t); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.strokeStyle = color; g.lineWidth = w; g.setLineDash(dash || []); g.stroke(); g.setLineDash([]); };
    if (L.env) ring(a.radial, '#f0a020', null, lw);
    if (L.corpus) ring(a.base, '#19b4e8', [8 * lw / 1.5, 5 * lw / 1.5], lw * 1.4);
    if (L.spines) a.peaks.forEach(i => { const t = (i + 0.5) / n * 2 * Math.PI; g.beginPath(); g.arc(cx + a.radial[i] * Math.cos(t), cy + a.radial[i] * Math.sin(t), lw * 2.6, 0, 2 * Math.PI); g.fillStyle = '#e8384f'; g.fill(); });
    if (L.cut !== false && a.cut) a.cut.forEach((c, i) => { if (!c) return; const t = (i + 0.5) / n * 2 * Math.PI; g.fillStyle = '#ffffff'; g.fillRect(cx + a.radial[i] * Math.cos(t) - lw, cy + a.radial[i] * Math.sin(t) - lw, 2 * lw, 2 * lw); });
    if (L.feret) {
      const poly = Img.ring(a.base, cx, cy), f = Img.feret(poly);
      /* the labels at about 13 px as the picture is shown (the canvas is drawn at its own size and scaled
         down to the viewer), with a dark edge, and kept inside the picture */
      const shown = g.canvas && g.canvas.clientWidth > 0 ? g.canvas.clientWidth : Math.min(img.w, 640), px = 13 * img.w / shown;
      const draw = (ang, len, label) => {
        const dx = Math.cos(ang) * len / 2, dy = Math.sin(ang) * len / 2;
        g.strokeStyle = '#ffe14d'; g.lineWidth = lw * 1.3; g.beginPath(); g.moveTo(cx - dx, cy - dy); g.lineTo(cx + dx, cy + dy); g.stroke();
        g.font = `600 ${Math.round(px)}px system-ui, sans-serif`;
        const tw = g.measureText(label).width, gap = 0.5 * px;
        let x = dx >= 0 ? cx + dx + gap : cx + dx - gap - tw, y = cy + dy + (dy >= 0 ? px : 0);
        x = Math.max(gap, Math.min(img.w - tw - gap, x)); y = Math.max(px + gap, Math.min(img.h - gap, y));
        g.lineJoin = 'round'; g.lineWidth = px / 4; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(label, x, y);
        g.fillStyle = '#ffe14d'; g.fillText(label, x, y);
      };
      draw(f.angMax, f.max, fmtFixed(f.max * img.umPerPx, 1) + ' µm');
      draw(f.angMin + Math.PI / 2, f.min, fmtFixed(f.min * img.umPerPx, 1) + ' µm');
    }
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('imageschange', () => { count(); renderBody(); });
  document.addEventListener('langchange', () => { if (el('b3Body') && el('b3Body').innerHTML) renderBody(); });
  document.addEventListener('stepchange', e => { if (e.detail.step === 3) count(); });
  window.Block3 = { render, renderBody, drawOverlay, byGroupTable, LAYERS };
})();
