/* PalynoPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán. Free software under the GNU GPL v3 or later; see LICENSE. */
/* The multivariate engine: algebra, PCA, LDA, random forest, PERMANOVA and
   the cross-validation by unit (the comparisons with an independent
   implementation are in validation/). */
later(async function () {
  sec('Multivariada: álgebra');
  const E = Multi.eigSym([[2, 1], [1, 2]]);
  near('autovalores de [[2,1],[1,2]]: 3', E.values[0], 3, 1e-12);
  near('… y 1', E.values[1], 1, 1e-12);
  const A = [[4, 2, 0.6], [2, 2, 0.4], [0.6, 0.4, 1]], Lc = Multi.chol(A);
  let maxd = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += Lc[i][k] * Lc[j][k]; maxd = Math.max(maxd, Math.abs(s - A[i][j])); }
  near('Cholesky: L·Lᵀ = A', maxd, 0, 1e-12);
  t('Cholesky de una matriz singular: null', Multi.chol([[1, 1], [1, 1]]) === null);

  sec('Multivariada: componentes principales');
  const r = Multi.rng(7), X = [];
  for (let i = 0; i < 60; i++) { const z = r() * 4; X.push([z + r(), 2 * z + r(), r() * 3, -z + 0.5 * r()]); }
  const P = Multi.pca(X);
  near('suma de autovalores = número de variables', P.values.reduce((s, v) => s + v, 0), 4, 1e-9);
  const v0 = P.scores.reduce((s, q) => s + q[0] * q[0], 0) / (X.length - 1);
  near('varianza de las puntuaciones del CP1 = su autovalor', v0, P.values[0], 1e-9);
  t('porcentajes que suman 100', Math.abs(P.pct.reduce((s, v) => s + v, 0) - 100) < 1e-9);
  t('la mayor carga de cada componente es positiva', [0, 1, 2, 3].every(k => { let b = 0; P.loadings.forEach((row, j) => { if (Math.abs(row[k]) > Math.abs(P.loadings[b][k])) b = j; }); return P.loadings[b][k] > 0; }));

  sec('Multivariada: discriminante y bosque');
  const Xs = [], ys = [];
  [[0, 0], [6, 0], [0, 6]].forEach((c, g) => { for (let i = 0; i < 12; i++) { Xs.push([c[0] + r(), c[1] + r(), r()]); ys.push('G' + g); } });
  const Z = Multi.standardize(Xs).Z, fit = Multi.ldaFit(Z, ys);
  t('grupos separados: el discriminante los clasifica todos', Z.every((z, i) => Multi.ldaPredict(fit, z).cls === ys[i]));
  near('las probabilidades posteriores suman 1', Multi.ldaPost(fit, Z[3]).reduce((s, v) => s + v, 0), 1, 1e-12);
  near('la proporción de la traza suma 1', fit.propTrace.reduce((s, v) => s + v, 0), 1, 1e-12);
  const units = ys.map((_, i) => 'u' + i);
  t('validación cruzada del discriminante: 100 %', Multi.crossValidate(Xs, ys, units, 'lda').accuracy === 1);
  const rf1 = Multi.rfFit(Z, ys, { ntree: 80, seed: 4 }), rf2 = Multi.rfFit(Z, ys, { ntree: 80, seed: 4 });
  t('bosque con la misma semilla: mismo resultado', rf1.importance.every((v, i) => v === rf2.importance[i]));
  t('bosque: error fuera de bolsa 0 con grupos separados', rf1.oobError === 0, rf1.oobError);
  t('la variable de ruido es la menos importante', rf1.importance[2] < rf1.importance[0] && rf1.importance[2] < rf1.importance[1]);

  sec('Multivariada: el grano como unidad');
  /* 15 grains with labels at random, each photographed twice (identical rows) */
  const Xd = [], yd = [], ud = [];
  for (let i = 0; i < 15; i++) { const row = [r(), r(), r()], g = 'G' + (i % 3); for (let k = 0; k < 2; k++) { Xd.push(row.slice()); yd.push(g); ud.push('g' + i); } }
  const byRow = Multi.crossValidate(Xd, yd, yd.map((_, i) => 'r' + i), 'rf', { ntree: 100, seed: 2 });
  const byUnit = Multi.crossValidate(Xd, yd, ud, 'rf', { ntree: 100, seed: 2 });
  t('dejando fuera la foto, su gemela delata el grupo (≥ 90 %)', byRow.accuracy >= 0.9, byRow.accuracy);
  t('dejando fuera el grano, la precisión cae al nivel del azar (≤ 60 %)', byUnit.accuracy <= 0.6, byUnit.accuracy);
  const U = Multi.byUnit([{ u: 'a', g: 'X', v: 1 }, { u: 'a', g: 'X', v: 3 }, { u: 'b', g: 'Y', v: 5 }], ['v'], o => o.u, o => o.g);
  t('promedio por grano', U.length === 2 && U[0].v === 2 && U[0].nImages === 2);

  sec('Multivariada: PERMANOVA y concordancia');
  const pm = Multi.permanova([[0], [1], [10], [11]], ['A', 'A', 'B', 'B'], { nperm: 1999, seed: 3 });
  near('pseudo-F a mano: (100/1)/(1/2) = 200', pm.F, 200, 1e-9);
  near('R² = 100/101', pm.R2, 100 / 101, 1e-12);
  t('con 4 puntos solo 2 de 6 particiones son tan extremas: p ≈ 1/3', Math.abs(pm.p - 1 / 3) < 0.05, pm.p);
  const pp = Multi.permanovaPairs(Z, ys, { nperm: 199, seed: 1 });
  t('pares: 3 comparaciones con p ajustado ≥ p', pp.length === 3 && pp.every(q => q.pAdj >= q.p - 1e-12));
  const C = Multi.confusion(['a', 'a', 'b', 'b'], ['a', 'b', 'b', 'b'], ['a', 'b']);
  t('matriz de confusión', C.confusion[0][0] === 1 && C.confusion[0][1] === 1 && C.confusion[1][1] === 2);
  near('kappa de Cohen: (0.75 − 0.5)/(1 − 0.5) = 0.5', C.kappa, 0.5, 1e-12);
});

