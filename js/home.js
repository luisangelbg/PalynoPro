/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — Block 1, the home page: the route, a lab that measures a
   simulated grain, the blocks, the ideas, the methods, the limits, the
   references and how to cite. */
(function () {
  'use strict';

  const WORKFLOW = [
    ['Abrir las imágenes', 'Open the images', 'una carpeta con sus metadatos', 'a folder with its metadata'],
    ['Calibrar y comprobar', 'Calibrate and check', 'µm por píxel y barra de escala', 'µm per pixel and scale bar'],
    ['Contorno y tamaño', 'Outline and size', 'cuerpo sin espinas, Feret', 'body without spines, Feret'],
    ['Ornamentación', 'Ornamentation', 'espinas, lúmenes, textura', 'spines, lumina, texture'],
    ['Fertilidad', 'Fertility', 'granos turgentes y colapsados', 'turgid and collapsed grains'],
    ['Comparar grupos', 'Compare groups', 'PCA, PERMANOVA, clave', 'PCA, PERMANOVA, key'],
    ['Informe', 'Report', 'métodos, tablas y figuras', 'methods, tables and figures'],
  ];
  const BLOCKS = [
    { n: 2, tag: ['Datos', 'Data'], d: ['Abre una carpeta: lee TIFF, PNG o JPEG, los archivos de texto del microscopio y un índice opcional; calibra cada foto y la comprueba contra su barra de escala.', 'Open a folder: it reads TIFF, PNG or JPEG, the text files of the microscope and an optional index; it calibrates each picture and checks it against its scale bar.'] },
    { n: 3, tag: ['Morfometría', 'Morphometry'], d: ['El contorno de cada grano, el cuerpo sin espinas, sus diámetros de Feret, elongación y circularidad, con revisión visual de cada medida.', 'The outline of each grain, the body without spines, its Feret diameters, elongation and circularity, with a visual check of every measure.'] },
    { n: 4, tag: ['Ornamentación', 'Ornamentation'], d: ['Espinas en el contorno (número, altura, espaciado y densidad), lúmenes del retículo y textura de la superficie.', 'Spines on the outline (number, height, spacing and density), lumina of the reticulum and texture of the surface.'] },
    { n: 5, tag: ['Viabilidad', 'Viability'], d: ['En las panorámicas: cada grano, su silueta y su solidez; la proporción de granos colapsados por grupo, con su intervalo.', 'In the overviews: every grain, its silhouette and solidity; the proportion of collapsed grains per group, with its interval.'] },
    { n: 6, tag: ['Comparación', 'Comparison'], d: ['Tabla por grupo con letras de Tukey, componentes principales, PERMANOVA, análisis discriminante y bosque aleatorio validados por grano.', 'Table by group with Tukey letters, principal components, PERMANOVA, discriminant analysis and random forest validated by grain.'] },
    { n: 7, tag: ['Publicación', 'Publication'], d: ['Los métodos redactados con sus referencias, un informe para imprimir o guardar en PDF y todas las tablas y figuras.', 'The methods written out with their references, a report to print or save as PDF, and every table and figure.'] },
  ];
  const THEORY = [
    { h: ['Cómo se ve un grano en el microscopio electrónico', 'How a grain looks under the electron microscope'], tag: ['Bloques 2–4', 'Blocks 2–4'],
      es: '<p>La imagen de electrones secundarios muestra la <b>superficie</b> del grano: las aristas y las puntas, que emiten más electrones, se ven más brillantes. Por eso el borde del grano y las espinas resaltan sobre el fondo oscuro de la preparación, y el grano puede separarse de su fondo con un umbral de gris.</p><p>Lo que no se ve es el interior: la pared (exina) no se puede medir en grosor, y del grano solo se observa la mitad que mira hacia el detector.</p>',
      en: '<p>The secondary-electron image shows the <b>surface</b> of the grain: edges and tips, which emit more electrons, look brighter. So the edge of the grain and its spines stand out against the dark mount, and the grain can be separated from its background by a gray threshold.</p><p>What is not seen is the inside: the thickness of the wall (exine) cannot be measured, and only the half of the grain facing the detector is observed.</p>' },
    { h: ['La calibración: cuántos micrómetros mide un píxel', 'Calibration: how many micrometers a pixel measures'], tag: ['Bloque 2', 'Block 2'],
      es: '<p>La magnificación de un microscopio se refiere a un cuadro de referencia (en muchos equipos, 128 mm de ancho): el campo fotografiado mide ese ancho dividido entre la magnificación. El tamaño del píxel es ese campo entre el <b>ancho en píxeles con que se guardó la imagen</b>. A la misma magnificación, una foto guardada a 1280 px tiene píxeles del doble que una de 2560 px: olvidarlo encoge a la mitad los granos de las fotos pequeñas.</p><p>PalynoPro busca la barra de escala de cada foto y comprueba que su largo por el tamaño del píxel dé una longitud redonda (10, 20, 50 µm…). Si no la da, la foto queda marcada.</p>',
      en: '<p>The magnification of a microscope refers to a reference frame (in many instruments 128 mm wide): the photographed field is that width divided by the magnification. The size of a pixel is that field divided by the <b>width in pixels at which the image was saved</b>. At the same magnification, a picture saved at 1280 px has pixels twice as large as one at 2560 px: forgetting it halves the grains of the small pictures.</p><p>PalynoPro finds the scale bar of each picture and checks that its length times the pixel size gives a round length (10, 20, 50 µm…). If it does not, the picture is flagged.</p>' },
    { h: ['Cuerpo y ornamentación', 'Body and ornamentation'], tag: ['Bloques 3–4', 'Blocks 3–4'],
      es: '<p>En palinología el tamaño se informa del <b>cuerpo</b> del grano, sin su ornamentación. PalynoPro lee el contorno como un perfil radial (la distancia del centro al borde en 720 direcciones) y recorta todo pico más angosto que la base de una espina: lo que queda es el cuerpo; los picos recortados son las <b>espinas (equinas)</b>, con su altura sobre el cuerpo.</p><p>Los diámetros mayor y menor son las <b>anchuras de Feret</b> (lo que mediría un calibrador). En una vista ecuatorial equivalen a los ejes polar y ecuatorial; en una vista polar u oblicua no, y la app no adivina la vista.</p>',
      en: '<p>In palynology size is reported for the <b>body</b> of the grain, without its ornamentation. PalynoPro reads the outline as a radial profile (the distance from the center to the edge in 720 directions) and cuts every peak narrower than the base of a spine: what remains is the body; the cut peaks are the <b>spines (echinae)</b>, with their height above the body.</p><p>The major and minor diameters are the <b>Feret widths</b> (what a caliper would measure). In an equatorial view they amount to the polar and equatorial axes; in a polar or oblique view they do not, and the app does not guess the view.</p>' },
    { h: ['El retículo: muros y lúmenes', 'The reticulum: muri and lumina'], tag: ['Bloque 4', 'Block 4'],
      es: '<p>Una exina reticulada forma una red de <b>muros (muri)</b> brillantes que encierran celdas más oscuras, los <b>lúmenes</b>. PalynoPro marca como lumen todo píxel más oscuro que su vecindario y mide cada celda cerrada: su diámetro mediano y cuántas hay por 100 µm² son descriptores directos del retículo. La textura (matriz de coocurrencia de grises) resume además el contraste y la regularidad de la superficie.</p>',
      en: '<p>A reticulate exine forms a net of bright <b>walls (muri)</b> enclosing darker cells, the <b>lumina</b>. PalynoPro marks as lumen every pixel darker than its neighborhood and measures each closed cell: their median diameter and how many there are per 100 µm² are direct descriptors of the reticulum. Texture (gray-level co-occurrence matrix) also sums up the contrast and regularity of the surface.</p>' },
    { h: ['El grano es la unidad, no la foto', 'The grain is the unit, not the picture'], tag: ['Bloque 6', 'Block 6'],
      es: '<p>Un mismo grano suele fotografiarse más de una vez (con y sin rótulo, con otro enfoque). Si cada foto contara como un grano distinto, las pruebas creerían tener más datos de los que hay y la validación cruzada clasificaría una foto con ayuda de su gemela. PalynoPro promedia las fotos de cada grano y valida dejando fuera el grano completo.</p>',
      en: '<p>The same grain is often photographed more than once (with and without the caption, with another focus). If every picture counted as a different grain, the tests would believe they have more data than there is and cross-validation would classify a picture helped by its twin. PalynoPro averages the pictures of each grain and validates by leaving out the whole grain.</p>' },
    { h: ['Fertilidad a partir de la forma', 'Fertility from the shape'], tag: ['Bloque 5', 'Block 5'],
      es: '<p>Un grano bien formado es turgente y casi convexo; uno vacío o abortado se pliega y su silueta pierde solidez (área / área de su envolvente convexa). La proporción de granos de baja solidez en las panorámicas es una <b>aproximación morfológica</b> a la fertilidad: útil para comparar grupos, pero no sustituye una prueba de viabilidad con tinción o germinación.</p>',
      en: '<p>A well-formed grain is turgid and almost convex; an empty or aborted one folds and its silhouette loses solidity (area / area of its convex hull). The proportion of low-solidity grains in the overviews is a <b>morphological proxy</b> for fertility: useful to compare groups, but it does not replace a viability test by staining or germination.</p>' },
  ];
  const METHODS = [
    ['Calibración', 'Calibration', 'Tamaño del píxel por magnificación y ancho; barra de escala comprobada', 'Pixel size from magnification and width; scale bar checked'],
    ['Imagen', 'Image', 'Umbral de Otsu (1979)', 'Otsu threshold (1979)'],
    ['Imagen', 'Image', 'Remuestreo por áreas a un píxel común (Wolberg 1990)', 'Area resampling to a common pixel (Wolberg 1990)'],
    ['Forma', 'Shape', 'Apertura en escala de grises del perfil radial (Serra 1982)', 'Gray-scale opening of the radial profile (Serra 1982)'],
    ['Forma', 'Shape', 'Anchuras de Feret por calibradores rotantes (Shamos 1978)', 'Feret widths by rotating calipers (Shamos 1978)'],
    ['Forma', 'Shape', 'Envolvente convexa (Andrew 1979)', 'Convex hull (Andrew 1979)'],
    ['Superficie', 'Surface', 'Lúmenes por umbral local (Niblack 1986)', 'Lumina by local threshold (Niblack 1986)'],
    ['Superficie', 'Surface', 'Matriz de coocurrencia de grises (Haralick et al. 1973)', 'Gray-level co-occurrence matrix (Haralick et al. 1973)'],
    ['Estadística', 'Statistics', 'ANOVA, Tukey (1949), Kruskal y Wallis (1952), Holm (1979)', 'ANOVA, Tukey (1949), Kruskal and Wallis (1952), Holm (1979)'],
    ['Multivariada', 'Multivariate', 'Componentes principales (Pearson 1901; Hotelling 1933)', 'Principal components (Pearson 1901; Hotelling 1933)'],
    ['Multivariada', 'Multivariate', 'PERMANOVA (Anderson 2001)', 'PERMANOVA (Anderson 2001)'],
    ['Clasificación', 'Classification', 'Análisis discriminante lineal (Fisher 1936)', 'Linear discriminant analysis (Fisher 1936)'],
    ['Clasificación', 'Classification', 'Bosque aleatorio (Breiman 2001)', 'Random forest (Breiman 2001)'],
    ['Viabilidad', 'Viability', 'Proporción con intervalo de Wilson (1927)', 'Proportion with the Wilson interval (1927)'],
  ];
  const NOTDO = [
    [['No reconstruye el grano en 3D', 'It does not rebuild the grain in 3D'], ['Mide la silueta y la cara visible; las espinas que cuenta son las del contorno, no todas las de la superficie.', 'It measures the silhouette and the visible face; the spines it counts are those of the outline, not all those of the surface.']],
    [['No adivina la vista del grano', 'It does not guess the view of the grain'], ['Polar, ecuatorial u oblicua: los diámetros de Feret equivalen a los ejes P y E solo en vista ecuatorial.', 'Polar, equatorial or oblique: the Feret diameters amount to the P and E axes only in an equatorial view.']],
    [['No lee el número de la barra', 'It does not read the number on the bar'], ['Calcula el tamaño del píxel y comprueba que la barra dé una longitud redonda; no reconoce el texto escrito.', 'It computes the pixel size and checks that the bar gives a round length; it does not recognize the written text.']],
    [['No sustituye una prueba de viabilidad', 'It does not replace a viability test'], ['La fertilidad por solidez es una aproximación morfológica; para afirmar viabilidad hace falta tinción o germinación.', 'Fertility by solidity is a morphological proxy; to claim viability a staining or germination test is needed.']],
    [['No mide el grosor de la pared', 'It does not measure the thickness of the wall'], ['La exina, el téctum y la nexina se miden en cortes o con microscopía de transmisión.', 'Exine, tectum and nexine are measured in sections or by transmission microscopy.']],
    [['No sube tus imágenes', 'It does not upload your images'], ['Todo se calcula en tu computadora; la app solo guarda referencias a los archivos que abres.', 'Everything is computed on your computer; the app only keeps references to the files you open.']],
  ];
  const REFS = [
    'Anderson MJ. 2001. A new method for non-parametric multivariate analysis of variance. Austral Ecology 26: 32–46.',
    'Andrew AM. 1979. Another efficient algorithm for convex hulls in two dimensions. Information Processing Letters 9: 216–219.',
    'Borgefors G. 1986. Distance transformations in digital images. Computer Vision, Graphics, and Image Processing 34: 344–371.',
    'Breiman L. 2001. Random forests. Machine Learning 45: 5–32.',
    'Cohen J. 1960. A coefficient of agreement for nominal scales. Educational and Psychological Measurement 20: 37–46.',
    'Erdtman G. 1952. Pollen morphology and plant taxonomy. Angiosperms. Almqvist and Wiksell, Stockholm.',
    'Fisher RA. 1936. The use of multiple measurements in taxonomic problems. Annals of Eugenics 7: 179–188.',
    'Halbritter H, Ulrich S, Grímsson F, Weber M, Zetter R, Hesse M, Buchner R, Svojtka M, Frosch-Radivo A. 2018. Illustrated pollen terminology. 2nd ed. Springer, Cham.',
    'Haralick RM, Shanmugam K, Dinstein I. 1973. Textural features for image classification. IEEE Transactions on Systems, Man, and Cybernetics 3: 610–621.',
    'Holm S. 1979. A simple sequentially rejective multiple test procedure. Scandinavian Journal of Statistics 6: 65–70.',
    'Hotelling H. 1933. Analysis of a complex of statistical variables into principal components. Journal of Educational Psychology 24: 417–441.',
    'Kruskal WH, Wallis WA. 1952. Use of ranks in one-criterion variance analysis. Journal of the American Statistical Association 47: 583–621.',
    'McArdle BH, Anderson MJ. 2001. Fitting multivariate models to community data: a comment on distance-based redundancy analysis. Ecology 82: 290–297.',
    'Niblack W. 1986. An introduction to digital image processing. Prentice Hall, Englewood Cliffs.',
    'Otsu N. 1979. A threshold selection method from gray-level histograms. IEEE Transactions on Systems, Man, and Cybernetics 9: 62–66.',
    'Pearson K. 1901. On lines and planes of closest fit to systems of points in space. Philosophical Magazine 2: 559–572.',
    'Punt W, Hoen PP, Blackmore S, Nilsson S, Le Thomas A. 2007. Glossary of pollen and spore terminology. Review of Palaeobotany and Palynology 143: 1–81.',
    'Serra J. 1982. Image analysis and mathematical morphology. Academic Press, London.',
    'Shamos MI. 1978. Computational geometry. PhD thesis, Yale University, New Haven.',
    'Tukey JW. 1949. Comparing individual means in the analysis of variance. Biometrics 5: 99–114.',
    'Wilson EB. 1927. Probable inference, the law of succession, and statistical inference. Journal of the American Statistical Association 22: 209–212.',
    'Wolberg G. 1990. Digital image warping. IEEE Computer Society Press, Los Alamitos.',
  ];
  const CITE_TITLE = ['PalynoPro: morfometría polínica cuantitativa a partir de micrografías electrónicas', 'PalynoPro: quantitative pollen morphometry from electron micrographs'];
  function citeText() {
    return {
      apa: `Barrera-Guzmán, L. Á. (2026). <i>${CITE_TITLE[0]}</i> (versión ${APP_VERSION}) [Programa de cómputo]. LABG Suite.`,
      apaEn: `Barrera-Guzmán, L. Á. (2026). <i>${CITE_TITLE[1]}</i> (version ${APP_VERSION}) [Computer software]. LABG Suite.`,
    };
  }

  /* ---------------- builders ---------------- */
  function buildStepper() {
    const nav = el('stepper');
    if (!nav) return;
    nav.innerHTML = STEPS.map(s => `<button type="button" class="step-btn${s.n === 1 ? ' active' : ''}" data-step="${s.n}"><span class="step-num">${s.n}</span>${L2(s.es, s.en)}</button>`).join('');
    nav.addEventListener('click', e => { const b = e.target.closest('.step-btn'); if (b && !b.disabled) goStep(b.dataset.step); });
  }
  function buildWorkflow() {
    const host = el('workflow');
    if (host) host.innerHTML = WORKFLOW.map((w, i) => `<div class="wf-step"><div class="wf-n">${L2('PASO ' + (i + 1), 'STEP ' + (i + 1))}</div><div class="wf-t">${L2(w[0], w[1])}</div><div class="wf-d">${L2(w[2], w[3])}</div></div>`).join('');
  }
  function buildBlocks() {
    const host = el('blockGrid');
    if (!host) return;
    host.innerHTML = BLOCKS.map(b => { const st = STEPS.find(s => s.n === b.n); return `<button type="button" class="feature" data-go="${b.n}"><span class="f-num">${b.n}</span><div class="f-art">${Art.card(b.n)}</div><span class="f-tag">${L2(b.tag[0], b.tag[1])}</span><h3>${L2(st.es, st.en)}</h3><p>${L2(b.d[0], b.d[1])}</p></button>`; }).join('');
    host.addEventListener('click', e => { const b = e.target.closest('.feature'); if (b) goStep(b.dataset.go); });
  }
  function buildTheory() {
    const host = el('theoryHost');
    if (host) host.innerHTML = THEORY.map((t, i) => `<details class="acc"${i === 0 ? ' open' : ''}><summary>${L2(t.h[0], t.h[1])}<span class="acc-tag">${L2(t.tag[0], t.tag[1])}</span></summary><div class="acc-body">${L2(t.es, t.en)}</div></details>`).join('');
  }
  function buildMethods() {
    const host = el('methodGallery');
    if (host) host.innerHTML = METHODS.map((m, i) => `<div class="method-card"><span class="m-fam${i % 2 ? ' alt' : ''}">${L2(m[0], m[1])}</span><div class="m-name">${L2(m[2], m[3])}</div></div>`).join('');
  }
  function buildNotDo() { const host = el('notDo'); if (host) host.innerHTML = NOTDO.map(n => `<div><b>${L2(n[0][0], n[0][1])}</b>${L2(n[1][0], n[1][1])}</div>`).join(''); }
  function buildRefs() { const host = el('refList'); if (host) host.innerHTML = REFS.map(r => `<li>${esc(r)}</li>`).join(''); }
  function buildCite() {
    const C = citeText(), a = el('citeApa');
    if (a) a.innerHTML = L2(C.apa, C.apaEn);
    const b = el('copyApa');
    if (b) b.addEventListener('click', () => { const t = (I18N.lang === 'en' ? C.apaEn : C.apa).replace(/<[^>]+>/g, ''); if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => toast(T('Cita copiada', 'Citation copied'), 'success'), () => {}); });
  }

  /* ---------------- the lab ---------------- */
  let labBusy = false, labAgain = false;
  function labValues() { const v = id => Number(el(id).value); return { D: v('labD'), E: v('labE'), N: v('labN'), H: v('labH'), M: v('labM') }; }
  function labOutputs() {
    const p = labValues();
    el('labDOut').textContent = p.D + ' µm'; el('labEOut').textContent = p.E.toFixed(2); el('labNOut').textContent = p.N; el('labHOut').textContent = p.H.toFixed(1) + ' µm'; el('labMOut').textContent = p.M.toFixed(1) + ' µm';
  }
  async function lab() {
    if (labBusy) { labAgain = true; return; }
    labBusy = true;
    try {
      do {
        labAgain = false;
        labOutputs();
        const p = labValues(), b = p.D / 2 / Math.sqrt(p.E), a = b * p.E;
        const mag = Math.round(128000 * 0.56 / (2 * a + 2 * p.H));
        const sim = Synth.single({ w: 800, h: 600, mag, seed: 4242, a, b, rot: 0.5, spines: p.N, hUm: p.H, baseUm: Math.max(1.6, Math.min(3.2, p.D / 26)), face: 26, mesh: p.M, wall: 0.2, noise: 6 });
        const cal = Calib.calibrate({ mag }, sim.img), rows = Calib.captionRow(sim.img, cal.bar);
        const w = Img.toScale(Img.crop(sim.img, 0, 0, sim.img.w, rows), cal.umPerPx, cal.umPerPx);
        const R = Img.analyze(w, { baseUm: Math.max(1.6, Math.min(3.2, p.D / 26)) * 1.2, minHeightUm: 0.3 });
        drawLab(sim, R, w);
        const t = sim.truth[0], dTrue = 2 * Math.sqrt(t.a * t.b);
        const tile = (k, v, s) => `<div class="idx-tile"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
        el('labTiles').innerHTML = R.error ? '' :
          tile(T('Diámetro del cuerpo', 'Body diameter'), fmtFixed(R.corpus.diameterUm, 1) + ' µm', T('dibujado ', 'drawn ') + fmtFixed(dTrue, 1) + ' µm') +
          tile('Feret', fmtFixed(R.corpus.feretMaxUm, 1) + ' × ' + fmtFixed(R.corpus.feretMinUm, 1), T('dibujado ', 'drawn ') + fmtFixed(2 * t.a, 1) + ' × ' + fmtFixed(2 * t.b, 1)) +
          tile(T('Espinas en el contorno', 'Spines on the outline'), R.spines.n, T('dibujadas ', 'drawn ') + t.spines) +
          tile(T('Altura de espina', 'Spine height'), fmtFixed(R.spines.heightUm, 2) + ' µm', T('dibujada ', 'drawn ') + fmtFixed(t.meanHeightUm, 2) + ' µm') +
          tile(T('Lumen (mediana)', 'Lumen (median)'), R.lumina ? fmtFixed(R.lumina.medianDiameterUm, 2) + ' µm' : '—', T('malla ', 'mesh ') + p.M.toFixed(1) + ' µm') +
          tile(T('Barra de escala', 'Scale bar'), cal.bar ? fmtFixed(cal.barUm, 2) + ' µm' : '—', cal.ok ? T('redonda: correcta', 'round: correct') : T('no comprobada', 'not checked'));
        el('labTitle1').innerHTML = L2('El grano simulado y lo que se midió', 'The simulated grain and what was measured');
        el('labTitle2').innerHTML = L2('Perfil radial: contorno, cuerpo y espinas', 'Radial profile: outline, body and spines');
        if (!R.error) {
          const n = R.radial.length, um = w.umPerPx;
          const env = [], bas = [];
          for (let i = 0; i < n; i++) { env.push({ x: i * 360 / n, y: R.radial[i] * um }); bas.push({ x: i * 360 / n, y: R.base[i] * um }); }
          el('labProfile').innerHTML = Fig.xy({ width: 470, height: 300, xlab: T('Dirección desde el centro (°)', 'Direction from the center (°)'), ylab: T('Radio (µm)', 'Radius (µm)'), xRange: [0, 360],
            aria: T('Perfil radial del grano simulado', 'Radial profile of the simulated grain'),
            series: [{ name: T('Contorno', 'Outline'), color: 'var(--accent)', pts: env, line: true, markers: false, width: 1.6 },
              { name: T('Cuerpo', 'Body'), color: 'var(--primary)', pts: bas, line: true, markers: false, width: 2.4, dash: '6 4' },
              { name: T('Espinas', 'Spines'), color: 'var(--chart7)', pts: R.peaks.map(i => ({ x: i * 360 / n, y: R.radial[i] * um })), shape: 'circle', r: 3.4 }] });
          el('labStatus').innerHTML = L2(`El cuerpo medido difiere del dibujado en <b>${fmtFixed(100 * (R.corpus.diameterUm / dTrue - 1), 2)} %</b> y se encontraron <b>${R.spines.n}</b> de las ${t.spines} espinas dibujadas. La altura de espina sale un poco menor que la dibujada porque la punta más fina del cono no alcanza a llenar un píxel: se pierde cerca de un píxel de altura (aquí ${fmtFixed(um, 3)} µm), unos 3 a 6 % en espinas de muchos píxeles y más si la espina es corta o las espinas se tocan en la base. Se informa en los métodos.`,
            `The measured body differs from the drawn one by <b>${fmtFixed(100 * (R.corpus.diameterUm / dTrue - 1), 2)}%</b> and <b>${R.spines.n}</b> of the ${t.spines} drawn spines were found. Spine height comes out slightly below the drawn one because the finest tip of the cone does not fill a pixel: about one pixel of height is lost (here ${fmtFixed(um, 3)} µm), some 3 to 6% on spines many pixels high and more if the spine is short or the spines touch at the base. It is reported in the methods.`);
        }
        await yieldPaint();
      } while (labAgain);
    } finally { labBusy = false; }
  }
  function drawLab(sim, R, w) {
    const cv = el('labCanvas');
    if (!cv) return;
    const g = Images.toCanvas(sim.img, cv);
    if (R.error) return;
    const k = 1, cx = R.region.cx, cy = R.region.cy, n = R.radial.length;
    const css = getComputedStyle(document.documentElement);
    const col = v => css.getPropertyValue(v).trim() || '#fff';
    const ring = (arr, color, dash, width) => { g.beginPath(); for (let i = 0; i <= n; i++) { const j = i % n, a = (j + 0.5) / n * 2 * Math.PI; const x = (cx + arr[j] * Math.cos(a)) * k, y = (cy + arr[j] * Math.sin(a)) * k; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash || []); g.stroke(); g.setLineDash([]); };
    ring(R.radial, '#f0a020', null, 1.4);
    ring(R.base, '#19b4e8', [6, 4], 2);
    R.peaks.forEach(i => { const a = (i + 0.5) / n * 2 * Math.PI; g.beginPath(); g.arc(cx + R.radial[i] * Math.cos(a), cy + R.radial[i] * Math.sin(a), 4, 0, 2 * Math.PI); g.fillStyle = '#e8384f'; g.fill(); });
    void col;
  }
  function bindLab() { ['labD', 'labE', 'labN', 'labH', 'labM'].forEach(id => { const n = el(id); if (n) n.addEventListener('input', debounce(lab, 120)); }); }

  /* ---------------- start ---------------- */
  function bindProjectFile() {
    const input = el('projectFile');
    if (!input) return;
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0];
      input.value = '';
      if (!f) return;
      try {
        const obj = JSON.parse(await ImgIO.readText(f));
        if (!obj || obj.app !== APP_NAME || !obj.data) throw new Error(T('El archivo no es un proyecto de PalynoPro.', 'The file is not a PalynoPro project.'));
        Project.load(obj);
        /* the file has no results of Block 6: say how to have them again */
        const measured = obj.data.results && Object.keys(obj.data.results.images || {}).length > 0;
        toast(T('Proyecto abierto: ', 'Project opened: ') + f.name + (measured ? T('. Los resultados del Bloque 6 no se guardan: repítelos con «Comparar los grupos».', '. The results of Block 6 are not saved: repeat them with "Compare the groups".') : ''), 'success');
        goStep(2);
      } catch (e) { toast(T('No se pudo abrir el proyecto: ', 'Could not open the project: ') + e.message, 'error'); }
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    const bl = el('brandLogo'); if (bl) bl.innerHTML = Art.logo(30);
    const iso = el('suiteIso'); if (iso && window.LABG && LABG.isotipo) iso.outerHTML = LABG.isotipo('labg-iso');
    const brand = el('brand'); if (brand) brand.addEventListener('click', () => goStep(1));
    const art = el('heroArt'); if (art) art.innerHTML = Art.hero();
    buildStepper(); buildWorkflow(); buildBlocks(); buildTheory(); buildMethods(); buildNotDo(); buildRefs(); buildCite();
    bindProjectFile(); bindLab(); lab();
    const go = (id, f) => { const b = el(id); if (b) b.addEventListener('click', f); };
    go('startBtn', () => goStep(2));
    go('exampleBtn', () => { goStep(2); if (window.Block2) Block2.loadExample(); });
    go('labBtn', () => { const t = el('lab'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    go('openProjBtn', () => { const f = el('projectFile'); if (f) f.click(); });
  });
  document.addEventListener('langchange', () => { lab(); });

  window.Home = { REFS, CITE_TITLE, citeText, METHODS };
})();
