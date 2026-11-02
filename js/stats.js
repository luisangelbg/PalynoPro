/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — the statistical engine (Stats), the same validated engine of the
   SeedsPro app of the LABG Suite (same author), kept here as its own copy.
   Everything is written here, with no library:
     · descriptive statistics;
     · the special functions (log-gamma, incomplete gamma and beta) and, on
       them, the normal, t, chi-square, F, beta, binomial and studentized
       range distributions with their quantiles;
     · intervals for a proportion (Wilson 1927; Clopper and Pearson 1934);
     · one-way analysis of variance, Tukey's test with the Tukey–Kramer error
       and the letters of the groups, Kruskal–Wallis and Brown–Forsythe;
     · generalized linear model for binomial counts by iteratively reweighted
       least squares (McCullagh and Nelder 1989), with the quasi-binomial
       dispersion, the analysis of deviance and the contrasts among groups;
     · Kaplan–Meier estimator (1958) with Greenwood's variance and the
       log-rank test for k groups (Mantel 1966; Harrington and Fleming 1982);
     · small dense linear algebra and the adjustments of p for many tests.
   The file has no DOM: the tests load it by itself. */
(function () {
  'use strict';
  const S = {};
  const TINY = 1e-300, EPS = 1e-16;

  /* ============================ descriptive ============================ */
  const isNum = v => typeof v === 'number' && isFinite(v);
  S.clean = x => x.filter(isNum);
  /* compensated sum (Kahan): the totals of many small terms keep their last digits */
  S.sum = x => { let s = 0, c = 0; for (let i = 0; i < x.length; i++) { const y = x[i] - c, t = s + y; c = (t - s) - y; s = t; } return s; };
  S.mean = x => (x.length ? S.sum(x) / x.length : NaN);
  S.variance = (x, pop) => {
    const n = x.length;
    if (n < (pop ? 1 : 2)) return NaN;
    const m = S.mean(x);
    return S.sum(x.map(v => (v - m) * (v - m))) / (pop ? n : n - 1);
  };
  S.sd = (x, pop) => Math.sqrt(S.variance(x, pop));
  S.sem = x => S.sd(x) / Math.sqrt(x.length);
  S.cv = x => 100 * S.sd(x) / S.mean(x);
  S.min = x => x.reduce((a, b) => Math.min(a, b), Infinity);
  S.max = x => x.reduce((a, b) => Math.max(a, b), -Infinity);
  /* quantile by linear interpolation between order statistics (h = (n − 1) p + 1) */
  S.quantile = (x, p) => {
    const v = x.slice().sort((a, b) => a - b), n = v.length;
    if (!n) return NaN;
    const h = (n - 1) * p, lo = Math.floor(h), hi = Math.min(n - 1, lo + 1);
    return v[lo] + (h - lo) * (v[hi] - v[lo]);
  };
  S.median = x => S.quantile(x, 0.5);
  /* average ranks, with the sizes of the groups of ties */
  S.ranks = x => {
    const idx = x.map((v, i) => i).sort((a, b) => x[a] - x[b]), r = new Array(x.length), ties = [];
    for (let i = 0; i < idx.length;) {
      let j = i;
      while (j + 1 < idx.length && x[idx[j + 1]] === x[idx[i]]) j++;
      for (let k = i; k <= j; k++) r[idx[k]] = (i + j) / 2 + 1;
      if (j > i) ties.push(j - i + 1);
      i = j + 1;
    }
    return { ranks: r, ties };
  };

  /* ============================ special functions ============================ */
  /* log-gamma by the approximation of Lanczos (1964), g = 7 and nine terms */
  const LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1;
    let a = LG[0];
    const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += LG[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  S.lgamma = lgamma;
  S.lchoose = (n, k) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);

  /* regularized incomplete gamma: [P(a, x), Q(a, x)]. The series below a + 1,
     the continued fraction (evaluated by Lentz's method) above; each tail is
     computed directly where it is the small one. */
  function gammaPQ(a, x) {
    if (!(x > 0)) return [0, 1];
    if (!isFinite(x)) return [1, 0];
    const front = Math.exp(-x + a * Math.log(x) - lgamma(a));
    if (x < a + 1) {
      let ap = a, del = 1 / a, sum = del;
      for (let n = 0; n < 100000; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * EPS) break; }
      const P = Math.min(1, sum * front);
      return [P, 1 - P];
    }
    let b = x + 1 - a, c = 1 / TINY, d = 1 / b, h = d;
    for (let i = 1; i < 100000; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < TINY) d = TINY;
      c = b + an / c; if (Math.abs(c) < TINY) c = TINY;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    const Q = Math.min(1, front * h);
    return [1 - Q, Q];
  }
  S.gammaP = (a, x) => gammaPQ(a, x)[0];
  S.gammaQ = (a, x) => gammaPQ(a, x)[1];

  /* continued fraction of the incomplete beta (Lentz) */
  function betacf(x, a, b) {
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < TINY) d = TINY;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 100000; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
      c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
      c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  /* regularized incomplete beta: [I_x(a, b), 1 − I_x(a, b)] */
  function betaPQ(x, a, b) {
    if (!(x > 0)) return [0, 1];
    if (x >= 1) return [1, 0];
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log1p(-x));
    if (x < (a + 1) / (a + b + 2)) { const p = Math.min(1, bt * betacf(x, a, b) / a); return [p, 1 - p]; }
    const q = Math.min(1, bt * betacf(1 - x, b, a) / b);
    return [1 - q, q];
  }
  S.pbeta = (x, a, b, upper) => betaPQ(x, a, b)[upper ? 1 : 0];

  /* a root of a monotone function inside [a, b]: false position with the
     Illinois correction, which never leaves the bracket */
  function root(f, a, b, tol, maxIter) {
    let fa = f(a), fb = f(b);
    if (fa === 0) return a;
    if (fb === 0) return b;
    if (fa * fb > 0) return NaN;
    tol = tol || 1e-13;
    let side = 0;
    for (let i = 0; i < (maxIter || 300); i++) {
      let c = (a * fb - b * fa) / (fb - fa);
      if (!(c > Math.min(a, b) && c < Math.max(a, b))) c = (a + b) / 2;
      const fc = f(c);
      if (fc === 0) return c;
      if (fc * fb > 0) { b = c; fb = fc; if (side === -1) fa /= 2; side = -1; }
      else { a = c; fa = fc; if (side === 1) fb /= 2; side = 1; }
      if (Math.abs(b - a) <= tol * (1 + Math.abs(a) + Math.abs(b))) return (a + b) / 2;
    }
    return (a + b) / 2;
  }
  S.root = root;

  /* ============================ distributions ============================ */
  S.dnorm = z => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  /* Φ(z) through the incomplete gamma: erfc(x) = Q(1/2, x²). Both tails keep
     their relative precision. */
  S.pnorm = (z, upper) => {
    if (Number.isNaN(z)) return NaN;
    if (upper) z = -z;
    if (z === 0) return 0.5;
    const q = 0.5 * gammaPQ(0.5, 0.5 * z * z)[1];
    return z < 0 ? q : 1 - q;
  };
  /* Φ⁻¹(p): a rational start (Abramowitz and Stegun 26.2.23) polished with
     Halley's steps on Φ itself, so the result is as exact as pnorm */
  S.qnorm = p => {
    if (!(p >= 0 && p <= 1)) return NaN;
    if (p === 0) return -Infinity;
    if (p === 1) return Infinity;
    if (p === 0.5) return 0;
    const low = p < 0.5, pp = low ? p : 1 - p;
    const t = Math.sqrt(-2 * Math.log(pp));
    let x = -(t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t));
    for (let i = 0; i < 6; i++) {
      const e = S.pnorm(x) - pp, u = e / S.dnorm(x), dx = u / (1 + x * u / 2);
      x -= dx;
      if (Math.abs(dx) < 1e-15 * (1 + Math.abs(x))) break;
    }
    return low ? x : -x;
  };

  S.pt = (t, df, upper) => {
    if (!(df > 0) || Number.isNaN(t)) return NaN;
    if (!isFinite(df)) return S.pnorm(t, upper);
    const tail = 0.5 * betaPQ(df / (df + t * t), df / 2, 0.5)[0];   /* P(T > |t|) */
    const up = t > 0 ? tail : 1 - tail;
    return upper ? up : 1 - up;
  };
  S.qt = (p, df) => {
    if (!(p > 0 && p < 1)) return p === 0 ? -Infinity : p === 1 ? Infinity : NaN;
    if (!isFinite(df)) return S.qnorm(p);
    if (p === 0.5) return 0;
    const low = p < 0.5, pp = low ? p : 1 - p;
    /* P(T > t) = pp, t > 0 */
    let hi = Math.max(2, -S.qnorm(pp) * 2);
    while (S.pt(hi, df, true) > pp) hi *= 2;
    const t = root(x => S.pt(x, df, true) - pp, 0, hi, 1e-14);
    return low ? -t : t;
  };

  S.pchisq = (x, df, upper) => (x <= 0 ? (upper ? 1 : 0) : gammaPQ(df / 2, x / 2)[upper ? 1 : 0]);
  S.qchisq = (p, df) => {
    if (!(p > 0 && p < 1)) return p === 0 ? 0 : p === 1 ? Infinity : NaN;
    /* start of Wilson and Hilferty (1931), then a bracket around it */
    const z = S.qnorm(p), h = 2 / (9 * df);
    let g = df * Math.pow(Math.max(1e-3, 1 - h + z * Math.sqrt(h)), 3), lo = g / 2, hi = g * 2 + 1;
    while (S.pchisq(lo, df) > p) lo /= 4;
    while (S.pchisq(hi, df) < p) hi *= 2;
    return p > 0.5 ? root(x => S.pchisq(x, df, true) - (1 - p), lo, hi, 1e-14) : root(x => S.pchisq(x, df) - p, lo, hi, 1e-14);
  };

  S.pf = (f, d1, d2, upper) => {
    if (!(f > 0)) return upper ? 1 : 0;
    if (!isFinite(f)) return upper ? 0 : 1;
    return betaPQ(d2 / (d2 + d1 * f), d2 / 2, d1 / 2)[upper ? 0 : 1];
  };
  S.qf = (p, d1, d2) => {
    if (!(p > 0 && p < 1)) return p === 0 ? 0 : p === 1 ? Infinity : NaN;
    let hi = 2;
    while (S.pf(hi, d1, d2) < p) hi *= 2;
    return p > 0.5 ? root(x => S.pf(x, d1, d2, true) - (1 - p), 0, hi, 1e-14) : root(x => S.pf(x, d1, d2) - p, 0, hi, 1e-14);
  };
  S.qbeta = (p, a, b) => {
    if (!(p > 0)) return 0;
    if (!(p < 1)) return 1;
    return root(x => betaPQ(x, a, b)[0] - p, 0, 1, 1e-15);
  };

  S.dbinom = (k, n, p) => {
    if (k < 0 || k > n || k !== Math.round(k)) return 0;
    if (p <= 0) return k === 0 ? 1 : 0;
    if (p >= 1) return k === n ? 1 : 0;
    return Math.exp(S.lchoose(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p));
  };
  S.pbinom = (k, n, p, upper) => {
    k = Math.floor(k);
    if (k < 0) return upper ? 1 : 0;
    if (k >= n) return upper ? 0 : 1;
    return betaPQ(p, k + 1, n - k)[upper ? 0 : 1];       /* P(X ≤ k) = 1 − I_p(k + 1, n − k) */
  };
  /* exact two-sided binomial test: the probability of every outcome no more
     likely than the one observed */
  S.binomTest = (x, n, p0) => {
    const d0 = S.dbinom(x, n, p0);
    let p = 0;
    for (let k = 0; k <= n; k++) { const d = S.dbinom(k, n, p0); if (d <= d0 * (1 + 1e-7)) p += d; }
    return Math.min(1, p);
  };

  /* ---------- the studentized range ----------
     P(Q < q) for k means and df degrees of freedom:
       P = ∫ f(s) · R(q s) ds,   R(w) = k ∫ φ(z) [Φ(z) − Φ(z − w)]^(k−1) dz,
     where s² is a chi-square over its degrees of freedom. Both integrals are
     done with Gauss–Legendre rules whose nodes are computed here. */
  function gaussLegendre(n) {
    const x = new Array(n), w = new Array(n);
    for (let i = 0; i < (n + 1) / 2; i++) {
      let z = Math.cos(Math.PI * (i + 0.75) / (n + 0.5)), pp = 1;
      for (let it = 0; it < 100; it++) {
        let p1 = 1, p2 = 0;
        for (let j = 0; j < n; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1); }
        pp = n * (z * p1 - p2) / (z * z - 1);
        const dz = p1 / pp;
        z -= dz;
        if (Math.abs(dz) < 1e-16) break;
      }
      x[i] = -z; x[n - 1 - i] = z;
      w[i] = w[n - 1 - i] = 2 / ((1 - z * z) * pp * pp);
    }
    return { x, w };
  }
  S.gaussLegendre = gaussLegendre;
  const GL = gaussLegendre(16);
  /* the nodes of the inner integral do not depend on w: Φ and φ at them are kept */
  const INNER = (() => {
    const z = [], wt = [], P = [];
    const a = -8.5, b = 8.5, panels = 17, h = (b - a) / panels;
    for (let i = 0; i < panels; i++) for (let j = 0; j < 16; j++) {
      const zz = a + h * (i + 0.5) + 0.5 * h * GL.x[j];
      z.push(zz); wt.push(0.5 * h * GL.w[j] * S.dnorm(zz)); P.push(S.pnorm(zz));
    }
    return { z, wt, P };
  })();
  function prange(w, k) {
    if (!(w > 0)) return 0;
    if (w > 40) return 1;
    let s = 0;
    for (let i = 0; i < INNER.z.length; i++) {
      const d = INNER.P[i] - S.pnorm(INNER.z[i] - w);
      if (d > 0) s += INNER.wt[i] * Math.pow(d, k - 1);
    }
    return Math.min(1, k * s);
  }
  S.prange = prange;
  S.ptukey = (q, k, df, upper) => {
    if (!(q > 0)) return upper ? 1 : 0;
    if (!(k >= 2) || !(df > 0)) return NaN;
    let P;
    if (!isFinite(df) || df > 1e6) P = prange(q, k);
    else {
      /* where s has its mass: bounds of the chi-square tails at e^(−38) */
      const Lc = 38, lo = Math.sqrt(Math.max(0, 1 - 2 * Math.sqrt(Lc / df))), hi = Math.sqrt(1 + 2 * Math.sqrt(Lc / df) + 2 * Lc / df);
      const cuts = [];
      const N = 16;
      for (let i = 0; i <= N; i++) cuts.push(lo + (hi - lo) * i / N);
      /* R(q s) climbs from 0 to 1 while q s goes from 0 to about 8 + …: more panels there */
      const top = (6 + 1.3 * Math.sqrt(Math.log(k) + 1) * 2) / q;
      for (let j = 1; j <= 8; j++) { const c = top * j / 8; if (c > lo && c < hi) cuts.push(c); }
      cuts.sort((x, y) => x - y);
      const lc = Math.log(2) + (df / 2) * Math.log(df / 2) - lgamma(df / 2);
      P = 0;
      for (let i = 0; i + 1 < cuts.length; i++) {
        const a = cuts[i], h = cuts[i + 1] - a;
        if (h < 1e-12) continue;
        for (let j = 0; j < 16; j++) {
          const s = a + 0.5 * h * (1 + GL.x[j]);
          if (!(s > 0)) continue;
          const f = Math.exp(lc + (df - 1) * Math.log(s) - df * s * s / 2);
          if (f > 0) P += 0.5 * h * GL.w[j] * f * prange(q * s, k);
        }
      }
      P = Math.max(0, Math.min(1, P));
    }
    return upper ? 1 - P : P;
  };
  S.qtukey = (p, k, df) => {
    if (!(p > 0 && p < 1)) return p === 0 ? 0 : p === 1 ? Infinity : NaN;
    let hi = 8;
    while (S.ptukey(hi, k, df) < p && hi < 1e4) hi *= 2;
    return root(x => S.ptukey(x, k, df) - p, 0, hi, 1e-10, 80);
  };

  /* ============================ proportions ============================ */
  /* score interval of Wilson (1927) */
  S.wilson = (x, n, conf) => {
    if (!(n > 0)) return { p: NaN, lo: NaN, hi: NaN };
    const z = S.qnorm(1 - (1 - (conf || 0.95)) / 2), p = x / n, z2 = z * z;
    const c = (p + z2 / (2 * n)) / (1 + z2 / n), h = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / (1 + z2 / n);
    return { p, lo: Math.max(0, c - h), hi: Math.min(1, c + h) };
  };
  /* exact interval of Clopper and Pearson (1934) */
  S.clopperPearson = (x, n, conf) => {
    if (!(n > 0)) return { p: NaN, lo: NaN, hi: NaN };
    const a = 1 - (conf || 0.95);
    return { p: x / n, lo: x <= 0 ? 0 : S.qbeta(a / 2, x, n - x + 1), hi: x >= n ? 1 : S.qbeta(1 - a / 2, x + 1, n - x) };
  };
  /* angular transformation and logit of a percentage of a known number of seeds */
  S.asinSqrt = p => Math.asin(Math.sqrt(Math.max(0, Math.min(1, p))));
  S.logit = p => Math.log(p / (1 - p));
  S.expit = e => (e >= 0 ? 1 / (1 + Math.exp(-e)) : Math.exp(e) / (1 + Math.exp(e)));
  /* empirical logit: one half added to both counts, so 0 and 100 % stay finite */
  S.elogit = (x, n) => Math.log((x + 0.5) / (n - x + 0.5));

  /* ============================ linear algebra ============================ */
  /* solves A x = b (A square, b a vector or a matrix of columns) by Gaussian
     elimination with partial pivoting; null when A is singular */
  S.solve = (A, b) => {
    const n = A.length, many = Array.isArray(b[0]);
    const M = A.map((r, i) => r.slice().concat(many ? b[i] : [b[i]])), w = M[0].length;
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-300) return null;
      if (p !== c) { const t = M[p]; M[p] = M[c]; M[c] = t; }
      for (let r = c + 1; r < n; r++) {
        const f = M[r][c] / M[c][c];
        if (f !== 0) for (let k = c; k < w; k++) M[r][k] -= f * M[c][k];
      }
    }
    const X = M.map(() => new Array(w - n).fill(0));
    for (let k = 0; k < w - n; k++) for (let r = n - 1; r >= 0; r--) {
      let s = M[r][n + k];
      for (let c = r + 1; c < n; c++) s -= M[r][c] * X[c][k];
      X[r][k] = s / M[r][r];
    }
    return many ? X : X.map(r => r[0]);
  };
  S.inverse = A => S.solve(A, A.map((r, i) => r.map((_, j) => (i === j ? 1 : 0))));
  /* reciprocal condition estimate of a symmetric positive matrix, from its scaled pivots */
  S.transpose = A => A[0].map((_, j) => A.map(r => r[j]));
  S.matmul = (A, B) => A.map(r => B[0].map((_, j) => { let s = 0; for (let k = 0; k < B.length; k++) s += r[k] * B[k][j]; return s; }));

  /* ============================ many tests ============================ */
  /* adjusted p-values; the missing ones stay missing and do not count */
  S.padjust = (p, method) => {
    const idx = p.map((v, i) => i).filter(i => isNum(p[i])), m = idx.length, out = p.map(() => NaN);
    if (!m) return out;
    if (method === 'none') { idx.forEach(i => { out[i] = p[i]; }); return out; }
    if (method === 'bonferroni') { idx.forEach(i => { out[i] = Math.min(1, p[i] * m); }); return out; }
    const o = idx.slice().sort((a, b) => p[a] - p[b]);
    if (method === 'BH') {
      let run = 1;
      for (let r = m - 1; r >= 0; r--) { run = Math.min(run, p[o[r]] * m / (r + 1)); out[o[r]] = run; }
      return out;
    }
    let run = 0;                                                    /* Holm (1979) */
    for (let r = 0; r < m; r++) { run = Math.max(run, Math.min(1, p[o[r]] * (m - r))); out[o[r]] = run; }
    return out;
  };

  /* letters of the groups from the table of «different / not different»:
     the insert-and-absorb scheme of Piepho (2004). `different(i, j)` says
     whether groups i and j differ; `order` lists the groups from the largest
     mean to the smallest, so that «a» goes to the largest. */
  S.letters = (k, different, order) => {
    let cols = [new Set(Array.from({ length: k }, (_, i) => i))];
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
      if (!different(i, j)) continue;
      const next = [];
      cols.forEach(c => {
        if (c.has(i) && c.has(j)) { const a = new Set(c), b = new Set(c); a.delete(i); b.delete(j); next.push(a, b); }
        else next.push(c);
      });
      /* absorb: drop every column contained in another */
      cols = next.filter((c, a) => !next.some((d, b) => a !== b && c.size <= d.size && [...c].every(v => d.has(v)) && (c.size < d.size || b < a)));
    }
    const ord = order || Array.from({ length: k }, (_, i) => i), pos = {};
    ord.forEach((g, r) => { pos[g] = r; });
    cols.sort((a, b) => Math.min(...[...a].map(v => pos[v])) - Math.min(...[...b].map(v => pos[v])) || Math.max(...[...a].map(v => pos[v])) - Math.max(...[...b].map(v => pos[v])));
    const abc = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({ length: k }, (_, g) => cols.map((c, i) => (c.has(g) ? (abc[i] || '(' + (i + 1) + ')') : '')).join(''));
  };

  /* ============================ analysis of variance ============================ */
  /* one-way analysis of variance; groups: [[…], […], …] */
  S.anova1 = groups => {
    const g = groups.map(S.clean), k = g.length, n = g.map(x => x.length), N = S.sum(n);
    const means = g.map(S.mean), grand = S.sum(g.map(S.sum)) / N;
    const ssb = S.sum(g.map((x, i) => n[i] * (means[i] - grand) * (means[i] - grand)));
    const ssw = S.sum(g.map((x, i) => S.sum(x.map(v => (v - means[i]) * (v - means[i])))));
    const dfb = k - 1, dfw = N - k, msb = ssb / dfb, msw = ssw / dfw, F = msb / msw;
    return { k, n, N, means, sds: g.map(x => S.sd(x)), grand, ssb, ssw, sst: ssb + ssw, dfb, dfw, msb, msw, F,
      p: dfw > 0 && dfb > 0 ? S.pf(F, dfb, dfw, true) : NaN, cv: 100 * Math.sqrt(msw) / grand, r2: ssb / (ssb + ssw) };
  };
  /* Tukey's honestly significant difference with the Tukey–Kramer error for
     unequal sizes; every pair with its difference, interval and p */
  S.tukey = (groups, conf) => {
    const A = S.anova1(groups), k = A.k, a = 1 - (conf || 0.95), pairs = [];
    const qc = A.dfw > 0 ? S.qtukey(1 - a, k, A.dfw) : NaN;
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
      const se = Math.sqrt(A.msw / 2 * (1 / A.n[i] + 1 / A.n[j])), d = A.means[i] - A.means[j], q = Math.abs(d) / se;
      pairs.push({ i, j, diff: d, se, q, lo: d - qc * se, hi: d + qc * se, p: se > 0 ? S.ptukey(q, k, A.dfw, true) : (d === 0 ? 1 : 0) });
    }
    const sig = {};
    pairs.forEach(p => { sig[p.i + ',' + p.j] = p.p < a; });
    const order = A.means.map((m, i) => i).sort((x, y) => A.means[y] - A.means[x]);
    return { anova: A, qcrit: qc, pairs, letters: S.letters(k, (i, j) => !!sig[Math.min(i, j) + ',' + Math.max(i, j)], order), order, hsd: qc * Math.sqrt(A.msw / (S.sum(A.n) / k)) };
  };
  /* homogeneity of variances: analysis of variance of the absolute deviations
     from the median of each group (Brown and Forsythe 1974) */
  S.brownForsythe = groups => {
    const A = S.anova1(groups.map(g => { const x = S.clean(g), m = S.median(x); return x.map(v => Math.abs(v - m)); }));
    return { F: A.F, df1: A.dfb, df2: A.dfw, p: A.p };
  };
  /* Kruskal and Wallis (1952), corrected for ties */
  S.kruskal = groups => {
    const g = groups.map(S.clean), all = [].concat(...g), N = all.length, R = S.ranks(all);
    let pos = 0, H = 0;
    g.forEach(x => { const r = R.ranks.slice(pos, pos + x.length); pos += x.length; const s = S.sum(r); H += s * s / x.length; });
    H = 12 / (N * (N + 1)) * H - 3 * (N + 1);
    const C = 1 - S.sum(R.ties.map(t => t * t * t - t)) / (N * N * N - N);
    H /= C || 1;
    return { H, df: g.length - 1, p: S.pchisq(H, g.length - 1, true) };
  };
  /* straight line by least squares, with the errors of its two coefficients */
  S.linreg = (x, y) => {
    const n = x.length, mx = S.mean(x), my = S.mean(y);
    const sxx = S.sum(x.map(v => (v - mx) * (v - mx))), sxy = S.sum(x.map((v, i) => (v - mx) * (y[i] - my))), syy = S.sum(y.map(v => (v - my) * (v - my)));
    const b = sxy / sxx, a = my - b * mx, rss = Math.max(0, syy - b * sxy), df = n - 2, s2 = rss / df;
    const seb = Math.sqrt(s2 / sxx), sea = Math.sqrt(s2 * (1 / n + mx * mx / sxx));
    return { n, slope: b, intercept: a, seSlope: seb, seIntercept: sea, r2: syy > 0 ? 1 - rss / syy : NaN, rss, df, sigma: Math.sqrt(s2),
      p: df > 0 ? 2 * S.pt(Math.abs(b / seb), df, true) : NaN, mx, sxx, covAB: -mx * s2 / sxx };
  };

  /* ============================ binomial GLM ============================ */
  const LINKS = {
    logit: { f: S.logit, inv: S.expit, d: e => { const m = S.expit(e); return m * (1 - m); } },
    probit: { f: S.qnorm, inv: e => S.pnorm(e), d: e => S.dnorm(e) },
    cloglog: { f: m => Math.log(-Math.log1p(-m)), inv: e => -Math.expm1(-Math.exp(e)), d: e => Math.exp(e - Math.exp(e)) },
  };
  S.links = LINKS;
  /* y successes out of n in every row, X the model matrix (with its column
     of ones). Iteratively reweighted least squares; opts.quasi estimates the
     dispersion with Pearson's chi-square over its degrees of freedom. */
  S.glmBinomial = (y, n, X, opts) => {
    opts = opts || {};
    const L = LINKS[opts.link || 'logit'], N = y.length, p = X[0].length;
    const lim = 1e-10;
    let eta = y.map((v, i) => L.f((v + 0.5) / (n[i] + 1))), beta = new Array(p).fill(0), dev = Infinity, iter = 0, converged = false, XtWX = null;
    const deviance = mu => 2 * S.sum(y.map((v, i) => {
      const a = v > 0 ? v * Math.log(v / (n[i] * mu[i])) : 0, f = n[i] - v, b = f > 0 ? f * Math.log(f / (n[i] * (1 - mu[i]))) : 0;
      return a + b;
    }));
    for (iter = 1; iter <= (opts.maxIter || 50); iter++) {
      const mu = eta.map(e => Math.min(1 - lim, Math.max(lim, L.inv(e))));
      const g = eta.map(e => Math.max(1e-12, L.d(e)));
      const W = mu.map((m, i) => n[i] * g[i] * g[i] / (m * (1 - m)));
      const z = eta.map((e, i) => e + (y[i] / n[i] - mu[i]) / g[i]);
      XtWX = Array.from({ length: p }, () => new Array(p).fill(0));
      const XtWz = new Array(p).fill(0);
      for (let i = 0; i < N; i++) {
        if (!(n[i] > 0)) continue;
        for (let a = 0; a < p; a++) {
          const xa = X[i][a] * W[i];
          XtWz[a] += xa * z[i];
          for (let b = a; b < p; b++) XtWX[a][b] += xa * X[i][b];
        }
      }
      for (let a = 0; a < p; a++) for (let b = 0; b < a; b++) XtWX[a][b] = XtWX[b][a];
      const nb = S.solve(XtWX, XtWz);
      if (!nb) break;
      beta = nb;
      eta = X.map(r => { let s = 0; for (let a = 0; a < p; a++) s += r[a] * beta[a]; return s; });
      const d = deviance(eta.map(e => Math.min(1 - lim, Math.max(lim, L.inv(e)))));
      /* once the deviance stops changing, one more step: the method converges
         quadratically, so that last step leaves the coefficients exact */
      if (converged) { dev = d; break; }
      if (Math.abs(d - dev) / (Math.abs(d) + 0.1) < 1e-10) converged = true;
      dev = d;
    }
    const mu = eta.map(e => Math.min(1 - lim, Math.max(lim, L.inv(e))));
    /* the weights at the solution, for the covariance */
    const g = eta.map(e => Math.max(1e-12, L.d(e))), W = mu.map((m, i) => n[i] * g[i] * g[i] / (m * (1 - m)));
    XtWX = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let i = 0; i < N; i++) if (n[i] > 0) for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) XtWX[a][b] += X[i][a] * W[i] * X[i][b];
    const used = n.filter(v => v > 0).length, dfRes = used - p;
    const pearson = S.sum(y.map((v, i) => (n[i] > 0 ? (v - n[i] * mu[i]) * (v - n[i] * mu[i]) / (n[i] * mu[i] * (1 - mu[i])) : 0)));
    const phi = opts.quasi ? (dfRes > 0 ? pearson / dfRes : NaN) : 1;
    const inv = S.inverse(XtWX), cov = inv ? inv.map(r => r.map(v => v * phi)) : null;
    const logLik = S.sum(y.map((v, i) => (n[i] > 0 ? S.lchoose(n[i], v) + (v > 0 ? v * Math.log(mu[i]) : 0) + (n[i] - v > 0 ? (n[i] - v) * Math.log(1 - mu[i]) : 0) : 0)));
    /* a fitted probability stuck at 0 or 1: the estimate has run to infinity */
    const separation = eta.some(e => Math.abs(e) > 15 && (opts.link || 'logit') !== 'probit') || eta.some(e => Math.abs(e) > 7 && opts.link === 'probit');
    return { beta, cov, se: cov ? cov.map((r, i) => Math.sqrt(r[i])) : beta.map(() => NaN), eta, mu, deviance: dev, pearson, dfRes, phi,
      dispersion: dfRes > 0 ? pearson / dfRes : NaN, logLik, aic: opts.quasi ? NaN : -2 * logLik + 2 * p, iter, converged, separation, link: opts.link || 'logit', quasi: !!opts.quasi, p, N: used };
  };
  /* model matrix of one factor: a column of ones and one indicator for every
     level but the first */
  S.factorMatrix = (labels, levels) => {
    levels = levels || [...new Set(labels)];
    return { levels, X: labels.map(l => [1].concat(levels.slice(1).map(v => (l === v ? 1 : 0)))) };
  };
  /* the whole comparison of one factor with binomial counts: the model, the
     test of the factor against the model of a single proportion, the fitted
     percentage of each level with its interval and every pair of levels */
  S.glmFactor = (y, n, labels, opts) => {
    opts = opts || {};
    const F = S.factorMatrix(labels, opts.levels), k = F.levels.length;
    const full = S.glmBinomial(y, n, F.X, opts), nul = S.glmBinomial(y, n, y.map(() => [1]), opts);
    const dDev = nul.deviance - full.deviance, ddf = k - 1;
    const test = opts.quasi
      ? { stat: dDev / ddf / full.phi, df1: ddf, df2: full.dfRes, p: full.dfRes > 0 ? S.pf(dDev / ddf / full.phi, ddf, full.dfRes, true) : NaN, kind: 'F' }
      : { stat: dDev, df1: ddf, df2: null, p: S.pchisq(dDev, ddf, true), kind: 'chisq' };
    const crit = opts.quasi ? S.qt(1 - (1 - (opts.conf || 0.95)) / 2, full.dfRes) : S.qnorm(1 - (1 - (opts.conf || 0.95)) / 2);
    const L = LINKS[full.link];
    const row = g => [1].concat(F.levels.slice(1).map((_, j) => (j === g - 1 ? 1 : 0)));
    const quad = c => { let s = 0; for (let a = 0; a < c.length; a++) for (let b = 0; b < c.length; b++) s += c[a] * full.cov[a][b] * c[b]; return s; };
    const dot = c => S.sum(c.map((v, a) => v * full.beta[a]));
    const groups = F.levels.map((lv, g) => {
      const c = row(g), e = dot(c), se = full.cov ? Math.sqrt(quad(c)) : NaN;
      const yy = S.sum(y.filter((_, i) => labels[i] === lv)), nn = S.sum(n.filter((_, i) => labels[i] === lv));
      return { level: lv, y: yy, n: nn, eta: e, se, p: L.inv(e), lo: L.inv(e - crit * se), hi: L.inv(e + crit * se) };
    });
    const pairs = [];
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
      const c = row(i).map((v, a) => v - row(j)[a]), est = dot(c), se = full.cov ? Math.sqrt(quad(c)) : NaN, z = est / se;
      pairs.push({ i, j, est, se, z, ratio: Math.exp(est), p: opts.quasi ? 2 * S.pt(Math.abs(z), full.dfRes, true) : 2 * S.pnorm(Math.abs(z), true) });
    }
    const adj = S.padjust(pairs.map(q => q.p), opts.adjust || 'holm');
    pairs.forEach((q, i) => { q.padj = adj[i]; });
    const a = 1 - (opts.conf || 0.95), sig = {};
    pairs.forEach(q => { sig[q.i + ',' + q.j] = q.padj < a; });
    const order = groups.map((g, i) => i).sort((u, v) => groups[v].p - groups[u].p);
    return { levels: F.levels, full, null: nul, test, groups, pairs, letters: S.letters(k, (i, j) => !!sig[Math.min(i, j) + ',' + Math.max(i, j)], order), order };
  };

  /* A response that goes from a floor c to a ceiling d along a dose (or a
     time, a moisture, a temperature):

         P(x) = c + (d − c) · F(a + b·u)        u = x or ln x

     F is the normal (probit) or the logistic (logit) distribution. With the
     floor at 0 and the ceiling at 1 it is the binomial model above; with
     either of them free the binomial likelihood is maximized with the simplex
     (needs Nls). rows: [{ x, n, y }]. opts: { link, log, lower, upper } —
     lower / upper true to estimate the floor / the ceiling.
     ed(p): the dose at which the response has covered the fraction p of the
     way from the floor to the ceiling, with its interval by the delta method
     on the scale of the model. */
  S.doseResponse = (rows, opts) => {
    opts = opts || {};
    const link = opts.link === 'logit' ? 'logit' : 'probit', L = LINKS[link], log = !!opts.log;
    const R = rows.map(r => ({ x: +r.x, n: +r.n, y: +r.y })).filter(r => r.n > 0 && r.y >= 0 && r.y <= r.n && isFinite(r.x) && (!log || r.x > 0));
    if (R.length < 3 || new Set(R.map(r => r.x)).size < 3) return null;
    const u = x => (log ? Math.log(x) : x), back = v => (log ? Math.exp(v) : v);
    const y = R.map(r => r.y), n = R.map(r => r.n), X = R.map(r => [1, u(r.x)]), free = (opts.lower ? 1 : 0) + (opts.upper ? 1 : 0);
    const stats = mu => {
      const dev = 2 * S.sum(y.map((v, i) => (v > 0 ? v * Math.log(v / (n[i] * mu[i])) : 0) + (n[i] - v > 0 ? (n[i] - v) * Math.log((n[i] - v) / (n[i] * (1 - mu[i]))) : 0)));
      const pearson = S.sum(y.map((v, i) => (v - n[i] * mu[i]) * (v - n[i] * mu[i]) / (n[i] * mu[i] * (1 - mu[i]))));
      const logLik = S.sum(y.map((v, i) => S.lchoose(n[i], v) + (v > 0 ? v * Math.log(mu[i]) : 0) + (n[i] - v > 0 ? (n[i] - v) * Math.log(1 - mu[i]) : 0)));
      return { deviance: dev, pearson, logLik };
    };
    let a, b, c = 0, d = 1, cov, seC = NaN, seD = NaN, st, k = 2, converged = true;
    if (!free) {
      const G = S.glmBinomial(y, n, X, { link });
      a = G.beta[0]; b = G.beta[1]; cov = G.cov; converged = G.converged;
      st = { deviance: G.deviance, pearson: G.pearson, logLik: G.logLik };
    } else {
      const pr = R.map(r => r.y / r.n), lo0 = opts.lower ? Math.max(0.005, Math.min(...pr) * 0.6) : 0, hi0 = opts.upper ? Math.min(0.995, Math.max(...pr) + 0.02 * (1 - Math.max(...pr))) : 1;
      const yy = R.map(r => Math.round(r.n * Math.min(0.98, Math.max(0.02, (r.y / r.n - lo0) / (hi0 - lo0)))));
      const G0 = S.glmBinomial(yy, n, X, { link });
      /* the floor and the ceiling are kept between 0 and 1 by fitting their logits */
      const unpack = q => { let i = 2, cc = 0, dd = 1; if (opts.lower) cc = S.expit(q[i++]); if (opts.upper) dd = cc + (1 - cc) * S.expit(q[i++]); return [q[0], q[1], cc, dd]; };
      const mus = q => { const [aa, bb, cc, dd] = unpack(q); return X.map(r => Math.min(1 - 1e-12, Math.max(1e-12, cc + (dd - cc) * L.inv(aa + bb * r[1])))); };
      const nll = q => { const mu = mus(q); let s = 0; for (let i = 0; i < y.length; i++) s -= y[i] * Math.log(mu[i]) + (n[i] - y[i]) * Math.log(1 - mu[i]); return s; };
      const q0 = [G0.beta[0], G0.beta[1]];
      if (opts.lower) q0.push(S.logit(lo0));
      if (opts.upper) q0.push(S.logit(Math.min(0.999, Math.max(0.001, (hi0 - lo0) / (1 - lo0)))));
      const fit = window.Nls.minimizeRestart(nll, q0, { step: 0.1 });
      const q = fit.par, P = unpack(q), H = window.Nls.hessian(nll, q), C = S.inverse(H);
      a = P[0]; b = P[1]; c = P[2]; d = P[3]; k = 2 + free; converged = fit.converged;
      cov = C ? [[C[0][0], C[0][1]], [C[1][0], C[1][1]]] : [[NaN, NaN], [NaN, NaN]];
      if (C) { if (opts.lower) seC = window.Nls.delta(v => unpack(v)[2], q, C).se; if (opts.upper) seD = window.Nls.delta(v => unpack(v)[3], q, C).se; }
      st = stats(mus(q));
    }
    const dfRes = R.length - k, dispersion = dfRes > 0 ? st.pearson / dfRes : NaN;
    const quasi = opts.quasi !== false && dfRes > 0 && dispersion > 1.5 && S.pchisq(st.pearson, dfRes, true) < 0.05;
    if (quasi) cov = cov.map(r => r.map(v => v * dispersion));
    const se = [Math.sqrt(cov[0][0]), Math.sqrt(cov[1][1])], crit = quasi ? S.qt(0.975, dfRes) : 1.959963984540054;
    const ed = p => {
      const q = L.f(p), est = (q - a) / b, g = [-1 / b, -(q - a) / (b * b)];
      const v = g[0] * g[0] * cov[0][0] + 2 * g[0] * g[1] * cov[0][1] + g[1] * g[1] * cov[1][1], s = v >= 0 ? Math.sqrt(v) : NaN;
      return { p, value: back(est), lo: back(est - crit * s), hi: back(est + crit * s), se: s };
    };
    return { rows: R, link, log, a, b, c, d, se, seC, seD, cov, k, quasi, dispersion, dfRes, deviance: st.deviance, pearson: st.pearson, logLik: st.logLik, aic: -2 * st.logLik + 2 * k, converged,
      pSlope: quasi ? 2 * S.pt(Math.abs(b / se[1]), dfRes, true) : 2 * S.pnorm(Math.abs(b / se[1]), true), rising: b > 0, ed,
      predict: x => c + (d - c) * L.inv(a + b * u(x)) };
  };

  /* ============================ time to event ============================ */
  /* Kaplan–Meier estimator from grouped records [{ t, d, c }]: at time t, d
     events and c censored (those censored at t are still at risk at t).
     conf.type: 'log' (the usual one), 'log-log' or 'plain'. */
  S.kaplanMeier = (records, opts) => {
    opts = opts || {};
    const z = S.qnorm(1 - (1 - (opts.conf || 0.95)) / 2), type = opts.type || 'log';
    const by = {};
    records.forEach(r => { if (!(r.t >= 0)) return; const o = by[r.t] || (by[r.t] = { t: +r.t, d: 0, c: 0 }); o.d += r.d || 0; o.c += r.c || 0; });
    const rows = Object.values(by).sort((a, b) => a.t - b.t);
    let risk = S.sum(rows.map(r => r.d + r.c)), s = 1, gw = 0;
    const n0 = risk, table = [];
    rows.forEach(r => {
      if (r.d > 0) {
        s *= 1 - r.d / risk;
        gw += r.d / (risk * (risk - r.d));
        const se = s * Math.sqrt(gw);
        let lo, hi;
        if (s <= 0) { lo = NaN; hi = NaN; }
        else if (type === 'plain') { lo = Math.max(0, s - z * se); hi = Math.min(1, s + z * se); }
        else if (type === 'log-log') { const w = z * Math.sqrt(gw) / Math.log(s); lo = Math.pow(s, Math.exp(-w)); hi = Math.pow(s, Math.exp(w)); if (lo > hi) { const t = lo; lo = hi; hi = t; } }
        else { lo = s * Math.exp(-z * Math.sqrt(gw)); hi = Math.min(1, s * Math.exp(z * Math.sqrt(gw))); }
        table.push({ t: r.t, risk, d: r.d, c: r.c, s, se, lo, hi });
      } else if (opts.all) table.push({ t: r.t, risk, d: 0, c: r.c, s, se: s * Math.sqrt(gw), lo: NaN, hi: NaN });
      risk -= r.d + r.c;
    });
    /* the time at which the curve first reaches 1 − q; when it lands exactly
       on the level, the midpoint with the next time of event */
    const quant = q => {
      const ev = table.filter(r => r.d > 0), lev = 1 - q;
      for (let i = 0; i < ev.length; i++) {
        if (ev[i].s < lev - 1e-12) return ev[i].t;
        if (Math.abs(ev[i].s - lev) <= 1e-12) return i + 1 < ev.length ? (ev[i].t + ev[i + 1].t) / 2 : ev[i].t;
      }
      return NaN;
    };
    return { n: n0, events: S.sum(rows.map(r => r.d)), censored: S.sum(rows.map(r => r.c)), table, median: quant(0.5), quantile: quant };
  };
  /* log-rank test for k groups; groups: [[{ t, d, c }, …], …]. rho = 0 is the
     log-rank; rho = 1 weights each time by the pooled survival just before it
     (the modification of Peto and Peto of the test of Gehan and Wilcoxon). */
  S.logRank = (groups, rho) => {
    rho = rho || 0;
    const k = groups.length, times = {};
    groups.forEach((g, i) => g.forEach(r => {
      if (!(r.t >= 0)) return;
      const o = times[r.t] || (times[r.t] = { t: +r.t, d: new Array(k).fill(0), c: new Array(k).fill(0) });
      o.d[i] += r.d || 0; o.c[i] += r.c || 0;
    }));
    const rows = Object.values(times).sort((a, b) => a.t - b.t);
    const risk = groups.map((g, i) => S.sum(rows.map(r => r.d[i] + r.c[i])));
    const O = new Array(k).fill(0), E = new Array(k).fill(0), V = Array.from({ length: k }, () => new Array(k).fill(0));
    let surv = 1;
    rows.forEach(r => {
      const n = S.sum(risk), d = S.sum(r.d);
      if (d > 0 && n > 0) {
        const w = rho ? Math.pow(surv, rho) : 1;
        for (let i = 0; i < k; i++) { O[i] += w * r.d[i]; E[i] += w * d * risk[i] / n; }
        if (n > 1) {
          const f = w * w * d * (n - d) / (n - 1);
          for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) V[i][j] += f * (risk[i] / n) * ((i === j ? 1 : 0) - risk[j] / n);
        }
        surv *= 1 - d / n;
      }
      for (let i = 0; i < k; i++) risk[i] -= r.d[i] + r.c[i];
    });
    const m = k - 1, u = O.slice(0, m).map((o, i) => o - E[i]), Vm = V.slice(0, m).map(r => r.slice(0, m));
    const sol = m > 0 ? S.solve(Vm, u) : null;
    const chisq = sol ? S.sum(u.map((v, i) => v * sol[i])) : NaN;
    return { chisq, df: m, p: sol ? S.pchisq(chisq, m, true) : NaN, observed: O, expected: E, rho };
  };

  window.Stats = S;
})();