/* The figures of Block 6 carry the names of the variables, which are long:
   bars lying down for the importance and biplot labels kept inside the frame. */
later(async function () {
  sec('Figuras: nombres largos de variables');
  const names = ['Diámetro mayor del cuerpo (Feret)', 'Circularidad del cuerpo', 'Área de espinas / área del cuerpo'];
  const hb = Fig.bars({ horizontal: true, width: 500, categories: names, series: [{ name: 'Importancia', values: [0.1, 0.3, 0.2] }], ylab: 'Disminución media de Gini' });
  const plot = hb.match(/data-plot="([^"]+)"/)[1].split(' ').map(Number);
  t('barras acostadas: cada nombre, entero, como etiqueta del eje vertical', names.every(n => hb.includes('data-role="ytick" x="' + (plot[0] - 7) + '" ') && hb.includes('>' + n + '</text>')));
  t('… y el margen izquierdo cabe el nombre más largo', plot[0] >= Math.max(...names.map(n => n.length)) * 11 * 0.56);
  const ws = [...hb.matchAll(/class="fg-bar" x="[^"]+" y="[^"]+" width="([^"]+)"/g)].map(m => +m[1]);
  t('… las barras son proporcionales al valor', ws.length === 3 && Math.abs(ws[1] / ws[0] - 3) < 0.02 && Math.abs(ws[2] / ws[0] - 2) < 0.02, ws);
  t('… y el eje de valores es el horizontal (data-xr)', /data-xr="0 /.test(hb) && !/data-yr=/.test(hb));
  const pts = [[-2, -1], [2, 1], [-1, 2], [1, -2]].map(([x, y]) => ({ x, y, g: 'A' }));
  const arrows = [{ x: 1, y: 0.05, label: names[0] }, { x: -1, y: 0.05, label: names[2] }, { x: 0.98, y: 0.1, label: names[1] }];
  const sc = Fig.scatter({ width: 400, height: 360, legend: false, groups: [{ key: 'A', name: 'A' }], points: pts, arrows });
  const P = sc.match(/data-plot="([^"]+)"/)[1].split(' ').map(Number);
  const txt = [...sc.matchAll(/<text class="txt(?: halo)?" x="([^"]+)" y="([^"]+)" font-size="10">([^<]*)</g)];
  const labs = arrows.map(a => { const m = txt.find(q => q[3] === a.label); return m && { x: +m[1], y: +m[2], w: a.label.length * 10 * 0.56 }; });
  t('biplot: cada flecha lleva el nombre de su variable', labs.every(Boolean));
  t('… dentro del marco aunque la flecha llegue al borde', labs.every(l => l && l.x >= P[0] && l.x + l.w <= P[0] + P[2] + 0.5 && l.y >= P[1] && l.y <= P[1] + P[3]), JSON.stringify(labs));
  t('… y dos nombres vecinos no se encimen', !(labs[0] && labs[2]) || Math.abs(labs[0].y - labs[2].y) >= 10 || labs[0].x + labs[0].w < labs[2].x || labs[2].x + labs[2].w < labs[0].x);
});
