/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — Block 6, multivariate statistics with the grain as unit:
   a table by group with Tukey letters, principal components, PERMANOVA,
   linear discriminant analysis and random forest, both validated by leaving
   out one whole grain at a time. */
(function () {
  'use strict';
  const chosen = () => state.set.vars || METRICS.filter(m => m.mv).map(m => m.k);
  /* the validation fits one forest per grain: each has at most 300 trees, which
     keeps the wait reasonable with a hundred grains or more (500 trees take
     about 70 % longer for nearly the same accuracy); the importance and the error out
     of bag come from one forest with all the trees asked for */
  const CV_TREES = n => Math.min(300, n);

  function render() {
    const P = el('panel-6');
    P.innerHTML = panelHead(6, 'Estadística multivariada', 'Multivariate statistics', '¿Se distinguen los grupos por su polen? Con el grano como unidad.', 'Can the groups be told apart by their pollen? With the grain as the unit.') +
      `<details class="why"><summary>${L2('Qué se calcula', 'What is computed')}</summary>${L2(
        '<p>Las fotos de cada grano se promedian: el grano es la unidad. Para cada variable: análisis de varianza de una vía, prueba de Kruskal y Wallis y letras de Tukey (grupos que no comparten letra difieren, α = 0.05), con el ajuste de Holm sobre todas las variables. Después, con las variables estandarizadas: <b>componentes principales</b> (para ver la estructura), <b>PERMANOVA</b> (¿difieren los grupos en conjunto?, global y por pares) y dos <b>clasificadores</b>: análisis discriminante lineal y bosque aleatorio. Su precisión se mide dejando fuera un grano completo cada vez y clasificándolo con un modelo ajustado sin él: es la precisión que se espera para un grano nuevo.</p>',
        '<p>The pictures of each grain are averaged: the grain is the unit. For each variable: one-way analysis of variance, the Kruskal–Wallis test and Tukey letters (groups sharing no letter differ, α = 0.05), with Holm’s adjustment over all variables. Then, with standardized variables: <b>principal components</b> (to see the structure), <b>PERMANOVA</b> (do the groups differ as a whole?, global and by pairs) and two <b>classifiers</b>: linear discriminant analysis and random forest. Their accuracy is measured by leaving out one whole grain at a time and classifying it with a model fitted without it: it is the accuracy to expect for a new grain.</p>')}</details>
      <div class="card"><h2>${L2('Variables', 'Variables')}</h2>
        <fieldset class="chips-set"><legend>${L2('Entran al análisis', 'Enter the analysis')}</legend><div class="check-grid" id="b6Vars"></div></fieldset>
        <div class="setting-grid">
          <div class="field"><label for="b6Ntree">${L2('Árboles del bosque', 'Trees of the forest')}</label><input type="text" id="b6Ntree" class="num" inputmode="numeric" value="${state.set.ntree}"></div>
          <div class="field"><label for="b6Nperm">${L2('Permutaciones', 'Permutations')}</label><input type="text" id="b6Nperm" class="num" inputmode="numeric" value="${state.set.nperm}"></div>
          <div class="field"><label for="b6Seed">${L2('Semilla aleatoria', 'Random seed')}</label><input type="text" id="b6Seed" class="num" inputmode="numeric" value="${state.set.seed}"></div>
        </div>
        <div class="btn-row"><button type="button" class="btn btn-primary" id="b6Run">${L2('Comparar los grupos', 'Compare the groups')}</button><span class="hint" id="b6Count"></span></div>
        <div class="messages" id="b6Msg"></div>
      </div><div id="b6Body"></div>`;
    el('b6Vars').innerHTML = METRICS.map(m => `<label class="checkbox-label"><input type="checkbox" value="${m.k}"${chosen().includes(m.k) ? ' checked' : ''}> ${L2(m.es, m.en)}</label>`).join('');
    el('b6Vars').addEventListener('change', () => { state.set.vars = els('#b6Vars input:checked').map(i => i.value); });
    el('b6Run').addEventListener('click', run);
    count(); renderBody();
  }
  function count() {
    const rows = Images.rows(), units = new Set(rows.map(r => r.unit)).size, c = el('b6Count');
    const S = state.results.stats, nG = new Set(rows.map(r => r.group)).size;
    if (c) c.innerHTML = rows.length ? L2(`${units} granos de ${nG} grupos`, `${units} grains from ${nG} groups`) +
      /* the grains the last comparison left out because a chosen variable had no value in them */
      (S && S.nNaN > 0 ? ' · ' + (S.nNaN === 1 ? L2('1 sin valor en alguna variable elegida: quedó fuera', '1 without a value in some chosen variable: left out') : L2(`${S.nNaN} sin valor en alguna variable elegida: quedaron fuera`, `${S.nNaN} without a value in some chosen variable: left out`)) : '') : L2('Primero mide los granos en el Bloque 3.', 'First measure the grains in Block 3.');
    const b = el('b6Run'); if (b) b.disabled = !rows.length;
  }

  async function run() {
    const s = state.set;
    s.ntree = Math.max(50, Math.round(num(el('b6Ntree').value)) || 500);
    s.nperm = Math.max(99, Math.round(num(el('b6Nperm').value)) || 999);
    s.seed = Math.round(num(el('b6Seed').value)) || 1;
    clearMessages('b6Msg');
    const keys = chosen();
    if (keys.length < 2) { showMessage('b6Msg', 'warning', L2('Elige al menos dos variables.', 'Choose at least two variables.')); return; }
    let units = Multi.byUnit(Images.rows(), keys, r => r.unit, r => r.group);
    const nAll = units.length;
    units = units.filter(u => keys.every(k => isFinite(u[k])));
    const nNaN = nAll - units.length;   /* grains without a value in some chosen variable */
    const counts = {};
    units.forEach(u => { counts[u.group] = (counts[u.group] || 0) + 1; });
    const dropped = Object.keys(counts).filter(g => counts[g] < 3);
    units = units.filter(u => !dropped.includes(u.group));
    const G = groupCodes().filter(g => units.some(u => u.group === g));
    if (G.length < 2) { showMessage('b6Msg', 'warning', L2('Hacen falta al menos dos grupos con tres granos o más.', 'At least two groups with three grains or more are needed.')); return; }
    const X = units.map(u => keys.map(k => u[k])), y = units.map(u => u.group), U = units.map(u => u.unit);
    const out = { keys, groups: G, units: units.map(u => ({ unit: u.unit, group: u.group, nImages: u.nImages })), nAll, dropped, nNaN, ntree: s.ntree, ntreeCv: CV_TREES(s.ntree) };
    await withWork(T('Comparando los grupos', 'Comparing the groups'), async w => {
      w.update(0.05, T('Pruebas por variable', 'Tests by variable')); await yieldPaint();
      out.uni = keys.map((k, j) => {
        const gv = G.map(g => units.filter(u => u.group === g).map(u => u[k]));
        const A = Stats.anova1(gv), K = Stats.kruskal(gv), Tk = Stats.tukey(gv);
        return { k, means: A.means, sds: A.sds, n: A.n, F: A.F, pF: A.p, H: K.H, pK: K.p, letters: Tk.letters, r2: A.r2 };
      });
      const aF = Stats.padjust(out.uni.map(u => u.pF), 'holm'), aK = Stats.padjust(out.uni.map(u => u.pK), 'holm');
      out.uni.forEach((u, i) => { u.pFadj = aF[i]; u.pKadj = aK[i]; });
      w.update(0.15, T('Componentes principales', 'Principal components')); await yieldPaint();
      const P = Multi.pca(X);
      out.pca = { values: P.values, pct: P.pct, cor: P.cor, scores: P.scores.map(r => r.slice(0, 3)) };
      const Z = Multi.standardize(X).Z;
      w.update(0.25, 'PERMANOVA'); await yieldPaint();
      out.perm = Multi.permanova(Z, y, { nperm: s.nperm, seed: s.seed });
      out.pairs = G.length > 2 ? Multi.permanovaPairs(Z, y, { nperm: s.nperm, seed: s.seed }) : [];
      w.update(0.45, T('Análisis discriminante', 'Discriminant analysis')); await yieldPaint();
      const L = Multi.ldaFit(Z, y);
      out.lda = L.error ? { error: L.error } : { propTrace: L.propTrace, scores: Multi.ldaScores(L, Z).map(r => r.slice(0, 2)) };
      out.ldaCv = Multi.crossValidate(X, y, U, 'lda');
      w.update(0.6, T('Bosque aleatorio (validación por grano)', 'Random forest (validation by grain)')); await yieldPaint();
      out.rfCv = Multi.crossValidate(X, y, U, 'rf', { ntree: CV_TREES(s.ntree), seed: s.seed });
      w.update(0.9, T('Importancia de las variables', 'Importance of the variables')); await yieldPaint();
      const RF = Multi.rfFit(Z, y, { ntree: s.ntree, seed: s.seed });
      out.rf = { importance: RF.importance, oobError: RF.oobError };
      out.chance = Math.max(...G.map(g => units.filter(u => u.group === g).length)) / units.length;
    });
    state.results.stats = out;
    count(); renderBody();
  }

  function cmTable(cv, G) {
    const max = Math.max(1, ...cv.confusion.map(r => Math.max(...r)));
    return `<table class="cm"><caption>${L2('Filas: grupo verdadero · columnas: grupo asignado', 'Rows: true group · columns: assigned group')}</caption><thead><tr><th></th>${G.map(g => `<th scope="col">${esc(g)}</th>`).join('')}<th scope="col">${L2('Acierto', 'Correct')}</th></tr></thead><tbody>` +
      cv.confusion.map((row, i) => `<tr><th scope="row">${esc(G[i])}</th>${row.map((v, j) => `<td class="${i === j ? 'diag' : ''}" style="background:rgba(var(--${i === j ? 'primary' : 'accent'}-rgb),${v ? (0.08 + 0.5 * v / max).toFixed(2) : 0})">${v}</td>`).join('')}<td>${fmtPct(cv.perClass[i], 0)}</td></tr>`).join('') + '</tbody></table>';
  }
  function renderBody() {
    const host = el('b6Body'), S = state.results.stats;
    if (!host) return;
    if (!S) { host.innerHTML = ''; blockDone(); return; }
    const G = S.groups, k2 = S.keys;
    host.innerHTML = `<div class="card"><h2>${L2('En resumen', 'In short')}</h2><div id="b6Tiles"></div><div id="b6Verd"></div></div>
      <div class="card"><h2>${L2('Por variable', 'By variable')}</h2><p class="hint">${L2('Media ± desviación estándar por grupo; grupos que no comparten letra difieren (Tukey, α = 0.05). Valores de p ajustados por Holm sobre todas las variables.', 'Mean ± standard deviation by group; groups sharing no letter differ (Tukey, α = 0.05). p-values adjusted by Holm over all variables.')}</p>
        <div class="table-scroll" id="b6Uni"></div><div class="table-tools"><button type="button" class="btn btn-ghost btn-sm" id="b6CsvU">CSV</button></div>
        ${Fig.block('b6FigBest', 'La variable que más separa a los grupos', 'The variable that best separates the groups')}</div>
      <div class="card"><h2>${L2('Componentes principales', 'Principal components')}</h2>
        <div class="fig-grid">${Fig.block('b6FigPca', 'Biplot: granos y variables', 'Biplot: grains and variables')}${Fig.block('b6FigScree', 'Varianza explicada', 'Variance explained')}</div>
        <div class="table-scroll" id="b6Load"></div></div>
      <div class="card"><h2>PERMANOVA</h2><div id="b6Perm"></div><div class="table-scroll" id="b6Pairs"></div></div>
      <div class="card"><h2>${L2('Clave polínica: clasificar un grano', 'Pollen key: classifying a grain')}</h2><div id="b6ClsTiles"></div>
        <div class="fig-grid">${Fig.block('b6FigLda', 'Espacio discriminante (LD1 × LD2)', 'Discriminant space (LD1 × LD2)')}${Fig.block('b6FigImp', 'Importancia de las variables (bosque aleatorio)', 'Importance of the variables (random forest)')}</div>
        <div class="two-col"><div><h3>${L2('Discriminante lineal', 'Linear discriminant')}</h3><div class="table-scroll">${cmTable(S.ldaCv, G)}</div></div><div><h3>${L2('Bosque aleatorio', 'Random forest')}</h3><div class="table-scroll">${cmTable(S.rfCv, G)}</div></div></div>
      </div>`;
    const sig = S.uni.filter(u => u.pFadj < 0.05).length;
    statTiles('b6Tiles', [
      [T('Granos', 'Grains'), S.units.length, G.length + T(' grupos', ' groups')],
      ['PERMANOVA', 'R² = ' + fmtFixed(S.perm.R2, 3), 'F = ' + fmtFixed(S.perm.F, 2) + ' · ' + pEq(S.perm.p), S.perm.p < 0.05 ? 'ok' : null],
      [T('Variables que difieren', 'Variables that differ'), sig + ' / ' + k2.length, T('ANOVA con Holm, α = 0.05', 'ANOVA with Holm, α = 0.05')],
      [T('Clasificación (LDA)', 'Classification (LDA)'), fmtPct(S.ldaCv.accuracy), 'κ = ' + fmtFixed(S.ldaCv.kappa, 2)],
      [T('Clasificación (bosque)', 'Classification (forest)'), fmtPct(S.rfCv.accuracy), 'κ = ' + fmtFixed(S.rfCv.kappa, 2)],
      [T('Al azar', 'By chance'), fmtPct(S.chance), T('el grupo más numeroso', 'the largest group')],
    ]);
    const best = Math.max(S.ldaCv.accuracy, S.rfCv.accuracy), v = [];
    v.push(S.perm.p < 0.05 ? verdict('ok', L2(`Los grupos difieren en conjunto (PERMANOVA ${pEq(S.perm.p)}); el grupo explica ${fmtFixed(100 * S.perm.R2, 1)} % de la variación entre granos.`, `The groups differ as a whole (PERMANOVA ${pEq(S.perm.p)}); group explains ${fmtFixed(100 * S.perm.R2, 1)}% of the variation among grains.`)) : verdict('info', L2('La PERMANOVA no detectó diferencia entre grupos en conjunto.', 'PERMANOVA did not detect a difference between groups as a whole.')));
    v.push(best >= 0.8 ? verdict('ok', L2(`Un grano nuevo se asignaría a su grupo correcto ${fmtPct(best, null, 'es')} de las veces: el polen sirve como clave para estos grupos.`, `A new grain would be assigned to its correct group ${fmtPct(best, null, 'en')} of the time: pollen works as a key for these groups.`))
      : best >= 2 * S.chance ? verdict('warn', L2(`La clasificación (${fmtPct(best, null, 'es')}) supera claramente al azar (${fmtPct(S.chance, null, 'es')}), pero no basta para identificar con seguridad un grano aislado: los grupos se traslapan. Revisa la matriz de confusión para ver cuáles se confunden.`, `Classification (${fmtPct(best, null, 'en')}) clearly beats chance (${fmtPct(S.chance, null, 'en')}), but is not enough to identify a single grain with confidence: the groups overlap. Check the confusion matrix to see which are confused.`))
        : verdict('info', L2(`La clasificación (${fmtPct(best, null, 'es')}) apenas supera al azar (${fmtPct(S.chance, null, 'es')}): con estas variables, un grano aislado no basta para reconocer su grupo.`, `Classification (${fmtPct(best, null, 'en')}) barely beats chance (${fmtPct(S.chance, null, 'en')}): with these variables a single grain is not enough to recognize its group.`)));
    if (S.dropped.length) v.push(verdict('info', L2('Grupos con menos de tres granos, fuera del análisis: ', 'Groups with fewer than three grains, left out: ') + esc(S.dropped.join(', '))));
    if (S.units.some(u => u.nImages > 1)) v.push(verdict('info', L2(`${S.units.filter(u => u.nImages > 1).length} grano(s) tenían más de una foto: se promediaron.`, `${S.units.filter(u => u.nImages > 1).length} grain(s) had more than one picture: they were averaged.`)));
    el('b6Verd').innerHTML = v.join('');
    /* by variable */
    const uniCols = [{ label: L2('Variable', 'Variable'), get: u => metricLabel(u.k, true) }].concat(G.map((g, i) => ({ label: esc(g), num: true, html: true, get: u => fmtMS(u.means[i], u.sds[i], Math.min(3, metric(u.k).d)) + ' <b>' + esc(u.letters[i]) + '</b>' })))
      .concat([{ label: 'F', num: true, get: u => fmtFixed(u.F, 2) }, { label: L2('p (ANOVA)', 'p (ANOVA)'), num: true, get: u => fmtP(u.pFadj) }, { label: L2('p (Kruskal)', 'p (Kruskal)'), num: true, get: u => fmtP(u.pKadj) }, { label: 'η²', num: true, get: u => fmtFixed(u.r2, 3) }]);
    buildTable('b6Uni', uniCols, S.uni);
    el('b6CsvU').addEventListener('click', () => download(csvOf([{ label: 'variable', key: 'k' }, { label: 'nombre', get: u => metricLabel(u.k, true) }].concat(...G.map((g, i) => [{ label: g + '_media', get: u => u.means[i] }, { label: g + '_de', get: u => u.sds[i] }, { label: g + '_letra', get: u => u.letters[i] }])).concat([{ label: 'F', key: 'F' }, { label: 'p_anova_holm', key: 'pFadj' }, { label: 'H', key: 'H' }, { label: 'p_kruskal_holm', key: 'pKadj' }, { label: 'eta2', key: 'r2' }]), S.uni), T('palynopro_por_variable.csv', 'palynopro_by_variable.csv'), 'text/csv;charset=utf-8'));
    const top = S.uni.slice().sort((a, b) => b.F - a.F)[0];
    if (top) {
      const units = Multi.byUnit(Images.rows(), [top.k], r => r.unit, r => r.group).filter(u => G.includes(u.group) && S.units.some(x => x.unit === u.unit));
      el('b6FigBest').innerHTML = Fig.box({ width: Math.max(420, 90 + G.length * 60), height: 330, ylab: metricLabel(top.k, true), letters: top.letters, groups: G.map(g => ({ name: g, color: groupColor(g), values: units.filter(u => u.group === g).map(u => u[top.k]) })), aria: metricLabel(top.k) });
    }
    /* PCA */
    const pts = S.pca.scores.map((s2, i) => ({ x: s2[0], y: s2[1], g: S.units[i].group, title: S.units[i].unit }));
    el('b6FigPca').innerHTML = Fig.scatter({ width: 500, height: 420, xlab: T('CP', 'PC') + '1 (' + fmtFixed(S.pca.pct[0], 1) + pctSign() + ')', ylab: T('CP', 'PC') + '2 (' + fmtFixed(S.pca.pct[1], 1) + pctSign() + ')', ellipse: 0.95,
      groups: G.map(g => ({ key: g, name: g, color: groupColor(g) })), points: pts, arrows: k2.map((k, j) => ({ x: S.pca.cor[j][0], y: S.pca.cor[j][1], label: metricLabel(k) })), aria: T('Biplot del análisis de componentes principales', 'Biplot of the principal component analysis') });
    el('b6FigScree').innerHTML = Fig.bars({ categories: S.pca.pct.map((_, i) => T('CP', 'PC') + (i + 1)), series: [{ name: '%', color: 'var(--primary)', values: S.pca.pct }], ylab: T('Varianza explicada (%)', 'Variance explained (%)'), aria: T('Varianza explicada por componente', 'Variance explained by component') });
    buildTable('b6Load', [{ label: L2('Variable', 'Variable'), get: (r, i) => metricLabel(r.k) }].concat([0, 1, 2].filter(j => j < S.pca.pct.length).map(j => ({ label: L2('CP', 'PC') + (j + 1) + ' (r)', num: true, get: r => fmtFixed(r.c[j], 3) }))), k2.map((k, j) => ({ k, c: S.pca.cor[j] })), { caption: L2('Correlación de cada variable con los componentes.', 'Correlation of each variable with the components.') });
    /* PERMANOVA */
    el('b6Perm').innerHTML = `<p>${L2('Global', 'Global')}: <b>pseudo-F = ${fmtFixed(S.perm.F, 3)}</b>, ${L2('gl', 'df')} ${S.perm.df1}, ${S.perm.df2}; <b>R² = ${fmtFixed(S.perm.R2, 3)}</b>; ${pEq(S.perm.p)} (${S.perm.nperm} ${T('permutaciones', 'permutations')}, ${T('distancia euclidiana sobre variables estandarizadas', 'Euclidean distance on standardized variables')}).</p>`;
    if (S.pairs.length) buildTable('b6Pairs', [{ label: L2('Par', 'Pair'), get: r => r.a + ' – ' + r.b }, { label: 'F', num: true, get: r => fmtFixed(r.F, 2) }, { label: 'R²', num: true, get: r => fmtFixed(r.R2, 3) }, { label: 'p', num: true, get: r => fmtP(r.p) }, { label: L2('p (Holm)', 'p (Holm)'), num: true, get: r => fmtP(r.pAdj) }], S.pairs.map(r => Object.assign({ _class: r.pAdj < 0.05 ? 'row-ok' : '' }, r)));
    /* classifiers */
    statTiles('b6ClsTiles', [[T('Discriminante lineal', 'Linear discriminant'), fmtPct(S.ldaCv.accuracy), T('validación dejando fuera un grano', 'leave-one-grain-out validation')], [T('Bosque aleatorio', 'Random forest'), fmtPct(S.rfCv.accuracy), T(`validación dejando fuera un grano, ${S.ntreeCv} árboles en cada modelo`, `leave-one-grain-out validation, ${S.ntreeCv} trees in each model`)], [T('Error fuera de bolsa', 'Out-of-bag error'), fmtPct(S.rf.oobError), T(`bosque completo, ${S.ntree} árboles`, `whole forest, ${S.ntree} trees`)]]);
    if (S.lda && S.lda.scores && S.lda.scores[0] && S.lda.scores[0].length >= 2) el('b6FigLda').innerHTML = Fig.scatter({ width: 500, height: 400, xlab: 'LD1 (' + fmtFixed(100 * S.lda.propTrace[0], 1) + pctSign() + ')', ylab: 'LD2 (' + fmtFixed(100 * S.lda.propTrace[1], 1) + pctSign() + ')', ellipse: 0.95, groups: G.map(g => ({ key: g, name: g, color: groupColor(g) })), points: S.lda.scores.map((s2, i) => ({ x: s2[0], y: s2[1], g: S.units[i].group, title: S.units[i].unit })), aria: T('Espacio discriminante', 'Discriminant space') });
    else el('b6FigLda').innerHTML = `<p class="hint">${L2('Con dos grupos hay un solo eje discriminante.', 'With two groups there is a single discriminant axis.')}</p>`;
    const imp = k2.map((k, j) => ({ k, v: S.rf.importance[j] })).sort((a, b) => a.v - b.v);
    el('b6FigImp').innerHTML = Fig.bars({ horizontal: true, width: 500, categories: imp.map(i => metricLabel(i.k)), series: [{ name: T('Importancia', 'Importance'), color: 'var(--accent)', values: imp.map(i => i.v) }], ylab: T('Disminución media de Gini', 'Mean decrease in Gini'), aria: T('Importancia de las variables', 'Importance of the variables') });
    blockDone();
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('measured', () => { state.results.stats = null; count(); renderBody(); });
  /* an opened project brings its own settings: show them in the fields, which are read again on «Compare» */
  function syncSettings() {
    [['b6Ntree', 'ntree'], ['b6Nperm', 'nperm'], ['b6Seed', 'seed']].forEach(([id, k]) => { const n = el(id); if (n) n.value = state.set[k]; });
    const on = chosen();
    els('#b6Vars input').forEach(i => { i.checked = on.includes(i.value); });
  }
  document.addEventListener('imageschange', () => { syncSettings(); count(); renderBody(); });
  document.addEventListener('groupschange', renderBody);
  document.addEventListener('langchange', () => { render(); });
  document.addEventListener('stepchange', e => { if (e.detail.step === 6) count(); });
  window.Block6 = { render, renderBody };
})();
