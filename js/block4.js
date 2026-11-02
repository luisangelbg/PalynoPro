/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — Block 4, ornamentation: spines on the outline, lumina of the
   reticulum and texture of the surface (measured in the pass of Block 3). */
(function () {
  'use strict';
  let sel = null;
  const ORN_KEYS = ['sp_n', 'sp_h', 'sp_spacing', 'sp_density', 'spininess', 'lum_d', 'lum_density', 'lum_cv', 'tx_contrast', 'tx_homogeneity', 'tx_entropy', 'tx_correlation'];
  const LAYERS = { lumina: true, spines: true, corpus: true };

  function render() {
    const P = el('panel-4');
    P.innerHTML = panelHead(4, 'Ornamentación', 'Ornamentation', 'Espinas en el contorno, lúmenes del retículo y textura de la superficie.', 'Spines on the outline, lumina of the reticulum and texture of the surface.') +
      `<details class="why"><summary>${L2('Cómo se mide', 'How it is measured')}</summary>${L2(
        '<p><b>Espinas.</b> En el perfil radial del grano, cada pico que se eleva sobre el cuerpo más que la altura mínima y es más angosto que la base máxima de una espina es una espina. De ellas salen el número en el contorno, la altura media (de la punta a la cuerda que une sus dos pies, por si el contorno del cuerpo está inclinado), el espaciado (perímetro libre del cuerpo entre el número de espinas) y la densidad por 100 µm de contorno. Las espinas son las del <b>contorno</b>: las que apuntan hacia el observador no se cuentan, así que el número es comparable entre grupos, no el total del grano. La altura sale menor que la real en cerca de un píxel, porque la punta más fina no llena un píxel.</p><p><b>Lúmenes.</b> Dentro del cuerpo, lejos de su borde, un píxel es lumen si es más oscuro que su vecindario; cada celda cerrada se mide. Las zonas oscuras grandes (aperturas, colpos) quedan fuera por su tamaño.</p><p><b>Textura.</b> La matriz de coocurrencia de grises a 0.2 y 0.4 µm resume el contraste, la homogeneidad, la entropía y la correlación de la superficie; solo cuentan pares de píxeles que están ambos sobre la superficie.</p>',
        '<p><b>Spines.</b> In the radial profile of the grain, each peak rising above the body by more than the least height and narrower than the largest base of a spine is a spine. From them come the number on the outline, the mean height (from the tip to the chord joining its two feet, in case the outline of the body slopes), the spacing (free perimeter of the body over the number of spines) and the density per 100 µm of outline. The spines are those of the <b>outline</b>: those pointing to the observer are not counted, so the number is comparable between groups, not the total of the grain. Height comes out about one pixel below the real one, because the finest tip does not fill a pixel.</p><p><b>Lumina.</b> Inside the body, away from its edge, a pixel is lumen if it is darker than its neighborhood; each closed cell is measured. Large dark zones (apertures, colpi) are left out by their size.</p><p><b>Texture.</b> The gray-level co-occurrence matrix at 0.2 and 0.4 µm sums up the contrast, homogeneity, entropy and correlation of the surface; only pairs of pixels both on the surface are counted.</p>')}</details>
      <div class="card"><h2>${L2('Lúmenes', 'Lumina')}</h2>
        <div class="setting-grid">
          <div class="field"><label for="b4Win">${L2('Radio del vecindario (<span class="nocase">µm</span>)', 'Radius of the neighborhood (<span class="nocase">µm</span>)')}</label><input type="text" id="b4Win" class="num" inputmode="decimal" value="${state.set.lumenWin}"></div>
          <div class="field"><label for="b4K">${L2('Más oscuro que el vecindario por (desv. est.)', 'Darker than the neighborhood by (st. dev.)')}</label><input type="text" id="b4K" class="num" inputmode="decimal" value="${state.set.lumenK}"></div>
        </div>
        <div class="btn-row"><button type="button" class="btn btn-secondary" id="b4Re">${L2('Volver a medir con estos valores', 'Measure again with these values')}</button></div>
        <p class="src-note">${L2('Se validó con retículos simulados: el diámetro mediano de lumen resultó proporcional a la malla dibujada en todo el intervalo de 1.8 a 4 µm, con variación entre réplicas menor a 3 %.', 'Validated on simulated reticula: the median lumen diameter came out proportional to the drawn mesh over the whole range from 1.8 to 4 µm, with less than 3% variation among replicates.')}</p>
      </div>
      <div id="b4Body"></div>`;
    el('b4Re').addEventListener('click', () => {
      state.set.lumenWin = num(el('b4Win').value) > 0 ? num(el('b4Win').value) : 1.5;
      state.set.lumenK = num(el('b4K').value) >= 0 ? num(el('b4K').value) : 0.15;
      goStep(3); el('b3Run') && el('b3Run').click();
    });
    renderBody();
  }
  function renderBody() {
    const host = el('b4Body');
    if (!host) return;
    const all = Images.rows({ usableOnly: false });
    if (!all.length) { host.innerHTML = `<div class="card"><div class="soon-box"><h3>${L2('Primero mide los granos', 'First measure the grains')}</h3><p>${L2('La ornamentación se mide en la misma pasada del Bloque 3.', 'Ornamentation is measured in the same pass of Block 3.')}</p><button type="button" class="btn btn-primary" id="b4Go">${L2('Ir al Bloque 3', 'Go to Block 3')}</button></div></div>`; el('b4Go').addEventListener('click', () => goStep(3)); blockDone(); return; }
    const usable = all.filter(r => r.usable), units = Multi.byUnit(usable, ORN_KEYS, r => r.unit, r => r.group);
    const codes = groupCodes().filter(g => units.some(u => u.group === g));
    host.innerHTML = `<div class="card"><h2>${L2('Resultados', 'Results')}</h2><div id="b4Tiles"></div>
        <h3>${L2('Por grupo', 'By group')}</h3><div class="table-scroll" id="b4Groups"></div><div class="table-tools"><button type="button" class="btn btn-ghost btn-sm" id="b4Csv">CSV</button></div>
        <div class="fig-grid">${Fig.block('b4FigSp', 'Densidad de espinas por grupo', 'Spine density by group')}${Fig.block('b4FigLum', 'Diámetro de lumen por grupo', 'Lumen diameter by group')}</div>
        <div class="fig-grid">${Fig.block('b4FigH', 'Altura de espina por grupo', 'Spine height by group')}${Fig.block('b4FigTx', 'Textura: contraste contra homogeneidad', 'Texture: contrast against homogeneity')}</div>
      </div>
      <div class="card"><h2>${L2('Revisión de cada foto', 'Check of every picture')}</h2>
        <div class="viewer">
          <div><div class="stage" id="b4Stage"><div class="stage-empty">${L2('Elige una foto.', 'Choose a picture.')}</div></div>
            <div class="nav-row"><button type="button" class="btn btn-ghost btn-sm" id="b4Prev">← ${L2('Anterior', 'Previous')}</button><select id="b4Sel" aria-label="${esc(T('Foto', 'Picture'))}"></select><button type="button" class="btn btn-ghost btn-sm" id="b4Next">${L2('Siguiente', 'Next')} →</button></div>
            <div class="layer-toggles" id="b4Layers"></div>
          </div>
          <dl class="meta-list" id="b4Meta"></dl>
        </div>
        ${Fig.block('b4FigProfile', 'Perfil radial de la foto elegida', 'Radial profile of the chosen picture')}
      </div>`;
    const mean = k => Stats.mean(units.map(u => u[k]).filter(isFinite));
    statTiles('b4Tiles', [
      [T('Espinas en el contorno', 'Spines on the outline'), fmtFixed(mean('sp_n'), 1), T('por grano (media)', 'per grain (mean)')],
      [T('Altura de espina', 'Spine height'), fmtFixed(mean('sp_h'), 2) + ' µm'],
      [T('Densidad de espinas', 'Spine density'), fmtFixed(mean('sp_density'), 2), T('por 100 µm de contorno', 'per 100 µm of outline')],
      [T('Lumen (mediana)', 'Lumen (median)'), fmtFixed(mean('lum_d'), 2) + ' µm', fmtFixed(mean('lum_density'), 1) + T(' por 100 µm²', ' per 100 µm²')],
    ]);
    const rows = codes.map(g => { const U = units.filter(u => u.group === g), o = { g, n: U.length }; ORN_KEYS.forEach(k => { const v = U.map(u => u[k]).filter(isFinite); o[k] = Stats.mean(v); o[k + '_sd'] = Stats.sd(v); }); return o; });
    /* the groups as columns and the measures as rows, in three sections (Block3.byGroupTable) */
    Block3.byGroupTable('b4Groups', rows, [{ title: ['Espinas', 'Spines'], keys: ORN_KEYS.slice(0, 5) }, { title: ['Lúmenes', 'Lumina'], keys: ORN_KEYS.slice(5, 8) }, { title: ['Textura', 'Texture'], keys: ORN_KEYS.slice(8) }],
      k => Math.min(3, metric(k).d), L2('Media ± desviación estándar entre granos.', 'Mean ± standard deviation among grains.'));
    el('b4Csv').addEventListener('click', () => download(csvOf([{ label: 'grupo', key: 'g' }, { label: 'nombre', get: r => groupName(r.g) }, { label: 'n_granos', key: 'n' }].concat(...ORN_KEYS.map(k => [{ label: k + '_media', key: k }, { label: k + '_de', key: k + '_sd' }])), rows), T('palynopro_ornamentacion_por_grupo.csv', 'palynopro_ornamentation_by_group.csv'), 'text/csv;charset=utf-8'));
    const boxOf = (id, k, title) => { el(id).innerHTML = Fig.box({ width: Math.max(420, 90 + codes.length * 60), height: 320, ylab: metricLabel(k, true), groups: codes.map(g => ({ name: g, color: groupColor(g), values: units.filter(u => u.group === g).map(u => u[k]) })), aria: title }); };
    boxOf('b4FigSp', 'sp_density', T('Densidad de espinas por grupo', 'Spine density by group'));
    boxOf('b4FigLum', 'lum_d', T('Diámetro de lumen por grupo', 'Lumen diameter by group'));
    boxOf('b4FigH', 'sp_h', T('Altura de espina por grupo', 'Spine height by group'));
    el('b4FigTx').innerHTML = Fig.scatter({ width: 470, height: 340, xlab: metricLabel('tx_contrast'), ylab: metricLabel('tx_homogeneity'), ellipse: 0.95, groups: codes.map(g => ({ key: g, name: g, color: groupColor(g) })), points: units.map(u => ({ x: u.tx_contrast, y: u.tx_homogeneity, g: u.group, title: u.unit })), aria: T('Textura por grano', 'Texture by grain') });
    const selEl = el('b4Sel');
    selEl.innerHTML = all.map(r => `<option value="${r.id}">${esc(r.name)}${r.usable ? '' : ' ⚠'}</option>`).join('');
    selEl.addEventListener('change', () => show(selEl.value));
    el('b4Prev').addEventListener('click', () => { const i = all.findIndex(r => r.id === sel); show(all[(i - 1 + all.length) % all.length].id); });
    el('b4Next').addEventListener('click', () => { const i = all.findIndex(r => r.id === sel); show(all[(i + 1) % all.length].id); });
    el('b4Layers').innerHTML = [['lumina', '#3fd17a', 'Lúmenes', 'Lumina'], ['spines', '#e8384f', 'Espinas', 'Spines'], ['corpus', '#19b4e8', 'Cuerpo', 'Body']]
      .map(([k, c, es, en]) => `<label class="chk"><input type="checkbox" data-layer="${k}"${LAYERS[k] ? ' checked' : ''}> <span class="sw" style="background:${c}"></span>${L2(es, en)}</label>`).join('');
    el('b4Layers').addEventListener('change', e => { const k = e.target.dataset.layer; if (k) { LAYERS[k] = e.target.checked; show(sel); } });
    show(sel && all.find(r => r.id === sel) ? sel : all[0].id);
    blockDone();
  }
  async function show(id) {
    const r = state.images.find(x => x.id === id), res = state.results.images[id];
    if (!r || !res) return;
    sel = id;
    const s = el('b4Sel'); if (s) s.value = id;
    const m = res.metrics;
    el('b4Meta').innerHTML = `<dt>${L2('Foto', 'Picture')}</dt><dd>${esc(r.name)}</dd>` + ORN_KEYS.map(k => `<dt>${metricDt(k)}</dt><dd>${fmtFixed(m[k], k === 'sp_n' ? 0 : Math.min(3, metric(k).d))}</dd>`).join('') + `<dt>${L2('Lúmenes medidos', 'Lumina measured')}</dt><dd>${res.qc.nLumina}</dd>`;
    /* the radial profile, every direction: the spines are marked on their own direction, so a line drawn
       every other direction would pass under some of them */
    const n = res.radial.length, um = res.workUm, env = [], bas = [];
    for (let i = 0; i < n; i++) { env.push({ x: i * 360 / n, y: res.radial[i] * um }); bas.push({ x: i * 360 / n, y: res.base[i] * um }); }
    el('b4FigProfile').innerHTML = Fig.xy({ width: 760, height: 300, xlab: T('Dirección desde el centro (°)', 'Direction from the center (°)'), ylab: T('Radio (µm)', 'Radius (µm)'), xRange: [0, 360],
      aria: T('Perfil radial de ', 'Radial profile of ') + r.name,
      series: [{ name: T('Contorno', 'Outline'), color: 'var(--accent)', pts: env, line: true, markers: false, width: 1.4 },
        { name: T('Cuerpo', 'Body'), color: 'var(--primary)', pts: bas, line: true, markers: false, width: 2.4, dash: '6 4' },
        { name: T('Espinas', 'Spines'), color: 'var(--chart7)', pts: res.peaks.map(i => ({ x: i * 360 / n, y: res.radial[i] * um })), shape: 'circle', r: 3.2 }] });
    const stage = el('b4Stage');
    if (!Images.has(r)) { stage.innerHTML = `<div class="stage-empty">${L2('Abre otra vez la carpeta para ver la foto.', 'Open the folder again to see the picture.')}</div>`; return; }
    try {
      const { a, img } = await Images.inspect(r);
      if (sel !== id) return;
      stage.innerHTML = '<canvas id="b4Canvas"></canvas>';
      const cv = el('b4Canvas'), g = Images.toCanvas(img, cv);
      cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', T('Ornamentación de ', 'Ornamentation of ') + r.name);
      if (LAYERS.lumina && a.lumina && a.lumina.mask) {
        const id2 = g.getImageData(0, 0, img.w, img.h), lm = a.lumina.mask;
        for (let i = 0; i < lm.length; i++) if (lm[i]) { id2.data[4 * i] = 40; id2.data[4 * i + 1] = 200; id2.data[4 * i + 2] = 110; }
        g.putImageData(id2, 0, 0);
      }
      Block3.drawOverlay(g, a, img, { mask: false, env: false, corpus: LAYERS.corpus, spines: LAYERS.spines, feret: false, cut: false });
    } catch (e) { stage.innerHTML = `<div class="stage-empty">${esc(e.message)}</div>`; }
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('measured', renderBody);
  document.addEventListener('imageschange', renderBody);
  document.addEventListener('langchange', renderBody);
  window.Block4 = { render, renderBody, ORN_KEYS };
})();
