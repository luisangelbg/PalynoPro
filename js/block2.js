/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — Block 2, images and calibration. */
(function () {
  'use strict';
  let filter = 'all', sel = null, measuring = null;
  const TIERS = { standard: ['Un grano', 'One grain'], overview: ['Panorámica', 'Overview'], detail: ['Detalle', 'Detail'] };
  const SRC = { manual: ['a mano', 'by hand'], index: ['índice', 'index'], instrument: ['del equipo', 'instrument'], magnification: ['magnificación', 'magnification'], none: ['sin calibrar', 'not calibrated'] };

  function render() {
    const P = el('panel-2');
    P.innerHTML = panelHead(2, 'Imágenes y calibración', 'Images and calibration', 'Abre una carpeta, revisa los grupos y comprueba la calibración de cada foto.', 'Open a folder, check the groups and the calibration of every picture.') +
      `<details class="why"><summary>${L2('Qué hace este bloque', 'What this block does')}</summary>${L2(
        '<p>Lee las imágenes de una carpeta (TIFF de 8 o 16 bits, PNG, JPEG…) y, si los hay, el archivo de texto que el microscopio deja junto a cada una (mismo nombre, extensión .txt), un <b>índice</b> en CSV con columnas como <code>archivo, grupo, nombre, grano, magnificacion, excluir</code> y una <b>clave</b> de nombres de grupo (líneas como <code>A = Morfotipo A</code> o <code>G1: Morfotipo uno</code>). Si no hay índice, el grupo y el grano se leen del nombre del archivo.</p><p>Cada foto se calibra (µm por píxel) y se comprueba contra su propia barra de escala: la barra por el tamaño del píxel debe dar una longitud redonda. Las fotos sin barra se calibran igual, pero no se pueden comprobar.</p>',
        '<p>It reads the images of a folder (8- or 16-bit TIFF, PNG, JPEG…) and, when present, the text file the microscope leaves next to each one (same name, .txt extension), an <b>index</b> in CSV with columns such as <code>file, group, name, grain, magnification, exclude</code> and a <b>key</b> of group names (lines like <code>A = Morphotype A</code> or <code>G1: Morphotype one</code>). Without an index, group and grain are read from the file name.</p><p>Every picture is calibrated (µm per pixel) and checked against its own scale bar: the bar times the pixel size must give a round length. Pictures without a bar are calibrated all the same, but cannot be checked.</p>')}</details>
      <div class="card">
        <div class="dropzone" id="b2Drop">
          <div class="dz-art">${Art.drop()}</div>
          <h3>${L2('Arrastra aquí una carpeta o tus imágenes', 'Drop a folder or your images here')}</h3>
          <p>${L2('Con sus archivos de texto del microscopio, un índice CSV y una clave de grupos, si los tienes. Nada se sube: las imágenes se leen en tu computadora.', 'With the text files of the microscope, a CSV index and a key of groups, if you have them. Nothing is uploaded: the images are read on your computer.')}</p>
          <div class="btn-row" style="justify-content:center">
            <label class="btn btn-primary" for="b2Folder">${L2('Elegir una carpeta', 'Choose a folder')}</label>
            <input type="file" id="b2Folder" webkitdirectory directory multiple hidden data-es-title="Elegir una carpeta" data-en-title="Choose a folder" aria-label="Elegir una carpeta">
            <label class="btn btn-secondary" for="b2Files">${L2('Elegir archivos', 'Choose files')}</label>
            <input type="file" id="b2Files" multiple accept=".tif,.tiff,.png,.jpg,.jpeg,.bmp,.webp,.gif,.txt,.csv" hidden data-es-title="Elegir archivos" data-en-title="Choose files" aria-label="Elegir archivos">
            <button type="button" class="btn btn-ghost" id="b2Example">${L2('Ejemplo simulado', 'Simulated example')}</button>
            <button type="button" class="btn btn-ghost danger" id="b2Clear">${L2('Vaciar', 'Clear')}</button>
          </div>
        </div>
        <div class="messages" id="b2Msg"></div>
      </div>
      <div id="b2Body"></div>`;
    bind();
    renderBody();
  }

  function renderBody() {
    const host = el('b2Body');
    if (!host) return;
    if (!state.images.length) { host.innerHTML = ''; blockDone(); return; }
    const imgs = state.images, n = imgs.length;
    const cal = imgs.filter(r => r.calib && r.calib.umPerPx > 0).length, ok = imgs.filter(r => r.calib && r.calib.ok === true).length;
    const bad = imgs.filter(r => r.calib && r.calib.ok === false).length, nobar = imgs.filter(r => r.calib && !r.calib.bar).length;
    const groups = groupCodes(), grains = new Set(imgs.filter(r => !r.exclude && r.tier === 'standard').map(unitOf)).size;
    const t = Images.target('standard');
    host.innerHTML = `
      <div class="card"><h2>${L2('Resumen', 'Summary')}</h2><div id="b2Tiles"></div><div id="b2Verdicts"></div></div>
      <div class="card"><h2>${L2('Calibración y lectura de nombres', 'Calibration and reading of names')}</h2>
        <div class="setting-grid">
          <div class="field"><label for="b2Ref">${L2('Ancho del cuadro de referencia (<span class="nocase">mm</span>)', 'Width of the reference frame (<span class="nocase">mm</span>)')}</label><input type="text" id="b2Ref" class="num" inputmode="decimal" value="${state.set.refMm}"></div>
          <div class="field"><label for="b2Target">${L2('Píxel del análisis (<span class="nocase">µm</span>)', 'Pixel of the analysis (<span class="nocase">µm</span>)')}</label><input type="text" id="b2Target" class="num" inputmode="decimal" placeholder="${isFinite(t) ? fmtNum(t, 4) : ''}" value="${state.set.targetUm || ''}"><span class="field-help">${L2('vacío = automático', 'empty = automatic')}: ${isFinite(t) ? fmtNum(t, 4) : '—'} µm</span></div>
          <div class="field"><label for="b2Pattern">${L2('Patrón del nombre (grupo y grano)', 'Pattern of the name (group and grain)')}</label><input type="text" id="b2Pattern" value="${esc(state.set.pattern || ImgIO.DEFAULT_PATTERN)}" spellcheck="false"></div>
        </div>
        <p class="hint" id="b2PatternTest"></p>
        <div class="btn-row"><button type="button" class="btn btn-secondary" id="b2Apply">${L2('Aplicar', 'Apply')}</button></div>
        <p class="src-note">${L2('Todas las fotos se llevan al mismo tamaño de píxel antes de medirse, para que la textura y las espinas sean comparables entre fotos de distinta resolución. Las que tienen menos resolución se amplían y quedan marcadas.', 'Every picture is brought to the same pixel size before it is measured, so texture and spines are comparable between pictures of different resolution. Those with less resolution are enlarged and flagged.')}</p>
      </div>
      <div class="card"><h2>${L2('Grupos', 'Groups')}</h2><p class="hint">${L2('Escribe el nombre de cada grupo; se usa en tablas, figuras e informe.', 'Type the name of each group; it is used in tables, figures and the report.')}</p><div class="table-scroll" id="b2Groups"></div></div>
      <div class="card"><h2>${L2('Imágenes', 'Images')}</h2>
        <div class="chips" id="b2Filter"></div>
        <div class="table-scroll tall" id="b2Table"></div>
        <div class="table-tools"><button type="button" class="btn btn-ghost btn-sm" id="b2Csv">${L2('Descargar el índice (CSV)', 'Download the index (CSV)')}</button></div>
      </div>
      <div class="card" id="b2ViewerCard"><h2>${L2('Visor', 'Viewer')}</h2>
        <div class="viewer">
          <div><div class="stage" id="b2Stage"><div class="stage-empty">${L2('Elige una imagen de la tabla.', 'Choose an image in the table.')}</div></div>
            <div class="nav-row"><button type="button" class="btn btn-ghost btn-sm" id="b2Prev">← ${L2('Anterior', 'Previous')}</button><span class="pos" id="b2Pos"></span><button type="button" class="btn btn-ghost btn-sm" id="b2Next">${L2('Siguiente', 'Next')} →</button>
              <button type="button" class="btn btn-secondary btn-sm" id="b2Measure">${L2('Medir la barra a mano', 'Measure the bar by hand')}</button></div>
            <div class="legend-inline"><span><span class="sw" style="background:#ffe14d"></span>${L2('barra detectada', 'detected bar')}</span><span><span class="sw" style="background:#e8384f"></span>${L2('inicio del rótulo (lo de abajo no se analiza)', 'start of the caption (what lies below is not analyzed)')}</span></div>
          </div>
          <dl class="meta-list" id="b2Meta"></dl>
        </div>
      </div>`;
    statTiles('b2Tiles', [
      [T('Imágenes', 'Images'), n, imgs.filter(r => r.exclude).length + T(' excluidas', ' excluded')],
      [T('Grupos', 'Groups'), groups.length || '—', groups.slice(0, 6).join(' · ') + (groups.length > 6 ? '…' : '')],
      [T('Granos', 'Grains'), grains, T('en las fotos de un grano', 'in the one-grain pictures')],
      [T('Calibradas', 'Calibrated'), cal + ' / ' + n, null, cal === n ? 'ok' : 'warn'],
      [T('Barra comprobada', 'Bar checked'), ok, bad ? bad + T(' con barra dudosa', ' with a doubtful bar') : T('ninguna dudosa', 'none doubtful'), bad ? 'warn' : 'ok'],
      [T('Panorámicas', 'Overviews'), imgs.filter(r => r.tier === 'overview').length, imgs.filter(r => r.tier === 'detail').length + T(' de detalle', ' of detail')],
    ]);
    const v = [];
    if (cal < n) v.push(verdict('warn', L2(`${n - cal} imagen(es) no tienen magnificación ni tamaño de píxel: escribe su magnificación en la tabla o mide su barra a mano.`, `${n - cal} image(s) have no magnification nor pixel size: type their magnification in the table or measure their bar by hand.`)));
    if (bad) v.push(verdict('warn', L2(`${bad} barra(s) no dan una longitud redonda con la calibración: revisa esas fotos (filtro «Barra dudosa»). Puede ser una magnificación mal escrita o un ancho de referencia distinto.`, `${bad} bar(s) do not give a round length with the calibration: check those pictures (filter "Doubtful bar"). It may be a mistyped magnification or a different reference width.`)));
    if (ok && !bad) v.push(verdict('ok', L2(`Las ${ok} barras encontradas dan longitudes redondas: la calibración es coherente.`, `The ${ok} bars found give round lengths: the calibration is consistent.`)));
    const repl = imgs.filter(r => r.calib && r.calib.replaced).length;
    if (repl) v.push(verdict('warn', L2(`En ${repl} imagen(es), el tamaño del píxel del índice o del archivo no coincidía con la barra de escala y la magnificación sí: se usó la magnificación. Revisa ese índice.`, `In ${repl} image(s), the pixel size of the index or the file did not match the scale bar while the magnification did: the magnification was used. Check that index.`)));
    if (nobar) v.push(verdict('info', L2(`${nobar} foto(s) sin barra: se calibran por su magnificación, sin poder comprobarse.`, `${nobar} picture(s) without a bar: calibrated by their magnification, without a check.`)));
    if (!groups.length) v.push(verdict('warn', L2('No se reconoció ningún grupo en los nombres: ajusta el patrón o carga un índice con la columna «grupo».', 'No group was recognized in the names: adjust the pattern or load an index with a "group" column.')));
    el('b2Verdicts').innerHTML = v.join('');
    renderGroups(); renderFilter(); renderTable(); patternTest(); bindBody();
    if (sel && state.images.find(r => r.id === sel)) showImage(sel); else if (state.images[0]) showImage(state.images[0].id);
    blockDone();
  }

  function renderGroups() {
    const host = el('b2Groups');
    const rows = groupCodes().map(g => ({ g, nI: state.images.filter(r => r.group === g && !r.exclude).length, nG: new Set(state.images.filter(r => r.group === g && !r.exclude && r.tier === 'standard').map(unitOf)).size }));
    host.innerHTML = `<table><thead><tr><th>${L2('Código', 'Code')}</th><th>${L2('Nombre', 'Name')}</th><th class="num">${L2('Imágenes', 'Images')}</th><th class="num">${L2('Granos', 'Grains')}</th></tr></thead><tbody>` +
      rows.map(r => `<tr><td><span class="sw" style="background:${groupColor(r.g)}"></span>${esc(r.g)}</td><td><input type="text" data-gname="${esc(r.g)}" value="${esc(state.groups[r.g] || '')}" placeholder="${esc(r.g)}" aria-label="${esc(T('Nombre del grupo ', 'Name of group ') + r.g)}"></td><td class="num">${r.nI}</td><td class="num">${r.nG}</td></tr>`).join('') + '</tbody></table>';
  }
  const FILTERS = [['all', 'Todas', 'All'], ['standard', 'Un grano', 'One grain'], ['overview', 'Panorámicas', 'Overviews'], ['detail', 'Detalle', 'Detail'], ['flag', 'Barra dudosa', 'Doubtful bar'], ['nocal', 'Sin calibrar', 'Not calibrated'], ['excluded', 'Excluidas', 'Excluded']];
  function renderFilter() { el('b2Filter').innerHTML = FILTERS.map(f => `<button type="button" class="chip${filter === f[0] ? ' on' : ''}" data-f="${f[0]}" aria-pressed="${filter === f[0]}">${L2(f[1], f[2])}</button>`).join(''); }
  function visible() {
    return state.images.filter(r => filter === 'all' || (filter === 'flag' ? r.calib && r.calib.ok === false : filter === 'nocal' ? !(r.calib && r.calib.umPerPx > 0) : filter === 'excluded' ? r.exclude : r.tier === filter));
  }
  function barBadge(r) {
    const c = r.calib;
    if (!c || !(c.umPerPx > 0)) return `<span class="qc bad">${L2('sin calibrar', 'not calibrated')}</span>`;
    if (!c.bar) return `<span class="qc none">${L2('sin barra', 'no bar')}</span>`;
    const t = fmtNum(c.barUm, 3) + ' µm';
    return c.ok ? `<span class="qc ok" title="${esc(c.bar.len + ' px')}">✓ ${t}</span>` : `<span class="qc warn" title="${esc(c.bar.len + ' px')}">! ${t}</span>`;
  }
  function renderTable() {
    const rows = visible();
    el('b2Table').innerHTML = `<table class="img-table"><thead><tr><th></th><th>${L2('Archivo', 'File')}</th><th>${L2('Grupo', 'Group')}</th><th>${L2('Grano', 'Grain')}</th><th class="num">${L2('Magnif.', 'Magnif.')}</th><th class="num">${L2('Ancho (px)', 'Width (px)')}</th><th class="num">µm/px</th><th>${L2('Fuente', 'Source')}</th><th>${L2('Barra', 'Bar')}</th><th>${L2('Tipo', 'Kind')}</th><th>${L2('Excluir', 'Exclude')}</th></tr></thead><tbody>` +
      rows.map(r => `<tr data-id="${r.id}" class="${r.exclude ? 'excluded' : ''}${r.id === sel ? ' row-best' : ''}">
        <td><button type="button" class="btn btn-ghost btn-sm b2-see" data-id="${r.id}" aria-label="${esc(T('Ver ', 'View ') + r.name)}"><img class="thumb" src="${r.thumb}" alt=""></button></td>
        <td>${esc(r.name)}</td>
        <td><input type="text" class="grp" data-k="group" value="${esc(r.group)}" aria-label="${esc(T('Grupo de ', 'Group of ') + r.name)}"></td>
        <td><input type="text" class="grain" data-k="grain" value="${esc(r.grain)}" aria-label="${esc(T('Grano de ', 'Grain of ') + r.name)}"></td>
        <td class="num"><input type="text" class="mag" data-k="mag" inputmode="decimal" value="${r.mag > 0 ? r.mag : ''}" aria-label="${esc(T('Magnificación de ', 'Magnification of ') + r.name)}"></td>
        <td class="num">${r.w || '—'}</td>
        <td class="num">${r.calib && r.calib.umPerPx > 0 ? fmtNum(r.calib.umPerPx, 5) : '—'}</td>
        <td>${L2(...(SRC[r.calib ? r.calib.source : 'none']))}</td>
        <td>${barBadge(r)}</td>
        <td><select data-k="tier" aria-label="${esc(T('Tipo de ', 'Kind of ') + r.name)}">${Object.keys(TIERS).map(k => `<option value="${k}"${r.tier === k ? ' selected' : ''} data-es="${TIERS[k][0]}" data-en="${TIERS[k][1]}">${T(TIERS[k][0], TIERS[k][1])}</option>`).join('')}</select></td>
        <td><label class="chk"><input type="checkbox" data-k="exclude"${r.exclude ? ' checked' : ''} aria-label="${esc(T('Excluir ', 'Exclude ') + r.name)}"></label></td></tr>`).join('') + '</tbody></table>';
  }
  function patternTest() {
    const p = el('b2Pattern'), out = el('b2PatternTest');
    if (!p || !out) return;
    const ex = state.images.slice(0, 3).map(r => { const m = ImgIO.fromName(r.stem, p.value); return `<code>${esc(r.stem)}</code> → ${L2('grupo', 'group')} <b>${esc(m.group || '—')}</b>, ${L2('grano', 'grain')} <b>${esc(m.grain || '—')}</b>`; });
    out.innerHTML = L2('Así se leen los primeros nombres: ', 'This is how the first names are read: ') + ex.join(' · ');
  }

  /* ---------------- the viewer ---------------- */
  async function showImage(id) {
    const r = state.images.find(x => x.id === id);
    if (!r) return;
    sel = id;
    els('#b2Table tr').forEach(tr => tr.classList.toggle('row-best', tr.dataset.id === id));
    const list = visible(), i = list.findIndex(x => x.id === id);
    el('b2Pos').textContent = i >= 0 ? (i + 1) + ' / ' + list.length : '';
    const c = r.calib || {};
    const fov = c.umPerPx > 0 ? fmtNum(r.w * c.umPerPx, 4) + ' × ' + fmtNum(r.h * c.umPerPx, 4) + ' µm' : '—';
    const meta = r.meta || {};
    el('b2Meta').innerHTML = `<dt>${L2('Archivo', 'File')}</dt><dd>${esc(r.name)}</dd><dt>${L2('Grupo · grano', 'Group · grain')}</dt><dd>${esc(groupName(r.group))} · ${esc(r.grain || '—')}</dd>` +
      `<dt>${L2('Tamaño', 'Size')}</dt><dd>${r.w} × ${r.h} px</dd><dt>${L2('Magnificación', 'Magnification')}</dt><dd>${r.mag > 0 ? fmtNum(r.mag) + '×' : '—'}</dd>` +
      `<dt>${L2('Tamaño del píxel', 'Pixel size')}</dt><dd>${c.umPerPx > 0 ? fmtNum(c.umPerPx, 5) + ' µm (' + T(...SRC[c.source]) + ')' : '—'}${c.replaced ? '<br><span class="muted">' + esc((c.replaced.source === 'index' ? T('el índice decía ', 'the index said ') : T('el archivo decía ', 'the file said ')) + fmtNum(c.replaced.umPerPx, 5) + ' µm; ' + T('la barra lo contradice y la magnificación no', 'the bar contradicts it and the magnification does not')) + '</span>' : ''}</dd><dt>${L2('Campo', 'Field')}</dt><dd>${fov}</dd>` +
      `<dt>${L2('Barra de escala', 'Scale bar')}</dt><dd>${c.bar ? c.bar.len + ' px = ' + fmtNum(c.barUm, 3) + ' µm' + (c.nice ? ' (' + (c.ok ? T('redonda: ', 'round: ') : T('se esperaba ', 'expected ')) + fmtNum(c.nice.value) + ' µm)' : '') : T('no encontrada', 'not found')}</dd>` +
      (meta.kv > 0 ? `<dt>${L2('Voltaje', 'Voltage')}</dt><dd>${fmtNum(meta.kv)} kV</dd>` : '') + (meta.wd > 0 ? `<dt>${L2('Distancia de trabajo', 'Working distance')}</dt><dd>${fmtNum(meta.wd)} mm</dd>` : '') + (meta.date ? `<dt>${L2('Fecha', 'Date')}</dt><dd>${esc(meta.date)}</dd>` : '') + (r.note ? `<dt>${L2('Nota', 'Note')}</dt><dd>${esc(r.note)}</dd>` : '');
    const stage = el('b2Stage');
    if (!Images.has(r)) { stage.innerHTML = `<div class="stage-empty">${L2('La imagen no está abierta en esta sesión: abre otra vez su carpeta.', 'The image is not open in this session: open its folder again.')}</div>`; return; }
    try {
      const img = await Images.decode(r), k = Math.min(1, 1200 / img.w), small = Img.resample(img, img.w * k, img.h * k);
      stage.innerHTML = '<canvas id="b2Canvas"></canvas>';
      const cv = el('b2Canvas'), g = Images.toCanvas(small, cv);
      cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', r.name);
      if (c.bar) { g.strokeStyle = '#ffe14d'; g.lineWidth = 2; g.strokeRect(c.bar.x * k - 3, c.bar.y * k - 3, c.bar.len * k + 6, c.bar.rows * k + 6); }
      if (r.captionRow && r.captionRow < img.h) { g.strokeStyle = '#e8384f'; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(0, r.captionRow * k); g.lineTo(small.w, r.captionRow * k); g.stroke(); g.setLineDash([]); }
      cv.addEventListener('click', ev => measureClick(ev, r, k));
    } catch (e) { stage.innerHTML = `<div class="stage-empty">${esc(e.message)}</div>`; }
  }
  function measureClick(ev, r, k) {
    if (!measuring) return;
    const cv = ev.currentTarget, b = cv.getBoundingClientRect(), x = (ev.clientX - b.left) / b.width * cv.width / k, y = (ev.clientY - b.top) / b.height * cv.height / k;
    measuring.pts.push([x, y]);
    const g = cv.getContext('2d');
    g.fillStyle = '#19b4e8'; g.beginPath(); g.arc(x * k, y * k, 5, 0, 2 * Math.PI); g.fill();
    if (measuring.pts.length === 2) {
      const [p, q] = measuring.pts, len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      measuring = null;
      const um = num(prompt(T('¿Cuántos µm mide la barra que marcaste? (', 'How many µm is the bar you marked? (') + fmtNum(len, 1) + ' px)', ''));
      if (um > 0) { r.manualUmPerPx = Calib.fromBar(len, um); Images.recalibrate(r); toast(T('Calibrada a mano: ', 'Calibrated by hand: ') + fmtNum(r.manualUmPerPx, 5) + ' µm/px', 'success'); invalidate(); renderBody(); }
    }
  }
  /* what depends on the calibration is computed again */
  function invalidate() { state.results.images = {}; state.results.fertility = null; state.results.stats = null; document.dispatchEvent(new CustomEvent('imageschange')); }

  /* ---------------- events ---------------- */
  async function open(files) {
    clearMessages('b2Msg');
    files = [...(files || [])];   /* a copy: the input is emptied right after the call */
    if (!files.length) return;
    const fresh = !state.images.length;
    /* The pictures of an open project are only attached again: its results stay. New pictures
       change the set, and what was computed on the old one is cleared, after asking. */
    const known = new Set(state.images.map(r => r.name));
    const nNew = files.filter(f => ImgIO.IMAGE_EXT.includes(ImgIO.ext(f.name)) && !known.has(f.name)).length;
    const hadResults = Object.keys(state.results.images).length > 0 || !!state.results.fertility;
    if (nNew && hadResults && !confirm(T(`Hay ${nNew} imagen(es) que no estaban en el conjunto. Añadirlas borra los resultados ya calculados (contorno, ornamentación, fertilidad y estadística), que habrá que calcular otra vez. ¿Seguir?`, `There are ${nNew} image(s) that were not in the set. Adding them clears the results already computed (outline, ornamentation, fertility and statistics), which will have to be computed again. Continue?`))) return;
    if (fresh) state.example = null;
    try {
      const rep = await withWork(T('Leyendo las imágenes', 'Reading the images'), w => Images.openFiles(files, w));
      showMessage('b2Msg', rep.added || rep.attached ? 'success' : 'warning', L2(`${rep.added} imagen(es) leídas`, `${rep.added} image(s) read`) + (rep.attached ? L2(`, ${rep.attached} del proyecto vueltas a abrir`, `, ${rep.attached} of the project opened again`) : '') + (rep.sidecars ? L2(`, ${rep.sidecars} archivo(s) del microscopio`, `, ${rep.sidecars} microscope file(s)`) : '') + (rep.index ? L2(`, índice «${esc(rep.index)}»`, `, index "${esc(rep.index)}"`) : '') + (rep.key ? L2(`, ${rep.key} nombre(s) de grupo`, `, ${rep.key} group name(s)`) : '') + '.',
        [rep.skipped.length ? L2('No se pudieron leer: ', 'Could not be read: ') + esc(rep.skipped.slice(0, 5).join(' · ')) + (rep.skipped.length > 5 ? '…' : '') : '',
          rep.added && hadResults ? L2('El conjunto cambió: los resultados anteriores se borraron.', 'The set changed: the previous results were cleared.') : ''].filter(Boolean).join('<br>') || null);
      if (rep.added) invalidate();
      else { document.dispatchEvent(new CustomEvent('imageschange')); if (rep.key) document.dispatchEvent(new CustomEvent('groupschange')); }
      renderBody();
    } catch (e) { showMessage('b2Msg', 'error', esc(e.message)); }
  }
  async function loadExample() {
    if (state.images.length && !state.example && !confirm(T('Esto reemplaza las imágenes abiertas por el ejemplo simulado. ¿Seguir?', 'This replaces the open images with the simulated example. Continue?'))) return;
    clearMessages('b2Msg');
    await withWork(T('Dibujando el ejemplo simulado', 'Drawing the simulated example'), w => Images.openExample(w));
    showMessage('b2Msg', 'info', L2('Ejemplo <b>simulado</b>: tres morfotipos dibujados por la app con parámetros conocidos (no son fotos de plantas reales). Algunos granos se fotografiaron dos veces, como en un estudio real.', '<b>Simulated</b> example: three morphotypes drawn by the app with known parameters (they are not photographs of real plants). Some grains were photographed twice, as in a real study.'));
    invalidate(); renderBody();
  }
  /* folders dropped: walk their entries */
  async function filesOfDrop(dt) {
    const items = [...(dt.items || [])], out = [];
    const walk = entry => new Promise(res => {
      if (entry.isFile) entry.file(f => { out.push(f); res(); }, () => res());
      else if (entry.isDirectory) {
        const reader = entry.createReader(), all = [];
        const more = () => reader.readEntries(async ents => { if (!ents.length) { for (const e of all) await walk(e); res(); } else { all.push(...ents); more(); } }, () => res());
        more();
      } else res();
    });
    const entries = items.map(it => it.webkitGetAsEntry && it.webkitGetAsEntry()).filter(Boolean);
    if (entries.length) { for (const e of entries) await walk(e); return out; }
    return [...(dt.files || [])];
  }
  function bind() {
    const dz = el('b2Drop');
    ['dragenter', 'dragover'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.remove('over'); }));
    dz.addEventListener('drop', async e => open(await filesOfDrop(e.dataTransfer)));
    el('b2Folder').addEventListener('change', e => { open(e.target.files); e.target.value = ''; });
    el('b2Files').addEventListener('change', e => { open(e.target.files); e.target.value = ''; });
    el('b2Example').addEventListener('click', loadExample);
    el('b2Clear').addEventListener('click', () => { if (!state.images.length || confirm(T('¿Quitar todas las imágenes y resultados?', 'Remove every image and result?'))) { Images.reset(); invalidate(); clearMessages('b2Msg'); renderBody(); } });
  }
  function bindBody() {
    el('b2Filter').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; filter = b.dataset.f; renderFilter(); renderTable(); });
    el('b2Groups').addEventListener('change', e => { const i = e.target.closest('[data-gname]'); if (i) { state.groups[i.dataset.gname] = i.value.trim(); document.dispatchEvent(new CustomEvent('groupschange')); } });
    el('b2Table').addEventListener('click', e => { const b = e.target.closest('.b2-see'); if (b) showImage(b.dataset.id); });
    el('b2Table').addEventListener('change', e => {
      const tr = e.target.closest('tr[data-id]'), k = e.target.dataset.k;
      if (!tr || !k) return;
      const r = state.images.find(x => x.id === tr.dataset.id);
      if (k === 'exclude') r.exclude = e.target.checked;
      else if (k === 'tier') { r.tier = e.target.value; r.tierManual = true; }
      else if (k === 'mag') { r.mag = num(e.target.value); Images.recalibrate(r); }
      else { r[k] = e.target.value.trim(); if (k === 'group' || k === 'grain') r[k + 'From'] = 'manual'; }
      invalidate();
      /* the counts of grains and groups depend on all of these */
      if (k !== 'note') renderBody(); else { tr.classList.toggle('excluded', r.exclude); }
    });
    el('b2Pattern').addEventListener('input', patternTest);
    el('b2Apply').addEventListener('click', () => {
      const ref = num(el('b2Ref').value), tg = num(el('b2Target').value), pat = el('b2Pattern').value.trim();
      try { new RegExp(pat); } catch (e) { toast(T('El patrón no es una expresión válida.', 'The pattern is not a valid expression.'), 'error'); return; }
      state.set.refMm = ref > 0 ? ref : 128;
      state.set.targetUm = tg > 0 ? tg : null;
      /* a new pattern reads group and grain again, except where an index or the user gave them:
         those were chosen on purpose, the pattern only guesses (they are changed in the table) */
      let kept = 0;
      if (pat !== (state.set.pattern || ImgIO.DEFAULT_PATTERN)) {
        state.set.pattern = pat === ImgIO.DEFAULT_PATTERN ? '' : pat;
        state.images.forEach(r => {
          const m = ImgIO.fromName(r.stem, pat);
          let held = false;
          if (r.groupFrom) held = true; else if (m.group) r.group = m.group;
          if (r.grainFrom) held = true; else if (m.grain) r.grain = m.grain;
          if (held) kept++;
        });
      }
      state.images.forEach(Images.recalibrate);
      Images.tiers();
      invalidate(); renderBody();
      if (kept) showMessage('b2Msg', 'info', L2(`El patrón nuevo no cambió el grupo ni el grano de ${kept} imagen(es): venían del índice o se escribieron en la tabla, y esos mandan. Si quieres cambiarlos, edítalos en la tabla.`, `The new pattern did not change the group or grain of ${kept} image(s): they came from the index or were typed in the table, and those prevail. To change them, edit them in the table.`));
      toast(T('Calibración aplicada', 'Calibration applied'), 'success');
    });
    el('b2Csv').addEventListener('click', () => {
      const cols = [{ label: 'archivo', key: 'name' }, { label: 'grupo', key: 'group' }, { label: 'nombre', get: r => state.groups[r.group] || '' }, { label: 'grano', key: 'grain' }, { label: 'magnificacion', get: r => (r.mag > 0 ? r.mag : '') },
        { label: 'ancho_px', key: 'w' }, { label: 'um_por_px', get: r => (r.calib && r.calib.umPerPx > 0 ? r.calib.umPerPx : '') }, { label: 'fuente', get: r => T(...SRC[(r.calib && r.calib.source) || 'none']) }, { label: 'barra_px', get: r => (r.calib && r.calib.bar ? r.calib.bar.len : '') },
        /* the kind in words of the interface: read again as an index, either language gives the same kind (ImgIO.tierOf) */
        { label: 'barra_um', get: r => (r.calib && r.calib.bar ? r.calib.barUm : '') }, { label: 'nivel', get: r => T(...(TIERS[r.tier] || TIERS.standard)).toLowerCase() }, { label: 'excluir', get: r => (r.exclude ? 1 : '') }, { label: 'nota', key: 'note' }];
      download(csvOf(cols, state.images), T('palynopro_indice.csv', 'palynopro_index.csv'), 'text/csv;charset=utf-8');
    });
    el('b2Prev').addEventListener('click', () => step(-1));
    el('b2Next').addEventListener('click', () => step(1));
    el('b2Measure').addEventListener('click', () => { measuring = { pts: [] }; toast(T('Haz clic en los dos extremos de la barra de escala.', 'Click on both ends of the scale bar.')); });
  }
  function step(d) { const list = visible(); if (!list.length) return; const i = list.findIndex(x => x.id === sel); showImage(list[(i + d + list.length) % list.length].id); }

  /* ---------------- the project ---------------- */
  window.Project = {
    load(obj) {
      const d = obj.data;
      Images.reset();
      Object.assign(state.meta, d.meta || {});
      Object.assign(state.set, d.set || {});
      state.groups = d.groups || {};
      state.example = d.example || null;
      const list = d.example === 'synth' ? Synth.exampleList(8) : null;
      state.images = (d.images || []).map(x => {
        const r = Images.newRecord(x);
        if (list && x.synth != null && list[x.synth]) r.src = { kind: 'synth', make: list[x.synth].make };
        return r;
      });
      const saved = (d.results && d.results.images) || {};
      state.results = { images: {}, fertility: (d.results && d.results.fertility) || null, stats: null };
      state.images.forEach(r => { const v = saved[r.name]; if (v) state.results.images[r.id] = Object.assign({}, v, { radial: v.radial && Float32Array.from(v.radial), base: v.base && Float32Array.from(v.base) }); });
      render();
      document.dispatchEvent(new CustomEvent('imageschange'));
    },
  };

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('langchange', () => { if (state.images.length) renderBody(); });
  window.Block2 = { render, renderBody, loadExample, showImage, invalidate };
})();
