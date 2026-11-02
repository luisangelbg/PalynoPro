/* PalynoPro — quantitative pollen morphometry from electron micrographs.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it under
   the terms of the GNU General Public License as published by the Free Software
   Foundation, either version 3 of the License, or (at your option) any later
   version. It is distributed in the hope that it will be useful, but WITHOUT ANY
   WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
   A PARTICULAR PURPOSE. See the GNU General Public License, in the file LICENSE
   at the root of this program, or <https://www.gnu.org/licenses/>. */

/* PalynoPro — the images of a study (Images).
   Opening a folder: the pictures (TIFF, PNG, JPEG…), the text files the
   microscope leaves next to them (same name), an index (CSV) and a key of
   group names, all recognized by themselves. Every picture is read once to
   know its size, check its scale bar and make a small preview; its pixels
   are read again only when it is analyzed. Nothing is copied or uploaded. */
(function () {
  'use strict';
  const IM = {};
  let uid = 0;

  /* ---------------- reading pixels ---------------- */
  const cache = new Map();   /* the last few decoded images */
  IM.decode = async function (rec) {
    if (cache.has(rec.id)) return cache.get(rec.id);
    let img;
    if (rec.src && rec.src.kind === 'synth') { const s = rec.src.make(); img = s.img; rec.truth = s.truth; }
    else if (rec.src && rec.src.kind === 'file') img = await ImgIO.fromFile(rec.src.file);
    else throw new Error(T('La imagen no está abierta: abre otra vez su carpeta.', 'The image is not open: open its folder again.'));
    cache.set(rec.id, img);
    if (cache.size > 4) cache.delete(cache.keys().next().value);
    return img;
  };
  IM.has = rec => !!(rec.src && (rec.src.kind === 'synth' || rec.src.kind === 'file'));

  function thumbOf(img, width) {
    const k = Math.min(1, (width || 240) / img.w), small = Img.resample(img, img.w * k, img.h * k);
    const cv = document.createElement('canvas');
    cv.width = small.w; cv.height = small.h;
    const g = cv.getContext('2d'), id = g.createImageData(small.w, small.h);
    for (let i = 0; i < small.w * small.h; i++) { const v = small.data[i]; id.data[4 * i] = id.data[4 * i + 1] = id.data[4 * i + 2] = v; id.data[4 * i + 3] = 255; }
    g.putImageData(id, 0, 0);
    return cv.toDataURL('image/jpeg', 0.72);
  }

  /* ---------------- calibration and kinds ---------------- */
  IM.calibrate = function (rec, img) {
    const c = Calib.calibrate({ manualUmPerPx: rec.manualUmPerPx, indexUmPerPx: rec.indexUmPerPx, meta: rec.meta, mag: rec.mag }, img, { refMm: state.set.refMm });
    rec.calib = c;
    rec.nativeUm = c.umPerPx;
    rec.captionRow = Calib.captionRow(img, c.bar);
    return c;
  };
  /* recompute only what depends on the settings (no pixels needed when the bar was already measured);
     the same rules as IM.calibrate, the replacement of a contradicted pixel size included */
  IM.recalibrate = function (rec) {
    if (!rec.w) return;
    const c = Calib.withBar(rec, rec.w, (rec.calib || {}).bar, { refMm: state.set.refMm });
    rec.calib = c;
    rec.nativeUm = c.umPerPx;
  };
  IM.tiers = function () {
    const mags = state.images.filter(r => r.mag > 0).map(r => r.mag).sort((a, b) => a - b);
    const med = mags.length ? mags[Math.floor(mags.length / 2)] : NaN;
    state.images.forEach(r => {
      if (r.isOverview) r.tierAuto = 'overview';
      else r.tierAuto = Calib.suggestTier(r.mag, med, state.set.tierLo, state.set.tierHi);
      if (!r.tierManual) r.tier = r.tierAuto;
    });
  };
  /* the size of pixel of the analysis: what the user set, or the 90th
     percentile of the native size of the one-grain images (so almost none
     needs to be enlarged), rounded to two figures */
  IM.target = function (kind) {
    if (kind !== 'overview' && state.set.targetUm > 0) return state.set.targetUm;
    const pool = state.images.filter(r => included(r) && (kind === 'overview' ? r.tier === 'overview' : r.tier !== 'overview')).map(r => r.nativeUm).sort((a, b) => a - b);
    if (!pool.length) return NaN;
    const v = pool[Math.min(pool.length - 1, Math.floor(0.9 * (pool.length - 1)))];
    const e = Math.floor(Math.log10(v)), f = Math.round(v / Math.pow(10, e - 1)) / 10;
    return f * Math.pow(10, e);
  };
  /* the picture ready for the analysis: without its caption, at the common size of pixel */
  IM.working = async function (rec, target, maxW) {
    const img = await IM.decode(rec);
    const rows = Math.min(img.h, rec.captionRow || img.h);
    const crop = rows < img.h ? Img.crop(img, 0, 0, img.w, rows) : img;
    let t = target;
    if (maxW && img.w * rec.nativeUm / t > maxW) t = img.w * rec.nativeUm / maxW;
    const w = Img.toScale(crop, rec.nativeUm, t);
    return { img: w, factor: rec.nativeUm / t, rows };
  };

  /* ---------------- opening a folder ---------------- */
  /* group names from a key: "G1 = Morphotype one" */
  function applyKey(map) { Object.keys(map).forEach(k => { state.groups[k] = map[k]; }); }
  IM.newRecord = function (o) {
    return Object.assign({ id: 'i' + (++uid), name: '', stem: '', group: '', grain: '', mag: NaN, indexUmPerPx: NaN, manualUmPerPx: NaN, meta: null, tier: 'standard', tierAuto: 'standard', tierManual: false, groupFrom: '', grainFrom: '', exclude: false, note: '', w: 0, h: 0, calib: null, thumb: '' }, o);
  };
  /* files: a FileList or array. → { added, attached, skipped, index, key, sidecars } */
  IM.openFiles = async function (files, w) {
    files = [...files];
    const imgs = files.filter(f => ImgIO.IMAGE_EXT.includes(ImgIO.ext(f.name)));
    const txts = files.filter(f => ['txt', 'csv', 'tsv'].includes(ImgIO.ext(f.name)));
    const stems = new Set(imgs.map(f => ImgIO.stem(f.name)));
    const side = new Map(), report = { added: 0, attached: 0, skipped: [], index: null, key: 0, sidecars: 0 };
    let index = null;
    for (const f of txts) {
      const text = await ImgIO.readText(f), st = ImgIO.stem(f.name);
      if (stems.has(st) && ImgIO.ext(f.name) === 'txt') { side.set(st, text); report.sidecars++; continue; }
      const idx = ImgIO.parseIndex(text);
      if (idx.rows.length && !index) { index = idx; report.index = f.name; continue; }
      const key = ImgIO.parseKey(text);
      if (Object.keys(key).length) { applyKey(key); report.key += Object.keys(key).length; }
    }
    const pattern = state.set.pattern || ImgIO.DEFAULT_PATTERN;
    const existing = new Set(state.images.map(r => r.name));
    for (let i = 0; i < imgs.length; i++) {
      const f = imgs[i], st = ImgIO.stem(f.name);
      if (w) { w.update(i / imgs.length, T('Leyendo ', 'Reading ') + f.name + ' (' + (i + 1) + ' / ' + imgs.length + ')'); await yieldPaint(); }
      if (existing.has(f.name)) {
        /* the same picture again (a project was opened first): attach the file */
        const r = state.images.find(x => x.name === f.name);
        if (r && !IM.has(r)) { r.src = { kind: 'file', file: f }; report.attached++; }
        continue;
      }
      const rec = IM.newRecord({ name: f.name, stem: st, src: { kind: 'file', file: f } });
      const nm = ImgIO.fromName(st, pattern);
      rec.group = nm.group; rec.grain = nm.grain;
      if (side.has(st)) { rec.metaText = side.get(st); rec.meta = ImgIO.parseMeta(rec.metaText); if (rec.meta.mag > 0) rec.mag = rec.meta.mag; }
      const row = index && index.rows.find(x => x.key === st || x.file === f.name);
      if (row) {
        /* what the index says is kept when the pattern of the names changes (Block 2, Apply) */
        if (row.group) { rec.group = row.group; rec.groupFrom = 'index'; }
        if (row.grain) { rec.grain = row.grain; rec.grainFrom = 'index'; }
        if (row.name && row.group) state.groups[row.group] = row.name;
        if (row.mag > 0 && !(rec.mag > 0)) rec.mag = row.mag;
        if (row.umPerPx > 0) rec.indexUmPerPx = row.umPerPx;
        if (row.exclude) rec.exclude = true;
        if (row.note) rec.note = row.note;
        if (row.tier) { rec.tier = ImgIO.tierOf(row.tier); rec.tierManual = true; }
      }
      try {
        const img = await ImgIO.fromFile(f);
        rec.w = img.w; rec.h = img.h;
        if (img.text) { const m2 = ImgIO.parseMeta(img.text); if (!rec.meta || !(rec.meta.mag > 0 || rec.meta.umPerPx > 0)) { rec.meta = m2; if (m2.mag > 0 && !(rec.mag > 0)) rec.mag = m2.mag; } }
        IM.calibrate(rec, img);
        rec.thumb = thumbOf(img);
        state.images.push(rec);
        report.added++;
      } catch (e) { report.skipped.push(f.name + ': ' + e.message); }
    }
    IM.tiers();
    return report;
  };

  /* ---------------- the simulated example ---------------- */
  IM.openExample = async function (w) {
    const list = Synth.exampleList(8);
    state.images = []; state.results = { images: {}, fertility: null, stats: null }; state.groups = {};
    cache.clear();
    Synth.GROUPS.forEach(g => { state.groups[g.code] = T(g.es, g.en); });
    state.example = 'synth';
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      if (w) { w.update(i / list.length, T('Dibujando ', 'Drawing ') + it.name); await yieldPaint(); }
      const rec = IM.newRecord({ name: it.name, stem: ImgIO.stem(it.name), group: it.group, grain: it.grain, mag: it.mag, src: { kind: 'synth', make: it.make }, synthIndex: i, isOverview: !!it.overview });
      rec.metaText = '$CM_MAG ' + it.mag + String.fromCharCode(10);
      rec.meta = ImgIO.parseMeta(rec.metaText);
      /* a quarter-size drawing of the same field gives the preview and the bar; the full picture is drawn when it is analyzed */
      const small = it.makeAt(320), k = it.w / small.img.w;
      const bar = Calib.findBar(small.img);
      rec.w = it.w; rec.h = Math.round(small.img.h * k);
      rec.calib = { bar: bar ? { x: Math.round(bar.x * k), y: Math.round(bar.y * k), len: Math.round(bar.len * k), rows: Math.round(bar.rows * k) } : null };
      Images.recalibrate(rec);
      rec.captionRow = bar ? Math.max(Math.floor(rec.h * 0.6), Math.round(bar.y * k) - Math.max(4, Math.round(rec.h * 0.012))) : rec.h;
      rec.thumb = thumbOf(small.img);
      state.images.push(rec);
    }
    IM.tiers();
  };

  /* ---------------- analyzing ---------------- */
  /* one grain → the result kept in state.results.images[id] */
  IM.analyze = async function (rec, target) {
    const t = target || IM.target('standard');
    const W = await IM.working(rec, t);
    const s = state.set;
    const a = Img.analyze(W.img, { baseUm: s.baseUm, minHeightUm: s.minHeightUm, lumen: { winUm: s.lumenWin, k: s.lumenK } });
    if (a.error) return (state.results.images[rec.id] = { error: a.error, workUm: W.img.umPerPx });
    const flags = [];
    if (a.cutFrac > s.maxCut) flags.push('cut');
    if (W.factor > 1.05) flags.push('enlarged');
    const m = {
      corp_d: a.corpus.diameterUm, corp_fmax: a.corpus.feretMaxUm, corp_fmin: a.corpus.feretMinUm, corp_aspect: a.corpus.aspect, corp_circ: a.corpus.circularity,
      env_d: a.envelope.diameterUm, spininess: a.spininess,
      sp_n: a.spines.n, sp_h: a.spines.heightUm, sp_spacing: a.spines.spacingUm, sp_density: a.spines.density,
      lum_d: a.lumina ? a.lumina.medianDiameterUm : NaN, lum_density: a.lumina ? a.lumina.densityPer100um2 : NaN, lum_cv: a.lumina ? a.lumina.cvDiameter : NaN,
      tx_contrast: a.texture ? a.texture.contrast : NaN, tx_homogeneity: a.texture ? a.texture.homogeneity : NaN, tx_entropy: a.texture ? a.texture.entropy : NaN,
      tx_correlation: a.texture ? a.texture.correlation : NaN, tx_energy: a.texture ? a.texture.energy : NaN,
    };
    const res = {
      metrics: m, workUm: W.img.umPerPx, factor: W.factor,
      qc: { cutFrac: a.cutFrac, nRegions: a.nRegions, threshold: a.threshold, flags, nLumina: a.lumina ? a.lumina.n : 0, nSpinesAll: a.spines.nAll },
      radial: Float32Array.from(a.radial), base: Float32Array.from(a.base), peaks: a.peaks, center: [a.region.cx, a.region.cy], workW: a.w, workH: a.h,
      spineHeights: a.spines.heights,
    };
    state.results.images[rec.id] = res;
    return res;
  };
  /* the full analysis of one picture again, with what the viewer draws (mask, lumina) */
  IM.inspect = async function (rec) {
    const t = IM.target('standard'), W = await IM.working(rec, t), s = state.set;
    const a = Img.analyze(W.img, { baseUm: s.baseUm, minHeightUm: s.minHeightUm, lumen: { winUm: s.lumenWin, k: s.lumenK, returnMask: true } });
    return { a, img: W.img };
  };
  /* an overview: every grain, its silhouette and solidity */
  IM.overview = async function (rec) {
    const W = await IM.working(rec, rec.nativeUm, 1600), s = state.set;
    /* the typical grain, for images with fewer than three grains: the median corpus measured in Block 3 */
    const corp = Object.values(state.results.images).map(r => r.metrics && r.metrics.corp_d).filter(v => v > 0).sort((a, b) => a - b);
    const o = Img.overview(W.img, { minUm: s.minGrainUm, maxUm: s.maxGrainUm, baseUm: s.baseUm, solidity: s.solidity, fragFactor: s.fragFactor, aggFactor: s.aggFactor, fallbackUm: corp.length ? corp[Math.floor((corp.length - 1) / 2)] : null });
    return { o, img: W.img };
  };
  /* the rows of the analyzed one-grain images, with what the statistics need */
  IM.rows = function (opts) {
    const o = Object.assign({ usableOnly: true }, opts || {});
    return state.images.filter(r => included(r) && r.tier !== 'overview' && state.results.images[r.id] && state.results.images[r.id].metrics)
      .map(r => { const res = state.results.images[r.id]; return Object.assign({ id: r.id, name: r.name, group: r.group, grain: r.grain, unit: unitOf(r), usable: !res.qc.flags.includes('cut') }, res.metrics); })
      .filter(r => !o.usableOnly || r.usable);
  };

  /* ---------------- drawing a picture ---------------- */
  IM.toCanvas = function (img, canvas) {
    canvas.width = img.w; canvas.height = img.h;
    const g = canvas.getContext('2d'), id = g.createImageData(img.w, img.h);
    for (let i = 0; i < img.w * img.h; i++) { const v = img.data[i]; id.data[4 * i] = id.data[4 * i + 1] = id.data[4 * i + 2] = v; id.data[4 * i + 3] = 255; }
    g.putImageData(id, 0, 0);
    return g;
  };
  IM.reset = function () { state.images = []; state.results = { images: {}, fertility: null, stats: null }; state.groups = {}; state.example = null; cache.clear(); };

  window.Images = IM;
})();
