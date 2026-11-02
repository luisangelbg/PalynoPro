/* PalynoPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán. Free software under the GNU GPL v3 or later; see LICENSE. */
/* The whole analysis of a grain against the truth of simulated grains:
   corpus, Feret widths, spines, their height, lumina and the overview. */
later(async function () {
  sec('Granos simulados: verdad recuperada');
  const cases = [
    { seed: 11, a: 32, b: 32, spines: 26, hUm: 2.2, mesh: 2.4, w: 1280 },
    { seed: 12, a: 36, b: 31, spines: 34, hUm: 2.8, mesh: 2.8, rot: 0.6, w: 1280 },
    { seed: 13, a: 29, b: 28, spines: 18, hUm: 1.5, mesh: 2.0, w: 2560 },
    { seed: 14, a: 34, b: 30, spines: 24, hUm: 1.9, mesh: 3.2, rot: 1.9, w: 1280 },
  ];
  const errD = [], errFmax = [], errFmin = [], spOk = [], hRel = [], lumRatio = [];
  for (const c of cases) {
    const s = Synth.single(Object.assign({ h: c.w * 3 / 4, mag: 1000 }, c));
    const cal = Calib.calibrate({ mag: 1000 }, s.img), rows = Calib.captionRow(s.img, cal.bar);
    const w = Img.toScale(Img.crop(s.img, 0, 0, s.img.w, rows), cal.umPerPx, 0.1);
    const a = Img.analyze(w, {}), tr = s.truth[0];
    errD.push(Math.abs(a.corpus.diameterUm / (2 * Math.sqrt(tr.a * tr.b)) - 1));
    errFmax.push(Math.abs(a.corpus.feretMaxUm / (2 * Math.max(tr.a, tr.b)) - 1));
    errFmin.push(Math.abs(a.corpus.feretMinUm / (2 * Math.min(tr.a, tr.b)) - 1));
    spOk.push(a.spines.n === tr.spines);
    hRel.push(a.spines.heightUm / tr.meanHeightUm - 1);
    lumRatio.push(a.lumina.medianDiameterUm / c.mesh);
    t('sin contorno cortado (seed ' + c.seed + ')', a.cutFrac === 0);
  }
  t('diámetro del cuerpo: error < 0.5 % en los 4 granos', Math.max(...errD) < 0.005, errD.map(v => (100 * v).toFixed(2)).join(' '));
  t('Feret mayor: error < 1 %', Math.max(...errFmax) < 0.01, errFmax.map(v => (100 * v).toFixed(2)).join(' '));
  t('Feret menor: error < 1 %', Math.max(...errFmin) < 0.01, errFmin.map(v => (100 * v).toFixed(2)).join(' '));
  t('número de espinas exacto en los 4', spOk.every(Boolean));
  t('altura de espina: sesgo entre −7 % y 0 % (la punta sub-píxel)', hRel.every(v => v > -0.07 && v <= 0.005), hRel.map(v => (100 * v).toFixed(1)).join(' '));
  const lm = lumRatio.reduce((s, v) => s + v, 0) / lumRatio.length;
  t('lumen proporcional a la malla (razón casi constante)', lumRatio.every(v => Math.abs(v / lm - 1) < 0.06), lumRatio.map(v => v.toFixed(3)).join(' '));

  sec('Granos simulados: panorámica');
  const f = Synth.field({ seed: 5, n: 12, collapsedFrac: 0.4, mag: 150 });
  const fw = Img.toScale(Img.crop(f.img, 0, 0, f.img.w, Calib.captionRow(f.img, Calib.findBar(f.img))), f.umPerPx, f.umPerPx);
  const o = Img.overview(fw, { minUm: 15, maxUm: 200 });
  const truthFree = f.truth.filter(g => !g.touches);
  t('encuentra todos los granos dibujados', o.grains.length === f.truth.length, o.grains.length + ' de ' + f.truth.length);
  const colTrue = f.truth.filter(g => g.collapsed > 0).length, colFound = o.grains.filter(g => g.cls === 'atypical').length;
  t('colapsados identificados por la solidez del cuerpo (< 0.95)', colFound === colTrue, colFound + ' de ' + colTrue);
  const nearest = g => f.truth.reduce((b, x) => (Math.hypot(x.cx - g.cx, x.cy - g.cy) < Math.hypot(b.cx - g.cx, b.cy - g.cy) ? x : b));
  t('cada atípico es un colapsado dibujado y cada turgente un grano sano', o.grains.every(g => (g.cls === 'atypical' ? nearest(g).collapsed > 0 : g.cls === 'turgid' ? nearest(g).collapsed === 0 : true)), o.grains.map(g => g.cls).join(','));
  void truthFree;
});
