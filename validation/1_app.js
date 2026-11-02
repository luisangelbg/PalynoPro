/* PalynoPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán. Free software under the GNU GPL v3 or later; see LICENSE. */
/* Validation, step 1: the statistical engines of the app on simulated data.
   Draws 30 data sets of grains (3 or 4 groups, 6 to 12 grains per group,
   8 correlated measures with shifts between groups), runs on them the same
   functions the app uses in Blocks 5 and 6, and writes the data and the
   answers for 2_comparar.R:
     node validation/1_app.js
   → validation/datos/caso_NN.csv, validation/datos/app.json */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
globalThis.window = globalThis;
['js/stats.js', 'js/multi.js'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f }));
const S = globalThis.Stats, M = globalThis.Multi;

/* a seeded generator, so that the cases are the same on every run */
let seed = 20261024;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const gauss = () => { let u = 0; while (u === 0) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };

const P = 8, KEYS = ['diam', 'fmax', 'fmin', 'circ', 'espinas', 'altura', 'lumen', 'contraste'];
fs.mkdirSync(path.join(__dirname, 'datos'), { recursive: true });
const cases = [];
for (let c = 1; c <= 30; c++) {
  const g = 3 + (c % 2), groups = 'ABCD'.slice(0, g).split(''), rows = [];
  const shift = groups.map(() => KEYS.map(() => gauss() * (0.4 + 0.15 * (c % 5)))), base = [62, 65, 59, 0.99, 26, 2, 1.5, 60], sd = [3, 3, 3, 0.004, 2.5, 0.3, 0.2, 6];
  groups.forEach((gr, k) => {
    const n = 6 + Math.floor(rnd() * 7);
    for (let i = 0; i < n; i++) {
      const common = gauss();                                       /* the three diameters move together */
      rows.push({ unit: gr + (i + 1), group: gr, v: KEYS.map((_, j) => base[j] + sd[j] * (shift[k][j] + (j < 3 ? 0.8 * common + 0.6 * gauss() : gauss()))) });
    }
  });
  const X = rows.map(r => r.v), y = rows.map(r => r.group), units = rows.map(r => r.unit);
  fs.writeFileSync(path.join(__dirname, 'datos', 'caso_' + String(c).padStart(2, '0') + '.csv'),
    ['unit,group,' + KEYS.join(',')].concat(rows.map(r => [r.unit, r.group].concat(r.v.map(String)).join(','))).join('\n') + '\n');

  /* univariate, one variable at a time, as in the table of Block 6 */
  const uni = KEYS.map((_, j) => {
    const by = groups.map(gr => rows.filter(r => r.group === gr).map(r => r.v[j]));
    const A = S.anova1(by), K = S.kruskal(by), T = S.tukey(by);
    return { F: A.F, p: A.p, r2: A.r2, H: K.H, pK: K.p, tukey: T.pairs.map(q => ({ i: q.i, j: q.j, diff: q.diff, lo: q.lo, hi: q.hi, p: q.p })) };
  });
  const holm = S.padjust(uni.map(u => u.p), 'holm');

  /* multivariate */
  const pca = M.pca(X), Z = M.standardize(X).Z, lda = M.ldaFit(Z, y), cv = M.crossValidate(X, y, units, 'lda');
  const perm = M.permanova(Z, y, { nperm: 9999, seed: c });

  /* fertility: counts of collapsed grains by group, as in Block 5 */
  const counts = groups.map(() => { const n = 30 + Math.floor(rnd() * 120); return { n, x: Math.floor(n * (0.02 + 0.3 * rnd())) }; });
  const N = counts.reduce((s, q) => s + q.n, 0), X1 = counts.reduce((s, q) => s + q.x, 0);
  let chi = 0;
  counts.forEach(q => { const e1 = q.n * X1 / N, e0 = q.n - e1; chi += (q.x - e1) ** 2 / e1 + (q.n - q.x - e0) ** 2 / e0; });
  const wil = counts.map(q => S.wilson(q.x, q.n));

  cases.push({ caso: c, groups, uni, holm, pcaValues: pca.values, pcaLoad1: pca.loadings.map(r => r[0]), pcaLoad2: pca.loadings.map(r => r[1]),
    ldaProp: lda.propTrace, ldaCvPred: cv.pred, ldaCvAcc: cv.accuracy, permF: perm.F, permR2: perm.R2, permP: perm.p,
    counts, chi, chiDf: groups.length - 1, chiP: S.pchisq(chi, groups.length - 1, true), wilson: wil.map(w => [w.lo, w.hi]) });
}
fs.writeFileSync(path.join(__dirname, 'datos', 'app.json'), JSON.stringify({ keys: KEYS, cases }));
console.log(cases.length + ' casos escritos en validation/datos/');
