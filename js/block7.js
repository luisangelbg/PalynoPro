/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — Block 7, the report: the methods written out with what was
   actually used, the results, every figure, a gallery of measured grains and
   the limits; one standalone HTML document, to print or save as PDF. */
(function () {
  'use strict';
  let last = '';
  /* the language of the report is a setting (state.set.reportLang: 'es', 'en' or null for that of
     the screen), so the saved project keeps it */
  const L = () => state.set.reportLang || I18N.lang;
  const t = (es, en) => (L() === 'en' ? en : es);

  function render() {
    const P = el('panel-7');
    P.innerHTML = panelHead(7, 'Informe', 'Report', 'Métodos, resultados, figuras y galería en un documento para imprimir o guardar en PDF.', 'Methods, results, figures and gallery in one document to print or save as PDF.') +
      `<div class="card"><h2>${L2('Datos del informe', 'Details of the report')}</h2>
        <div class="setting-grid">
          <div class="field"><label for="b7Title">${L2('Título', 'Title')}</label><input type="text" id="b7Title" value="${esc(state.meta.title)}" data-es-ph="Morfometría polínica de …" data-en-ph="Pollen morphometry of …" placeholder="Morfometría polínica de …"></div>
          <div class="field"><label for="b7Species">${L2('Especie o material', 'Species or material')}</label><input type="text" id="b7Species" value="${esc(state.meta.species)}"></div>
          <div class="field"><label for="b7Analyst">${L2('Autor(a)', 'Author')}</label><input type="text" id="b7Analyst" value="${esc(state.meta.analyst)}"></div>
          <div class="field"><label for="b7Lab">${L2('Institución', 'Institution')}</label><input type="text" id="b7Lab" value="${esc(state.meta.lab)}"></div>
          <div class="field"><label for="b7Lang">${L2('Idioma del informe', 'Language of the report')}</label><select id="b7Lang"><option value="" data-es="El de la pantalla" data-en="That of the screen">${T('El de la pantalla', 'That of the screen')}</option><option value="es">Español</option><option value="en">English</option></select></div>
        </div>
        <div id="b7Check"></div>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" id="b7Make">${L2('Generar el informe', 'Make the report')}</button>
          <button type="button" class="btn btn-secondary" id="b7Print" disabled>${L2('Imprimir / guardar como PDF', 'Print / save as PDF')}</button>
          <button type="button" class="btn btn-ghost" id="b7Html" disabled>${L2('Descargar (HTML)', 'Download (HTML)')}</button>
          <button type="button" class="btn btn-ghost" id="b7Methods" disabled>${L2('Copiar los métodos', 'Copy the methods')}</button>
          <button type="button" class="btn btn-ghost" id="b7Proj">${L2('Guardar el proyecto', 'Save the project')}</button>
        </div>
        <p class="src-note">${L2('Las figuras salen con los colores del tema claro, sea cual sea el de la pantalla. En el diálogo de impresión elige «Guardar como PDF» para obtener el archivo; el texto queda vectorial.', 'Figures come out with the colors of the light theme, whatever that of the screen. In the print dialog choose "Save as PDF" to get the file; the text stays vector.')}</p>
      </div>
      <div class="card" id="b7PrevCard" hidden><h2>${L2('Vista previa', 'Preview')}</h2><iframe id="b7Frame" title="${esc(T('Vista previa del informe', 'Preview of the report'))}" style="width:100%;height:900px;border:1px solid var(--border);border-radius:var(--r-md);background:#fff"></iframe></div>`;
    const bindMeta = (id, k) => el(id).addEventListener('input', e => { state.meta[k] = e.target.value; });
    bindMeta('b7Title', 'title'); bindMeta('b7Species', 'species'); bindMeta('b7Analyst', 'analyst'); bindMeta('b7Lab', 'lab');
    el('b7Lang').addEventListener('change', e => { state.set.reportLang = e.target.value || null; });
    fill();
    el('b7Make').addEventListener('click', make);
    el('b7Print').addEventListener('click', () => { const f = el('b7Frame'); if (f && f.contentWindow) { f.contentWindow.focus(); f.contentWindow.print(); } });
    el('b7Html').addEventListener('click', () => download(last, slug(state.meta.title || t('palynopro_informe', 'palynopro_report')) + '.html', 'text/html;charset=utf-8'));
    el('b7Methods').addEventListener('click', () => { const m = methodsText().map(p => p.replace(/<[^>]+>/g, '')).join('\n\n'); if (navigator.clipboard) navigator.clipboard.writeText(m).then(() => toast(T('Métodos copiados', 'Methods copied'), 'success')); });
    el('b7Proj').addEventListener('click', saveProjectFile);
    check();
  }
  /* the fields show what is in the state (an opened project brings its own) */
  function fill() {
    [['b7Title', 'title'], ['b7Species', 'species'], ['b7Analyst', 'analyst'], ['b7Lab', 'lab']].forEach(([id, k]) => { const n = el(id); if (n && n.value !== (state.meta[k] || '')) n.value = state.meta[k] || ''; });
    const s = el('b7Lang'); if (s) s.value = state.set.reportLang === 'es' || state.set.reportLang === 'en' ? state.set.reportLang : '';
  }
  function check() {
    const host = el('b7Check');
    if (!host) return;
    const items = [[t('Imágenes calibradas', 'Calibrated images'), state.images.some(included)], [t('Contorno y tamaño', 'Outline and size'), Object.keys(state.results.images).length > 0],
      [t('Fertilidad', 'Fertility'), !!(state.results.fertility && state.results.fertility.per)], [t('Estadística multivariada', 'Multivariate statistics'), !!state.results.stats]];
    host.innerHTML = '<div class="chips">' + items.map(([l, ok]) => `<span class="badge ${ok ? 'ok' : 'warn'}">${ok ? '✓' : '·'} ${esc(l)}</span>`).join('') + '</div>' +
      (items.some(i => !i[1]) ? `<p class="hint">${L2('Lo que falta aparece en el informe como «sin calcular»; puedes generarlo igual.', 'What is missing appears in the report as "not computed"; you can make it anyway.')}</p>` : '');
  }

  /* ---------------- the methods, as written for a paper ---------------- */
  function methodsText() {
    const s = state.set, imgs = state.images.filter(included), std = imgs.filter(r => r.tier === 'standard'), ov = imgs.filter(r => r.tier === 'overview');
    const bars = imgs.filter(r => r.calib && r.calib.bar), ok = bars.filter(r => r.calib.ok);
    const target = Images.target('standard'), units = new Set(Images.rows().map(r => r.unit)).size;
    const P = [];
    P.push(t(`<b>Imágenes y calibración.</b> Se analizaron ${imgs.length} micrografías electrónicas de barrido (${std.length} de un grano y ${ov.length} panorámicas) de ${groupCodes().length} grupos. El tamaño del píxel se calculó como el ancho del cuadro de referencia (${fmtNum(s.refMm)} mm) dividido entre el producto de la magnificación por el ancho de la imagen en píxeles, y se comprobó contra la barra de escala impresa en cada imagen: en ${ok.length} de las ${bars.length} imágenes con barra, su longitud dio un valor redondo con un error menor a 4 %. Antes de medir, cada imagen se recortó por encima del rótulo del equipo y se remuestreó por áreas (Wolberg 1990) a un píxel común de ${fmtNum(target, 4)} µm.`,
      `<b>Images and calibration.</b> ${imgs.length} scanning electron micrographs (${std.length} of one grain and ${ov.length} overviews) from ${groupCodes().length} groups were analyzed. Pixel size was computed as the width of the reference frame (${fmtNum(s.refMm)} mm) divided by the product of the magnification and the width of the image in pixels, and was checked against the scale bar printed on each image: in ${ok.length} of the ${bars.length} images with a bar, its length gave a round value with an error below 4%. Before measuring, each image was cropped above the caption of the instrument and resampled by area averaging (Wolberg 1990) to a common pixel of ${fmtNum(target, 4)} µm.`));
    P.push(t(`<b>Contorno y tamaño.</b> El grano se separó del fondo con el umbral de Otsu (1979), con relleno de huecos, eliminación de partículas y cierre morfológico; se tomó la región mayor cercana al centro. Su contorno se leyó como la distancia máxima del centroide al borde en 720 direcciones. El cuerpo (corpus) se obtuvo por apertura en escala de grises de ese perfil (Serra 1982) con una ventana igual a la base máxima de una espina (${fmtNum(s.baseUm)} µm); de él se midieron el diámetro equivalente, las anchuras de Feret mayor y menor por calibradores rotantes (Shamos 1978) sobre su envolvente convexa (Andrew 1979), la elongación y la circularidad. Las imágenes con más de ${fmtFixed(100 * s.maxCut, 0)} % del contorno cortado por el borde se excluyeron de las comparaciones. Las imágenes de un mismo grano se promediaron (${units} granos).`,
      `<b>Outline and size.</b> The grain was separated from the background with Otsu’s threshold (1979), with hole filling, removal of specks and morphological closing; the largest region near the center was taken. Its outline was read as the largest distance from the centroid to the edge in 720 directions. The body (corpus) was obtained by gray-scale opening of that profile (Serra 1982) with a window equal to the largest base of a spine (${fmtNum(s.baseUm)} µm); from it were measured the equivalent diameter, the major and minor Feret widths by rotating calipers (Shamos 1978) on its convex hull (Andrew 1979), elongation and circularity. Images with more than ${fmtFixed(100 * s.maxCut, 0)}% of the outline cut by the edge were excluded from comparisons. Images of the same grain were averaged (${units} grains).`));
    P.push(t(`<b>Ornamentación.</b> Las espinas se identificaron como los picos del perfil radial sobre el cuerpo con altura mínima de ${fmtNum(s.minHeightUm)} µm; se registraron su número en el contorno, su altura media, su espaciado y su densidad por 100 µm de contorno libre. Los lúmenes del retículo se detectaron dentro del cuerpo como los píxeles más oscuros que la media de su vecindario (radio ${fmtNum(s.lumenWin)} µm) en más de ${fmtNum(s.lumenK)} desviaciones estándar (Niblack 1986), y se midió el diámetro equivalente de cada celda cerrada. La textura se describió con la matriz de coocurrencia de grises (Haralick et al. 1973) a 0.2 y 0.4 µm en cuatro direcciones, contando solo pares de píxeles sobre la superficie.`,
      `<b>Ornamentation.</b> Spines were identified as the peaks of the radial profile above the body with a least height of ${fmtNum(s.minHeightUm)} µm; their number on the outline, mean height, spacing and density per 100 µm of free outline were recorded. Lumina of the reticulum were detected inside the body as the pixels darker than the mean of their neighborhood (radius ${fmtNum(s.lumenWin)} µm) by more than ${fmtNum(s.lumenK)} standard deviations (Niblack 1986), and the equivalent diameter of each closed cell was measured. Texture was described with the gray-level co-occurrence matrix (Haralick et al. 1973) at 0.2 and 0.4 µm in four directions, counting only pairs of pixels on the surface.`));
    if (state.results.fertility && state.results.fertility.per) P.push(t(`<b>Fertilidad.</b> En las panorámicas se contaron los granos completos (sin tocar el borde) de ${fmtNum(s.minGrainUm)} a ${fmtNum(s.maxGrainUm)} µm; se consideró colapsado o deforme todo grano con solidez menor a ${fmtNum(s.solidity)}. La proporción se informa con el intervalo de Wilson (1927) y los grupos se compararon con una prueba χ² de homogeneidad.`,
      `<b>Fertility.</b> In the overviews the complete grains (not touching the edge) from ${fmtNum(s.minGrainUm)} to ${fmtNum(s.maxGrainUm)} µm were counted; any grain with solidity below ${fmtNum(s.solidity)} was considered collapsed or misshapen. The proportion is reported with the Wilson interval (1927) and groups were compared with a χ² test of homogeneity.`));
    if (state.results.stats) {
      const S = state.results.stats, cv = S.ntreeCv < S.ntree;
      P.push(t(`<b>Estadística.</b> Con el grano como unidad, cada variable se comparó entre grupos con análisis de varianza de una vía y la prueba de Kruskal y Wallis (1952), con el ajuste de Holm (1979) sobre las ${S.keys.length} variables y letras de Tukey (1949). Con las variables estandarizadas se calcularon los componentes principales (Pearson 1901; Hotelling 1933) y una PERMANOVA sobre distancias euclidianas (Anderson 2001) con ${S.perm.nperm} permutaciones, global y por pares. La clasificación se evaluó con análisis discriminante lineal (Fisher 1936) y bosque aleatorio (Breiman 2001; ${S.ntree} árboles${cv ? `, ${S.ntreeCv} en cada modelo de la validación` : ''}), con validación cruzada que deja fuera un grano completo cada vez; la concordancia se resume con κ de Cohen (1960).`,
      `<b>Statistics.</b> With the grain as the unit, each variable was compared among groups by one-way analysis of variance and the Kruskal–Wallis test (1952), with Holm’s adjustment (1979) over the ${S.keys.length} variables and Tukey letters (1949). With standardized variables, principal components (Pearson 1901; Hotelling 1933) and a PERMANOVA on Euclidean distances (Anderson 2001) with ${S.perm.nperm} permutations, global and by pairs, were computed. Classification was assessed with linear discriminant analysis (Fisher 1936) and random forest (Breiman 2001; ${S.ntree} trees${cv ? `, ${S.ntreeCv} in each model of the validation` : ''}), with cross-validation leaving out one whole grain at a time; agreement is summed up with Cohen’s κ (1960).`));
      if (S.nNaN > 0) P[P.length - 1] += S.nNaN === 1 ? t(' Se dejó fuera un grano sin valor en alguna de las variables.', ' One grain without a value in some of the variables was left out.') : t(` Se dejaron fuera ${S.nNaN} granos sin valor en alguna de las variables.`, ` ${S.nNaN} grains without a value in some of the variables were left out.`);
    }
    P.push(t(`Todos los cálculos se hicieron con PalynoPro ${APP_VERSION} (Barrera-Guzmán 2026), cuyos motores se comprobaron contra pólenes simulados de parámetros conocidos y contra implementaciones independientes.`, `All computations were done with PalynoPro ${APP_VERSION} (Barrera-Guzmán 2026), whose engines were checked against simulated pollen of known parameters and against independent implementations.`));
    return P;
  }

  /* ---------------- the document ---------------- */
  const tableHTML = (head, rows) => `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const lbl = k => { const m = metric(k); return (L() === 'en' ? m.en : m.es) + (m.u ? ' (' + m.u + ')' : ''); };
  function sizeSection() {
    const rows = Images.rows();
    if (!rows.length) return `<p class="miss">${t('Sin calcular.', 'Not computed.')}</p>`;
    const keys = ['corp_d', 'corp_fmax', 'corp_fmin', 'corp_aspect', 'corp_circ', 'sp_n', 'sp_h', 'sp_density', 'lum_d', 'lum_density'];
    const units = Multi.byUnit(rows, keys, r => r.unit, r => r.group), G = groupCodes().filter(g => units.some(u => u.group === g));
    return tableHTML([t('Grupo', 'Group'), 'n'].concat(keys.map(lbl)), G.map(g => { const U = units.filter(u => u.group === g); return [esc(groupName(g)), U.length].concat(keys.map(k => { const v = U.map(u => u[k]).filter(isFinite); return fmtMS(Stats.mean(v), Stats.sd(v), Math.min(3, metric(k).d)); })); })) +
      `<p class="cap">${t('Media ± desviación estándar entre granos.', 'Mean ± standard deviation among grains.')}</p>`;
  }
  function statsSection() {
    const S = state.results.stats;
    if (!S) return `<p class="miss">${t('Sin calcular.', 'Not computed.')}</p>`;
    const G = S.groups;
    let h = tableHTML([t('Variable', 'Variable')].concat(G.map(esc)).concat(['F', t('p (Holm)', 'p (Holm)')]), S.uni.map(u => [esc(lbl(u.k))].concat(G.map((g, i) => fmtMS(u.means[i], u.sds[i], Math.min(3, metric(u.k).d)) + ' <b>' + esc(u.letters[i]) + '</b>')).concat([fmtFixed(u.F, 2), fmtP(u.pFadj)])));
    h += `<p class="cap">${t('Grupos que no comparten letra difieren (Tukey, α = 0.05).', 'Groups sharing no letter differ (Tukey, α = 0.05).')}</p>`;
    h += `<p>PERMANOVA: pseudo-F = ${fmtFixed(S.perm.F, 3)}, R² = ${fmtFixed(S.perm.R2, 3)}, ${pEq(S.perm.p)} (${S.perm.nperm} ${t('permutaciones', 'permutations')}). ${t('Clasificación con validación dejando fuera un grano', 'Classification with leave-one-grain-out validation')}: ${t('discriminante lineal', 'linear discriminant')} ${fmtPct(S.ldaCv.accuracy, null, L())} (κ = ${fmtFixed(S.ldaCv.kappa, 2)}); ${t('bosque aleatorio', 'random forest')} ${fmtPct(S.rfCv.accuracy, null, L())} (κ = ${fmtFixed(S.rfCv.kappa, 2)}); ${t('al azar', 'by chance')} ${fmtPct(S.chance, null, L())}.</p>`;
    return h;
  }
  function fertSection() {
    const F = state.results.fertility;
    if (!F || !F.per) return `<p class="miss">${t('Sin calcular.', 'Not computed.')}</p>`;
    return tableHTML([t('Grupo', 'Group'), t('Panorámicas', 'Overviews'), t('Granos', 'Grains'), t('Colapsados', 'Collapsed'), '%', t('IC 95 %', '95% CI')], F.groups.map(g => [esc(groupName(g.g)), g.nImages, g.n, g.atypical, fmtPct(g.pct, null, L()), fmtPct(g.lo, null, L()) + ' – ' + fmtPct(g.hi, null, L())])) +
      `<p>χ² = ${fmtFixed(F.chi, 2)}, ${t('gl', 'df')} = ${F.df}, ${pEq(F.p)}.</p>`;
  }
  function figuresHTML() {
    const out = [];
    ['panel-3', 'panel-4', 'panel-5', 'panel-6'].forEach(p => {
      Fig.mounted(el(p)).forEach(f => {
        const h = f.block.querySelector('.fig-head h4 [data-l="' + L() + '"]');
        const svg = Fig.svgString(f.svg).replace(/^<\?xml[^>]*>\s*/, '');
        const wide = (f.svg.viewBox && f.svg.viewBox.baseVal.width) > 640;
        out.push(`<figure${wide ? ' class="wide"' : ''}><div class="svg">${svg}</div><figcaption>${t('Figura', 'Figure')} ${out.length + 1}. ${esc(h ? h.textContent : f.name)}.</figcaption></figure>`);
      });
    });
    return out.length ? '<div class="figs">' + out.join('') + '</div>' : `<p class="miss">${t('Aún no hay figuras.', 'There are no figures yet.')}</p>`;
  }
  async function galleryHTML() {
    const G = groupCodes(), out = [];
    for (const g of G) {
      const rec = state.images.find(r => r.group === g && included(r) && r.tier === 'standard' && state.results.images[r.id] && !state.results.images[r.id].qc.flags.length && Images.has(r));
      if (!rec) continue;
      try {
        const { a, img } = await Images.inspect(rec);
        const k = Math.min(1, 640 / img.w), cv = document.createElement('canvas'), g2 = Images.toCanvas(img, cv);
        Block3.drawOverlay(g2, a, img, { mask: false, env: true, corpus: true, spines: true, feret: false, cut: false });
        const sm = document.createElement('canvas'); sm.width = Math.round(img.w * k); sm.height = Math.round(img.h * k);
        sm.getContext('2d').drawImage(cv, 0, 0, sm.width, sm.height);
        out.push(`<figure class="gal"><img src="${sm.toDataURL('image/jpeg', 0.86)}" alt="${esc(rec.name)}"><figcaption><b>${esc(groupName(g))}</b> · ${esc(rec.name)} · ${t('cuerpo', 'body')} ${fmtFixed(state.results.images[rec.id].metrics.corp_d, 1)} µm</figcaption></figure>`);
      } catch (e) { /* the image is not open: no picture for that group */ }
    }
    return out.length ? `<div class="gallery">${out.join('')}</div><p class="cap">${t('Contorno con espinas (naranja), cuerpo (azul) y puntas de espina (rojo), como los midió la app.', 'Outline with spines (orange), body (blue) and spine tips (red), as measured by the app.')}</p>` : `<p class="miss">${t('Las imágenes no están abiertas en esta sesión.', 'The images are not open in this session.')}</p>`;
  }
  const LIMITS = () => [
    t('El cuerpo y las espinas se miden sobre la silueta en dos dimensiones; el número de espinas es el del contorno, no el total de la superficie.', 'Body and spines are measured on the two-dimensional silhouette; the number of spines is that of the outline, not the total on the surface.'),
    t('Los diámetros de Feret equivalen a los ejes polar y ecuatorial solo en vistas ecuatoriales; la vista no se clasificó.', 'Feret diameters amount to the polar and equatorial axes only in equatorial views; the view was not classified.'),
    t('La altura de espina se mide de la punta a la cuerda que une sus dos pies y se subestima en cerca de un píxel, porque la punta más fina del cono no llena un píxel: en pólenes simulados con espinas de 1.2 a 3.2 µm a 0.1 µm por píxel, de 3 a 6 % (mediana 4 %); el sesgo relativo crece en espinas de pocos píxeles de alto o que se tocan en la base.', 'Spine height is measured from the tip to the chord joining its two feet and is underestimated by about one pixel, because the finest tip of the cone does not fill a pixel: on simulated pollen with spines of 1.2 to 3.2 µm at 0.1 µm per pixel, by 3 to 6% (median 4%); the relative bias grows for spines only a few pixels high or touching at the base.'),
    t('La fertilidad por solidez es una aproximación morfológica; no sustituye una prueba de viabilidad por tinción o germinación.', 'Fertility by solidity is a morphological proxy; it does not replace a viability test by staining or germination.'),
    t('Las imágenes ampliadas al píxel común (menos resolución que el resto) dan medidas finas menos fiables y se marcan en la tabla.', 'Images enlarged to the common pixel (less resolution than the rest) give less reliable fine measures and are flagged in the table.'),
  ];
  async function make() {
    if (!state.images.length) { toast(T('Primero abre tus imágenes.', 'First open your images.'), 'warning'); return; }
    const html = await withWork(T('Armando el informe', 'Putting the report together'), async w => {
      w.update(0.2, T('Galería', 'Gallery')); await yieldPaint();
      const gal = await galleryHTML();
      w.update(0.7, T('Figuras', 'Figures')); await yieldPaint();
      return documentHTML(gal);
    });
    last = html;
    state.results.reportMade = true;
    const f = el('b7Frame');
    el('b7PrevCard').hidden = false;
    f.srcdoc = html;
    ['b7Print', 'b7Html', 'b7Methods'].forEach(id => { el(id).disabled = false; });
    blockDone();
  }
  function documentHTML(gal) {
    const today = new Date().toLocaleDateString(L() === 'en' ? 'en-US' : 'es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const imgs = state.images.filter(included), G = groupCodes();
    const matRows = G.map(g => { const R = imgs.filter(r => r.group === g); return [esc(g), esc(groupName(g)), R.filter(r => r.tier === 'standard').length, R.filter(r => r.tier === 'overview').length, new Set(R.filter(r => r.tier === 'standard').map(unitOf)).size]; });
    const refs = Home.REFS.concat([`Barrera-Guzmán LÁ. 2026. ${Home.CITE_TITLE[L() === 'en' ? 1 : 0]} (${t('versión', 'version')} ${APP_VERSION}). Zenodo. https://doi.org/${Home.CITE_DOI}`]).sort();
    const title = esc(state.meta.title || t('Morfometría polínica cuantitativa', 'Quantitative pollen morphometry'));
    return `<!DOCTYPE html><html lang="${L()}"><head><meta charset="UTF-8"><title>${title}</title><style>
      @page { size: A4; margin: 16mm 15mm; }
      body { font-family: Georgia, 'Times New Roman', serif; color: #1a1d22; font-size: 10.5pt; line-height: 1.5; margin: 0; padding: 18px 26px; }
      .cover { border-top: 8px solid #2f5f7a; padding: 36px 0 26px; margin-bottom: 18px; page-break-after: always; }
      .kicker { font-family: system-ui, sans-serif; text-transform: uppercase; letter-spacing: .14em; font-size: 8.5pt; color: #b5601d; font-weight: 700; }
      h1 { font-size: 23pt; line-height: 1.2; margin: 10px 0 8px; } h2 { font-size: 14pt; border-bottom: 2px solid #2f5f7a; padding-bottom: 4px; margin: 22px 0 10px; page-break-after: avoid; }
      .meta p { margin: 2px 0; font-family: system-ui, sans-serif; font-size: 9.5pt; }
      .stats { display: flex; gap: 26px; margin-top: 26px; font-family: system-ui, sans-serif; } .stats div { font-size: 8.5pt; color: #555; } .stats b { display: block; font-size: 20pt; color: #2f5f7a; font-family: Georgia, serif; }
      table { border-collapse: collapse; width: 100%; font-family: system-ui, sans-serif; font-size: 8.3pt; margin: 8px 0; page-break-inside: avoid; }
      th, td { border: 1px solid #ccd3d9; padding: 3px 6px; text-align: left; } th { background: #eef2f5; } tr:nth-child(even) td { background: #f8fafb; }
      figure { margin: 12px 0; page-break-inside: avoid; text-align: center; } .figs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; align-items: end; } .figs figure { margin: 6px 0; } .figs figure.wide { grid-column: 1 / -1; } figure .svg svg { max-width: 100%; height: auto; }
      figcaption, .cap { font-family: system-ui, sans-serif; font-size: 8.5pt; color: #555; } .cap { text-align: left; }
      .gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; } .gal img { width: 100%; border-radius: 4px; }
      .miss { color: #888; font-style: italic; font-family: system-ui, sans-serif; } .refs p { padding-left: 1.6em; text-indent: -1.6em; margin: 3px 0; font-size: 9pt; }
      ul.lim li { margin-bottom: 4px; }
    </style></head><body>
      <section class="cover"><div class="kicker">${t('Informe de morfometría polínica', 'Pollen morphometry report')}</div><h1>${title}</h1>
        <div class="meta">${state.meta.species ? `<p><b>${t('Material', 'Material')}:</b> ${esc(state.meta.species)}</p>` : ''}${state.meta.analyst ? `<p><b>${t('Autor(a)', 'Author')}:</b> ${esc(state.meta.analyst)}</p>` : ''}${state.meta.lab ? `<p><b>${t('Institución', 'Institution')}:</b> ${esc(state.meta.lab)}</p>` : ''}<p><b>${t('Fecha', 'Date')}:</b> ${today}</p>
        ${state.example ? `<p><b>${t('Datos', 'Data')}:</b> ${t('ejemplo simulado por la app (no son fotos de plantas reales)', 'example simulated by the app (not photographs of real plants)')}</p>` : ''}</div>
        <div class="stats"><div><b>${imgs.length}</b>${t('imágenes', 'images')}</div><div><b>${G.length}</b>${t('grupos', 'groups')}</div><div><b>${new Set(Images.rows().map(r => r.unit)).size}</b>${t('granos medidos', 'grains measured')}</div>${state.results.stats ? `<div><b>${fmtPct(Math.max(state.results.stats.ldaCv.accuracy, state.results.stats.rfCv.accuracy), 0, L())}</b>${t('clasificación por grano', 'classification by grain')}</div>` : ''}</div></section>
      <h2>1. ${t('Material', 'Material')}</h2>${tableHTML([t('Código', 'Code'), t('Grupo', 'Group'), t('Fotos de un grano', 'One-grain pictures'), t('Panorámicas', 'Overviews'), t('Granos', 'Grains')], matRows)}
      <h2>2. ${t('Métodos', 'Methods')}</h2>${methodsText().map(p => `<p>${p}</p>`).join('')}
      <h2>3. ${t('Tamaño y ornamentación por grupo', 'Size and ornamentation by group')}</h2>${sizeSection()}
      <h2>4. ${t('Comparación entre grupos', 'Comparison between groups')}</h2>${statsSection()}
      <h2>5. ${t('Fertilidad', 'Fertility')}</h2>${fertSection()}
      <h2>6. ${t('Figuras', 'Figures')}</h2>${figuresHTML()}
      <h2>7. ${t('Granos medidos, uno por grupo', 'Measured grains, one per group')}</h2>${gal}
      <h2>8. ${t('Limitaciones', 'Limitations')}</h2><ul class="lim">${LIMITS().map(l => `<li>${l}</li>`).join('')}</ul>
      <h2>9. ${t('Referencias', 'References')}</h2><div class="refs">${refs.map(r => `<p>${esc(r)}</p>`).join('')}</div>
      <p class="cap" style="margin-top:24px">${t('Generado con', 'Made with')} PalynoPro ${APP_VERSION} · LABG Suite · ${today}</p>
    </body></html>`;
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('stepchange', e => { if (e.detail.step === 7) { fill(); check(); } });
  document.addEventListener('langchange', render);
  window.Block7 = { render, methodsText };
})();
