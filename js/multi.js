/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — the multivariate engine (Multi). Everything written here.
   · standardization and principal components from the correlation matrix
     (Pearson 1901; Hotelling 1933), by Jacobi rotations;
   · linear discriminant analysis with equal covariances (Fisher 1936; Rao
     1948): canonical axes and posterior probabilities with priors equal to
     the group frequencies;
   · random forests of classification trees (Breiman 2001), Gini splits,
     bootstrap samples, mtry = ⌊√p⌋, seeded; votes, out-of-bag error and the
     mean decrease of Gini impurity;
   · cross-validation that leaves out one whole unit (a grain photographed
     several times is one unit), so no image of a grain helps to classify
     another image of the same grain;
   · permutational multivariate analysis of variance on Euclidean distances
     (Anderson 2001; McArdle and Anderson 2001), global and between pairs.
   The file has no DOM: the tests load it by itself. */
(function () {
  'use strict';
  const M = {};

  function rng(seed) {
    let a = (seed >>> 0) ^ 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = 0xdeadbeef;
    const next = () => { a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; let t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0; return (t >>> 0) / 4294967296; };
    for (let i = 0; i < 12; i++) next();
    return next;
  }
  M.rng = rng;

  /* ============================ linear algebra ============================ */
  /* eigen-decomposition of a symmetric matrix by cyclic Jacobi rotations:
     → { values (descending), vectors (columns) } */
  M.eigSym = function (A) {
    const n = A.length, a = A.map(r => r.slice()), V = a.map((r, i) => r.map((_, j) => (i === j ? 1 : 0)));
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
      if (off < 1e-22) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
        for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
        for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
      }
    }
    const idx = a.map((_, i) => i).sort((i, j) => a[j][j] - a[i][i]);
    return { values: idx.map(i => a[i][i]), vectors: V.map(r => idx.map(i => r[i])) };
  };
  /* Cholesky factor L of a symmetric positive definite matrix (A = L Lᵀ) */
  M.chol = function (A) {
    const n = A.length, L = A.map(() => new Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) { if (s <= 1e-12) return null; L[i][i] = Math.sqrt(s); } else L[i][j] = s / L[j][j];
    }
    return L;
  };
  const triInvLower = L => {
    const n = L.length, X = L.map(() => new Array(n).fill(0));
    for (let i = 0; i < n; i++) { X[i][i] = 1 / L[i][i]; for (let j = 0; j < i; j++) { let s = 0; for (let k = j; k < i; k++) s -= L[i][k] * X[k][j]; X[i][j] = s / L[i][i]; } }
    return X;
  };
  const mm = (A, B) => A.map(r => B[0].map((_, j) => { let s = 0; for (let k = 0; k < B.length; k++) s += r[k] * B[k][j]; return s; }));
  const tp = A => A[0].map((_, j) => A.map(r => r[j]));

  /* ============================ standardizing and PCA ============================ */
  M.colStats = function (X) {
    const n = X.length, p = X[0].length, mean = new Array(p).fill(0), sd = new Array(p).fill(0);
    X.forEach(r => r.forEach((v, j) => { mean[j] += v; }));
    mean.forEach((v, j) => { mean[j] = v / n; });
    X.forEach(r => r.forEach((v, j) => { sd[j] += (v - mean[j]) * (v - mean[j]); }));
    sd.forEach((v, j) => { sd[j] = Math.sqrt(v / (n - 1)); });
    return { mean, sd };
  };
  M.standardize = function (X, st) {
    st = st || M.colStats(X);
    return { Z: X.map(r => r.map((v, j) => (st.sd[j] > 0 ? (v - st.mean[j]) / st.sd[j] : 0))), st };
  };
  /* PCA of the correlation matrix → eigenvalues, % of variance, loadings
     (eigenvectors), correlations of the variables with the components, scores */
  M.pca = function (X) {
    const n = X.length, p = X[0].length, { Z, st } = M.standardize(X);
    const R = Array.from({ length: p }, () => new Array(p).fill(0));
    Z.forEach(r => { for (let i = 0; i < p; i++) for (let j = i; j < p; j++) R[i][j] += r[i] * r[j]; });
    for (let i = 0; i < p; i++) for (let j = i; j < p; j++) { R[i][j] /= n - 1; R[j][i] = R[i][j]; }
    const E = M.eigSym(R);
    /* sign: the largest loading of each component is positive (a fixed rule, so runs agree) */
    for (let k = 0; k < p; k++) { let big = 0; for (let j = 0; j < p; j++) if (Math.abs(E.vectors[j][k]) > Math.abs(E.vectors[big][k])) big = j; if (E.vectors[big][k] < 0) for (let j = 0; j < p; j++) E.vectors[j][k] = -E.vectors[j][k]; }
    const values = E.values.map(v => Math.max(0, v)), tot = values.reduce((s, v) => s + v, 0);
    const scores = Z.map(r => values.map((_, k) => r.reduce((s, v, j) => s + v * E.vectors[j][k], 0)));
    return { values, pct: values.map(v => 100 * v / tot), loadings: E.vectors, cor: E.vectors.map(row => row.map((v, k) => v * Math.sqrt(values[k]))), scores, st, R };
  };

  /* ============================ linear discriminant analysis ============================ */
  function groupsOf(y) { const levels = [...new Set(y)]; return { levels, idx: y.map(v => levels.indexOf(v)) }; }
  /* fit → { levels, prior, means, W (pooled within covariance), Winv, logdet, scaling, svd } */
  M.ldaFit = function (X, y, opts) {
    const o = Object.assign({ ridge: 0, prior: null }, opts || {});
    const n = X.length, p = X[0].length, G = groupsOf(y), g = G.levels.length;
    const cnt = new Array(g).fill(0), means = Array.from({ length: g }, () => new Array(p).fill(0)), gm = new Array(p).fill(0);
    X.forEach((r, i) => { const k = G.idx[i]; cnt[k]++; r.forEach((v, j) => { means[k][j] += v; gm[j] += v; }); });
    means.forEach((m, k) => m.forEach((v, j) => { m[j] = v / cnt[k]; }));
    gm.forEach((v, j) => { gm[j] = v / n; });
    const W = Array.from({ length: p }, () => new Array(p).fill(0)), B = Array.from({ length: p }, () => new Array(p).fill(0));
    X.forEach((r, i) => { const m = means[G.idx[i]]; for (let a = 0; a < p; a++) for (let b = a; b < p; b++) W[a][b] += (r[a] - m[a]) * (r[b] - m[b]); });
    for (let a = 0; a < p; a++) for (let b = a; b < p; b++) { W[a][b] /= n - g; W[b][a] = W[a][b]; }
    if (o.ridge > 0) { const tr = W.reduce((s, r, i) => s + r[i], 0) / p; for (let a = 0; a < p; a++) W[a][a] += o.ridge * tr; }
    means.forEach((m, k) => { for (let a = 0; a < p; a++) for (let b = a; b < p; b++) B[a][b] += cnt[k] * (m[a] - gm[a]) * (m[b] - gm[b]); });
    for (let a = 0; a < p; a++) for (let b = a; b < p; b++) { B[a][b] /= g - 1; B[b][a] = B[a][b]; }
    const L = M.chol(W);
    if (!L) return { error: 'singular', levels: G.levels };
    const Li = triInvLower(L), Winv = mm(tp(Li), Li);
    /* canonical axes: eigenvectors of L⁻¹ B L⁻ᵀ, scaled so the within-group variance of each axis is 1 */
    const E = M.eigSym(mm(mm(Li, B), tp(Li))), r = Math.min(p, g - 1);
    const scal = mm(tp(Li), E.vectors).map(row => row.slice(0, r));
    const ev = E.values.slice(0, r).map(v => Math.max(0, v));
    const tot = ev.reduce((s, v) => s + v, 0);
    return { levels: G.levels, prior: o.prior ? G.levels.map(l => o.prior[l]) : cnt.map(c => c / n), count: cnt, means, W, Winv, scaling: scal, eigen: ev, propTrace: ev.map(v => v / tot), grandMean: gm, p, g };
  };
  /* posterior probabilities of one observation */
  M.ldaPost = function (fit, x) {
    const lp = fit.means.map((m, k) => {
      const d = x.map((v, j) => v - m[j]);
      let q = 0;
      for (let a = 0; a < d.length; a++) { let s = 0; for (let b = 0; b < d.length; b++) s += fit.Winv[a][b] * d[b]; q += d[a] * s; }
      return Math.log(fit.prior[k]) - 0.5 * q;
    });
    const mx = Math.max(...lp), e = lp.map(v => Math.exp(v - mx)), s = e.reduce((a, b) => a + b, 0);
    return e.map(v => v / s);
  };
  M.ldaPredict = (fit, x) => { const pp = M.ldaPost(fit, x); let k = 0; for (let i = 1; i < pp.length; i++) if (pp[i] > pp[k]) k = i; return { cls: fit.levels[k], post: pp }; };
  /* scores on the canonical axes, centered on the grand mean */
  M.ldaScores = (fit, X) => X.map(r => fit.scaling[0].map((_, k) => r.reduce((s, v, j) => s + (v - fit.grandMean[j]) * fit.scaling[j][k], 0)));

  /* ============================ random forest ============================ */
  function gini(counts, n) { if (!n) return 0; let s = 1; for (const c of counts) s -= (c / n) * (c / n); return s; }
  function growTree(X, yi, rows, g, mtry, r, imp, minLeaf) {
    const p = X[0].length;
    const counts = new Array(g).fill(0);
    rows.forEach(i => counts[yi[i]]++);
    const n = rows.length, gi = gini(counts, n);
    const majority = counts.indexOf(Math.max(...counts));
    if (gi === 0 || n < 2 * minLeaf) return { leaf: majority };
    /* mtry variables drawn without replacement */
    const vars = [], pool = [...Array(p).keys()];
    for (let k = 0; k < mtry && pool.length; k++) vars.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    let best = null;
    for (const j of vars) {
      const ord = rows.slice().sort((a, b) => X[a][j] - X[b][j]);
      const left = new Array(g).fill(0), right = counts.slice();
      for (let t = 0; t < n - 1; t++) {
        const c = yi[ord[t]]; left[c]++; right[c]--;
        const v0 = X[ord[t]][j], v1 = X[ord[t + 1]][j];
        if (v0 === v1 || t + 1 < minLeaf || n - t - 1 < minLeaf) continue;
        const nl = t + 1, nr = n - nl, dec = gi - (nl / n) * gini(left, nl) - (nr / n) * gini(right, nr);
        if (!best || dec > best.dec + 1e-15) best = { dec, j, thr: (v0 + v1) / 2 };
      }
    }
    if (!best || best.dec <= 0) return { leaf: majority };
    imp[best.j] += best.dec * n;
    const L = rows.filter(i => X[i][best.j] <= best.thr), R = rows.filter(i => X[i][best.j] > best.thr);
    return { j: best.j, thr: best.thr, l: growTree(X, yi, L, g, mtry, r, imp, minLeaf), r: growTree(X, yi, R, g, mtry, r, imp, minLeaf) };
  }
  const predictTree = (t, x) => { while (t.leaf == null) t = x[t.j] <= t.thr ? t.l : t.r; return t.leaf; };
  /* fit → { levels, trees, importance (mean decrease Gini, summed impurity × n per tree, averaged), oobError, oobPred } */
  M.rfFit = function (X, y, opts) {
    const o = Object.assign({ ntree: 500, seed: 1, mtry: null, minLeaf: 1 }, opts || {});
    const n = X.length, p = X[0].length, G = groupsOf(y), g = G.levels.length, r = rng(o.seed);
    const mtry = o.mtry || Math.max(1, Math.floor(Math.sqrt(p)));
    const imp = new Array(p).fill(0), trees = [], votes = Array.from({ length: n }, () => new Array(g).fill(0));
    for (let t = 0; t < o.ntree; t++) {
      const inBag = new Uint8Array(n), rows = [];
      for (let k = 0; k < n; k++) { const i = Math.floor(r() * n); rows.push(i); inBag[i] = 1; }
      const tree = growTree(X, G.idx, rows, g, mtry, r, imp, o.minLeaf);
      trees.push(tree);
      for (let i = 0; i < n; i++) if (!inBag[i]) votes[i][predictTree(tree, X[i])]++;
    }
    const oobPred = votes.map(v => (v.some(c => c > 0) ? G.levels[v.indexOf(Math.max(...v))] : null));
    const counted = oobPred.filter(v => v != null).length;
    const oobError = counted ? oobPred.filter((v, i) => v != null && v !== y[i]).length / counted : NaN;
    return { levels: G.levels, trees, importance: imp.map(v => v / o.ntree / n), oobError, oobPred, mtry, ntree: o.ntree };
  };
  M.rfPredict = function (fit, x) {
    const v = new Array(fit.levels.length).fill(0);
    fit.trees.forEach(t => { v[predictTree(t, x)]++; });
    return { cls: fit.levels[v.indexOf(Math.max(...v))], votes: v.map(c => c / fit.trees.length) };
  };

  /* ============================ cross-validation by unit ============================ */
  /* method: 'lda' | 'rf'. units: the unit of each row (a grain); every unit is
     left out in turn and predicted from a model fitted to the others, with the
     standardization recomputed without it. → { pred, accuracy, confusion, levels } */
  M.crossValidate = function (X, y, units, method, opts) {
    const o = Object.assign({ seed: 1, ntree: 300 }, opts || {});
    const levels = [...new Set(y)], U = [...new Set(units)], pred = new Array(X.length).fill(null);
    /* priors: the frequencies of the groups in the whole set, as is usual (they do not leak the left-out labels in any useful way) */
    const prior = {};
    levels.forEach(l => { prior[l] = y.filter(v => v === l).length / y.length; });
    U.forEach((u, ui) => {
      const test = [], train = [];
      units.forEach((v, i) => (v === u ? test : train).push(i));
      if (!test.length || !train.length) return;
      const Xt = train.map(i => X[i]), yt = train.map(i => y[i]);
      if (new Set(yt).size < 2) return;
      const st = M.colStats(Xt), Zt = M.standardize(Xt, st).Z, Zs = M.standardize(test.map(i => X[i]), st).Z;
      let fit;
      if (method === 'lda') { fit = M.ldaFit(Zt, yt, { prior }); if (fit.error) fit = M.ldaFit(Zt, yt, { ridge: 1e-3, prior }); }
      else fit = M.rfFit(Zt, yt, { ntree: o.ntree, seed: o.seed + ui });
      test.forEach((i, k) => { if (fit.error) return; pred[i] = method === 'lda' ? M.ldaPredict(fit, Zs[k]).cls : M.rfPredict(fit, Zs[k]).cls; });
    });
    return Object.assign({ pred }, M.confusion(y, pred, levels));
  };
  M.confusion = function (y, pred, levels) {
    levels = levels || [...new Set(y)];
    const C = levels.map(() => new Array(levels.length).fill(0));
    let ok = 0, n = 0;
    y.forEach((v, i) => { if (pred[i] == null) return; n++; if (pred[i] === v) ok++; C[levels.indexOf(v)][levels.indexOf(pred[i])]++; });
    /* Cohen's kappa */
    const tot = n, po = ok / (tot || 1);
    let pe = 0;
    levels.forEach((_, i) => { const row = C[i].reduce((s, v) => s + v, 0), col = C.reduce((s, r) => s + r[i], 0); pe += (row / tot) * (col / tot); });
    return { confusion: C, levels, accuracy: n ? ok / n : NaN, n, kappa: pe < 1 ? (po - pe) / (1 - pe) : NaN, perClass: levels.map((_, i) => { const row = C[i].reduce((s, v) => s + v, 0); return row ? C[i][i] / row : NaN; }) };
  };

  /* ============================ PERMANOVA ============================ */
  /* pseudo-F of Anderson (2001) on squared Euclidean distances of the rows of Z
     (already standardized), with nperm permutations of the labels → { F, R2, p, df } */
  function sqDist(Z) {
    const n = Z.length, D = Array.from({ length: n }, () => new Float64Array(n));
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { let s = 0; for (let k = 0; k < Z[i].length; k++) { const d = Z[i][k] - Z[j][k]; s += d * d; } D[i][j] = D[j][i] = s; }
    return D;
  }
  function pseudoF(D, gi, g) {
    const n = gi.length;
    let sst = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) sst += D[i][j];
    sst /= n;
    const members = Array.from({ length: g }, () => []);
    gi.forEach((k, i) => members[k].push(i));
    let ssw = 0;
    members.forEach(m => { let s = 0; for (let a = 0; a < m.length; a++) for (let b = a + 1; b < m.length; b++) s += D[m[a]][m[b]]; if (m.length) ssw += s / m.length; });
    const ssa = sst - ssw;
    return { F: (ssa / (g - 1)) / (ssw / (n - g)), R2: ssa / sst, ssa, ssw, sst };
  }
  M.permanova = function (Z, y, opts) {
    const o = Object.assign({ nperm: 999, seed: 1 }, opts || {});
    const G = groupsOf(y), g = G.levels.length, D = sqDist(Z), obs = pseudoF(D, G.idx, g), r = rng(o.seed);
    let ge = 0;
    const perm = G.idx.slice();
    for (let t = 0; t < o.nperm; t++) {
      for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp; }
      if (pseudoF(D, perm, g).F >= obs.F - 1e-12) ge++;
    }
    return { F: obs.F, R2: obs.R2, p: (ge + 1) / (o.nperm + 1), df1: g - 1, df2: y.length - g, nperm: o.nperm, levels: G.levels, ss: obs };
  };
  /* every pair of groups, with Holm's adjustment */
  M.permanovaPairs = function (Z, y, opts) {
    const levels = [...new Set(y)], out = [];
    for (let a = 0; a < levels.length; a++) for (let b = a + 1; b < levels.length; b++) {
      const rows = y.map((v, i) => i).filter(i => y[i] === levels[a] || y[i] === levels[b]);
      const res = M.permanova(rows.map(i => Z[i]), rows.map(i => y[i]), opts);
      out.push({ a: levels[a], b: levels[b], F: res.F, R2: res.R2, p: res.p });
    }
    const m = out.length, ord = out.map((_, i) => i).sort((i, j) => out[i].p - out[j].p);
    let run = 0;
    ord.forEach((i, k) => { run = Math.max(run, Math.min(1, (m - k) * out[i].p)); out[i].pAdj = run; });
    return out;
  };

  /* ============================ units ============================ */
  /* the mean of the rows of each unit (a grain photographed more than once) */
  M.byUnit = function (rows, keys, unitOf, groupOf) {
    const map = new Map();
    rows.forEach(r => {
      const u = unitOf(r);
      if (!map.has(u)) map.set(u, { unit: u, group: groupOf(r), n: 0, sums: keys.map(() => 0), cnt: keys.map(() => 0), rows: [] });
      const e = map.get(u);
      e.n++; e.rows.push(r);
      keys.forEach((k, j) => { const v = r[k]; if (typeof v === 'number' && isFinite(v)) { e.sums[j] += v; e.cnt[j]++; } });
    });
    return [...map.values()].map(e => { const o = { unit: e.unit, group: e.group, nImages: e.n, rows: e.rows }; keys.forEach((k, j) => { o[k] = e.cnt[j] ? e.sums[j] / e.cnt[j] : NaN; }); return o; });
  };

  window.Multi = M;
})();
