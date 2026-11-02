/* PalynoPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán. Free software under the GNU GPL v3 or later; see LICENSE. */
/* The image engine against figures whose answer is known: a disc, a square,
   an ellipse, a checkerboard, peaks drawn by hand. */
later(async function () {
  const blank = (w, h, v) => ({ w, h, data: new Uint8Array(w * h).fill(v || 0) });
  const disc = (w, h, cx, cy, r, v) => { const im = blank(w, h, 20); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) im.data[y * w + x] = v || 200; return im; };

  sec('Imagen: remuestreo');
  const g4 = { w: 4, h: 2, data: new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]) };
  const half = Img.resample(g4, 2, 1);
  t('a la mitad: promedio exacto de cada bloque de 2 × 2', half.data[0] === 35 && half.data[1] === 55, Array.from(half.data).join(','));
  const third = Img.resample({ w: 3, h: 1, data: new Uint8Array([0, 90, 180]) }, 2, 1);
  t('a 2/3: promedio por áreas (30, 150)', third.data[0] === 30 && third.data[1] === 150, Array.from(third.data).join(','));
  const same = Img.resample(g4, 4, 2);
  t('mismo tamaño: sin cambio', same.data.every((v, i) => v === g4.data[i]));
  const sc = Img.toScale(blank(1000, 500, 7), 0.05, 0.1);
  t('de 0.05 a 0.1 µm/px: 500 × 250 y 0.1 µm/px', sc.w === 500 && sc.h === 250 && Math.abs(sc.umPerPx - 0.1) < 1e-12);

  sec('Imagen: umbral y operaciones binarias');
  const bi = []; for (let i = 0; i < 500; i++) bi.push(40 + (i % 11)); for (let i = 0; i < 500; i++) bi.push(180 + (i % 13));
  const th = Img.otsu(Uint8Array.from(bi));
  t('Otsu separa dos modos (40–50 y 180–192): umbral 50, primer plano > 50', th >= 50 && th < 180, th);
  t('Otsu de una imagen plana: su valor', Img.otsu(new Uint8Array(10).fill(9)) === 9);
  const ring = new Uint8Array(9 * 9);
  for (let y = 1; y < 8; y++) for (let x = 1; x < 8; x++) ring[y * 9 + x] = (y === 1 || y === 7 || x === 1 || x === 7) ? 1 : 0;
  const filled = Img.fillHoles(ring, 9, 9);
  t('relleno de un anillo: 49 píxeles', filled.reduce((s, v) => s + v, 0) === 49);
  const diag = new Uint8Array([1, 0, 0, 1]);
  t('dos píxeles en diagonal: 1 componente con 8 vecinos, 2 con 4', Img.label(diag, 2, 2, 8).n === 1 && Img.label(diag, 2, 2, 4).n === 2);
  const specks = new Uint8Array(10 * 10); specks[0] = 1; for (let i = 50; i < 60; i++) specks[i] = 1;
  t('quita las manchas menores que el mínimo', Img.removeSmall(specks, 10, 10, 5).reduce((s, v) => s + v, 0) === 10);
  t('disco de radio 2: 13 desplazamientos', Img.disk(2).length === 13);
  const gap = new Uint8Array(11 * 5); for (let y = 0; y < 5; y++) for (let x = 0; x < 11; x++) if (x !== 5) gap[y * 11 + x] = 1;
  t('el cierre une una grieta de 1 px', Img.close(gap, 11, 5, 1)[2 * 11 + 5] === 1);

  sec('Imagen: propiedades de una región');
  const D = disc(201, 201, 100, 100, 60), F = Img.foreground(D, {}), p = Img.props(F.labels, F.w, F.h, 1);
  rel('área de un disco de radio 60 ≈ π·60²', p.area, Math.PI * 3600, 0.01);
  /* the weighted count of boundary configurations overestimates a digital circle by about 5 %; the measures of the app come from the radial outline, not from it */
  rel('perímetro digital ≈ 2π·60 (sesgo conocido < 6 %)', p.perimeter, 2 * Math.PI * 60, 0.06);
  rel('diámetro equivalente ≈ 120', p.equivDiameter, 120, 0.005);
  near('excentricidad de un disco ≈ 0', p.eccentricity, 0, 0.02);
  t('solidez de un disco > 0.98', p.solidity > 0.98, p.solidity);
  near('centroide', p.cx + p.cy, 200, 1e-9);
  const sq = blank(50, 50, 0); for (let y = 10; y < 30; y++) for (let x = 10; x < 30; x++) sq.data[y * 50 + x] = 255;
  const Fs = Img.foreground(sq, { closeR: 0 }), ps = Img.props(Fs.labels, 50, 50, 1);
  t('cuadrado de 20 × 20: área 400, extensión 1, solidez 1', ps.area === 400 && ps.extent === 1 && Math.abs(ps.solidity - 1) < 1e-9, ps.solidity);
  near('cuadrado: ejes iguales', ps.major - ps.minor, 0, 1e-9);
  const el2 = blank(301, 201, 0); for (let y = 0; y < 201; y++) for (let x = 0; x < 301; x++) if (((x - 150) / 120) ** 2 + ((y - 100) / 60) ** 2 <= 1) el2.data[y * 301 + x] = 255;
  const Fe = Img.foreground(el2, { closeR: 0 }), pe = Img.props(Fe.labels, 301, 201, 1);
  rel('elipse 240 × 120: eje mayor', pe.major, 240, 0.01);
  rel('elipse: eje menor', pe.minor, 120, 0.01);
  near('elipse: excentricidad √(1 − 1/4)', pe.eccentricity, Math.sqrt(0.75), 0.005);

  sec('Imagen: geometría');
  const sqp = [[0, 0], [10, 0], [10, 10], [0, 10]];
  near('Feret mayor de un cuadrado = diagonal', Img.feret(sqp).max, Math.hypot(10, 10), 1e-9);
  near('Feret menor de un cuadrado = lado', Img.feret(sqp).min, 10, 1e-9);
  const ell = []; for (let i = 0; i < 720; i++) { const a = i / 720 * 2 * Math.PI; ell.push([30 * Math.cos(a), 12 * Math.sin(a)]); }
  rel('Feret de una elipse 60 × 24: mayor', Img.feret(ell).max, 60, 1e-4);
  rel('Feret de una elipse: menor', Img.feret(ell).min, 24, 1e-3);
  near('área de un polígono (cuadrado)', Img.polyArea(sqp), 100, 1e-12);
  t('envolvente convexa ignora puntos interiores', Img.hull(sqp.concat([[5, 5], [2, 7]])).length === 4);
  const pm = Img.polyMetrics(ell, 0.5);
  rel('métricas de polígono en µm (escala 0.5): diámetro equivalente', pm.diameterUm, 2 * Math.sqrt(30 * 12) * 0.5, 1e-3);

  sec('Imagen: picos');
  const seq = [0, 1, 5, 1, 0, 0, 2, 2, 2, 0, 0, 7, 3, 4, 3, 0];
  const pk = Img.peaks(seq, { periodic: false });
  t('máximos locales, con la meseta en su centro', pk.map(q => q.i).join(',') === '2,7,11,13', pk.map(q => q.i).join(','));
  t('prominencias 5, 2, 7 y 1', pk.map(q => q.prominence).join(',') === '5,2,7,1', pk.map(q => q.prominence).join(','));
  t('filtro de prominencia ≥ 2', Img.peaks(seq, { periodic: false, prominence: 2 }).map(q => q.i).join(',') === '2,7,11');
  t('distancia mínima 3: gana el más alto', Img.peaks(seq, { periodic: false, distance: 3 }).map(q => q.i).join(',') === '2,7,11');
  const circ = [3, 0, 0, 0, 0, 0, 0, 0, 1, 0];
  t('secuencia circular: el pico en el extremo cuenta', Img.peaks(circ).map(q => q.i).join(',') === '0,8');
  const op = Img.open1(Float64Array.from([5, 5, 5, 9, 5, 5, 5, 5]), 1);
  t('la apertura corta un pico de 1 de ancho', Math.max(...op) === 5);

  sec('Imagen: altura de espina sobre la cuerda de sus pies');
  /* an elongated outline (radius 300 ± 40 px, two lobes) with 12 triangular
     spines of 20 px and 9 bins at the base, at 0.1 µm/px: on the flanks the
     outline slopes, and a flat opening would sit on the higher side */
  const nO = 720, rO = new Float64Array(nO);
  for (let i = 0; i < nO; i++) rO[i] = 300 + 40 * Math.cos(2 * 2 * Math.PI * i / nO);
  const spAt = []; for (let s = 0; s < 12; s++) spAt.push(30 + s * 60);
  spAt.forEach(c => { for (let d = -4; d <= 4; d++) rO[(c + d + nO) % nO] += 20 * (1 - Math.abs(d) / 5); });
  const orn = Img.ornament(rO, 0.1, { baseUm: 3 });
  t('las 12 espinas, en su sitio', orn.peaks.join(',') === spAt.join(','), orn.peaks.join(','));
  const hErr = Array.from(orn.peakHeights, v => v / 20 - 1);
  t('altura sobre la cuerda: error < 1.5 % aun en los flancos inclinados', hErr.every(v => Math.abs(v) < 0.015), hErr.map(v => (100 * v).toFixed(2)).join(' '));
  const hOpen = orn.peaks.map(i => orn.height[i] / 20 - 1);
  t('(la altura sobre la apertura plana sí se sesga en los flancos: > 3 %)', Math.min(...hOpen) < -0.03, hOpen.map(v => (100 * v).toFixed(1)).join(' '));

  sec('Imagen: textura');
  const cb = blank(40, 40), all = new Uint8Array(1600).fill(1);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) cb.data[y * 40 + x] = (x + y) % 2 ? 255 : 0;
  const g1 = Img.glcm(cb, all, { levels: 2, distances: [1] });
  /* a 1-px checkerboard: horizontal and vertical neighbours always differ, diagonal ones never */
  near('tablero de ajedrez: contraste medio 0.5', g1.contrast, 0.5, 1e-9);
  near('tablero: homogeneidad 0.75', g1.homogeneity, 0.75, 1e-9);
  const flat = blank(40, 40, 77);
  t('imagen plana: textura sin contraste', Img.glcm(flat, all, { levels: 8, distances: [1, 2] }).contrast === 0);
  const half2 = new Uint8Array(1600); for (let i = 0; i < 800; i++) half2[i] = 1;
  const big = blank(40, 40); for (let i = 0; i < 1600; i++) big.data[i] = i < 800 ? 0 : 255;
  t('solo cuentan pares dentro de la máscara', Img.glcm(big, half2, { levels: 4, distances: [1] }).contrast === 0);
  t('máscara diminuta: error', Img.glcm(flat, new Uint8Array(1600).fill(0).map((v, i) => (i < 10 ? 1 : 0)), {}).error === 'small');

  sec('Imagen: lúmenes');
  /* a lattice of dark cells of 6 × 6 px with bright walls of 2 px, at 0.1 µm/px */
  const L = blank(160, 160, 220);
  for (let y = 0; y < 160; y++) for (let x = 0; x < 160; x++) if (y % 8 >= 2 && x % 8 >= 2) L.data[y * 160 + x] = 60;
  const lm = new Uint8Array(160 * 160); for (let y = 10; y < 150; y++) for (let x = 10; x < 150; x++) lm[y * 160 + x] = 1;
  const lu = Img.lumina(L, lm, 0.1, { winUm: 1.2, k: 0.1, minUm2: 0.05, maxUm2: 5 });
  rel('celdas de 6 × 6 px a 0.1 µm/px: diámetro equivalente 0.677 µm', lu.medianDiameterUm, Math.sqrt(4 * 0.36 / Math.PI), 0.01);
  rel('densidad: una celda cada 0.64 µm² (156 por 100 µm²)', lu.densityPer100um2, 100 / 0.64, 0.06);
  t('variación casi nula entre celdas iguales', lu.cvDiameter < 0.01, lu.cvDiameter);
});
